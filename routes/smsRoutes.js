const express = require('express');
const router = express.Router(); // Initialize the router
const PhoneNumber = require('../models/PhoneNumber'); // Import your Mongoose model if necessary
const client = require('../config/twilioClient'); // Import your Twilio client setup

// Your route code
router.post('/send-sms', async (req, res) => {
    const { number, message } = req.body;

    try {
        if (!number || !message) {
            return res.status(400).json({ success: false, error: 'Number and message are required' });
        }

        const newNumber = new PhoneNumber({ number, message });
        await newNumber.save();

        const messageResponse = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: number
        });

        res.status(200).json({ success: true, data: messageResponse });
    } catch (error) {
        console.error('Error occurred:', error);

        if (error.name === 'ValidationError') {
            res.status(400).json({ success: false, error: 'Validation Error: ' + error.message });
        } else {
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
});

// Export the router
module.exports = router;
