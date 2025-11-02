# 🔧 Focus Time Page Refresh Fix

## 🎯 Problem

When refreshing the page, the focus time was changing/resetting incorrectly due to:

1. **Incorrect timer state restoration** - startTime was not being recalculated properly
2. **Multiple sources of truth** - Database, localStorage, and real-time calculations weren't synchronized
3. **Race conditions** - Timer state and database values were loaded at different times

## ✅ Complete Solution

### 1. **Backend: New `/focus/today` Endpoint**

Created a dedicated endpoint that returns only **completed** focus sessions from the database.

**File:** `server/routes/focus.js`

```javascript
// Get today's progress - returns only completed focus minutes from database
router.get("/today", authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const focusSession = await FocusSession.findOne({
      userId: req.user.id,
      date: today,
    });

    const focusMinutes = focusSession?.focusMinutes || 0;
    const sessionsCompleted = focusSession?.sessionsCompleted || 0;
    const achieved = focusMinutes >= 120;

    res.json({
      focusMinutes,
      sessionsCompleted,
      achieved,
      date: today.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch today progress" });
  }
});
```

### 2. **Frontend API: Simplified `getTodayProgress()`**

Updated the API client to use the new endpoint directly.

**File:** `src/lib/api.ts`

```typescript
getTodayProgress: async () => {
  const data = await fetchWithAuth("/focus/today");
  return {
    focusMinutes: data.focusMinutes || 0,
    sessionsCompleted: data.sessionsCompleted || 0,
    achieved: data.achieved || false,
  };
};
```

### 3. **Timer: Fixed State Restoration on Page Refresh**

Properly recalculate `startTime` when restoring an active timer.

**File:** `src/components/PomodoroTimer.tsx`

```typescript
const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem("pomodoroState");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.isActive && parsed.startTime) {
        const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
        const remainingTime = Math.max(0, parsed.timeLeft - elapsed);

        return {
          ...parsed,
          timeLeft: remainingTime,
          isActive: remainingTime > 0,
          // CRITICAL: Recalculate startTime based on remaining time
          startTime:
            remainingTime > 0
              ? Date.now() - (parsed.timeLeft - remainingTime) * 1000
              : 0,
        };
      }
      return parsed;
    }
  } catch (error) {
    console.error("Error loading persisted state:", error);
  }
  return null;
};
```

### 4. **Timer: Simplified Focus Time Loading**

Load **only** completed sessions from database on mount.

```typescript
useEffect(() => {
  // Load today's accumulated focus time from database (only completed sessions)
  if (user) {
    api.focus
      .getTodayProgress()
      .then(({ focusMinutes, sessionsCompleted }) => {
        // Set the completed focus time from database
        setTotalFocusTime(focusMinutes);
        console.log(
          "✅ TIMER: Set totalFocusTime to",
          focusMinutes,
          "minutes from database"
        );
      })
      .catch((err) => {
        console.error("❌ TIMER: Failed to load today's progress:", err);
        setTotalFocusTime(0);
      });
  }
}, [user]); // Only run once when component mounts
```

### 5. **Timer: Real-Time Display with Base Reference**

Track completed time separately and add current session progress for display.

```typescript
// Store the base focus time when it's loaded from database
useEffect(() => {
  if (totalFocusTime > 0 && !isActive) {
    localStorage.setItem("focusTimeBase", totalFocusTime.toString());
  }
}, [totalFocusTime, isActive]);

// Update display during active session
if (mode === "focus") {
  const sessionDuration = focusMinutes * 60;
  const timeElapsed = sessionDuration - newTime;
  const minutesElapsed = Math.floor(timeElapsed / 60);

  setTotalFocusTime((prev) => {
    const storedBase = parseInt(localStorage.getItem("focusTimeBase") || "0");
    return storedBase + minutesElapsed;
  });
}
```

### 6. **Stats: Consistent Calculation**

Both QuickStats and Timer now calculate focus time the same way.

**File:** `src/components/QuickStats.tsx`

```typescript
// Get today's focus time from database (completed sessions only)
const { focusMinutes: dbMinutes } = await api.focus.getTodayProgress();

// Calculate current session progress if timer is active
let currentSessionProgress = 0;
const timerState = JSON.parse(localStorage.getItem("pomodoroState") || "{}");
if (
  timerState.isActive &&
  timerState.mode === "focus" &&
  timerState.startTime
) {
  const now = Date.now();
  const sessionStartTime = timerState.startTime;
  const sessionDuration = timerState.focusMinutes * 60;

  const elapsedMs = now - sessionStartTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const actualElapsedSeconds = Math.min(elapsedSeconds, sessionDuration);
  currentSessionProgress = Math.floor(actualElapsedSeconds / 60);
}

// Total = completed + in-progress
const totalFocusMinutes = dbMinutes + currentSessionProgress;
```

### 7. **Optimized Polling**

Reduced unnecessary polling - only when timer is active.

```typescript
// Poll every 5 seconds for real-time updates, but only during active sessions
const interval = setInterval(() => {
  try {
    const timerState = JSON.parse(
      localStorage.getItem("pomodoroState") || "{}"
    );
    if (timerState.isActive && timerState.mode === "focus") {
      fetchStats();
    }
  } catch (e) {
    // Silent fail
  }
}, 5000);
```

## 🎯 How It Works Now

### On Page Load (Fresh or Refresh):

1. ✅ Load completed focus time from database → `focusMinutes`
2. ✅ Check if timer was active → read `pomodoroState` from localStorage
3. ✅ If timer was active, recalculate `startTime` based on elapsed time
4. ✅ Calculate current session progress from recalculated `startTime`
5. ✅ Display = `dbMinutes` + `currentSessionProgress`

### During Active Session:

1. ✅ Timer counts down normally
2. ✅ Display updates every second showing: completed + current progress
3. ✅ QuickStats polls every 5 seconds and calculates the same way
4. ✅ Both components show identical values

### On Session Complete:

1. ✅ Save completed session to database
2. ✅ Reload from database to get new total
3. ✅ Update `focusTimeBase` in localStorage
4. ✅ Dispatch events to update all components

### On Page Refresh Mid-Session:

1. ✅ Database returns completed sessions only (e.g., 25 minutes)
2. ✅ Timer state is restored with correct `startTime`
3. ✅ Current session progress is calculated (e.g., 10 minutes)
4. ✅ Display shows: 25 + 10 = 35 minutes ✨

## 🧪 Testing Checklist

- [x] Start a 25-minute focus session
- [x] Refresh page at 10 minutes → Should show 10 minutes progress
- [x] Let it complete → Should save 25 minutes to database
- [x] Start another session
- [x] Refresh at 5 minutes → Should show 25 (completed) + 5 (current) = 30 minutes
- [x] QuickStats and Timer show same values at all times

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PAGE LOAD/REFRESH                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌───────────────────┐                  ┌────────────────────┐
│   Load from DB    │                  │ Load from localStorage│
│ (completed only)  │                  │   (timer state)    │
│ focusMinutes: 25  │                  │   isActive: true   │
└───────────────────┘                  │   startTime: ...   │
        ↓                               │   timeLeft: 900    │
        │                               └────────────────────┘
        │                                       ↓
        │                               ┌────────────────────┐
        │                               │ Recalculate start  │
        │                               │ based on elapsed   │
        │                               └────────────────────┘
        │                                       ↓
        └───────────────────┬───────────────────┘
                            ↓
                ┌───────────────────────┐
                │  Calculate Display:   │
                │  25 + 10 = 35 min ✅  │
                └───────────────────────┘
```

## 🚀 Result

✅ Focus time now remains **consistent** across page refreshes  
✅ No more random time changes  
✅ Database is single source of truth for completed sessions  
✅ Real-time progress is calculated consistently  
✅ All components show the same values
