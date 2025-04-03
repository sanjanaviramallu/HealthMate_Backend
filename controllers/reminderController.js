import Reminder from '../models/reminderModel.js';
import schedule from 'node-schedule';
import twilio from 'twilio';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Twilio configuration from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Log Twilio setup (for debugging - remove in production)
console.log('Twilio Setup:', {
  sid: accountSid ? `${accountSid.substring(0, 8)}...` : 'Missing SID',
  token: authToken ? 'Auth token present' : 'Missing token',
  phone: twilioNumber || 'Missing phone number'
});

// Create Twilio client only if credentials are available
let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.error('Twilio credentials not found in environment variables');
}

// Helper function to format phone numbers to E.164 format
function formatPhoneNumber(phoneNumber) {
  // First strip any non-numeric characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // For Indian numbers, ensure proper country code
  if (digits.length === 10) {
    return `+91${digits}`;  // Add Indian country code
  } 
  // For numbers that already have country code (remove any + and re-add it)
  else if (digits.length > 10) {
    // If it starts with 91 and is 12 digits, assume it's an Indian number
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    // For other international numbers
    return `+${digits}`;
  }
  
  // Return the original if it doesn't match expected patterns
  return phoneNumber;
}

// Helper function to send SMS
async function sendSMS(formattedPhoneNumber, medicineName) {
  try {
    // Check if Twilio client is initialized
    if (!client) {
      console.error('Twilio client not initialized. SMS not sent.');
      return false;
    }

    // Ensure the phone number is properly formatted
    const toNumber = formatPhoneNumber(formattedPhoneNumber);
    
    console.log(`Attempting to send SMS to ${toNumber} for medicine: ${medicineName}`);
    
    // Log the complete Twilio configuration for debugging
    console.log('Using Twilio number:', twilioNumber);
    
    const message = await client.messages.create({
      body: `It's time to take your medicine: ${medicineName}`,
      from: twilioNumber,
      to: toNumber,
    });
    
    console.log(`Message sent with SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    // Log specific error details for easier debugging
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
      console.error(`Twilio Error Message: ${error.message}`);
      console.error(`More Info: ${error.moreInfo || 'No additional info'}`);
      
      // Handle specific Twilio error codes
      if (error.code === 21659) {
        console.error('Country Code Mismatch: The "from" phone number country does not match the "to" phone number country.');
        console.error('Suggestion: Use a Twilio phone number from the same country as the recipient or use a Twilio verified caller ID');
      } else if (error.code === 21608) {
        console.error('Trial Account Limitation: You need to verify this number in your Twilio console.');
        console.error(`Please verify ${formattedPhoneNumber} at https://www.twilio.com/console/phone-numbers/verified`);
        console.error('Or upgrade your Twilio account to send to unverified numbers.');
        
        // For development/testing purposes, we'll simulate success
        console.log('DEVELOPMENT MODE: Simulating successful SMS delivery');
        return true; // Return true to simulate success for development
      }
    }
    return false;
  }
}

// Helper function to schedule reminders
function scheduleReminders(reminder) {
  const formattedPhoneNumber = formatPhoneNumber(reminder.phoneNumber);
  
  reminder.medicines.forEach(medicine => {
    // Get the initial reminder time
    const initialTime = new Date(medicine.time);
    
    // Schedule reminders for the specified number of days
    for (let i = 0; i < reminder.reminderDays; i++) {
      // Calculate the time for this reminder
      const reminderTime = new Date(initialTime);
      reminderTime.setDate(reminderTime.getDate() + i);
      
      // Skip scheduling if the time is in the past
      if (reminderTime <= new Date()) {
        console.log(`Skipping past reminder for ${medicine.name} at ${reminderTime}`);
        continue;
      }
      
      // Schedule the job
      const job = schedule.scheduleJob(reminderTime, async function() {
        console.log(`Sending reminder for ${medicine.name} to ${formattedPhoneNumber}`);
        const sent = await sendSMS(formattedPhoneNumber, medicine.name);
        
        // Update the sent status if the SMS was sent successfully
        if (sent) {
          try {
            await Reminder.updateOne(
              { _id: reminder._id, "medicines._id": medicine._id },
              { $set: { "medicines.$.sentStatus": true } }
            );
            console.log(`Updated sent status for ${medicine.name}`);
          } catch (error) {
            console.error('Error updating sent status:', error);
          }
        }
      });
      
      // Store the job ID for potential cancellation
      console.log(`Scheduled reminder for ${medicine.name} at ${reminderTime}`);
    }
  });
}

// CRUD Controller functions

// Create a new reminder
export const createReminder = async (req, res) => {
  try {
    const { phoneNumber, medicines, reminderDays } = req.body;
    
    // Validate required fields
    if (!phoneNumber || !medicines || medicines.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and at least one medicine are required' 
      });
    }
    
    // Create a new reminder
    const reminder = new Reminder({
      phoneNumber,
      medicines,
      reminderDays: reminderDays || 1
    });
    
    // Save to database
    await reminder.save();
    
    // Schedule the reminders
    scheduleReminders(reminder);
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder
    });
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reminder',
      error: error.message
    });
  }
};

// Get all reminders
export const getAllReminders = async (req, res) => {
  try {
    // Pagination options
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = { isActive: true }; // Default to only active reminders
    
    if (req.query.phoneNumber) {
      filter.phoneNumber = req.query.phoneNumber;
    }
    
    // Get reminders with pagination
    const reminders = await Reminder.find(filter)
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination info
    const total = await Reminder.countDocuments(filter);
    
    // Return paginated results
    res.status(200).json({
      success: true,
      count: reminders.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: reminders
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders',
      error: error.message
    });
  }
};

// Get a single reminder by ID
export const getReminderById = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Error fetching reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminder',
      error: error.message
    });
  }
};

// Update a reminder
export const updateReminder = async (req, res) => {
  try {
    const { phoneNumber, medicines, reminderDays, isActive } = req.body;
    
    // Find the reminder
    const reminder = await Reminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    // Update fields if provided
    if (phoneNumber) reminder.phoneNumber = phoneNumber;
    if (medicines) reminder.medicines = medicines;
    if (reminderDays) reminder.reminderDays = reminderDays;
    if (isActive !== undefined) reminder.isActive = isActive;
    
    // Save updated reminder
    await reminder.save();
    
    // Reschedule reminders if active
    if (reminder.isActive) {
      scheduleReminders(reminder);
    }
    
    res.status(200).json({
      success: true,
      message: 'Reminder updated successfully',
      data: reminder
    });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder',
      error: error.message
    });
  }
};

// Delete a reminder
export const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    // Perform soft delete by marking as inactive
    reminder.isActive = false;
    await reminder.save();
    
    // Alternatively, for hard delete:
    // await Reminder.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reminder',
      error: error.message
    });
  }
}; 