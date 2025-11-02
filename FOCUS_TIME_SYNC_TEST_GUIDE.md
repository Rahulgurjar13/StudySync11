# FOCUS TIME SYNC - TEST GUIDE

## 🎯 Test Complete Flow

### Prerequisites

✅ Server running on port 3001
✅ Frontend running (npm run dev)
✅ User logged in

## Test 1: Single Session Start to Finish

### Step 1: Check Initial State

1. Look at dashboard
2. **Expected**:
   - Focus Time card: "0.0h" or "Start focusing!"
   - Focus Streak calendar "Today's Progress": "0h 0m / 2h"
   - Timer: Shows "0 sessions completed"

### Step 2: Start Timer

1. Click "Start" button on timer
2. Set to 5 minutes (for quick testing)
3. **Expected**:
   - Timer counts down from 5:00
   - Focus Time card: Updates every second (0.0h → 0.1h)
   - Calendar "Today's Progress": Updates (1m, 2m, 3m...)

### Step 3: Wait for Auto-Save (after 1 minute)

1. Watch browser console
2. **Expected logs**:
   ```
   💾 AUTO-SAVE: Saving active session progress
   ✅ AUTO-SAVE: Server response
   📊 STATS: Timer state changed - refreshing stats
   📅 CALENDAR: Timer state changed - updating progress
   ```

### Step 4: Complete Session

1. Wait for timer to reach 0:00
2. **Expected**:
   - Toast: "🎉 Focus session complete! 5 minutes..."
   - Toast: "🎯 +X XP Earned!"
   - Focus Time card: Shows "0.1h" (5/60 = 0.08h)
   - Calendar: Shows "5m / 2h" with progress bar
   - Timer: Shows "1 sessions completed"

### Step 5: Verify Database

Open browser console and run:

```javascript
fetch("http://localhost:3001/api/focus/today", {
  headers: { Authorization: "Bearer " + localStorage.getItem("authToken") },
})
  .then((r) => r.json())
  .then((d) =>
    console.table({
      Completed: d.focusMinutes + " min",
      Active: d.activeMinutes + " min",
      Sessions: d.sessionsCompleted,
      Achieved: d.achieved,
    })
  );
```

**Expected Result**:

```
Completed: 5 min
Active: 0 min
Sessions: 1
Achieved: false
```

## Test 2: Multiple Sessions

### Step 1: Start Second Session

1. Click "Start" again
2. **Expected**:
   - Timer resets to 5:00
   - Focus Time still shows previous total (0.1h)
   - Calendar shows "5m / 2h"

### Step 2: Wait 2 Minutes (Don't Complete)

1. Let timer run to 3:00
2. **Expected**:
   - Focus Time: Shows ~0.2h (5 completed + 2 active = 7 min)
   - Calendar: Shows "7m / 2h" (5 + 2)

### Step 3: Complete Second Session

1. Wait for completion
2. **Expected**:
   - Focus Time: Shows ~0.2h (5 + 5 = 10 minutes)
   - Calendar: Shows "10m / 2h"
   - Timer: Shows "2 sessions completed"

### Step 4: Verify Database

```javascript
fetch("http://localhost:3001/api/focus/today", {
  headers: { Authorization: "Bearer " + localStorage.getItem("authToken") },
})
  .then((r) => r.json())
  .then((d) =>
    console.table({
      Completed: d.focusMinutes + " min",
      Active: d.activeMinutes + " min",
      Total: d.focusMinutes + d.activeMinutes + " min",
      Sessions: d.sessionsCompleted,
    })
  );
```

**Expected**:

```
Completed: 10 min
Active: 0 min
Total: 10 min
Sessions: 2
```

## Test 3: Page Refresh During Active Session

### Step 1: Start Session

1. Start timer (5 minutes)
2. Wait until 3:30 remaining (1.5 minutes elapsed)

### Step 2: Refresh Page

1. Press F5 or Cmd+R
2. **Expected** (after page loads):
   - Timer continues from 3:30
   - Focus Time: Shows previous + active (10 + 1.5 = ~11.5 min = 0.2h)
   - Calendar: Shows "11m / 2h" or "12m / 2h"

### Step 3: Complete Session After Refresh

1. Let timer finish
2. **Expected**:
   - Total: 10 (previous) + 5 (this session) = 15 minutes
   - Focus Time: 0.25h
   - Calendar: "15m / 2h"

## Test 4: Verify All Components Show Same Value

### At Any Point During Testing

1. **Timer Display** (below timer when > 0)
2. **Focus Time Card** (middle card)
3. **Calendar "Today's Progress"** (left side of calendar)

**All three should show the EXACT same value at all times!**

Example:

- Timer: "15m total today"
- Focus Time: "0.3h" (which is 15-18 minutes)
- Calendar: "15m / 2h"

## Test 5: Achieve Daily Goal (2 hours)

### For Full Test (Optional)

1. Complete 24 sessions of 5 minutes each
   OR
2. Manually update database:

```javascript
fetch("http://localhost:3001/api/focus/session", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + localStorage.getItem("authToken"),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ focusMinutes: 120, sessionType: "focus" }),
})
  .then((r) => r.json())
  .then((d) => console.log("✅ Goal achieved!", d));
```

3. **Expected**:
   - Calendar shows green checkmark on today
   - Calendar: "✓ Goal Achieved"
   - Progress bar: Green and at 100%

## Console Debugging

### Key Logs to Watch

#### When Starting Timer:

```
▶️ TIMER: Starting new focus session
```

#### During Auto-Save:

```
💾 AUTO-SAVE: Saving active session progress
✅ AUTO-SAVE: Server response
```

#### When Completing Session:

```
🎯 TIMER COMPLETE - Recording session: X minutes
✅ Focus session recorded successfully
🔄 TIMER: Synced with database after session complete
📢 Dispatching focusSessionComplete event
```

#### When Calendar Updates:

```
📅 CALENDAR: Focus session completed - refreshing calendar
📊 CALENDAR: Database returned: {...}
📊 CALENDAR: Focus time calculation: {...}
```

#### When Stats Update:

```
📊 STATS: Focus session completed - refreshing stats
📊 STATS: Focus time calculation: {...}
📊 STATS: Focus time breakdown: {...}
```

## Success Criteria

✅ All components show identical values
✅ Auto-save doesn't corrupt data
✅ Session completion adds correctly
✅ Page refresh maintains state
✅ Calendar updates immediately after session
✅ Stats update immediately after session
✅ Timer shows cumulative "total today"
✅ Database has correct separation of completed vs active

## If Something Goes Wrong

### Values Don't Match

1. Check browser console for errors
2. Check server logs
3. Verify calculation logs show same values
4. Check database with fetch commands above

### Data Seems Wrong

1. Clear today's data:

```javascript
fetch("http://localhost:3001/api/focus/today", {
  headers: { Authorization: "Bearer " + localStorage.getItem("authToken") },
})
  .then((r) => r.json())
  .then((d) => console.log("Current:", d));
```

2. Or manually reset (ask me for help)

### Page Refresh Loses Data

1. Check localStorage:

```javascript
console.log(JSON.parse(localStorage.getItem("pomodoroState")));
```

2. Should show `sessionStartTime` if timer was active

## Quick Reset for Testing

To start fresh each test:

```javascript
// Clear localStorage
localStorage.removeItem("pomodoroState");

// Then ask me to reset database for your user
```
