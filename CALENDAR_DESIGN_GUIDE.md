# 🎯 Focus Streak Calendar - Design Guide

## 🎨 Visual Design

### Color Scheme

The calendar uses a beautiful gradient system inspired by your reference image:

#### Intensity Levels (6 levels):

1. **Level 0** - Gray (No activity)
   - `bg-gray-200` / `dark:bg-gray-700`
2. **Level 1** - Light Yellow (1-29 minutes)
   - `bg-yellow-200` / `dark:bg-yellow-800/40`
3. **Level 2** - Medium Yellow (30-59 minutes)
   - `bg-yellow-300` / `dark:bg-yellow-700/60`
4. **Level 3** - Bright Yellow (60-89 minutes)
   - `bg-yellow-400` / `dark:bg-yellow-600/80`
5. **Level 4** - Orange (90-119 minutes)
   - `bg-orange-300` / `dark:bg-orange-600/80`
6. **Level 5** - Fire Streak! 🔥 (120+ minutes)
   - `bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500`
   - Shows **fire icon** in the center
   - Glowing shadow effect
   - Scales to 125% on hover

### Layout Structure

```
┌─────────────────────────────────────────┐
│         Stats Cards (4 columns)         │
│  🔥 Streak  🏆 Best  🎯 Goals  ⏰ Time │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           Calendar Card                  │
│  ← JANUARY 2025 →                       │
│                                          │
│  MON  TUE  WED  THU  FRI  SAT  SUN     │
│   ⚪   🔥   ⚪   ⚪   ⚪   🔥   ⚪      │
│   ⚪   ⚪   🟡   ⚪   ⚪   ⚪   ⚪      │
│   ⚪   🔥   🔥   🔥   🔥   🔥   🔥      │
│                                          │
│  Less [⚪][🟡][🟡][🟢][🟠][🔥] More   │
└─────────────────────────────────────────┘
```

## ✨ Interactive Features

### 1. Hover Effects

- **Regular days**: Scale to 110% + shadow
- **Fire days**: Scale to 125% + glowing orange shadow
- **Today**: Blue ring indicator

### 2. Tooltips

Beautiful dark tooltip appears on hover with:

- Date (e.g., "Oct 26, 2025")
- Focus minutes with clock icon
- Session count with zap icon
- "Goal Achieved!" badge for 2+ hour days
- Arrow pointer at bottom

### 3. Month Navigation

- Left/Right arrow buttons
- Current month is uppercase and bold
- Next button disabled if viewing current month

### 4. Stats Cards

Four gradient cards showing:

1. **Day Streak** 🔥 (Orange gradient)
2. **Best Streak** 🏆 (Purple gradient)
3. **Goals Hit** 🎯 (Blue gradient)
4. **Total Time** ⏰ (Green gradient)

## 📱 Responsive Design

### Desktop (md and up)

- Stats: 4 columns
- Calendar: Full width with proper spacing
- Gap: 3 units between days

### Mobile (< md)

- Stats: 2 columns (stacked)
- Calendar: Responsive with touch-friendly sizing
- Smaller gaps for better fit

## 🎭 Animation & Transitions

### Smooth Transitions

- All elements: `transition-all duration-300`
- Hover states: Scale + shadow changes
- Tooltip: Opacity fade (200ms)

### Special Effects

- **Fire days**: Pulse animation when it's today
- **Loading**: Skeleton pulse animation
- **Hover**: Transform scale with ease

## 🎯 User Experience

### Goal Achievement

- **Target**: 2 hours (120 minutes) per day
- **Reward**: Fire icon 🔥 appears in cell
- **Visual feedback**: Gradient glow effect
- **Streak tracking**: Automatic calculation

### Information Hierarchy

1. **Primary**: Fire streaks (most prominent)
2. **Secondary**: Colored intensity levels
3. **Tertiary**: Gray inactive days
4. **Context**: Stats at top for quick overview

### Accessibility

- Clear color contrast
- Hover states for all interactive elements
- Tooltips for additional context
- Keyboard navigation support
- Screen reader friendly with proper titles

## 🔥 Fire Icon Placement

The fire icon appears when:

- Day has 120+ minutes (2+ hours)
- Rendered as: `<Flame className="w-5 h-5 text-white drop-shadow-lg" />`
- Centered in the circle
- White color for maximum contrast
- Drop shadow for depth

## 📊 Data Flow

```
User completes Pomodoro
        ↓
Auto-recorded to DB
        ↓
Calendar fetches data
        ↓
Calculates intensity
        ↓
Renders with fire icon if achieved
        ↓
Updates streak stats
```

## 🎨 Design Tokens

### Shadows

- Cards: `shadow-lg` and `shadow-xl`
- Fire days: `shadow-orange-300/50`
- Hover fire: `shadow-orange-400/60`

### Rounded Corners

- Cards: `rounded-lg` and `rounded-xl`
- Calendar cells: `rounded-full` (perfect circles)
- Buttons: `rounded-full`

### Spacing

- Card padding: `p-6` and `p-8`
- Grid gap: `gap-3` and `gap-4`
- Content spacing: `space-y-6`

## 🌙 Dark Mode

Full dark mode support with:

- Gray backgrounds with opacity
- Adjusted color intensities
- Maintained contrast ratios
- Subtle glow effects

### Dark Mode Colors

- Background: Darker variants with opacity
- Text: Lighter shades for readability
- Borders: Subtle gray tones
- Gradients: Preserved with opacity adjustments

## 📏 Dimensions

### Calendar Cells

- `aspect-square`: Perfect circles
- Width: Auto-sized within 7-column grid
- Fire icon: `w-5 h-5` (20px × 20px)

### Stats Cards

- Icon container: `w-8 h-8` (32px)
- Stat number: `text-3xl` (1.875rem)
- Label: `text-sm` (0.875rem)

## ✅ Best Practices

1. **Consistent spacing**: Using Tailwind's spacing scale
2. **Semantic colors**: Fire = achievement, Blue = today
3. **Clear hierarchy**: Stats → Calendar → Legend
4. **Smooth interactions**: All hover states are instant feedback
5. **Loading states**: Skeleton screens prevent layout shift
6. **Error handling**: Graceful fallback to mock data

---

**Design Philosophy**: Clean, modern, and motivating. The fire icon creates a gamified experience that encourages users to maintain their focus streaks!
