// Simple script to test Twilio SMS sending
import dotenv from 'dotenv';
import twilio from 'twilio';

// Load environment variables
dotenv.config();

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Log configuration
console.log('Twilio Configuration:');
console.log(`- Account SID: ${accountSid ? `${accountSid.substring(0, 8)}...` : 'Missing'}`);
console.log(`- Auth Token: ${authToken ? 'Present' : 'Missing'}`);
console.log(`- Phone Number: ${twilioNumber || 'Missing'}`);

// Create Twilio client
if (!accountSid || !authToken || !twilioNumber) {
  console.error('Missing Twilio credentials. Please check your .env file.');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

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

// Test phone number - replace with a real number for testing
const testPhoneNumber = formatPhoneNumber('8121785809'); // Replace with your test number

console.log(`Formatted test phone number: ${testPhoneNumber}`);

// Send a test SMS
async function sendTestSMS() {
  try {
    console.log(`Attempting to send SMS to ${testPhoneNumber}...`);
    console.log(`Using Twilio number: ${twilioNumber}`);
    
    const message = await client.messages.create({
      body: 'This is a test message from your medication reminder system.',
      from: twilioNumber,
      to: testPhoneNumber
    });
    
    console.log('Success! SMS sent with SID:', message.sid);
  } catch (error) {
    console.error('Error sending SMS:');
    console.error(`- Code: ${error.code}`);
    console.error(`- Message: ${error.message}`);
    console.error(`- More Info: ${error.moreInfo || 'None provided'}`);
    
    if (error.code === 20003) {
      console.error('\nAuthentication Error: Your Twilio credentials are invalid or expired.');
      console.error('Please check your account on https://www.twilio.com/console');
    } else if (error.code === 21211) {
      console.error('\nInvalid Phone Number: The phone number you\'re trying to send to is invalid.');
    } else if (error.code === 21659) {
      console.error('\nCountry Code Mismatch: The "from" phone number country does not match the "to" phone number country.');
      console.error('Suggestion: Use a Twilio phone number from the same country as the recipient or use a Twilio verified caller ID');
      console.error('\nTo fix this:');
      console.error('1. Go to your Twilio console: https://www.twilio.com/console/phone-numbers');
      console.error('2. Purchase a phone number from the same country as your recipient');
      console.error('3. Or, add the recipient\'s number as a verified caller ID: https://www.twilio.com/console/phone-numbers/verified');
    }
  }
}

// Run the test
sendTestSMS(); 