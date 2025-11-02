import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserPointHistory, getXPForNextLevel } from '../utils/pointSystem.js';
import User from '../models/User.js';
import PointTransaction from '../models/PointTransaction.js';

const router = express.Router();

// Get current user's points and level
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentXP = user.profile.xp || 0;
    const currentLevel = user.profile.level || 1;
    const xpForNextLevel = getXPForNextLevel(currentLevel);
    const xpInCurrentLevel = currentXP - (currentLevel > 1 ? Math.pow(currentLevel - 1, 2) * 100 : 0);
    const xpNeededForLevel = xpForNextLevel - (currentLevel > 1 ? Math.pow(currentLevel - 1, 2) * 100 : 0);
    const progressToNextLevel = (xpInCurrentLevel / xpNeededForLevel) * 100;

    res.json({
      xp: currentXP,
      level: currentLevel,
      xpForNextLevel,
      xpInCurrentLevel,
      xpNeededForLevel,
      progressToNextLevel: Math.min(100, Math.max(0, progressToNextLevel))
    });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ error: 'Failed to fetch points' });
  }
});

// Get point transaction history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await getUserPointHistory(req.user.id, limit);

    res.json({ transactions });
  } catch (error) {
    console.error('Get point history error:', error);
    res.status(500).json({ error: 'Failed to fetch point history' });
  }
});

// Get point statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total points earned
    const earnedTransactions = await PointTransaction.find({
      userId,
      points: { $gt: 0 }
    });
    const totalEarned = earnedTransactions.reduce((sum, t) => sum + t.points, 0);

    // Get total points lost
    const lostTransactions = await PointTransaction.find({
      userId,
      points: { $lt: 0 }
    });
    const totalLost = Math.abs(lostTransactions.reduce((sum, t) => sum + t.points, 0));

    // Get points by type
    const pointsByType = await PointTransaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$points' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTransactions = await PointTransaction.find({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });
    const recentPoints = recentTransactions.reduce((sum, t) => sum + t.points, 0);

    res.json({
      totalEarned,
      totalLost,
      netPoints: totalEarned - totalLost,
      pointsByType,
      last7Days: recentPoints,
      transactionCount: earnedTransactions.length + lostTransactions.length
    });
  } catch (error) {
    console.error('Get point stats error:', error);
    res.status(500).json({ error: 'Failed to fetch point statistics' });
  }
});

// Get leaderboard (top users by XP)
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const topUsers = await User.find()
      .select('fullName profile.xp profile.level')
      .sort({ 'profile.xp': -1 })
      .limit(limit)
      .lean();

    // Find current user's rank
    const currentUser = await User.findById(req.user.id);
    const usersAbove = await User.countDocuments({
      'profile.xp': { $gt: currentUser.profile.xp }
    });
    const userRank = usersAbove + 1;

    res.json({
      leaderboard: topUsers.map((user, index) => ({
        rank: index + 1,
        fullName: user.fullName,
        xp: user.profile?.xp || 0,
        level: user.profile?.level || 1
      })),
      currentUserRank: userRank,
      currentUserXP: currentUser.profile?.xp || 0,
      currentUserLevel: currentUser.profile?.level || 1
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
