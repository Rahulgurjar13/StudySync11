# ✅ QUICK TEST GUIDE - Auto-Save Solution

## Status: Ready to Test! 🚀

---

## What Changed?

Your focus time now **auto-saves to the database every 30 seconds** while the timer is running. This means:

✅ Page refresh won't lose your progress
✅ Maximum 30 seconds of data lost (vs entire session before)
✅ Database has real-time updates
✅ Works across browser crashes, tab closes, etc.

---

## How to Test (Simple Version)

### Step 1: Start Timer

1. Go to http://localhost:8080
2. Login if needed
3. Click "Start Focus"
4. **Open browser console** (F12 or Cmd+Option+I)

### Step 2: Watch Auto-Save Logs

You should see console logs like:

```
💾 AUTO-SAVE: Saving active session progress: 1 minutes
✅ AUTO-SAVE: Success {totalMinutes: 1, activeMinutes: 1, completedMinutes: 0}

(30 seconds later)
💾 AUTO-SAVE: Saving active session progress: 1 minutes
✅ AUTO-SAVE: Success {totalMinutes: 1, activeMinutes: 1, completedMinutes: 0}

(1 minute later)
💾 AUTO-SAVE: Saving active session progress: 2 minutes
✅ AUTO-SAVE: Success {totalMinutes: 2, activeMinutes: 2, completedMinutes: 0}
```

### Step 3: Test Refresh

1. Let timer run for 3-5 minutes
2. Note the "Today's Focus" time (e.g., "5m")
3. **Refresh the page** (F5 or Cmd+R)
4. ✅ **Check:** Focus time should still show ~5 minutes (maybe 4.5-5 min)
5. ✅ **Check:** Timer should resume from where it was
6. ❌ **BUG IF:** Focus time resets to 0 or wrong number

---

## What to Look For

### ✅ Good Signs (Success):

- Auto-save logs appear every 30 seconds
- Focus time stays same after refresh
- No errors in console
- Timer resumes after refresh

### ❌ Bad Signs (Problems):

- No auto-save logs appearing
- 401 Unauthorized errors (need to re-login)
- 500 Server errors (backend issue)
- Focus time resets to 0 on refresh
- Focus time shows wrong value

---

## Common Issues & Solutions

### Issue: No auto-save logs

**Cause:** Timer not in focus mode, or not logged in
**Fix:** Make sure you're logged in and timer is in "Focus" mode (not break)

### Issue: 401 Unauthorized

**Cause:** Login token expired
**Fix:** Logout and login again

### Issue: 500 Server Error

**Cause:** Backend not running or database issue
**Fix:** Check backend terminal for errors

### Issue: Timer jumps forward/backward

**Cause:** Clock sync issue between localStorage and database
**Fix:** Clear localStorage and refresh

---

## Quick Debug Commands

### Check Backend is Running:

```bash
curl http://localhost:3001/api/focus/today
```

### Check localStorage State:

Open console and run:

```javascript
JSON.parse(localStorage.getItem("pomodoroState"));
```

### Clear Everything and Start Fresh:

```javascript
localStorage.clear();
location.reload();
```

---

## Expected Behavior Timeline

```
Time 0:00 - Click "Start Focus"
  → AUTO-SAVE: 0 minutes (triggered immediately)

Time 1:00 - First minute passes
  → AUTO-SAVE: 1 minute

Time 1:30 - 30 seconds later
  → AUTO-SAVE: 1 minute (saves every 30s)

Time 2:00
  → AUTO-SAVE: 2 minutes

Time 2:30
  → AUTO-SAVE: 2 minutes

Time 3:00
  → AUTO-SAVE: 3 minutes

[USER REFRESHES PAGE]

Time 3:05 - Page reloads
  → Loads from database: 3 minutes (from last auto-save)
  → Timer resumes from localStorage
  → AUTO-SAVE continues every 30s
```

---

## Success Criteria

**Test Passes If:**

1. ✅ Auto-save logs appear in console
2. ✅ Saves happen approximately every 30 seconds
3. ✅ Refreshing page preserves focus time
4. ✅ Timer resumes correctly after refresh
5. ✅ No errors in browser or backend console

**Test Fails If:**

1. ❌ No auto-save logs appear
2. ❌ Focus time resets on refresh
3. ❌ Errors appear in console
4. ❌ Timer doesn't resume after refresh

---

## Servers Status

✅ **Backend:** Running on port 3001 (just restarted)
✅ **Frontend:** Running on port 8080
✅ **MongoDB:** Connected

---

## Need More Details?

See `REALTIME_AUTOSAVE_SOLUTION.md` for:

- Complete technical architecture
- Database schema changes
- API endpoint specifications
- Advanced testing scenarios
- Troubleshooting guide

---

**Ready to test! Try it now and let me know if you see the auto-save logs.** 🎯
