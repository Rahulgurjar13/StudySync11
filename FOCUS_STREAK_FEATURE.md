# Focus Streak Calendar Feature 🎯

## Overview

A LeetCode-style streak calendar that tracks your daily focus time and visualizes your productivity with a beautiful GitHub contribution-style heatmap.

## Features

### 📅 Calendar View

- **Visual Heatmap**: Color-coded calendar showing focus intensity
- **Daily Goal**: Cells turn green when you achieve 2+ hours of focus time
- **Month Navigation**: Switch between months to view historical data
- **Interactive Tooltips**: Hover over any day to see detailed stats

### 🔥 Streak Tracking

- **Current Streak**: Your ongoing streak of consecutive days achieving 2+ hours
- **Longest Streak**: Your all-time best streak
- **Auto-calculated**: Updates automatically based on your focus sessions

### 📊 Monthly Statistics

The component displays 5 key metrics:

1. **Current Streak** 🔥

   - Shows consecutive days with 2+ hours of focus
   - Resets when you miss a day

2. **Longest Streak** 🏆

   - Your all-time best streak
   - Never resets, only grows

3. **Total Focus Time** ⏰

   - Sum of all focus minutes for the month
   - Displayed as hours and minutes

4. **Days Achieved** ✅

   - Number of days you hit the 2-hour goal
   - Out of total days in the month

5. **Total Sessions** 📝
   - Count of all Pomodoro sessions completed
   - Includes both focus and break sessions

### 🎨 Color Intensity Scale

The calendar uses 6 intensity levels:

- **Gray**: No focus time (0 minutes)
- **Light Green**: 1-29 minutes
- **Green**: 30-59 minutes
- **Medium Green**: 60-89 minutes
- **Dark Green**: 90-119 minutes
- **Darkest Green**: 120+ minutes (Goal achieved! ✓)

## How It Works

### Recording Focus Sessions

When you complete a Pomodoro focus session:

1. The timer automatically records the session to the database
2. Today's focus time is updated
3. The calendar refreshes to show new data
4. Streak calculations update automatically

### Database Schema

```javascript
FocusSession {
  userId: ObjectId,
  date: Date (normalized to start of day),
  focusMinutes: Number,
  sessionsCompleted: Number,
  sessionType: 'focus' | 'break',
  achieved: Boolean (true if >= 120 minutes)
}
```

## API Endpoints

### GET `/api/focus/month/:year/:month`

Get all focus sessions for a specific month.

**Response:**

```json
{
  "sessions": [
    {
      "date": "2025-10-26",
      "focusMinutes": 150,
      "sessionsCompleted": 6,
      "achieved": true
    }
  ]
}
```

### POST `/api/focus/session`

Record a completed focus session.

**Request:**

```json
{
  "focusMinutes": 25,
  "sessionType": "focus"
}
```

### GET `/api/focus/streak`

Get current and longest streak information.

**Response:**

```json
{
  "currentStreak": 5,
  "longestStreak": 12,
  "totalDaysAchieved": 18
}
```

### GET `/api/focus/stats/:year/:month`

Get statistics for a specific month.

**Response:**

```json
{
  "totalMinutes": 3000,
  "totalSessions": 120,
  "daysAchieved": 20,
  "totalDays": 26
}
```

## Usage

### Viewing Your Calendar

1. Navigate to the home page
2. Click the **"Streak"** tab
3. View your current month's progress
4. Use arrow buttons to navigate between months

### Building Your Streak

1. Complete Pomodoro focus sessions (minimum 25 minutes)
2. Aim for 120 minutes (2 hours) daily to keep your streak alive
3. The calendar automatically turns green when you achieve the goal
4. Try to maintain your streak for as long as possible!

### Tips for Success

- **Consistency > Intensity**: Small daily progress beats occasional marathons
- **Set Reminders**: Use the Pomodoro timer notifications
- **Partner Accountability**: Share your screen in Study Rooms
- **Track Progress**: Check your streak regularly to stay motivated

## Component Integration

The component is integrated into the main dashboard:

```tsx
import { FocusStreakCalendar } from "@/components/FocusStreakCalendar";

// In your page component
<FocusStreakCalendar />;
```

## Data Storage

### Backend (MongoDB)

- All focus sessions are stored in the database
- Persistent across sessions and devices
- Automatic data aggregation for stats

### Fallback (LocalStorage)

- Mock data generation for demo purposes
- Used when API is unavailable
- Automatically syncs when connection is restored

## Future Enhancements

### Planned Features

- [ ] Weekly/Yearly views
- [ ] Export data as CSV/JSON
- [ ] Comparison with partners
- [ ] Personal best notifications
- [ ] Custom goal setting (beyond 2 hours)
- [ ] Detailed session breakdown
- [ ] Productivity insights and recommendations
- [ ] Share your streak on social media

### Analytics Integration

- Track most productive hours
- Identify productivity patterns
- Compare weekday vs weekend performance
- Category-based focus tracking

## Troubleshooting

### Calendar not updating?

- Ensure backend server is running
- Check browser console for errors
- Verify you're logged in
- Try refreshing the page

### Streak seems incorrect?

- Streak counts consecutive days with 2+ hours
- Today doesn't count until the day is complete
- Check individual day details by hovering

### No data showing?

- Complete at least one Pomodoro session
- Wait for the timer to fully complete
- Check the database connection

## Development

### Running Locally

```bash
# Start backend
cd server
npm run dev

# Start frontend
npm run dev
```

### Testing

1. Complete a 25-minute Pomodoro session
2. Check the calendar - today should update
3. Verify database entry in MongoDB
4. Test streak calculation

## Credits

Inspired by:

- LeetCode problem-solving streaks
- GitHub contribution graphs
- Duolingo learning streaks

Built with ❤️ for productive learners!
