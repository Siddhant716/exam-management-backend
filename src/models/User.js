const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['academy','exam_manager','judge','participant'], 
    default: 'participant' 
  },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function(next){
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = function(candidate){
  return bcrypt.compare(candidate, this.password);
};


module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
