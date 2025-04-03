import express from 'express';
import {
  createReminder,
  getAllReminders,
  getReminderById,
  updateReminder,
  deleteReminder
} from '../controllers/reminderController.js';

const router = express.Router();

// Route: /api/reminders
router.route('/')
  .post(createReminder)
  .get(getAllReminders);

// Route: /api/reminders/:id
router.route('/:id')
  .get(getReminderById)
  .put(updateReminder)
  .delete(deleteReminder);

// Route to get reminders by phone number: /api/reminders/phone/:phoneNumber
router.get('/phone/:phoneNumber', (req, res) => {
  // Add the phone number to the query params
  req.query.phoneNumber = req.params.phoneNumber;
  // Call the getAllReminders function
  return getAllReminders(req, res);
});

export default router; 