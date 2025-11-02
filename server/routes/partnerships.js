import express from 'express';
import { body, validationResult } from 'express-validator';
import Partnership from '../models/Partnership.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's partnerships
router.get('/', authenticateToken, async (req, res) => {
  try {
    const partnerships = await Partnership.find({
      $or: [
        { user1Id: req.user.id },
        { user2Id: req.user.id }
      ],
      status: 'accepted'
    })
    .populate('user1Id', 'email fullName profile')
    .populate('user2Id', 'email fullName profile')
    .sort({ createdAt: -1 });

    res.json({ partnerships });
  } catch (error) {
    console.error('Get partnerships error:', error);
    res.status(500).json({ error: 'Failed to fetch partnerships' });
  }
});

// Get pending partnership requests (received by current user)
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const pendingRequests = await Partnership.find({
      user2Id: req.user.id,
      status: 'pending'
    })
    .populate('user1Id', 'email fullName profile')
    .populate('requestedBy', 'email fullName profile')
    .sort({ createdAt: -1 });

    res.json({ pendingRequests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Get sent partnership requests (sent by current user)
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const sentRequests = await Partnership.find({
      user1Id: req.user.id,
      status: 'pending'
    })
    .populate('user2Id', 'email fullName profile')
    .sort({ createdAt: -1 });

    res.json({ sentRequests });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
});

// Create partnership
router.post('/',
  authenticateToken,
  body('partnerEmail').isEmail().normalizeEmail(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { partnerEmail } = req.body;

      // Find partner by email
      const partner = await User.findOne({ email: partnerEmail.toLowerCase() });

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found. They need to sign up first.' });
      }

      if (partner._id.toString() === req.user.id) {
        return res.status(400).json({ error: 'You cannot partner with yourself' });
      }

      // Check if partnership already exists
      const existingPartnership = await Partnership.findOne({
        $or: [
          { user1Id: req.user.id, user2Id: partner._id },
          { user1Id: partner._id, user2Id: req.user.id }
        ]
      });

      if (existingPartnership) {
        if (existingPartnership.status === 'pending') {
          return res.status(400).json({ error: 'Partnership request already sent' });
        }
        return res.status(400).json({ error: 'Partnership already exists' });
      }

      // Create partnership request (pending)
      const partnership = new Partnership({
        user1Id: req.user.id,
        user2Id: partner._id,
        requestedBy: req.user.id,
        status: 'pending'
      });

      await partnership.save();
      await partnership.populate('user1Id user2Id', 'email fullName profile');

      res.status(201).json({ 
        partnership,
        message: 'Partnership request sent successfully'
      });
    } catch (error) {
      console.error('Create partnership error:', error);
      res.status(500).json({ error: 'Failed to create partnership' });
    }
  }
);

// Accept partnership request
router.put('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find pending partnership where current user is user2 (receiver)
    const partnership = await Partnership.findOne({
      _id: id,
      user2Id: req.user.id,
      status: 'pending'
    });

    if (!partnership) {
      return res.status(404).json({ error: 'Partnership request not found' });
    }

    // Update status to accepted
    partnership.status = 'accepted';
    partnership.acceptedAt = new Date();
    await partnership.save();

    await partnership.populate('user1Id user2Id', 'email fullName profile');

    res.json({ 
      partnership,
      message: 'Partnership request accepted!'
    });
  } catch (error) {
    console.error('Accept partnership error:', error);
    res.status(500).json({ error: 'Failed to accept partnership' });
  }
});

// Decline partnership request
router.put('/:id/decline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find pending partnership where current user is user2 (receiver)
    const partnership = await Partnership.findOne({
      _id: id,
      user2Id: req.user.id,
      status: 'pending'
    });

    if (!partnership) {
      return res.status(404).json({ error: 'Partnership request not found' });
    }

    // Update status to declined
    partnership.status = 'declined';
    await partnership.save();

    res.json({ 
      message: 'Partnership request declined'
    });
  } catch (error) {
    console.error('Decline partnership error:', error);
    res.status(500).json({ error: 'Failed to decline partnership' });
  }
});

// Delete partnership
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const partnership = await Partnership.findOneAndDelete({
      _id: id,
      $or: [
        { user1Id: req.user.id },
        { user2Id: req.user.id }
      ]
    });

    if (!partnership) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    res.json({ message: 'Partnership deleted successfully' });
  } catch (error) {
    console.error('Delete partnership error:', error);
    res.status(500).json({ error: 'Failed to delete partnership' });
  }
});

export default router;
