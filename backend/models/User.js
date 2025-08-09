const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  role: String,
  avatarUrl: String,
  bio: String,
  college: String,
  specialization: String,
  company: String,
  position: String,
  isPrivate: Boolean,
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