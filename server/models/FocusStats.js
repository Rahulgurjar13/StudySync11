import mongoose from 'mongoose';

const focusStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  totalMinutes: {
    type: Number,
    default: 0
  },
  sessionsCompleted: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure unique user+date combination
focusStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('FocusStats', focusStatsSchema);
