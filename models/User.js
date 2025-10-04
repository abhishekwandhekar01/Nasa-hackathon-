const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true // Each username must be unique
  },
  password: {
    type: String,
    required: true
  },
  xp: {
    type: Number,
    default: 0 // Users start with 0 XP
  },
  level: {
    type: Number,
    default: 1 // Users start at level 1
  }
});

// This special function runs BEFORE a user is saved to the database
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's new or has been changed
  if (!this.isModified('password')) {
    return next();
  }
  
  // Generate a 'salt' and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', UserSchema);