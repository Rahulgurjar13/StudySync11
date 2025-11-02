import mongoose from 'mongoose';

const pomodoroSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

pomodoroSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PomodoroSession', pomodoroSessionSchema);
