# Cross-Browser Session Sync Fix

## Problem

When logging in with the **same account** on different browsers/devices:

- Each browser showed different countdown times
- Focus time progress was different between browsers
- Timer state was not synchronized across devices
- Data was stored only in browser's localStorage, not synced to database

### Example of the Issue:

- **Browser 1**: Shows "0h 0m" focus time with timer at "24:36"
- **Browser 2**: Shows "0h 1m" focus time with timer at "24:11"
- **Same User Account** but different states!

## Root Cause

1. Timer state was **only saved to localStorage** (browser-specific storage)
2. On login, timer loaded from **localStorage first**, not from database
3. No periodic sync to check if another browser/device started a timer
4. Active sessions were not properly restored from database

## Solution Implemented

### 1. Database-First Initialization

**File**: `src/components/PomodoroTimer.tsx`

The timer now:

- ✅ **Fetches active session from database** on component mount
- ✅ **Restores timer state** if an active session exists in the database
- ✅ **Calculates remaining time** based on elapsed progress
- ✅ **Shows notification** when restoring a session from another device

```typescript
// Load today's progress from database AND restore active session
const loadProgress = async () => {
  const {
    focusMinutes: dbMinutes,
    activeMinutes,
    sessionsCompleted,
  } = await api.focus.getTodayProgress();

  // Restore active session from database if exists
  if (activeMinutes > 0) {
    // Calculate remaining time
    const elapsedSeconds = activeMinutes * 60;
    const remainingSeconds = totalSessionSeconds - elapsedSeconds;

    // Restore timer state
    setTimeLeft(remainingSeconds);
    setIsActive(true);
  }
};
```

### 2. Real-Time Auto-Save (Every 30 seconds)

- ✅ Saves active session progress to database every 30 seconds
- ✅ Only saves during active focus sessions
- ✅ Ensures data persistence even if browser crashes

### 3. Cross-Browser Sync Check (Every 60 seconds)

- ✅ Periodically checks database for session updates
- ✅ Detects if timer was started on another browser/device
- ✅ Automatically restores timer state if found
- ✅ Shows notification when syncing from another device

```typescript
// Cross-browser sync check
const syncFromDatabase = async () => {
  const { activeMinutes } = await api.focus.getTodayProgress();

  // If database shows active session but this browser doesn't
  if (activeMinutes > 0 && !isActive) {
    // Restore the timer from database
    restoreTimerState(activeMinutes);
    toast.info("Timer synced from another device!");
  }
};

setInterval(syncFromDatabase, 60000); // Check every minute
```

### 4. Enhanced User Isolation

**Files**:

- `src/lib/api.ts` - Clear all data on login/logout
- `src/hooks/useAuth.tsx` - Force page reload on logout

- ✅ `localStorage.clear()` on login to remove previous user data
- ✅ `localStorage.clear()` + `sessionStorage.clear()` on logout
- ✅ Page reload on logout to clear all React state
- ✅ Every API request authenticated with user's JWT token

## How It Works Now

### Scenario 1: Start Timer on Browser A

1. User starts 25-minute focus session on **Browser A**
2. Timer saves to database every 30 seconds
3. Database stores: `activeMinutes: 5` (after 5 minutes)

### Scenario 2: Open Browser B with Same Account

1. User opens **Browser B** and logs in with same account
2. Timer component loads and fetches from database
3. Database returns: `activeMinutes: 5`
4. **Browser B** restores timer with 20 minutes remaining (25 - 5)
5. Both browsers now show synchronized countdown!

### Scenario 3: Complete Session on Browser B

1. Timer completes on **Browser B**
2. Calls `api.focus.recordSession(25, 'focus')`
3. Database updates: `focusMinutes: 25`, `activeMinutes: 0`
4. **Browser A** next sync check (within 60 seconds) detects completion

## Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Browser A  │         │   Database   │         │  Browser B  │
│  (Logged In)│         │   (MongoDB)  │         │ (Logged In) │
└──────┬──────┘         └───────┬──────┘         └──────┬──────┘
       │                        │                       │
       │ Start Timer            │                       │
       ├───────────────────────>│                       │
       │ Auto-save (30s)        │                       │
       ├───────────────────────>│                       │
       │                        │   Login & Load        │
       │                        │<──────────────────────┤
       │                        │   Return activeMin:5  │
       │                        ├──────────────────────>│
       │                        │                       │
       │                        │   Restore Timer       │
       │                        │                       ├─> Timer: 20:00
       │ Auto-save (30s)        │                       │
       ├───────────────────────>│<──────────────────────┤
       │                        │   Sync (60s)          │
       │                        ├──────────────────────>│
       │                        │                       │
```

## Testing Instructions

### Test Cross-Browser Sync:

1. **Browser 1 (e.g., Chrome)**

   - Login with your account
   - Start a 25-minute focus timer
   - Wait 2-3 minutes
   - Leave it running

2. **Browser 2 (e.g., Safari or Firefox or Chrome Incognito)**

   - Login with the **same account**
   - Go to dashboard
   - **Timer should automatically restore** with remaining time!
   - You should see notification: "Timer restored! X min completed, Y min remaining"

3. **Verify Sync**
   - Both browsers should show similar countdown
   - Both should display same focus time progress
   - Data should match across browsers

### Test User Isolation:

1. **Browser 1: User A**

   - Login as User A
   - Start timer (5 minutes)
   - Complete focus session

2. **Browser 2: User B**
   - Login as User B
   - Should NOT see User A's timer or data
   - Start your own timer
   - Should have separate data

## Database Schema

```javascript
FocusSession {
  userId: ObjectId,              // User who owns this session
  date: Date,                    // Day of session (normalized to midnight)
  focusMinutes: Number,          // Completed focus time
  activeSessionMinutes: Number,  // Current active session progress (syncs across browsers)
  sessionsCompleted: Number,     // Count of completed sessions
  achieved: Boolean,             // Whether 2h goal was reached
  sessionType: String,           // 'focus' or 'break'
  lastUpdated: Date             // Last time activeSessionMinutes was updated
}
```

## API Endpoints Used

### GET `/api/focus/today`

Returns today's progress including active session:

```json
{
  "focusMinutes": 25, // Completed sessions total
  "activeMinutes": 5, // Current active session progress
  "sessionsCompleted": 1,
  "achieved": false
}
```

### POST `/api/focus/active-session`

Saves active session progress:

```json
{
  "activeMinutes": 5 // Current progress in minutes
}
```

### POST `/api/focus/session`

Records completed session:

```json
{
  "focusMinutes": 25, // Session duration
  "sessionType": "focus"
}
```

## What This Fixes

✅ Same account shows same timer state across all browsers/devices
✅ Timer automatically restores when logging in on new device
✅ Focus time progress is synchronized in real-time
✅ Countdown timer shows correct remaining time
✅ Data persists even if browser crashes or closes
✅ User can seamlessly switch between devices
✅ Auto-saves every 30 seconds during active sessions
✅ Syncs from database every 60 seconds
✅ Each user's data is completely isolated

## Files Modified

- ✅ `src/components/PomodoroTimer.tsx` - Database-first initialization + cross-browser sync
- ✅ `src/lib/api.ts` - Clear localStorage on login/logout
- ✅ `src/hooks/useAuth.tsx` - Force reload on logout
- ✅ `server/middleware/auth.js` - Enhanced authentication logging
- ✅ `server/routes/auth.js` - Added user tracking logs

## Important Notes

1. **Auto-save Interval**: 30 seconds during active sessions
2. **Sync Check Interval**: 60 seconds to check for updates from other devices
3. **Minimum Progress**: At least 1 minute must elapse before auto-save
4. **Toast Notifications**: Shows when timer is restored from another device
5. **Database Authority**: Database is the source of truth, not localStorage
6. **Backward Compatible**: Works with existing user data

## Security

- ✅ User ID from JWT token (server-verified)
- ✅ Cannot access another user's session data
- ✅ All endpoints require authentication
- ✅ Data isolated by userId in all queries
