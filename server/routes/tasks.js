import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Partnership from '../models/Partnership.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { awardTaskPoints } from '../utils/pointSystem.js';

const router = express.Router();

// Get all tasks for user (including shared tasks)
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

    // Get user's own tasks and shared tasks
    const tasks = await Task.find({
      $or: [
        { userId: req.user.id },
        { isShared: true, partnershipId: { $in: partnershipIds } }
      ]
    })
    .populate('userId', 'fullName email')
    .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
router.post('/',
  authenticateToken,
  body('title').trim().notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, completed, isShared, partnershipId } = req.body;

      const task = new Task({
        userId: req.user.id,
        title,
        description,
        completed: completed || false,
        isShared: isShared || false,
        partnershipId: partnershipId || null
      });

      await task.save();
      await task.populate('userId', 'fullName email');

      res.status(201).json({ task });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    // Get user's partnerships
    const partnerships = await Partnership.find({
      $or: [
        { user1Id: req.user.id },
        { user2Id: req.user.id }
      ],
      status: 'accepted'
    });

    const partnershipIds = partnerships.map(p => p._id);

    // Find task that user owns or is shared with them
    const task = await Task.findOne({
      _id: id,
      $or: [
        { userId: req.user.id },
        { isShared: true, partnershipId: { $in: partnershipIds } }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Track if completion status changed
    const completionChanged = completed !== undefined && task.completed !== completed;
    const oldCompletedStatus = task.completed;

    // Update fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (completed !== undefined) task.completed = completed;

    await task.save();
    await task.populate('userId', 'fullName email');

    // 🎯 AWARD/DEDUCT POINTS IF COMPLETION STATUS CHANGED (Anti-cheat built-in)
    let pointsResult = null;
    if (completionChanged) {
      try {
        pointsResult = await awardTaskPoints(
          req.user.id,
          task._id.toString(),
          completed
        );
        
        if (pointsResult.success) {
          const action = completed ? 'awarded' : 'deducted';
          console.log(`[POINTS] ${action} ${Math.abs(pointsResult.points)} points for task: ${task.title}`);
        } else {
          console.log(`[POINTS] Not ${completed ? 'awarded' : 'deducted'}: ${pointsResult.reason}`);
        }
      } catch (pointError) {
        console.error('[POINTS] Error processing points:', pointError);
        // Don't fail the request if points fail
      }
    }

    res.json({ 
      task,
      points: pointsResult?.success ? {
        awarded: pointsResult.points,
        newBalance: pointsResult.newBalance,
        level: pointsResult.level,
        reason: pointsResult.reason
      } : (pointsResult ? { reason: pointsResult.reason } : null)
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
