import mongoose from 'mongoose';

const focusSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  focusMinutes: {
    type: Number,
    default: 0
  },
  sessionsCompleted: {
    type: Number,
    default: 0
  },
  sessionType: {
    type: String,
    enum: ['focus', 'break'],
    default: 'focus'
  },
  achieved: {
    type: Boolean,
    default: false // true if >= 120 minutes (2 hours)
  },
  activeSessionMinutes: {
    type: Number,
    default: 0 // Current active session in progress
  },
  sessionStartTime: {
    type: Date,
    default: null // When the current active session started
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
focusSessionSchema.index({ userId: 1, date: -1 });

// Ensure one document per user per day
focusSessionSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('FocusSession', focusSessionSchema);
