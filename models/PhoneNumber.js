const mongoose = require('mongoose');

const phoneNumberSchema = new mongoose.Schema({
    number: { type: String, required: true }, // Remove `unique: true` if present
    message: { type: String, required: true }
  });
module.exports = mongoose.model('PhoneNumber', phoneNumberSchema);
