const mongoose = require('mongoose');

const HeartRateSchema = new mongoose.Schema({
    rate: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('HeartRate', HeartRateSchema);
