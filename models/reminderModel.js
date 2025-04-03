import mongoose from 'mongoose';

// Define the schema for a single medicine
const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: Date,
    required: true
  },
  // To track if reminder has been sent
  sentStatus: {
    type: Boolean,
    default: false
  },
  // For recurring reminders (daily/weekly/etc)
  recurrence: {
    type: String,
    enum: ['once', 'daily', 'weekly'],
    default: 'once'
  }
});

// Define the main reminder schema
const reminderSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  medicines: [medicineSchema],
  reminderDays: {
    type: Number,
    default: 1,
    min: 1,
    max: 30
  },
  // For tracking when reminders were created and last updated
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // To mark reminders as active or inactive
  isActive: {
    type: Boolean,
    default: true
  }
});

// Auto-update the "updatedAt" field before saving
reminderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create and export the Reminder model
const Reminder = mongoose.model('Reminder', reminderSchema);
export default Reminder; 