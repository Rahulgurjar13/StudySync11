# 🔥 COMPLETE REWRITE - Simple & Bulletproof Focus Time

## The REAL Problem

The timer is too complex with multiple sources calculating focus time:

1. ❌ `totalFocusTime` state updates every second in countdown
2. ❌ `dbFocusMinutes` sometimes used, sometimes not
3. ❌ Multiple places calculating elapsed time differently
4. ❌ Race conditions between state updates

## The Solution: ONE Function, ONE Source of Truth

```typescript
// Single function that calculates current focus time
const getCurrentFocusTime = () => {
  let total = dbFocusMinutes; // Start with completed sessions from DB

  // Add current session if active
  if (isActive && mode === "focus" && startTimeRef.current > 0) {
    const elapsedMs = Date.now() - startTimeRef.current;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    total += elapsedMinutes;
  }

  return total;
};
```

**That's it!** Every time we need focus time, call this function. No state updates, no race conditions.

## Implementation Plan

1. Remove `totalFocusTime` state entirely
2. Remove all the complex calculation logic from countdown
3. Add `getCurrentFocusTime()` helper
4. Use it everywhere we display focus time
5. Keep auto-save for persistence only

This will make the code 10x simpler and impossible to break.
