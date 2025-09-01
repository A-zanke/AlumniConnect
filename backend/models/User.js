const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['student', 'teacher', 'alumni', 'admin'], default: 'student' },
  emailVerified: { type: Boolean, default: false },
  department: { type: String },
  year: { type: Number },
  graduationYear: { type: Number },
  avatarUrl: String,
  bio: String,
  location: String,
  college: String,
  specialization: String,
  company: String,
  position: String,
  isPrivate: { type: Boolean, default: false },
  skills: [String],
  socials: {
    linkedin: String,
    twitter: String,
    github: String,
    website: String
  },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  connectionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;