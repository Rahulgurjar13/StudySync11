# Testing Focus Session Recording

## 🧪 How to Test

### Method 1: Quick Test Button (RECOMMENDED)

Open browser console (F12) and run:

```javascript
// Test recording 25 minutes
fetch("http://localhost:3001/api/focus/session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + localStorage.getItem("authToken"),
  },
  body: JSON.stringify({
    focusMinutes: 25,
    sessionType: "focus",
  }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Session recorded:", data);
    window.dispatchEvent(new CustomEvent("focusSessionComplete"));
  })
  .catch((err) => console.error("❌ Error:", err));
```

### Method 2: Complete Real Pomodoro Session

1. Click "Start" on the Pomodoro timer
2. Wait 25 minutes OR manually edit localStorage:
   ```javascript
   // Skip time (in browser console)
   const state = JSON.parse(localStorage.getItem("pomodoroState"));
   state.timeLeft = 1; // 1 second left
   localStorage.setItem("pomodoroState", JSON.stringify(state));
   location.reload(); // Timer will complete in 1 second
   ```

### Method 3: Add Multiple Sessions

```javascript
// Add 3 sessions (1h 15min total)
for (let i = 0; i < 3; i++) {
  fetch("http://localhost:3001/api/focus/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("authToken"),
    },
    body: JSON.stringify({ focusMinutes: 25, sessionType: "focus" }),
  })
    .then((res) => res.json())
    .then((d) => console.log("Session", i + 1, ":", d));
}

// Trigger refresh
setTimeout(() => {
  window.dispatchEvent(new CustomEvent("focusSessionComplete"));
}, 1000);
```

### Method 4: Reach Goal (2 hours)

```javascript
// Record 120 minutes at once
fetch("http://localhost:3001/api/focus/session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + localStorage.getItem("authToken"),
  },
  body: JSON.stringify({ focusMinutes: 120, sessionType: "focus" }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("✅ Goal achieved!", data);
    window.dispatchEvent(new CustomEvent("focusSessionComplete"));
  });
```

## 📊 What Should Happen

After recording a session, within **2 seconds** you should see:

1. **Calendar "Today's Progress":**

   - Changes from "0h 0m" to actual time (e.g., "0h 25m")
   - Progress bar fills (orange until 2h, then green)
   - "120 min remaining" updates to remaining time

2. **QuickStats "Focus Time":**

   - Updates from "0.0h" to actual hours
   - Shows remaining minutes or "✓ Goal reached!"

3. **Browser Console Logs:**
   ```
   ✅ Focus session recorded successfully: {...}
   📊 Session details: { focusMinutes: 25, ... }
   📢 Dispatching focusSessionComplete event
   🎉 CALENDAR EVENT: Focus session completed
   📅 CALENDAR: Fetching today's progress...
   📊 STATS: Focus session completed - refreshing stats
   ```

## 🐛 Troubleshooting

### "Access token required" error

- You're not logged in
- Solution: Login at `/auth` first

### Console shows "❌ Failed to record focus session"

- Backend not running
- Solution: `cd server && npm start`

### Nothing updates after recording

- Event listener not working
- Solution: Refresh page and try again

### "0h 0m" persists even after recording

- Date mismatch issue
- Check console logs for date strings
- Should see: `2025-10-26 === 2025-10-26 ? true`

## ✅ Expected Final State

After recording 25 minutes × 5 sessions (125 minutes total):

- **Calendar:** "2h 5m / 2h" with green progress bar
- **Calendar Cell:** Green checkmark on today
- **QuickStats:** "2.1h" with "✓ Goal reached!"
- **Streak:** "1 day" (first day achieving goal)
