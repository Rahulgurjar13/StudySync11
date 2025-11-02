// Check localStorage state
const state = localStorage.getItem('pomodoroState');
console.log('=== localStorage pomodoroState ===');
console.log(state);

if (state) {
  const parsed = JSON.parse(state);
  console.log('\n=== Parsed State ===');
  console.log('isActive:', parsed.isActive);
  console.log('mode:', parsed.mode);
  console.log('sessionStartTime:', parsed.sessionStartTime);
  console.log('lastSavedTime:', parsed.lastSavedTime);
  console.log('focusMinutes:', parsed.focusMinutes);
  
  if (parsed.sessionStartTime) {
    const now = Date.now();
    const elapsed = now - parsed.sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    console.log('\n=== Calculated ===');
    console.log('Elapsed ms:', elapsed);
    console.log('Elapsed minutes:', minutes);
    console.log('Session started:', new Date(parsed.sessionStartTime).toLocaleTimeString());
    console.log('Current time:', new Date(now).toLocaleTimeString());
  }
}
