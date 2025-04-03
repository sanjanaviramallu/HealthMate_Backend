const express = require('express');
const router = express.Router();
const HeartRate = require('../models/HeartRate');

// POST route to save heart rate data
router.post('/heartrate', async (req, res) => {
    const { rate } = req.body;
    try {
        const newHeartRate = new HeartRate({ rate });
        await newHeartRate.save();
        res.status(201).json({ message: "Heart rate saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error saving heart rate" });
    }
});

module.exports = router;
