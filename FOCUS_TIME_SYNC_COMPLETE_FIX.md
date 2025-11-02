# FOCUS TIME SYNCHRONIZATION - COMPLETE FIX

## Problem Summary

All components (Timer, Calendar, Stats) were showing different focus time values due to improper separation of **completed** vs **active** session minutes.

## Root Cause

The `/focus/active-session` endpoint was **replacing** completed minutes with total (completed + active), causing data corruption during auto-saves.

## Architecture - How Focus Time Works

### Database Structure (FocusSession Model)

```javascript
{
  focusMinutes: Number,         // COMPLETED sessions only
  activeSessionMinutes: Number, // Current ACTIVE session progress
  sessionsCompleted: Number,    // Count of completed sessions
  achieved: Boolean,            // Total >= 120 minutes (2 hours)
}
```

### Data Flow

#### 1. Starting a Session

- **Frontend**: `sessionStartTimeRef.current = Date.now()`
- **localStorage**: Stores session start time
- **Database**: No changes (session not started in DB yet)

#### 2. Auto-Save (Every 30 seconds during active session)

- **Calculation**: Uses `calculateCurrentFocusTime(completedMinutes)`
  - Reads localStorage for session start time
  - Calculates: `activeMinutes = (now - sessionStartTime) / 60000`
  - Returns: `{ dbMinutes, activeMinutes, totalMinutes }`
- **API Call**: `POST /focus/active-session`
  - Sends: ONLY `activeMinutes` (not total)
  - Server updates: `activeSessionMinutes = activeMinutes`
  - Server keeps: `focusMinutes` (completed) unchanged

#### 3. Completing a Session

- **API Call**: `POST /focus/session`
  - Sends: Full session time (e.g., 25 minutes)
  - Server updates: `focusMinutes += sessionMinutes`
  - Server clears: `activeSessionMinutes = 0`
  - Server increments: `sessionsCompleted++`

#### 4. Fetching Today's Progress

- **API Call**: `GET /focus/today`

  - Returns:
    ```javascript
    {
      focusMinutes: 25,      // Completed only
      activeMinutes: 10,     // Current active (if any)
      completedMinutes: 25,  // Alias for clarity
      sessionsCompleted: 1
    }
    ```

- **Frontend Calculation**:
  ```javascript
  const calculation = calculateCurrentFocusTime(completedMinutes);
  // Uses localStorage to add real-time active session progress
  totalMinutes = completedMinutes + activeMinutes;
  ```

## Fixed Files

### 1. Server: `/server/routes/focus.js`

#### `/focus/active-session` - Auto-save endpoint

```javascript
// CRITICAL FIX: Update ONLY activeSessionMinutes, keep completed focusMinutes intact
focusSession.activeSessionMinutes = minutesToSave; // ✅ Correct
focusSession.focusMinutes = minutesToSave; // ❌ Wrong (was doing this before)
```

#### `/focus/today` - Today's progress endpoint

```javascript
res.json({
  focusMinutes: completedMinutes, // Completed only
  activeMinutes: activeSessionMinutes, // Active only
  completedMinutes: completedMinutes, // Alias
});
```

#### `/focus/session` - Session completion endpoint

```javascript
// ADD to completed, CLEAR active
focusSession.focusMinutes = previousCompleted + focusMinutes;
focusSession.activeSessionMinutes = 0;
```

### 2. Frontend: `/src/components/PomodoroTimer.tsx`

#### Auto-save logic

```javascript
// Send ONLY active minutes (not total)
await api.focus.updateActiveSession(calculation.activeMinutes);
```

#### Session completion

```javascript
// Reload from database to sync
const { focusMinutes: dbMinutes } = await api.focus.getTodayProgress();
setDbFocusMinutes(dbMinutes);
sessionStartTimeRef.current = 0; // Clear session
```

### 3. Frontend: `/src/components/CompactStreakCalendar.tsx`

#### Fetch today's progress

```javascript
const { focusMinutes: completedMinutes, activeMinutes } =
  await api.focus.getTodayProgress();
const calculation = calculateCurrentFocusTime(completedMinutes);
setTodayMinutes(calculation.totalMinutes);
```

### 4. Frontend: `/src/components/QuickStats.tsx`

#### Fetch stats

```javascript
const { focusMinutes: completedMinutes, activeMinutes } =
  await api.focus.getTodayProgress();
const calculation = calculateCurrentFocusTime(completedMinutes);
const totalFocusMinutes = calculation.totalMinutes;
```

### 5. Shared Utility: `/src/lib/focusTimeCalculator.ts`

#### Calculation function (unchanged - already correct)

```javascript
export function calculateCurrentFocusTime(dbMinutes: number) {
  // Read localStorage for active session
  const timerState = localStorage.getItem("pomodoroState");

  if (isActive && mode === "focus" && sessionStartTime) {
    const elapsedSeconds = (Date.now() - sessionStartTime) / 1000;
    activeMinutes = Math.floor(elapsedSeconds / 60);
  }

  return {
    dbMinutes, // From database (completed)
    activeMinutes, // From localStorage (active)
    totalMinutes: dbMinutes + activeMinutes,
  };
}
```

## Event System

### Events Dispatched

1. **`focusSessionComplete`** - When a session finishes

   - Dispatched by: `PomodoroTimer.handleComplete()`
   - Listened by: `CompactStreakCalendar`, `QuickStats`
   - Action: Refresh data from API

2. **`timerStateChange`** - When timer starts/pauses/resumes
   - Dispatched by: Auto-save in `PomodoroTimer`
   - Listened by: `CompactStreakCalendar`, `QuickStats`
   - Action: Recalculate using shared function

## Testing Flow

### Scenario 1: Single Session

1. Start 25-minute focus session

   - Timer: Shows 25:00 counting down
   - Stats: Shows 0.0h → updates every second
   - Calendar: Shows 0m → updates every second

2. After 1 minute (auto-save triggers)

   - Database: `activeSessionMinutes = 1`
   - All components: Show 1 minute

3. Complete session at 25 minutes
   - Database: `focusMinutes = 25, activeSessionMinutes = 0`
   - All components: Show 25 minutes (0.4h)

### Scenario 2: Multiple Sessions

1. Complete first 25-minute session

   - Database: `focusMinutes = 25, activeSessionMinutes = 0`

2. Start second 25-minute session, auto-save at 10 minutes

   - Database: `focusMinutes = 25, activeSessionMinutes = 10`
   - All components: Show 35 minutes (25 + 10)

3. Complete second session
   - Database: `focusMinutes = 50, activeSessionMinutes = 0`
   - All components: Show 50 minutes (0.8h)

### Scenario 3: Page Refresh During Active Session

1. Start session, wait 10 minutes

   - Database: `focusMinutes = 0, activeSessionMinutes = 10`

2. Refresh page
   - localStorage: Has `sessionStartTime`
   - Calculation: Uses sessionStartTime to recalculate
   - All components: Show correct time (continues from 10 minutes)

## Key Principles

1. **Separation of Concerns**

   - `focusMinutes` = COMPLETED sessions (permanent)
   - `activeSessionMinutes` = ACTIVE session (temporary)

2. **Single Source of Truth**

   - Database for completed minutes
   - localStorage for active session timing
   - Shared calculator for consistency

3. **Event-Driven Updates**

   - Components listen for events
   - Automatically refresh on session completion
   - Real-time updates during active sessions

4. **Data Integrity**
   - Auto-save never overwrites completed data
   - Session completion properly merges active into completed
   - All calculations use the same shared function

## Restart Server

After these fixes, restart the server:

```bash
cd server
npm start
```

## Verification

All components should now show identical values:

- ✅ PomodoroTimer display
- ✅ QuickStats "Focus Time" card
- ✅ CompactStreakCalendar "Today's Progress"

The values will update in real-time during active sessions and persist correctly across page refreshes.
