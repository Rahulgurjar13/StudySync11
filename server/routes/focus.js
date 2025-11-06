import express from 'express';
import FocusSession from '../models/FocusSession.js';
import { authenticateToken } from '../middleware/auth.js';
import { awardFocusSessionPoints, awardStreakBonus } from '../utils/pointSystem.js';

const router = express.Router();

// Get focus data for a specific month
router.get('/month/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(parseInt(year), parseInt(month), 1);
    const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);

    const sessions = await FocusSession.find({
      userId: req.user.id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    res.json({ sessions });
  } catch (error) {
    console.error('Get month data error:', error);
    res.status(500).json({ error: 'Failed to fetch month data' });
  }
});

// Get all focus data
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const sessions = await FocusSession.find({ userId: req.user.id }).sort({ date: -1 });
    res.json({ sessions });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ error: 'Failed to fetch all data' });
  }
});

// Record a completed focus session
router.post('/session', authenticateToken, async (req, res) => {
  try {
    const { focusMinutes, sessionType } = req.body;

    if (!focusMinutes || focusMinutes < 0) {
      return res.status(400).json({ error: 'Invalid focus time' });
    }

    // Get today's date (normalized to start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's focus session
    let focusSession = await FocusSession.findOne({
      userId: req.user.id,
      date: today
    });

    if (focusSession) {
      // CRITICAL: When completing a session, the active session minutes need to be finalized
      // If there was an active session being auto-saved, clear it and add the full session time
      const previousCompleted = focusSession.focusMinutes;
      const previousActive = focusSession.activeSessionMinutes;
      
      // Update: ADD new completed session minutes to existing completed total
      focusSession.focusMinutes = previousCompleted + focusMinutes;
      focusSession.sessionsCompleted += 1;
      focusSession.activeSessionMinutes = 0; // Clear active session since it's now completed
      focusSession.achieved = focusSession.focusMinutes >= 120;
      
      console.log('[FOCUS] Session completion - merging:', {
        previousCompleted,
        previousActive,
        newSessionMinutes: focusMinutes,
        newTotal: focusSession.focusMinutes,
        clearedActive: previousActive
      });
    } else {
      // Create new session
      focusSession = new FocusSession({
        userId: req.user.id,
        date: today,
        focusMinutes: focusMinutes,
        sessionsCompleted: 1,
        sessionType: sessionType || 'focus',
        achieved: focusMinutes >= 120,
        activeSessionMinutes: 0
      });
      
      console.log('[FOCUS] First session of the day:', {
        sessionMinutes: focusMinutes
      });
    }

    await focusSession.save();

    console.log('[FOCUS] Session completed for user ' + req.user.id + ':', {
      sessionMinutes: focusMinutes,
      totalCompleted: focusSession.focusMinutes,
      sessionsCount: focusSession.sessionsCompleted,
      activeCleared: true
    });

    // Award points for focus session
    let pointsResult = null;
    try {
      pointsResult = await awardFocusSessionPoints(
        req.user.id,
        focusSession._id.toString(),
        focusMinutes
      );
      
      if (pointsResult.success) {
        console.log('[POINTS] Awarded ' + pointsResult.points + ' XP for focus session');
      } else {
        console.log('[POINTS] ' + pointsResult.message);
      }
    } catch (pointError) {
      console.error('[POINTS] Error awarding points:', pointError);
    }

    res.json({ 
      session: focusSession,
      focusMinutes: focusSession.focusMinutes,
      sessionsCompleted: focusSession.sessionsCompleted,
      achieved: focusSession.achieved,
      message: 'Focus session recorded successfully',
      points: pointsResult?.success ? {
        awarded: pointsResult.points,
        newBalance: pointsResult.newBalance,
        level: pointsResult.level
      } : null
    });
  } catch (error) {
    console.error('Record focus session error:', error);
    res.status(500).json({ error: 'Failed to record focus session' });
  }
});

// Get current streak
router.get('/streak', authenticateToken, async (req, res) => {
  try {
    const sessions = await FocusSession.find({
      userId: req.user.id,
      achieved: true
    }).sort({ date: -1 });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate = null;

    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      
      if (previousDate === null) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        const dayDiff = Math.floor((previousDate - sessionDate) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          tempStreak++;
          if (currentStreak > 0) {
            currentStreak++;
          }
        } else {
          tempStreak = 1;
          if (currentStreak > 0) {
            currentStreak = 0;
          }
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      previousDate = sessionDate;
    }

    res.json({ 
      currentStreak,
      longestStreak,
      totalDaysAchieved: sessions.length
    });
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({ error: 'Failed to calculate streak' });
  }
});

// Get monthly stats
router.get('/stats/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(parseInt(year), parseInt(month), 1);
    const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);

    const sessions = await FocusSession.find({
      userId: req.user.id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.focusMinutes, 0);
    const totalSessions = sessions.reduce((sum, s) => sum + s.sessionsCompleted, 0);
    const daysAchieved = sessions.filter(s => s.achieved).length;

    res.json({
      totalMinutes,
      totalSessions,
      daysAchieved,
      totalDays: sessions.length
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
});

// Get today's progress
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('[FOCUS] /today - Fetching progress for user:', req.user.id, 'date:', today.toISOString());

    const focusSession = await FocusSession.findOne({
      userId: req.user.id,
      date: today
    });

    if (focusSession) {
      console.log('[FOCUS] /today - Found session:', {
        id: focusSession._id,
        focusMinutes: focusSession.focusMinutes,
        sessionsCompleted: focusSession.sessionsCompleted,
        activeSessionMinutes: focusSession.activeSessionMinutes
      });
    } else {
      console.log('[FOCUS] /today - No session found for today');
    }

    const completedMinutes = focusSession?.focusMinutes || 0;
    const sessionsCompleted = focusSession?.sessionsCompleted || 0;
    const activeSessionMinutes = focusSession?.activeSessionMinutes || 0;
    const lastUpdated = focusSession?.lastUpdated || null;
    const sessionStartTime = focusSession?.sessionStartTime || null;
    
    // Total is completed + active (both from database)
    const totalMinutes = completedMinutes + activeSessionMinutes;
    const achieved = totalMinutes >= 120;

    console.log('[FOCUS] Today progress for user ' + req.user.id + ':', {
      completedMinutes,
      activeMinutes: activeSessionMinutes,
      totalMinutes,
      sessionsCompleted,
      achieved,
      lastUpdated,
      sessionStartTime,
      date: today.toISOString()
    });

    res.json({
      focusMinutes: completedMinutes, // Completed sessions only
      completedMinutes: completedMinutes, // Alias for clarity
      activeMinutes: activeSessionMinutes, // Current active session progress
      sessionsCompleted,
      achieved,
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      sessionStartTime: sessionStartTime ? sessionStartTime.toISOString() : null,
      date: today.toISOString()
    });
  } catch (error) {
    console.error('Get today progress error:', error);
    res.status(500).json({ error: 'Failed to fetch today progress' });
  }
});

// Auto-save active session in real-time
router.post('/active-session', authenticateToken, async (req, res) => {
  try {
    const { elapsedMinutes, activeMinutes, sessionStartTime } = req.body;
    
    const minutesToSave = activeMinutes !== undefined ? activeMinutes : elapsedMinutes;
    
    if (minutesToSave === undefined || minutesToSave < 0) {
      return res.status(400).json({ error: 'Invalid elapsed time' });
    }

    console.log('[FOCUS] Saving active session for user ' + req.user.id + ':', {
      activeMinutes: minutesToSave,
      sessionStartTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : 'not provided'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let focusSession = await FocusSession.findOne({
      userId: req.user.id,
      date: today
    });

    if (focusSession) {
      // CRITICAL FIX: Update ONLY activeSessionMinutes, keep completed focusMinutes intact
      focusSession.activeSessionMinutes = minutesToSave;
      const totalMinutes = focusSession.focusMinutes + focusSession.activeSessionMinutes;
      focusSession.achieved = totalMinutes >= 120;
      focusSession.lastUpdated = new Date();
      
      // Save session start time if provided
      if (sessionStartTime) {
        focusSession.sessionStartTime = new Date(sessionStartTime);
      }
      
      console.log('[FOCUS] Updating existing session:', {
        completedMinutes: focusSession.focusMinutes,
        newActiveMinutes: minutesToSave,
        totalMinutes: totalMinutes,
        sessionStartTime: focusSession.sessionStartTime
      });
    } else {
      // First session of the day - create new record with active minutes only
      focusSession = new FocusSession({
        userId: req.user.id,
        date: today,
        focusMinutes: 0, // No completed sessions yet
        activeSessionMinutes: minutesToSave, // Current active session progress
        sessionsCompleted: 0,
        achieved: minutesToSave >= 120,
        sessionType: 'focus',
        lastUpdated: new Date(),
        sessionStartTime: sessionStartTime ? new Date(sessionStartTime) : new Date()
      });
      
      console.log('[FOCUS] Creating new session:', {
        completedMinutes: 0,
        activeMinutes: minutesToSave,
        totalMinutes: minutesToSave,
        sessionStartTime: focusSession.sessionStartTime
      });
    }

    await focusSession.save();

    const totalMinutes = focusSession.focusMinutes + focusSession.activeSessionMinutes;

    console.log('[FOCUS] Active session saved successfully:', {
      completedMinutes: focusSession.focusMinutes,
      activeMinutes: focusSession.activeSessionMinutes,
      totalMinutes: totalMinutes,
      sessionStartTime: focusSession.sessionStartTime
    });

    res.json({
      success: true,
      focusMinutes: focusSession.focusMinutes,
      activeMinutes: focusSession.activeSessionMinutes,
      totalMinutes: totalMinutes,
      sessionStartTime: focusSession.sessionStartTime ? focusSession.sessionStartTime.toISOString() : null,
      message: 'Active session saved'
    });
  } catch (error) {
    console.error('Save active session error:', error);
    res.status(500).json({ error: 'Failed to save active session' });
  }
});

export default router;
