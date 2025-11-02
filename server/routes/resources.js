import express from 'express';
import { body, validationResult } from 'express-validator';
import SharedResource from '../models/SharedResource.js';
import Partnership from '../models/Partnership.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get shared resources
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user's partnerships
    const partnerships = await Partnership.find({
      $or: [
        { user1Id: req.user.id },
        { user2Id: req.user.id }
      ],
      status: 'accepted'
    });

    const partnershipIds = partnerships.map(p => p._id);

    // Get resources for these partnerships
    const resources = await SharedResource.find({
      partnershipId: { $in: partnershipIds }
    })
    .populate('sharedBy', 'fullName email')
    .sort({ createdAt: -1 });

    res.json({ resources });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Create shared resource
router.post('/',
  authenticateToken,
  body('title').trim().notEmpty(),
  body('partnershipId').notEmpty(),
  body('resourceType').isIn(['link', 'file', 'note', 'image']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, url, resourceType, partnershipId } = req.body;

      // Verify partnership exists and user is part of it
      const partnership = await Partnership.findOne({
        _id: partnershipId,
        $or: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'accepted'
      });

      if (!partnership) {
        return res.status(403).json({ error: 'Invalid partnership or access denied' });
      }

      const resource = new SharedResource({
        partnershipId,
        title,
        description,
        url,
        resourceType,
        sharedBy: req.user.id
      });

      await resource.save();
      await resource.populate('sharedBy', 'fullName email');

      res.status(201).json({ resource });
    } catch (error) {
      console.error('Create resource error:', error);
      res.status(500).json({ error: 'Failed to create resource' });
    }
  }
);

// Delete shared resource
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's partnerships
    const partnerships = await Partnership.find({
      $or: [
        { user1Id: req.user.id },
        { user2Id: req.user.id }
      ],
      status: 'accepted'
    });

    const partnershipIds = partnerships.map(p => p._id);

    // Delete resource if user is sharer or part of partnership
    const resource = await SharedResource.findOneAndDelete({
      _id: id,
      $or: [
        { sharedBy: req.user.id },
        { partnershipId: { $in: partnershipIds } }
      ]
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found or access denied' });
    }

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
