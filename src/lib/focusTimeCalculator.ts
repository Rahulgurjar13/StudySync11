/**
 * Shared utility for calculating current focus time across all components
 * This ensures Timer, Stats, and Calendar all show identical values
 */

export interface FocusTimeCalculation {
  dbMinutes: number;
  activeMinutes: number;
  totalMinutes: number;
  isActive: boolean;
  mode: string;
}

/**
 * Calculate the current focus time by combining database value with active session
 * @param dbMinutes - Completed focus minutes from database
 * @returns FocusTimeCalculation object with breakdown
 */
export function calculateCurrentFocusTime(dbMinutes: number): FocusTimeCalculation {
  let activeMinutes = 0;
  let isActive = false;
  let mode = '';

  try {
    const timerState = localStorage.getItem('pomodoroState');
    if (!timerState) {
      return {
        dbMinutes,
        activeMinutes: 0,
        totalMinutes: dbMinutes,
        isActive: false,
        mode: ''
      };
    }

    const parsed = JSON.parse(timerState);
    isActive = parsed.isActive || false;
    mode = parsed.mode || '';

    // Only count active focus sessions
    if (mode === 'focus' && parsed.sessionStartTime) {
      if (isActive) {
        // Timer is running - calculate from start time
        const now = Date.now();
        const sessionStartTime = parsed.sessionStartTime;
        const sessionDuration = (parsed.focusMinutes || 25) * 60; // in seconds

        // Calculate elapsed time in seconds
        const elapsedMs = now - sessionStartTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);

        // Add any elapsed time from when it was paused
        const pausedElapsed = parsed.elapsedTimeWhenPaused || 0;

        // Cap at session duration to prevent counting overtime
        const totalElapsedSeconds = Math.min(Math.max(0, elapsedSeconds + pausedElapsed), sessionDuration);
        activeMinutes = Math.floor(totalElapsedSeconds / 60);

        console.log('⏱️ FOCUS CALC (ACTIVE):', {
          sessionStart: new Date(sessionStartTime).toLocaleTimeString(),
          now: new Date(now).toLocaleTimeString(),
          elapsedSeconds,
          pausedElapsed,
          totalElapsedSeconds,
          activeMinutes,
          dbMinutes,
          totalMinutes: dbMinutes + activeMinutes
        });
      } else {
        // Timer is paused - use stored elapsed time
        const pausedElapsed = parsed.elapsedTimeWhenPaused || 0;
        activeMinutes = Math.floor(pausedElapsed / 60);

        console.log('⏸️ FOCUS CALC (PAUSED):', {
          pausedElapsed,
          activeMinutes,
          dbMinutes,
          totalMinutes: dbMinutes + activeMinutes
        });
      }
    }
  } catch (error) {
    console.error('Error calculating focus time:', error);
  }

  return {
    dbMinutes,
    activeMinutes,
    totalMinutes: dbMinutes + activeMinutes,
    isActive,
    mode
  };
}

/**
 * Format minutes as "Xh Ym"
 * @param minutes - Total minutes
 * @returns Formatted string like "1h 25m"
 */
export function formatFocusTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format minutes as decimal hours
 * @param minutes - Total minutes
 * @returns Formatted string like "1.4h"
 */
export function formatFocusHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}
