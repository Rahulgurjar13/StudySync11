import mongoose from 'mongoose';

const pointTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'FOCUS_SESSION_COMPLETED',
      'TASK_COMPLETED',
      'TASK_UNCOMPLETED',  // Negative points for unchecking
      'DAILY_STREAK',
      'WEEKLY_GOAL',
      'PARTNERSHIP_CREATED',
      'ADMIN_ADJUSTMENT'
    ]
  },
  reason: {
    type: String,
    required: true
  },
  metadata: {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    focusSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FocusSession'
    },
    focusMinutes: Number,
    streakDays: Number,
    previousBalance: Number,
    newBalance: Number
  },
  // Anti-cheat: Track when points were awarded
  awardedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
pointTransactionSchema.index({ userId: 1, createdAt: -1 });
pointTransactionSchema.index({ type: 1, userId: 1 });
pointTransactionSchema.index({ 'metadata.taskId': 1 });
pointTransactionSchema.index({ 'metadata.focusSessionId': 1 });

export default mongoose.model('PointTransaction', pointTransactionSchema);
