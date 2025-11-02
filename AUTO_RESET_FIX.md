# CRITICAL FIX: Focus Time Auto-Reset Issue

## 🐛 The Problem

User reported that focus time would **automatically reset** from 5 minutes back to 1 minute after a few minutes, even without pausing or interacting with the timer.

**Symptoms:**

- Shows "0h 5m" initially
- After ~30-60 seconds, drops to "0h 1m"
- Time keeps resetting randomly
- Different values across components

## 🔍 Root Causes Found

### 1. **Double Counting Bug** ❌

**Backend was returning total (completed + active):**

```javascript
res.json({
  focusMinutes: totalMinutes, // ❌ Returned completed + active
  completedMinutes: focusMinutes,
  activeMinutes: activeSessionMinutes,
});
```

**Frontend then added MORE active time on top:**

```typescript
// dbFocusMinutes = 5 (already includes active)
// Calculator adds 5 MORE active minutes
// Result: 10 minutes (doubled!)
```

**Fix:** Backend now returns ONLY completed minutes:

```javascript
res.json({
  focusMinutes: focusMinutes, // ✅ Only completed
  completedMinutes: focusMinutes,
  activeMinutes: activeSessionMinutes,
});
```

### 2. **Auto-Save Conflict** ❌

**Auto-save was running every 30 seconds:**

- Overwrote `activeSessionMinutes` in database
- Conflicted with pause logic
- Caused race conditions
- Made state management unpredictable

**Fix:** **Removed auto-save entirely**

- Now only save on pause or complete
- Clean, predictable state management
- No more conflicts

### 3. **Pause Not Committing Progress** ❌

**When pausing, backend stored in separate field:**

```javascript
// Old: Stored in activeSessionMinutes (temporary)
focusSession.activeSessionMinutes = minutesToSave;
focusSession.focusMinutes = 0; // Still 0!
```

**When fetching, frontend got 0:**

```typescript
// Frontend fetches and gets focusMinutes = 0
setDbFocusMinutes(0); // Lost all progress!
```

**Fix:** **Pause now commits progress to completed minutes:**

```javascript
// New: Add to focusMinutes (permanent)
focusSession.focusMinutes += minutesToSave; // Commits progress
focusSession.activeSessionMinutes = 0; // Clear temporary
```

### 4. **Frontend Not Reloading After Pause** ❌

**Old pause logic:**

```typescript
setDbFocusMinutes(calculation.totalMinutes); // Set locally only
// Never verified with database!
```

**Fix:** **Reload from database after saving:**

```typescript
api.focus
  .updateActiveSession(activeMinutes)
  .then(() => api.focus.getTodayProgress()) // Reload from DB
  .then(({ focusMinutes: dbMinutes }) => {
    setDbFocusMinutes(dbMinutes); // Use verified DB value
    setTotalFocusTime(dbMinutes);
  });
```

## ✅ How It Works Now

### Flow 1: Start Session

```
1. User clicks "Start"
2. sessionStartTime = Date.now()
3. Save to localStorage
4. Dispatch 'timerStateChange' event
5. All components refresh
```

### Flow 2: During Active Session

```
1. Timer counts down every second
2. Calculate: dbMinutes + activeMinutes (from elapsed time)
3. Display in all components using shared calculator
4. NO auto-save (removed!)
```

### Flow 3: Pause Session

```
1. User clicks "Pause"
2. Calculate active minutes from elapsed time
3. Send to backend: updateActiveSession(activeMinutes)
4. Backend: focusMinutes += activeMinutes (commits to DB)
5. Backend: activeSessionMinutes = 0 (clears temporary)
6. Frontend: Reload from database → get updated focusMinutes
7. Frontend: setDbFocusMinutes(newValue)
8. Frontend: sessionStartTime = 0 (clear session)
9. Dispatch 'timerStateChange' event
10. All components refresh with committed value
```

### Flow 4: Resume Session

```
1. User clicks "Resume"
2. sessionStartTime = Date.now() (fresh start)
3. Use current dbFocusMinutes as base
4. Continue accumulating from there
5. Dispatch 'timerStateChange' event
```

### Flow 5: Complete Session

```
1. Timer reaches 0
2. Calculate session duration
3. Send to backend: recordSession(minutes)
4. Backend: focusMinutes += minutes (add to completed)
5. Backend: activeSessionMinutes = 0 (clear)
6. Backend: sessionsCompleted += 1
7. Frontend: Reload from database
8. Frontend: sessionStartTime = 0 (clear)
9. Dispatch 'focusSessionComplete' event
10. All components refresh
```

## 🎯 Key Principles

### 1. **Single Source of Truth**

- Database `focusMinutes` = only completed minutes
- Frontend `dbFocusMinutes` = mirrors database value
- Active session = calculated on-the-fly from `sessionStartTime`
- Total = `dbFocusMinutes` + `activeMinutes`

### 2. **Save Only When Needed**

- ✅ Save on pause (commit progress)
- ✅ Save on complete (commit full session)
- ❌ NO auto-save (removed - caused conflicts)

### 3. **Always Reload After Save**

- After pause → reload from DB
- After complete → reload from DB
- Ensures frontend matches backend

### 4. **Clear Separation**

- `focusMinutes` = committed/completed progress (persistent)
- `activeSessionMinutes` = temporary in-progress time (cleared on save)
- Frontend only uses `focusMinutes` as base value

## 📊 Data Flow Diagram

```
START SESSION:
localStorage: { sessionStartTime: 1234567890, isActive: true }
Database: { focusMinutes: 0, activeSessionMinutes: 0 }

RUNNING (5 min elapsed):
Frontend: dbMinutes=0 + activeMinutes=5 = 5 min total ✅
Database: { focusMinutes: 0, activeSessionMinutes: 0 }

PAUSE:
Frontend: Calculate activeMinutes=5
→ API: updateActiveSession(5)
Database: { focusMinutes: 5, activeSessionMinutes: 0 } ← Committed!
← API: getTodayProgress() returns focusMinutes=5
Frontend: dbMinutes=5, activeMinutes=0 = 5 min total ✅
localStorage: { sessionStartTime: 0, isActive: false }

RESUME:
localStorage: { sessionStartTime: 1234567999, isActive: true }
Frontend: dbMinutes=5 + activeMinutes=0 = 5 min total ✅
Database: { focusMinutes: 5, activeSessionMinutes: 0 }

RUNNING (3 more min elapsed):
Frontend: dbMinutes=5 + activeMinutes=3 = 8 min total ✅
Database: { focusMinutes: 5, activeSessionMinutes: 0 }

COMPLETE:
Frontend: Calculate session=25 min
→ API: recordSession(25)
Database: { focusMinutes: 30, activeSessionMinutes: 0 } ← 5+25=30
← API: getTodayProgress() returns focusMinutes=30
Frontend: dbMinutes=30, activeMinutes=0 = 30 min total ✅
```

## 🧪 Testing Checklist

### Test 1: Basic Session

- [ ] Start 25-min focus
- [ ] Wait 5 minutes
- [ ] **Verify:** All components show 5 minutes
- [ ] **Verify:** Does NOT reset to 1 minute
- [ ] Wait another 5 minutes
- [ ] **Verify:** All components show 10 minutes
- [ ] **Verify:** Still does NOT reset

### Test 2: Pause and Check

- [ ] Start focus timer
- [ ] Wait 5 minutes
- [ ] Pause
- [ ] **Verify:** All 3 components show 5 minutes
- [ ] **Verify:** Calendar shows "0h 5m"
- [ ] **Verify:** Stats show "0.1h" (5/60 = 0.08 ≈ 0.1)
- [ ] Wait 1 minute (paused)
- [ ] **Verify:** Still shows 5 minutes (NOT 1 minute!)

### Test 3: Pause, Wait, Resume

- [ ] Continue from Test 2 (paused at 5 min)
- [ ] Wait 2 minutes while paused
- [ ] **Verify:** Still shows 5 minutes
- [ ] Resume
- [ ] **Verify:** Starts from 5 minutes
- [ ] Run for 3 more minutes
- [ ] **Verify:** All components show 8 minutes

### Test 4: Page Refresh While Active

- [ ] Start timer
- [ ] Wait 5 minutes
- [ ] Refresh page
- [ ] **Verify:** Shows 5 minutes (or more if time passed)
- [ ] Continue for 3 more minutes
- [ ] **Verify:** Shows 8 minutes total

### Test 5: Page Refresh While Paused

- [ ] Start timer
- [ ] Wait 5 minutes
- [ ] Pause
- [ ] **Verify:** Shows 5 minutes
- [ ] Refresh page
- [ ] **Verify:** Still shows 5 minutes
- [ ] Resume
- [ ] Wait 3 minutes
- [ ] **Verify:** Shows 8 minutes

### Test 6: Complete Session

- [ ] Start and complete full 25-min session
- [ ] **Verify:** All components show 25 minutes
- [ ] Start another session
- [ ] Wait 5 minutes
- [ ] **Verify:** Shows 30 minutes total (25 + 5)

## 🔧 Files Modified

### Frontend Changes:

1. **`/src/components/PomodoroTimer.tsx`**

   - Removed auto-save useEffect (lines 205-238)
   - Updated pause logic to reload from DB after saving
   - Cleaner state management

2. **`/src/lib/api.ts`**
   - No changes needed (updateActiveSession already exists)

### Backend Changes:

1. **`/server/routes/focus.js`**
   - Line 242: Return ONLY `focusMinutes` (not total)
   - Lines 276-291: Commit active to completed on pause
   - Active minutes now added to `focusMinutes`
   - `activeSessionMinutes` cleared after commit

## 🎉 Expected Results

After these fixes:

1. ✅ **No Auto-Reset**: Time will NOT mysteriously drop from 5 min to 1 min
2. ✅ **Consistent Values**: All components always show same value
3. ✅ **Pause Works**: Pausing commits progress permanently
4. ✅ **Resume Works**: Resuming continues from saved value
5. ✅ **Page Refresh**: Values persist correctly
6. ✅ **Clean State**: No more conflicts or race conditions

## 🚀 Ready to Test!

The core issue was:

- Auto-save causing conflicts ❌ → **Removed**
- Double counting active time ❌ → **Fixed**
- Pause not committing ❌ → **Fixed**
- Not reloading after save ❌ → **Fixed**

Now the timer should work smoothly with no random resets! 🎊
