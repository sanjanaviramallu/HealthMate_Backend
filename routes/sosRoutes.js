import express from 'express';
import { sendSOS } from '../controllers/sosController.js';

const router = express.Router();

// Send SOS messages
router.post('/send-sos', sendSOS);

export default router; 