const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['registration', 'login'], default: 'registration' },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false }
}, { timestamps: true });

otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model('Otp', otpSchema);

