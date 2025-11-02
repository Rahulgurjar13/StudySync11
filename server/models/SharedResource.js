import mongoose from 'mongoose';

const sharedResourceSchema = new mongoose.Schema({
  partnershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partnership',
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
  url: {
    type: String,
    trim: true
  },
  resourceType: {
    type: String,
    enum: ['link', 'file', 'note', 'image'],
    default: 'link'
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
sharedResourceSchema.index({ partnershipId: 1 });

export default mongoose.model('SharedResource', sharedResourceSchema);
