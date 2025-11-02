import PointTransaction from '../models/PointTransaction.js';
import User from '../models/User.js';
import Task from '../models/Task.js';

/**
 * Point System Rules (Anti-Cheat Design)
 * 
 * Focus Sessions:
 * - 1 point per minute of focused work (verified through backend session tracking)
 * - Minimum 5 minutes to earn points (prevents gaming with quick toggles)
 * - Points awarded ONLY when session completes successfully
 * 
 * Tasks:
 * - 10 points for completing a task (first time only)
 * - -5 points penalty for unchecking a completed task (prevents tick/untick abuse)
 * - Task must be completed for at least 5 minutes before points are locked in
 * 
 * Streaks:
 * - 50 points bonus for maintaining 7-day streak
 * - 100 points bonus for maintaining 30-day streak
 * 
 * Partnerships:
 * - 25 points for creating first partnership
 */

const POINT_RULES = {
  FOCUS_PER_MINUTE: 1,
  FOCUS_MINIMUM_MINUTES: 5,
  TASK_COMPLETION: 10,
  TASK_UNCOMPLETION_PENALTY: -5,
  TASK_LOCK_DURATION: 5 * 60 * 1000, // 5 minutes in ms
  STREAK_7_DAYS: 50,
  STREAK_30_DAYS: 100,
  PARTNERSHIP_BONUS: 25
};

/**
 * Award points for a focus session
 * @param {string} userId - User ID
 * @param {string} focusSessionId - Focus Session ID
 * @param {number} focusMinutes - Minutes of focus time
 * @returns {Promise<Object>} Transaction result
 */
export async function awardFocusSessionPoints(userId, focusSessionId, focusMinutes) {
  try {
    // Anti-cheat: Minimum session duration
    if (focusMinutes < POINT_RULES.FOCUS_MINIMUM_MINUTES) {
      return {
        success: false,
        reason: `Minimum ${POINT_RULES.FOCUS_MINIMUM_MINUTES} minutes required to earn points`
      };
    }

    // Anti-cheat: Check if points already awarded for this session
    const existingTransaction = await PointTransaction.findOne({
      userId,
      'metadata.focusSessionId': focusSessionId
    });

    if (existingTransaction) {
      return {
        success: false,
        reason: 'Points already awarded for this session'
      };
    }

    // Calculate points
    const points = Math.floor(focusMinutes * POINT_RULES.FOCUS_PER_MINUTE);

    // Get current user balance
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const previousBalance = user.profile.xp || 0;
    const newBalance = previousBalance + points;

    // Create transaction
    const transaction = new PointTransaction({
      userId,
      points,
      type: 'FOCUS_SESSION_COMPLETED',
      reason: `Completed ${focusMinutes} minutes of focus time`,
      metadata: {
        focusSessionId,
        focusMinutes,
        previousBalance,
        newBalance
      }
    });

    await transaction.save();

    // Update user XP
    user.profile.xp = newBalance;
    user.profile.level = calculateLevel(newBalance);
    await user.save();

    return {
      success: true,
      points,
      newBalance,
      level: user.profile.level,
      transaction
    };
  } catch (error) {
    console.error('Award focus session points error:', error);
    throw error;
  }
}

/**
 * Award points for task completion (with anti-cheat)
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {boolean} completed - New completion status
 * @returns {Promise<Object>} Transaction result
 */
export async function awardTaskPoints(userId, taskId, completed) {
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Get current user balance
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const previousBalance = user.profile.xp || 0;
    let points = 0;
    let type = '';
    let reason = '';

    if (completed) {
      // Check if points already awarded for this task completion
      const existingCompletionTransaction = await PointTransaction.findOne({
        userId,
        'metadata.taskId': taskId,
        type: 'TASK_COMPLETED'
      });

      // Check if this task was uncompleted recently (within lock duration)
      const recentUncompletion = await PointTransaction.findOne({
        userId,
        'metadata.taskId': taskId,
        type: 'TASK_UNCOMPLETED',
        createdAt: { $gte: new Date(Date.now() - POINT_RULES.TASK_LOCK_DURATION) }
      });

      if (recentUncompletion) {
        return {
          success: false,
          reason: 'Task was uncompleted recently. Wait 5 minutes to earn points again.'
        };
      }

      if (existingCompletionTransaction) {
        return {
          success: false,
          reason: 'Points already awarded for this task'
        };
      }

      points = POINT_RULES.TASK_COMPLETION;
      type = 'TASK_COMPLETED';
      reason = `Completed task: ${task.title}`;
    } else {
      // Unchecking a task - apply penalty
      const existingCompletionTransaction = await PointTransaction.findOne({
        userId,
        'metadata.taskId': taskId,
        type: 'TASK_COMPLETED'
      });

      if (!existingCompletionTransaction) {
        return {
          success: false,
          reason: 'No points to deduct - task was never completed'
        };
      }

      // Check if task was completed long enough ago (anti-rapid-toggle)
      const completionAge = Date.now() - existingCompletionTransaction.createdAt.getTime();
      if (completionAge < POINT_RULES.TASK_LOCK_DURATION) {
        return {
          success: false,
          reason: 'Task must be completed for at least 5 minutes before you can uncheck it'
        };
      }

      points = POINT_RULES.TASK_UNCOMPLETION_PENALTY;
      type = 'TASK_UNCOMPLETED';
      reason = `Uncompleted task: ${task.title}`;
    }

    const newBalance = previousBalance + points;

    // Create transaction
    const transaction = new PointTransaction({
      userId,
      points,
      type,
      reason,
      metadata: {
        taskId,
        previousBalance,
        newBalance
      }
    });

    await transaction.save();

    // Update user XP
    user.profile.xp = Math.max(0, newBalance); // Don't go below 0
    user.profile.level = calculateLevel(user.profile.xp);
    await user.save();

    return {
      success: true,
      points,
      newBalance: user.profile.xp,
      level: user.profile.level,
      transaction
    };
  } catch (error) {
    console.error('Award task points error:', error);
    throw error;
  }
}

/**
 * Award streak bonus points
 * @param {string} userId - User ID
 * @param {number} streakDays - Number of consecutive days
 * @returns {Promise<Object>} Transaction result
 */
export async function awardStreakBonus(userId, streakDays) {
  try {
    let points = 0;
    let reason = '';

    if (streakDays === 7) {
      points = POINT_RULES.STREAK_7_DAYS;
      reason = '7-day focus streak bonus!';
    } else if (streakDays === 30) {
      points = POINT_RULES.STREAK_30_DAYS;
      reason = '30-day focus streak bonus!';
    } else {
      return {
        success: false,
        reason: 'No streak bonus for this day count'
      };
    }

    // Check if bonus already awarded for this streak
    const existingBonus = await PointTransaction.findOne({
      userId,
      type: 'DAILY_STREAK',
      'metadata.streakDays': streakDays,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (existingBonus) {
      return {
        success: false,
        reason: 'Streak bonus already awarded today'
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const previousBalance = user.profile.xp || 0;
    const newBalance = previousBalance + points;

    const transaction = new PointTransaction({
      userId,
      points,
      type: 'DAILY_STREAK',
      reason,
      metadata: {
        streakDays,
        previousBalance,
        newBalance
      }
    });

    await transaction.save();

    user.profile.xp = newBalance;
    user.profile.level = calculateLevel(newBalance);
    await user.save();

    return {
      success: true,
      points,
      newBalance,
      level: user.profile.level,
      transaction
    };
  } catch (error) {
    console.error('Award streak bonus error:', error);
    throw error;
  }
}

/**
 * Get user's point history
 * @param {string} userId - User ID
 * @param {number} limit - Number of transactions to return
 * @returns {Promise<Array>} Point transactions
 */
export async function getUserPointHistory(userId, limit = 50) {
  try {
    const transactions = await PointTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('metadata.taskId', 'title')
      .lean();

    return transactions;
  } catch (error) {
    console.error('Get user point history error:', error);
    throw error;
  }
}

/**
 * Calculate user level based on XP
 * @param {number} xp - Experience points
 * @returns {number} User level
 */
function calculateLevel(xp) {
  // Level formula: Level = floor(sqrt(XP / 100))
  // Level 1: 0-99 XP
  // Level 2: 100-399 XP
  // Level 3: 400-899 XP
  // Level 4: 900-1599 XP
  // etc.
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculate XP needed for next level
 * @param {number} currentLevel - Current level
 * @returns {number} XP needed
 */
export function getXPForNextLevel(currentLevel) {
  return Math.pow(currentLevel, 2) * 100;
}

export { POINT_RULES };
