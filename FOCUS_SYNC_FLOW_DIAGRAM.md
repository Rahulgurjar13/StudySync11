# Focus Time Data Flow - Visual Guide

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER STARTS TIMER                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PomodoroTimer Component                                             │
│  ─────────────────────────                                          │
│  • sessionStartTimeRef.current = Date.now()                         │
│  • localStorage: { sessionStartTime: 1234567890 }                   │
│  • Database: NO CHANGE YET                                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EVERY SECOND (Timer Tick)                        │
│  ─────────────────────────────────────────────────────────────────  │
│  calculateCurrentFocusTime(dbMinutes):                              │
│    1. Read localStorage: sessionStartTime = 1234567890              │
│    2. Calculate: activeMinutes = (now - start) / 60000              │
│    3. Return: totalMinutes = dbMinutes + activeMinutes              │
│                                                                      │
│  All Components Update:                                             │
│    • Timer Display: "5m total today"                                │
│    • Focus Time Card: "0.1h"                                        │
│    • Calendar: "5m / 2h"                                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  AUTO-SAVE (Every 30 seconds)                        │
│  ──────────────────────────────────────────────────────────────────│
│  Frontend:                                                          │
│    const calc = calculateCurrentFocusTime(dbMinutes)                │
│    // calc = { dbMinutes: 0, activeMinutes: 5, totalMinutes: 5 }   │
│                                                                      │
│    POST /focus/active-session                                       │
│    Body: { activeMinutes: 5 }  ← ONLY ACTIVE, NOT TOTAL!           │
│                                                                      │
│  Server:                                                            │
│    focusSession.activeSessionMinutes = 5  ← Update active only      │
│    focusSession.focusMinutes = 0          ← Keep completed intact   │
│    Save to database                                                 │
│                                                                      │
│  Database State:                                                    │
│    ┌─────────────────────────────────────┐                         │
│    │ focusMinutes: 0                     │ (completed)             │
│    │ activeSessionMinutes: 5             │ (in progress)           │
│    │ sessionsCompleted: 0                │                         │
│    └─────────────────────────────────────┘                         │
│                                                                      │
│  Event Dispatched: 'timerStateChange'                               │
│    → CompactStreakCalendar fetches & updates                        │
│    → QuickStats fetches & updates                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SESSION COMPLETES (25 min)                        │
│  ──────────────────────────────────────────────────────────────────│
│  Frontend:                                                          │
│    POST /focus/session                                              │
│    Body: { focusMinutes: 25, sessionType: 'focus' }                │
│                                                                      │
│  Server:                                                            │
│    prevCompleted = focusSession.focusMinutes      // = 0            │
│    prevActive = focusSession.activeSessionMinutes  // = 25          │
│                                                                      │
│    focusSession.focusMinutes = 0 + 25 = 25  ← ADD to completed     │
│    focusSession.activeSessionMinutes = 0    ← CLEAR active         │
│    focusSession.sessionsCompleted++         ← INCREMENT count      │
│    Save to database                                                 │
│                                                                      │
│  Database State AFTER:                                              │
│    ┌─────────────────────────────────────┐                         │
│    │ focusMinutes: 25                    │ (completed)             │
│    │ activeSessionMinutes: 0             │ (cleared)               │
│    │ sessionsCompleted: 1                │                         │
│    └─────────────────────────────────────┘                         │
│                                                                      │
│  Frontend:                                                          │
│    sessionStartTimeRef.current = 0  ← CLEAR session                │
│    Reload from database → setDbFocusMinutes(25)                     │
│    Dispatch event: 'focusSessionComplete'                           │
│                                                                      │
│  All Components Update:                                             │
│    • Timer: "1 sessions completed"                                  │
│    • Focus Time: "0.4h"                                             │
│    • Calendar: "25m / 2h" with 20.8% progress                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    START SECOND SESSION                              │
│  ──────────────────────────────────────────────────────────────────│
│  • sessionStartTimeRef.current = Date.now()  (new start time)       │
│  • Database: focusMinutes=25, activeSessionMinutes=0                │
│                                                                      │
│  After 10 minutes (auto-save):                                      │
│    POST /focus/active-session                                       │
│    Body: { activeMinutes: 10 }                                      │
│                                                                      │
│  Database State:                                                    │
│    ┌─────────────────────────────────────┐                         │
│    │ focusMinutes: 25                    │ (first session)         │
│    │ activeSessionMinutes: 10            │ (second session)        │
│    │ sessionsCompleted: 1                │                         │
│    └─────────────────────────────────────┘                         │
│                                                                      │
│  All Components Show:                                               │
│    Total = 25 + 10 = 35 minutes (0.6h)                              │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 Data State at Each Stage

### Stage 1: No Sessions Yet

```javascript
Database: {
  focusMinutes: 0,
  activeSessionMinutes: 0,
  sessionsCompleted: 0
}
Display: "0.0h" | "0m / 2h"
```

### Stage 2: Active Session (5 min elapsed)

```javascript
Database: {
  focusMinutes: 0,           // No completed sessions
  activeSessionMinutes: 5,   // 5 min into current session
  sessionsCompleted: 0
}
localStorage: {
  sessionStartTime: 1234567890
}
Calculation: 0 + 5 = 5 minutes
Display: "0.1h" | "5m / 2h"
```

### Stage 3: First Session Complete

```javascript
Database: {
  focusMinutes: 25,          // First session completed
  activeSessionMinutes: 0,   // Cleared
  sessionsCompleted: 1
}
localStorage: {
  sessionStartTime: 0  // Cleared
}
Calculation: 25 + 0 = 25 minutes
Display: "0.4h" | "25m / 2h"
```

### Stage 4: Second Session Active (10 min)

```javascript
Database: {
  focusMinutes: 25,          // First session
  activeSessionMinutes: 10,  // Second session in progress
  sessionsCompleted: 1
}
localStorage: {
  sessionStartTime: 9876543210
}
Calculation: 25 + 10 = 35 minutes
Display: "0.6h" | "35m / 2h"
```

### Stage 5: Second Session Complete

```javascript
Database: {
  focusMinutes: 50,          // 25 + 25
  activeSessionMinutes: 0,   // Cleared
  sessionsCompleted: 2
}
Calculation: 50 + 0 = 50 minutes
Display: "0.8h" | "50m / 2h"
```

## 🔑 Key Points

1. **Database has TWO fields**:

   - `focusMinutes` = Permanent completed sessions
   - `activeSessionMinutes` = Temporary active session

2. **Total is ALWAYS**:

   ```
   total = focusMinutes + activeSessionMinutes
   ```

3. **Auto-save updates ONLY**:

   - `activeSessionMinutes` ← new value
   - `focusMinutes` ← UNCHANGED

4. **Session complete**:

   - `focusMinutes` ← old + new
   - `activeSessionMinutes` ← 0

5. **All components use SAME calculation**:
   ```javascript
   calculateCurrentFocusTime(completedMinutes);
   // Returns: completedMinutes + activeMinutes from localStorage
   ```

## 🎯 Why This Works

- ✅ **Separation**: Completed vs Active are separate
- ✅ **Persistence**: localStorage for active timing
- ✅ **Consistency**: Shared calculator function
- ✅ **Events**: Components listen and update
- ✅ **Real-time**: Updates every second
- ✅ **Accuracy**: Database is source of truth for completed

## 🚨 What Was Wrong Before

```javascript
// ❌ WRONG (before fix):
POST / focus / active - session;
Server: focusSession.focusMinutes = totalMinutes; // OVERWRITES!
// If you had 25 completed + 5 active = 30 total
// This would set focusMinutes to 30, losing the separation

// ✅ CORRECT (after fix):
POST / focus / active - session;
Server: focusSession.activeSessionMinutes = activeMinutes; // SEPARATE!
// Keeps focusMinutes=25 and activeSessionMinutes=5
```

This is why all components are now synchronized and accurate! 🎉
