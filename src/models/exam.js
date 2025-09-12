const mongoose = require('mongoose');

// Level Schema
const LevelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  scoringMethod: { type: String, enum: ['boolean', 'dressage', 'percentage'], default: 'percentage' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scores: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Exam Schema
const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  center: String,
  venue: String,
  startAt: Date,
  endAt: Date,
  imageUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'open', 'published'], default: 'draft' },

  judges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  levels: [LevelSchema]
}, { timestamps: true });

module.exports = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
