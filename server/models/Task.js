import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  partnershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership'
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ partnershipId: 1, isShared: 1 });

export default mongoose.model('Task', taskSchema);
