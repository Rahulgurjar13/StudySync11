# Pause/Resume Focus Time Fix

## 🔍 Problem Identified

When pausing or resuming the timer, focus time values were showing different numbers across components:

- **Timer**: Showed one value (e.g., 0h 7m)
- **Calendar**: Showed different value (e.g., 0h 3m)
- **Stats**: Showed different value (e.g., 0.1h)

## 🛠️ Root Causes Fixed

### 1. **Session Start Time Recalculation Bug**

**Problem**: When resuming, the code was trying to "recalculate" the session start time by subtracting elapsed time, which caused incorrect calculations.

**Old Code**:

```typescript
// Resuming - recalculate sessionStartTime
const newStartTime =
  Date.now() -
  ((mode === "focus" ? focusMinutes * 60 : breakMinutes * 60) - timeLeft) *
    1000;
sessionStartTimeRef.current = newStartTime;
```

**Fix**: Start fresh when resuming - don't try to backdate the start time

```typescript
// Resuming - start new session from current point
const newStartTime = Date.now();
sessionStartTimeRef.current = newStartTime;
```

### 2. **Pause Not Saving Progress**

**Problem**: When pausing, the active session progress wasn't being saved to the database, so it appeared lost.

**Fix**: Save active session minutes to database when pausing

```typescript
if (!newActiveState) {
  // Pausing - save current progress to database
  const calculation = calculateCurrentFocusTime(dbFocusMinutes);
  api.focus.updateActiveSession(calculation.activeMinutes).then(() => {
    // Update db reference to include active minutes
    setDbFocusMinutes(calculation.totalMinutes);
    // Clear session start time since we've saved progress
    sessionStartTimeRef.current = 0;
  });
}
```

### 3. **Missing Event Dispatching**

**Problem**: When pausing/resuming or starting, other components (Calendar, Stats) weren't being notified to refresh.

**Fix**: Dispatch `timerStateChange` event on all state changes

```typescript
// Dispatch event to update other components
window.dispatchEvent(new CustomEvent("timerStateChange"));
```

### 4. **New Backend Endpoint**

**Added**: `/focus/active-session` endpoint that accepts both `elapsedMinutes` and `activeMinutes` parameters to save in-progress session time.

## ✅ How It Works Now

### When Starting Focus Session:

1. Creates new `sessionStartTime` timestamp
2. Saves to localStorage
3. Dispatches `timerStateChange` event
4. Calendar and Stats refresh immediately

### During Active Session:

1. Timer counts down every second
2. Uses shared `calculateCurrentFocusTime()` to calculate progress
3. Shows: `dbMinutes` (completed) + `activeMinutes` (current session)
4. Auto-saves to database every 30 seconds

### When Pausing:

1. Calculates current active minutes using shared function
2. Saves active minutes to database via `/focus/active-session`
3. Updates `dbFocusMinutes` to include saved progress
4. Clears `sessionStartTimeRef` (since progress is now in database)
5. Dispatches `timerStateChange` event
6. All components refresh with new saved value

### When Resuming:

1. Starts NEW session with fresh timestamp
2. Uses current `dbFocusMinutes` (which includes previously saved progress)
3. Dispatches `timerStateChange` event
4. Timer continues from current database value + new session

### When Completing Session:

1. Records full session to database
2. Clears `activeSessionMinutes` (now in `focusMinutes`)
3. Re-fetches database value
4. Clears `sessionStartTimeRef`
5. Dispatches `focusSessionComplete` event
6. All components show updated database value

## 🎯 Testing Checklist

### Test 1: Start and Pause

- [ ] Start focus timer (25 minutes)
- [ ] Let it run for 3 minutes
- [ ] Pause timer
- [ ] **Expected**: All 3 components (Timer, Calendar, Stats) show ~3 minutes
- [ ] **Verify**: Check console logs show "Active session saved to database"

### Test 2: Pause and Resume

- [ ] Continue from Test 1 (paused at 3 minutes)
- [ ] Resume timer
- [ ] Let it run for 2 more minutes (total 5 minutes)
- [ ] **Expected**: All 3 components show ~5 minutes
- [ ] **Verify**: Values stay consistent across all components

### Test 3: Multiple Pause/Resume Cycles

- [ ] Start timer
- [ ] Run 2 minutes → Pause
- [ ] Resume → Run 2 minutes → Pause
- [ ] Resume → Run 2 minutes → Pause
- [ ] **Expected**: All components show ~6 minutes
- [ ] **Verify**: No time is lost between pause/resume cycles

### Test 4: Page Refresh During Active Session

- [ ] Start timer
- [ ] Let it run for 3 minutes
- [ ] Refresh browser page
- [ ] **Expected**: Timer resumes from 3 minutes, all components show 3 minutes
- [ ] Continue session for 2 more minutes
- [ ] **Expected**: All components show ~5 minutes

### Test 5: Page Refresh While Paused

- [ ] Start timer
- [ ] Run 3 minutes → Pause
- [ ] Refresh browser page
- [ ] **Expected**: Timer shows paused at remaining time, focus time shows 3 minutes
- [ ] Resume and run 2 more minutes
- [ ] **Expected**: All components show ~5 minutes

### Test 6: Complete Full Session

- [ ] Start 25-minute focus session
- [ ] Let it run to completion (or fast-forward for testing)
- [ ] **Expected**: Session complete notification
- [ ] **Expected**: All components show 25 minutes added to total
- [ ] **Expected**: Timer resets, ready for next session
- [ ] **Expected**: Database value persists after page refresh

### Test 7: Multiple Sessions

- [ ] Complete first 25-minute session
- [ ] Start and complete second 25-minute session
- [ ] **Expected**: All components show 50 minutes total
- [ ] Refresh page
- [ ] **Expected**: Still shows 50 minutes (persisted in database)

## 🔧 Console Logs to Monitor

When testing, watch for these console logs:

**On Start**:

```
▶️ TIMER: Starting new focus session: { dbMinutes: X, sessionStartTime: ..., duration: 25 }
```

**On Pause**:

```
⏸️ TIMER: Pausing session, saving progress: { dbMinutes: X, activeMinutes: Y, totalMinutes: Z }
✅ TIMER: Active session saved to database
```

**On Resume**:

```
▶️ TIMER: Resuming session from: { dbMinutes: X, timeLeft: ..., newStartTime: ... }
```

**On Complete**:

```
✅ TIMER: Focus time after session: { dbMinutes: X, activeMinutes: 0, totalMinutes: X }
📢 Dispatching focusSessionComplete event
```

**Calendar/Stats Refresh**:

```
📊 STATS: Timer state changed - refreshing stats
📊 STATS: Focus time calculation: { dbMinutes: X, activeMinutes: Y, totalMinutes: Z }
```

## 🎉 Expected Behavior

After these fixes:

1. ✅ **Consistency**: All components always show the same focus time value
2. ✅ **Persistence**: Pausing saves progress to database
3. ✅ **No Loss**: No time is lost during pause/resume cycles
4. ✅ **Real-time**: All components update in real-time when timer state changes
5. ✅ **Page Refresh**: Values persist correctly across page refreshes
6. ✅ **Accurate**: Uses shared calculation function for consistency

## 📋 Files Modified

### Frontend:

- `/src/components/PomodoroTimer.tsx` - Fixed pause/resume logic, added event dispatching
- `/src/lib/api.ts` - Added `updateActiveSession()` method
- `/src/lib/focusTimeCalculator.ts` - Shared calculation function (already existed)

### Backend:

- `/server/routes/focus.js` - Updated `/active-session` endpoint to accept `activeMinutes`

### Already Working:

- `/src/components/CompactStreakCalendar.tsx` - Already listens to events
- `/src/components/QuickStats.tsx` - Already listens to events and polls
- Both use shared `calculateCurrentFocusTime()` function

## 🚀 Ready to Test!

All fixes are now complete. The key improvements are:

1. Pause properly saves progress to database
2. Resume starts fresh (doesn't try to backdate)
3. Events dispatched on all state changes
4. All components use same calculation method
5. Database persistence working correctly
