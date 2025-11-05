# Timer Refresh Fix - Accurate Time Restoration

## Problem

When refreshing the page during an active timer session:

- Timer would reset to the initial duration (e.g., 24 or 25 minutes)
- Even if the timer was at 23:20, after refresh it showed 24:00 again
- Lost track of actual elapsed time
- User had to remember where they were

### Example:

```
Before Refresh: Timer showing 23:20 (1 minute 40 seconds elapsed)
After Refresh:  Timer showing 24:00 (reset to start)
Expected:       Timer showing 23:20 (or less based on time passed)
```

## Root Cause

The timer was saving only the **elapsed minutes** to the database, but not the **exact session start time**. On page refresh:

1. Database returned: `activeMinutes: 1` (saved progress)
2. Frontend calculated: `remainingTime = 25min - 1min = 24min`
3. **But actual time passed could be 1min 40sec, not exactly 1min!**
4. Timer always rounded to full minutes, losing seconds of progress

## Solution

### 1. Added `sessionStartTime` Field

**Database Schema**: `server/models/FocusSession.js`

```javascript
sessionStartTime: {
  type: Date,
  default: null  // Exact timestamp when session started
}
```

This stores the **exact moment** the timer started (down to milliseconds).

### 2. Backend Returns Session Start Time

**Endpoint**: `GET /api/focus/today`

Now returns:

```json
{
  "activeMinutes": 5,
  "sessionStartTime": "2025-11-02T10:30:45.123Z",
  "lastUpdated": "2025-11-02T10:35:30.456Z"
}
```

### 3. Frontend Calculates Actual Elapsed Time

**File**: `src/components/PomodoroTimer.tsx`

On page load/refresh:

```typescript
// Get exact start time from database
const startTime = new Date(sessionStartTime).getTime();
const now = Date.now();

// Calculate ACTUAL elapsed time (including seconds!)
const actualElapsedMs = now - startTime;
const actualElapsedSeconds = Math.floor(actualElapsedMs / 1000);

// Calculate remaining time
const totalSessionSeconds = 25 * 60; // 1500 seconds
const remainingSeconds = totalSessionSeconds - actualElapsedSeconds;

// Set timer to EXACT remaining time
setTimeLeft(remainingSeconds);
```

## How It Works Now

### Scenario: 25-Minute Timer

**Time 0:00** - Start Timer

```
- User clicks "Start"
- sessionStartTime = 2025-11-02T10:30:00.000Z (saved to DB)
- Timer shows: 25:00
```

**Time 0:01:40** - Page Refresh

```
- User refreshes page
- Backend returns:
  - activeMinutes: 1
  - sessionStartTime: 2025-11-02T10:30:00.000Z

- Frontend calculates:
  - now = 2025-11-02T10:31:40.000Z
  - elapsedMs = 100,000 (100 seconds)
  - elapsedSeconds = 100
  - remainingSeconds = 1500 - 100 = 1400

- Timer restores to: 23:20 ✅
```

**Time 0:05:30** - Another Refresh

```
- Backend returns:
  - activeMinutes: 5
  - sessionStartTime: 2025-11-02T10:30:00.000Z

- Frontend calculates:
  - elapsedSeconds = 330 (5min 30sec)
  - remainingSeconds = 1500 - 330 = 1170

- Timer restores to: 19:30 ✅
```

## Data Flow Diagram

```
┌──────────────┐
│ User Starts  │
│    Timer     │
└──────┬───────┘
       │
       ├─> Save to DB:
       │   - activeMinutes: 0
       │   - sessionStartTime: NOW
       │
       ▼
┌──────────────┐
│ 1 min passes │
│ Auto-save    │
└──────┬───────┘
       │
       ├─> Save to DB:
       │   - activeMinutes: 1
       │   - sessionStartTime: (unchanged)
       │
       ▼
┌──────────────┐
│ User Refresh │
│    Page      │
└──────┬───────┘
       │
       ├─> Load from DB:
       │   - activeMinutes: 1
       │   - sessionStartTime: <original>
       │
       ├─> Calculate:
       │   - Actual elapsed = NOW - sessionStartTime
       │   - Remaining = Total - Actual elapsed
       │
       ▼
   Timer shows
   EXACT time!
```

## Files Modified

### Backend

1. **`server/models/FocusSession.js`**
   - Added `sessionStartTime` field to schema
2. **`server/routes/focus.js`**
   - `/today` endpoint returns `sessionStartTime` and `lastUpdated`
   - `/active-session` endpoint saves `sessionStartTime` on first save
   - `/active-session` preserves `sessionStartTime` on subsequent saves

### Frontend

3. **`src/lib/api.ts`**

   - `getTodayProgress()` returns `sessionStartTime` and `lastUpdated`
   - `updateActiveSession()` accepts and sends `sessionStartTime`
   - `autoSaveActiveSession()` accepts and sends `sessionStartTime`

4. **`src/components/PomodoroTimer.tsx`**
   - On mount: Loads `sessionStartTime` from database
   - On restore: Calculates **actual elapsed time** from start time
   - On auto-save: Sends `sessionStartTimeRef.current` to database
   - On sync: Uses `sessionStartTime` for cross-browser accuracy

## Testing

### Test 1: Single Browser Refresh

1. Start 25-minute timer
2. Wait 1 minute 40 seconds (timer shows 23:20)
3. **Refresh the page**
4. Timer should restore to **~23:20** (or slightly less)

### Test 2: Multiple Refreshes

1. Start 25-minute timer
2. Wait 2 minutes (timer shows 23:00)
3. Refresh page → Should show ~23:00
4. Wait 3 more minutes (timer shows ~20:00)
5. Refresh page → Should show ~20:00
6. Pattern continues accurately

### Test 3: Cross-Browser with Refresh

1. **Browser A**: Start timer, wait 5 minutes
2. **Browser B**: Open same account
3. Timer should restore to ~20:00 remaining
4. **Browser A**: Refresh
5. Both browsers show same time (±1-2 seconds)

### Test 4: Long Session

1. Start 25-minute timer
2. Wait 20 minutes
3. Refresh page
4. Timer should show ~5:00 remaining
5. Let it complete
6. Should trigger completion at 0:00

## Key Improvements

| Aspect           | Before          | After                  |
| ---------------- | --------------- | ---------------------- |
| Accuracy         | ±1 minute       | ±1 second              |
| Refresh behavior | Resets to start | Maintains exact time   |
| Cross-browser    | Rounded minutes | Exact sync             |
| Time calculation | Snapshot-based  | Start-time-based       |
| Data loss        | Loses seconds   | Preserves milliseconds |

## Console Logs

### On Page Load/Refresh:

```
📊 TIMER: Loading today progress from database...
📊 TIMER: Database returned: {
  dbMinutes: 0,
  activeMinutes: 5,
  sessionStartTime: "2025-11-02T10:30:00.000Z"
}
🔄 TIMER: Restoring active session from database: 5 minutes
✅ TIMER: Active session restored: {
  totalSessionMinutes: 25,
  savedActiveMinutes: 5,
  actualElapsedMinutes: 5.5,
  remainingSeconds: 1170,
  startTime: "2025-11-02T10:30:00.000Z",
  isActive: true
}
```

### On Auto-Save:

```
💾 AUTO-SAVE: Saving active session progress: {
  dbMinutes: 0,
  activeMinutes: 5,
  sessionStartTime: "2025-11-02T10:30:00.000Z",
  sendingToServer: 5
}
✅ AUTO-SAVE: Server response: {
  success: true,
  activeMinutes: 5,
  sessionStartTime: "2025-11-02T10:30:00.000Z"
}
```

## Important Notes

1. **Millisecond Precision**: Session start time is stored with millisecond precision
2. **Time Drift**: May be ±1-2 seconds due to network latency and auto-save intervals
3. **Auto-Save Frequency**: Every 30 seconds, so max data loss is 30 seconds of progress
4. **Cross-Browser**: All browsers calculate from same start time
5. **Timezone Independent**: Uses UTC timestamps, works across timezones

## Edge Cases Handled

✅ **Session completed while away**: Detects if remaining time ≤ 0
✅ **Browser crash**: Last saved start time allows accurate restoration
✅ **Multiple browsers**: All sync to same start time
✅ **Network delay**: Calculations on client-side based on local time
✅ **Day boundary**: Sessions reset at midnight (new day)

## What This Fixes

✅ Timer maintains exact time on page refresh
✅ No more resetting to initial duration
✅ Accurate to the second (not just minutes)
✅ Cross-browser time sync is precise
✅ Users can refresh without losing progress
✅ Session restoration is reliable and consistent
