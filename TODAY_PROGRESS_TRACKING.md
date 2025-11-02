# Today's Progress Tracking System

## 🎯 Overview

The "Today's Progress" counter in the calendar automatically syncs with the Pomodoro timer and displays real-time focus time accumulated throughout the day.

## 📊 How It Works

### 1. **Data Flow**

```
Pomodoro Timer → Complete Session → Backend API → Database → Calendar Display
```

### 2. **Real-Time Sync Methods**

#### **Method 1: Instant Update (On Session Complete)**

- When you complete a Pomodoro focus session
- Timer calls: `api.focus.recordSession(minutes, 'focus')`
- Backend adds minutes to today's total in MongoDB
- Event fired: `window.dispatchEvent('focusSessionComplete')`
- Calendar listens and immediately refreshes

#### **Method 2: Automatic Polling (Every 10 seconds)**

- Calendar polls: `api.focus.getMonthData(year, month)`
- Finds today's session from response
- Updates progress bar and time display
- Ensures sync even if event is missed

#### **Method 3: Page Load**

- On page refresh, timer loads: `api.focus.getTodayProgress()`
- Gets accumulated time from database
- Restores correct progress state

### 3. **Database Accumulation**

**Backend Route:** `/api/focus/session` (POST)

```javascript
// When session completes:
POST /api/focus/session
{
  focusMinutes: 25,
  sessionType: 'focus'
}

// Backend logic:
if (today's session exists) {
  focusMinutes += 25  // Add to existing
  sessionsCompleted += 1
  achieved = (focusMinutes >= 120)
} else {
  Create new session with 25 minutes
}
```

### 4. **Today's Progress Display**

Located in: `src/components/CompactStreakCalendar.tsx`

**Shows:**

- Current time: `{hours}h {minutes}m` (e.g., "1h 35m")
- Goal: `/ 2h` (120 minutes target)
- Progress bar: Visual 0-100% (orange → green at 120min)
- Remaining: `{remaining} min remaining` or `✓ Goal achieved!`

### 5. **Progress Calculation**

```javascript
// Get today's data
const todayStr = "2025-10-26"; // UTC date
const session = sessions.find((s) => s.date === todayStr);
const minutes = session?.focusMinutes || 0;

// Display format
const hours = Math.floor(minutes / 60);
const mins = minutes % 60;
display: `${hours}h ${mins}m / 2h`;

// Progress bar
const percentage = Math.min(100, (minutes / 120) * 100);
color: minutes >= 120 ? "green" : "orange";
```

## 🔧 Technical Details

### **Frontend (Calendar Component)**

```typescript
// State
const [todayMinutes, setTodayMinutes] = useState(0);

// Polling every 10 seconds
useEffect(() => {
  const interval = setInterval(fetchTodayProgress, 10000);
  return () => clearInterval(interval);
}, [user]);

// Listen for timer completion
window.addEventListener("focusSessionComplete", handleRefresh);
```

### **Frontend (Timer Component)**

```typescript
// On completion
api.focus.recordSession(focusMinutes, "focus").then(() => {
  console.log("Focus session recorded");
  window.dispatchEvent(new CustomEvent("focusSessionComplete"));
});
```

### **Backend (Focus Routes)**

```javascript
router.post("/session", authenticateToken, async (req, res) => {
  const { focusMinutes } = req.body;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let session = await FocusSession.findOne({
    userId: req.user.id,
    date: today,
  });

  if (session) {
    session.focusMinutes += focusMinutes; // ACCUMULATE
    session.sessionsCompleted += 1;
    session.achieved = session.focusMinutes >= 120;
  } else {
    session = new FocusSession({
      /* new record */
    });
  }

  await session.save();
  res.json({ session });
});
```

## 📝 Database Schema

```javascript
FocusSession {
  userId: ObjectId,
  date: Date,           // Normalized to day start
  focusMinutes: Number, // Accumulated total for the day
  sessionsCompleted: Number,
  sessionType: String,  // 'focus' or 'break'
  achieved: Boolean     // true if >= 120 minutes
}
```

## 🐛 Debugging

### Check if data is being saved:

1. **Open browser console**
2. **Start a Pomodoro session** (25 minutes)
3. **Wait for completion** or skip time in localStorage
4. **Look for logs:**
   - `"Focus session recorded successfully"`
   - `"Focus session completed - refreshing calendar immediately"`
   - `"Fetching today's progress for: 2025 10"`
   - `"Setting today minutes to: 25"`

### Check database directly:

```bash
# In MongoDB shell
db.focussessions.find({ userId: ObjectId("your_user_id") })
```

### Check API response:

```bash
# Get auth token from localStorage
TOKEN="your_jwt_token"

# Fetch today's data
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/focus/month/2025/9
```

## ✅ Testing Checklist

- [ ] Start Pomodoro timer
- [ ] Complete a 25-minute session
- [ ] Check "Today's Progress" updates to "0h 25m / 2h"
- [ ] Progress bar shows ~21% filled (orange)
- [ ] Complete another session
- [ ] Progress updates to "0h 50m / 2h"
- [ ] Complete 3 more sessions (total 2h 5min)
- [ ] Progress shows "2h 5m / 2h"
- [ ] Progress bar is 100% filled (green)
- [ ] Message says "✓ Goal achieved!"
- [ ] Today's date cell has green checkmark
- [ ] Refresh page - all data persists

## 🚨 Common Issues

### "0h 0m" stuck at zero:

**Causes:**

1. Backend server not running
2. Auth token expired
3. Timer not recording sessions
4. API endpoint error

**Solutions:**

1. Check server running on port 3001
2. Re-login to get new token
3. Check browser console for errors
4. Verify MongoDB connection

### Data resets on page refresh:

**Cause:** Session not being saved to database

**Solution:** Check that `api.focus.recordSession()` is being called when timer completes

## 📊 Data Persistence

| What             | Where        | When                |
| ---------------- | ------------ | ------------------- |
| Timer state      | localStorage | Every state change  |
| Focus minutes    | MongoDB      | Session complete    |
| Daily total      | MongoDB      | Accumulated per day |
| Progress display | React state  | Every 10s + events  |

## 🎉 Expected Behavior

1. **Start Pomodoro:** Timer counts down
2. **Complete Session:** Saves 25 minutes to database
3. **Calendar Updates:** "Today's Progress" shows 25 minutes
4. **Continue Working:** Each session adds to total
5. **Reach 2 Hours:** Calendar cell turns green with ✓
6. **Next Day:** Counter resets to 0h 0m for new day
7. **Past Days:** Historical data preserved forever

## 🔄 Sync Frequency

- **Instant:** On timer completion (0 seconds)
- **Polling:** Every 10 seconds
- **On Load:** When page opens
- **On Month Change:** When calendar navigates

---

**Status:** ✅ Fully Implemented and Working
**Last Updated:** October 26, 2025
