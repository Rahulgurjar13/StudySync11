# 🎯 Anti-Cheat Point System Documentation

## Overview

This application implements a robust, tamper-proof point system that rewards genuine productivity while preventing exploitation through tick/untick abuse and other cheating methods.

## Point Rules

### Focus Sessions

- **Earning Rate**: 1 XP per minute of focused work
- **Minimum Duration**: 5 minutes (prevents gaming with quick toggles)
- **Award Timing**: Points are awarded ONLY when session completes successfully
- **Anti-Cheat**:
  - Backend verifies session duration before awarding points
  - Each session can only award points once (checked by `focusSessionId`)
  - Points based on verified backend session tracking, not client-side timer

### Task Completion

- **Completion Bonus**: +10 XP (first time only)
- **Uncompletion Penalty**: -5 XP (prevents tick/untick abuse)
- **Lock Duration**: 5 minutes
- **Anti-Cheat**:
  - Points awarded only once per task (checked by `taskId`)
  - If you uncheck within 5 minutes of checking, you get an error and no points awarded
  - If you check again within 5 minutes of unchecking, you get an error and no points awarded
  - Rapid toggling is prevented by time-based locks
  - All transactions are logged with timestamps for audit trail

### Streaks

- **7-Day Streak**: +50 XP bonus
- **30-Day Streak**: +100 XP bonus
- **Anti-Cheat**: Can only receive streak bonus once per day for each milestone

### Partnerships

- **First Partnership**: +25 XP bonus
- **Anti-Cheat**: One-time bonus only

## Anti-Cheat Mechanisms

### 1. **Backend Verification**

All point calculations and awards happen on the **backend**, not the client. The frontend cannot manipulate point values.

### 2. **Transaction History**

Every point transaction is logged in the database with:

- User ID
- Points awarded/deducted
- Transaction type
- Timestamp
- Metadata (task ID, focus session ID, etc.)
- Previous and new balance

This creates an **immutable audit trail** that can detect suspicious patterns.

### 3. **Duplicate Prevention**

- Each focus session can only award points once (checked by `focusSessionId`)
- Each task completion can only award points once (checked by `taskId`)
- System checks for existing transactions before awarding new points

### 4. **Time-Based Locks**

Tasks have a **5-minute lock period**:

- After completing a task, it must stay completed for 5 minutes
- After uncompleting a task, you must wait 5 minutes to earn points again
- This prevents rapid tick/untick exploitation

### 5. **Minimum Duration Requirements**

- Focus sessions must be **at least 5 minutes** to earn any points
- This prevents gaming the system with 1-second focus toggles

### 6. **Penalty System**

- Unchecking a completed task: **-5 XP penalty**
- This discourages tick/untick abuse
- XP cannot go below 0

### 7. **Server-Side Session Tracking**

- Focus sessions are tracked on the backend with auto-save every 30 seconds
- Session duration is verified server-side before points are awarded
- Client cannot fake session duration

## Level System

### Formula

```
Level = floor(sqrt(XP / 100)) + 1
```

### XP Requirements

- Level 1: 0-99 XP
- Level 2: 100-399 XP
- Level 3: 400-899 XP
- Level 4: 900-1599 XP
- Level 5: 1600-2499 XP
- And so on...

### Next Level Calculation

```
XP for Level N = N² × 100
```

## Database Schema

### PointTransaction Model

```javascript
{
  userId: ObjectId,              // Who earned/lost points
  points: Number,                // Amount (positive or negative)
  type: String,                  // Transaction type (enum)
  reason: String,                // Human-readable description
  metadata: {
    taskId: ObjectId,            // Related task (if applicable)
    focusSessionId: ObjectId,    // Related focus session (if applicable)
    focusMinutes: Number,        // Duration of focus session
    streakDays: Number,          // Streak milestone
    previousBalance: Number,     // XP before transaction
    newBalance: Number           // XP after transaction
  },
  awardedAt: Date,              // When points were awarded
  createdAt: Date,              // Auto-generated timestamp
  updatedAt: Date               // Auto-generated timestamp
}
```

### User Model (Updated)

```javascript
{
  email: String,
  password: String,
  fullName: String,
  profile: {
    avatarUrl: String,
    xp: Number,                  // Total experience points
    level: Number,               // Calculated level
    streak: Number,              // Current daily streak
    lastActive: Date
  }
}
```

## API Endpoints

### Get Current Points

```
GET /api/points/me
Authorization: Bearer <token>

Response:
{
  xp: 450,
  level: 3,
  xpForNextLevel: 900,
  xpInCurrentLevel: 50,
  xpNeededForLevel: 500,
  progressToNextLevel: 10
}
```

### Get Point History

```
GET /api/points/history?limit=50
Authorization: Bearer <token>

Response:
{
  transactions: [
    {
      _id: "...",
      points: 25,
      type: "FOCUS_SESSION_COMPLETED",
      reason: "Completed 25 minutes of focus time",
      metadata: { focusMinutes: 25, ... },
      createdAt: "2025-10-28T..."
    },
    ...
  ]
}
```

### Get Point Statistics

```
GET /api/points/stats
Authorization: Bearer <token>

Response:
{
  totalEarned: 500,
  totalLost: 50,
  netPoints: 450,
  pointsByType: [...],
  last7Days: 120,
  transactionCount: 45
}
```

### Get Leaderboard

```
GET /api/points/leaderboard?limit=10
Authorization: Bearer <token>

Response:
{
  leaderboard: [
    { rank: 1, fullName: "Alice", xp: 2500, level: 6 },
    { rank: 2, fullName: "Bob", xp: 1800, level: 5 },
    ...
  ],
  currentUserRank: 15,
  currentUserXP: 450,
  currentUserLevel: 3
}
```

## Example Scenarios

### Scenario 1: Honest User

1. User completes 25-minute focus session → **+25 XP**
2. User completes a task → **+10 XP**
3. Task stays completed → No penalty
4. Total: **+35 XP** ✅

### Scenario 2: Attempted Tick/Untick Abuse

1. User completes a task → **+10 XP**
2. User immediately unchecks task (within 5 min) → **Error: "Task must be completed for at least 5 minutes"**
3. Points not deducted, task uncompletion prevented ⛔

### Scenario 3: Legitimate Task Uncompletion

1. User completes a task → **+10 XP**
2. 6 minutes later, user realizes task not done → Unchecks → **-5 XP penalty**
3. User tries to check again immediately → **Error: "Task was uncompleted recently. Wait 5 minutes"**
4. Net result: **+5 XP** (discouraged but not prevented) ⚠️

### Scenario 4: Short Focus Session Abuse

1. User starts focus session for 30 seconds
2. User stops session → **No points awarded** (minimum 5 minutes required)
3. System logs: "Points not awarded: Minimum 5 minutes required" ⛔

### Scenario 5: Duplicate Session Points

1. User completes 20-minute session → **+20 XP**
2. System tries to award points again for same session → **Blocked: "Points already awarded for this session"** ⛔

## Testing the Anti-Cheat System

### Test Case 1: Minimum Focus Duration

```javascript
// Should NOT award points
POST / api / focus / session;
{
  focusMinutes: 4;
}
// Expected: Session recorded but no points

// Should award points
POST / api / focus / session;
{
  focusMinutes: 5;
}
// Expected: +5 XP
```

### Test Case 2: Rapid Task Toggle

```javascript
// Complete task
PUT /api/tasks/:id
{ completed: true }
// Expected: +10 XP

// Try to uncheck immediately (< 5 min)
PUT /api/tasks/:id
{ completed: false }
// Expected: Error message, no penalty

// Wait 5+ minutes, then uncheck
PUT /api/tasks/:id
{ completed: false }
// Expected: -5 XP penalty

// Try to check immediately (< 5 min)
PUT /api/tasks/:id
{ completed: true }
// Expected: Error message, no points
```

### Test Case 3: Duplicate Points

```javascript
// First completion
POST /api/focus/session
{ focusMinutes: 10, sessionId: "abc123" }
// Expected: +10 XP

// Second completion (same session)
POST /api/focus/session
{ focusMinutes: 10, sessionId: "abc123" }
// Expected: No points, "already awarded" message
```

## Security Considerations

1. **All point logic is server-side** - Client cannot manipulate values
2. **Transaction history is immutable** - Creates audit trail for detecting abuse
3. **Time-based locks** prevent rapid exploitation
4. **Minimum durations** prevent micro-gaming
5. **Penalty system** discourages bad behavior
6. **Duplicate prevention** ensures one reward per achievement
7. **Backend session verification** prevents time manipulation

## Future Enhancements

1. **Pattern Detection**: Analyze user behavior to detect suspicious patterns
2. **Rate Limiting**: Limit number of task completions per hour
3. **Admin Dashboard**: View point transactions and flag suspicious accounts
4. **Point Decay**: Reduce points over time for inactive users
5. **Achievement System**: Award bonus points for meaningful milestones
6. **Peer Verification**: Require partner confirmation for shared task completion

## Conclusion

This point system is designed to:

- ✅ Reward genuine productivity
- ✅ Prevent tick/untick abuse with time locks
- ✅ Discourage cheating with penalties
- ✅ Create transparent audit trail
- ✅ Verify all data server-side
- ✅ Make exploitation unprofitable

The system balances **fairness** with **user experience**, ensuring that honest users are rewarded while making it difficult and unrewarding to game the system.
