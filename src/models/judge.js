const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['academy', 'exam_manager', 'judge', 'participant'], 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
