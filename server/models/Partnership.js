import mongoose from 'mongoose';

const partnershipSchema = new mongoose.Schema({
  user1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acceptedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure unique partnerships
partnershipSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });

export default mongoose.model('Partnership', partnershipSchema);
