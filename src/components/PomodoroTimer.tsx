import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Timer, Settings, Bell, BellOff, Volume2, Coffee } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { calculateCurrentFocusTime } from "@/lib/focusTimeCalculator";
import type { Socket } from 'socket.io-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TimerMode = 'focus' | 'break';

interface PomodoroTimerProps {
  socket?: Socket | null;
  roomCode?: string;
  userName?: string;
}

export const PomodoroTimer = ({ socket, roomCode, userName }: PomodoroTimerProps = {}) => {
  const { user } = useAuth();
  
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const saved = localStorage.getItem('pomodoroState');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if there was an active session
        if (parsed.isActive && parsed.sessionStartTime && parsed.lastSavedTime) {
          // Calculate how much time has passed since we last saved
          const timeSinceLastSave = Date.now() - parsed.lastSavedTime;
          const secondsSinceLastSave = Math.floor(timeSinceLastSave / 1000);
          
          // Calculate remaining time accounting for time that passed
          const remainingTime = Math.max(0, parsed.timeLeft - secondsSinceLastSave);
          
          console.log('🔄 RESTORE: Restoring timer state', {
            wasActive: true,
            savedTimeLeft: parsed.timeLeft,
            timeSinceLastSave: secondsSinceLastSave,
            remainingTime,
            willContinue: remainingTime > 0
          });
          
          return {
            ...parsed,
            timeLeft: remainingTime,
            isActive: remainingTime > 0,
            // Keep the original session start time
            sessionStartTime: parsed.sessionStartTime
          };
        }
        return parsed;
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
    return null;
  };

  const persistedState = loadPersistedState();
  
  // Timer State
  const [mode, setMode] = useState<TimerMode>(persistedState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(persistedState?.timeLeft || 25 * 60);
  const [isActive, setIsActive] = useState(persistedState?.isActive || false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Settings
  const [focusMinutes, setFocusMinutes] = useState(persistedState?.focusMinutes || 25);
  const [breakMinutes, setBreakMinutes] = useState(persistedState?.breakMinutes || 5);
  const [soundEnabled, setSoundEnabled] = useState(persistedState?.soundEnabled ?? true);
  const [volume, setVolume] = useState(persistedState?.volume || 70);
  
  // Stats
  const [completedSessions, setCompletedSessions] = useState(persistedState?.completedSessions || 0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [dbFocusMinutes, setDbFocusMinutes] = useState(0);
  const [elapsedTimeWhenPaused, setElapsedTimeWhenPaused] = useState(persistedState?.elapsedTimeWhenPaused || 0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartTimeRef = useRef<number>(persistedState?.sessionStartTime || 0);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      mode,
      timeLeft,
      isActive,
      focusMinutes,
      breakMinutes,
      soundEnabled,
      volume,
      completedSessions,
      sessionStartTime: sessionStartTimeRef.current,
      elapsedTimeWhenPaused,
      lastSavedTime: Date.now() // Save current time for restoration
    };
    localStorage.setItem('pomodoroState', JSON.stringify(state));
    
    window.dispatchEvent(new CustomEvent('timerStateChange', {
      detail: {
        isActive,
        mode,
        sessionStartTime: sessionStartTimeRef.current,
        elapsedTimeWhenPaused,
        timeLeft,
        focusMinutes
      }
    }));
  }, [mode, timeLeft, isActive, focusMinutes, breakMinutes, soundEnabled, volume, completedSessions, elapsedTimeWhenPaused]);

  const alarmSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBgoODhIODgoGAfXt5d3VyDy4rKCUiHxsYFRILBwcGBgYGBgYGBwcHCAkKCwwNDg8QERITExQVFRYXFxgYGRkZGhoaGhoaGhoaGRkZGBgXFxYVFRQTExIREA8ODQwLCgkIBwcGBgYGBgYGBgcLEhUYGx8iJSgrLjBydXd5e32AgYKDg4SBgX59enl2dHJvbGllYl9cWVZTUE1KR0RBPjo3NDEvLComIyAdGhcUERENDAoJBwYFBAQDAwICAgICAgICAwMEBAUGBwgKCwwOEBIUFhgbHSAjJiksLzE0Nzs+QURHSk1QU1ZZXGJlZ2ttcHR2eXx+gA==';

  // Save progress before page unload/logout (critical data protection)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If there's an active focus session, save it immediately
      if (isActive && mode === 'focus' && user && sessionStartTimeRef.current) {
        const calculation = calculateCurrentFocusTime(dbFocusMinutes);
        
        if (calculation.activeMinutes > 0) {
          console.log('💾 UNLOAD SAVE: Saving before page close:', calculation.activeMinutes, 'minutes');
          
          const token = localStorage.getItem('authToken');
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          
          if (token) {
            // Use synchronous fetch with keepalive for reliable save during unload
            fetch(`${apiUrl}/focus/active-session`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ activeMinutes: calculation.activeMinutes }),
              keepalive: true // Ensures request completes even if page closes
            }).catch(err => console.error('❌ Unload save failed:', err));
          }
        }
      }
    };

    // Listen for page unload/close/refresh
    window.addEventListener('beforeunload', handleBeforeUnload);
    // Listen for visibility change (tab switching, minimize)
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleBeforeUnload();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save one last time when component unmounts (logout, navigation)
      handleBeforeUnload();
    };
  }, [isActive, mode, user, dbFocusMinutes]);

  // Initialize audio and load today's progress
  useEffect(() => {
    audioRef.current = new Audio(alarmSound);
    audioRef.current.volume = volume / 100;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Load today's progress from database
    const loadProgress = async () => {
      if (!user) return;
      
      try {
        console.log('📊 TIMER: Loading today progress from database...');
        const { focusMinutes: dbMinutes, sessionsCompleted } = await api.focus.getTodayProgress();
        console.log('📊 TIMER: Database returned:', { dbMinutes, sessionsCompleted });
        
        // Always update dbFocusMinutes with the database value
        setDbFocusMinutes(dbMinutes);
        
        // Calculate current session progress using shared function
        const calculation = calculateCurrentFocusTime(dbMinutes);
        setTotalFocusTime(calculation.totalMinutes);
        
        console.log('✅ TIMER: Focus time loaded:', {
          dbMinutes: calculation.dbMinutes,
          activeMinutes: calculation.activeMinutes,
          totalMinutes: calculation.totalMinutes,
          isActive: calculation.isActive,
          mode: calculation.mode
        });
      } catch (err) {
        console.error('❌ TIMER: Failed to load progress:', err);
        setDbFocusMinutes(0);
        setTotalFocusTime(0);
      }
    };
    
    loadProgress();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [user, isActive, mode]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          const newTime = time - 1;

          // Update total focus time based on actual elapsed time using shared calculator
          if (mode === 'focus') {
            const calculation = calculateCurrentFocusTime(dbFocusMinutes);
            setTotalFocusTime(calculation.totalMinutes);
          }

          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, mode, focusMinutes, dbFocusMinutes]);

  // Real-time auto-save: Save progress every 30 seconds during active focus session
  // This ensures data persistence for login/logout and prevents data loss
  useEffect(() => {
    if (!isActive || mode !== 'focus' || !user || !sessionStartTimeRef.current) {
      return; // Only save during active focus sessions
    }

    const saveProgress = async () => {
      try {
        const calculation = calculateCurrentFocusTime(dbFocusMinutes);
        
        // Only save if there's meaningful progress (at least 1 minute)
        if (calculation.activeMinutes < 1) {
          return;
        }

        console.log('💾 AUTO-SAVE: Saving active session progress:', {
          dbMinutes: calculation.dbMinutes,
          activeMinutes: calculation.activeMinutes,
          sendingToServer: calculation.activeMinutes
        });

        // CRITICAL: Send ONLY active minutes to server (not total)
        // Server will keep this separate from completed minutes
        const result = await api.focus.updateActiveSession(calculation.activeMinutes);
        
        console.log('✅ AUTO-SAVE: Server response:', result);
        
        // Trigger UI update for other components (calendar, stats)
        window.dispatchEvent(new CustomEvent('timerStateChange'));
        
      } catch (err) {
        console.error('❌ AUTO-SAVE: Failed', err);
      }
    };

    // Save immediately after 1 minute
    const initialTimeout = setTimeout(saveProgress, 60000); // 1 minute

    // Then save every 30 seconds
    const autoSaveInterval = setInterval(saveProgress, 30000); // 30 seconds

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(autoSaveInterval);
    };
  }, [isActive, mode, user, dbFocusMinutes]); // dbFocusMinutes ensures we use latest base value

  // Listen for partner focus updates
  useEffect(() => {
    if (!socket) return;

    const handlePartnerFocusStart = ({ userName: partnerName, sessionType }: any) => {
      toast.success(`🎯 ${partnerName} started ${sessionType === 'focus' ? 'focusing' : 'a break'}!`, {
        description: 'Stay motivated together!'
      });
    };

    const handlePartnerFocusComplete = ({ userName: partnerName, sessionType, duration }: any) => {
      const minutes = Math.floor(duration / 60);
      toast.success(`🎉 ${partnerName} completed ${sessionType === 'focus' ? 'a focus session' : 'a break'}!`, {
        description: `${minutes} minutes - Great work!`
      });
    };

    const handlePartnerFocusPause = ({ userName: partnerName }: any) => {
      toast.info(`⏸️ ${partnerName} paused their timer`);
    };

    const handlePartnerFocusResume = ({ userName: partnerName }: any) => {
      toast.info(`▶️ ${partnerName} resumed their timer`);
    };

    socket.on('partner-focus-start', handlePartnerFocusStart);
    socket.on('partner-focus-complete', handlePartnerFocusComplete);
    socket.on('partner-focus-pause', handlePartnerFocusPause);
    socket.on('partner-focus-resume', handlePartnerFocusResume);

    return () => {
      socket.off('partner-focus-start', handlePartnerFocusStart);
      socket.off('partner-focus-complete', handlePartnerFocusComplete);
      socket.off('partner-focus-pause', handlePartnerFocusPause);
      socket.off('partner-focus-resume', handlePartnerFocusResume);
    };
  }, [socket, userName]);

  const playAlarm = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      
      // Play 3 times
      setTimeout(() => audioRef.current?.play().catch(() => {}), 1000);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 2000);
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          mode === 'focus' ? '🎉 Focus Complete!' : '☕ Break Over!',
          {
            body: mode === 'focus' ? 'Great job! Time for a break.' : 'Ready to focus again?',
            icon: '/favicon.ico',
            requireInteraction: true
          }
        );
      }
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    playAlarm();

    if (mode === 'focus') {
      const sessionTime = focusMinutes * 60;
      const sessionMinutes = focusMinutes;
      setCompletedSessions(prev => prev + 1);

      // Record focus session to database FIRST, then update UI
      if (user) {
        console.log('🎯 TIMER COMPLETE - Recording session:', sessionMinutes, 'minutes');
        console.log('🔑 User authenticated:', !!user, 'Token:', !!localStorage.getItem('authToken'));

        api.focus.recordSession(sessionMinutes, 'focus')
          .then((session) => {
            console.log('✅ Focus session recorded successfully:', session);
            console.log('📊 Session details:', {
              focusMinutes: session.focusMinutes,
              sessionsCompleted: session.sessionsCompleted,
              achieved: session.achieved,
              points: session.points
            });

            // Show point notification if points were awarded
            if (session.points?.awarded) {
              const pointsAwarded = session.points.awarded;
              const newLevel = session.points.level;
              const newBalance = session.points.newBalance;
              
              toast.success(`🎯 +${pointsAwarded} XP Earned!`, {
                description: `${sessionMinutes} min focus • Total: ${newBalance} XP (Level ${newLevel})`,
                duration: 5000,
              });
            } else if (sessionMinutes < 5) {
              toast.info("⏱️ Session too short", {
                description: "Complete at least 5 minutes to earn XP",
                duration: 3000,
              });
            }

            // Reload today's progress to get accurate database value
            return api.focus.getTodayProgress();
          })
          .then(({ focusMinutes: dbMinutes }) => {
            console.log('🔄 TIMER: Synced with database after session complete');
            console.log('📊 TIMER: New database value:', dbMinutes, 'minutes');
            
            // Update the database reference
            setDbFocusMinutes(dbMinutes);
            
            // Clear session start time AND elapsed time since session is complete
            sessionStartTimeRef.current = 0;
            setElapsedTimeWhenPaused(0);
            
            // Calculate total using shared function (should just be dbMinutes since session is complete)
            const calculation = calculateCurrentFocusTime(dbMinutes);
            setTotalFocusTime(calculation.totalMinutes);
            
            console.log('✅ TIMER: Focus time after session:', {
              dbMinutes: calculation.dbMinutes,
              activeMinutes: calculation.activeMinutes,
              totalMinutes: calculation.totalMinutes
            });
            
            // Trigger calendar refresh
            console.log('📢 Dispatching focusSessionComplete event');
            window.dispatchEvent(new CustomEvent('focusSessionComplete'));
          })
          .catch(err => {
            console.error('❌ Failed to record focus session:', err);
            toast.error('Failed to save session', {
              description: err.message || 'Please check your connection'
            });
          });
      } else {
        console.warn('⚠️ User not authenticated - session NOT recorded');
      }
      
      // Emit to room if connected
      if (socket && roomCode && userName) {
        socket.emit('focus-session-complete', {
          roomCode,
          userName,
          sessionType: 'focus',
          duration: sessionTime
        });
      }
      
      toast.success("🎉 Focus session complete!", {
        description: `${focusMinutes} minutes of focused work!`,
        action: {
          label: "Start Break",
          onClick: () => startBreak()
        }
      });
    } else {
      // Break complete
      if (socket && roomCode && userName) {
        socket.emit('focus-session-complete', {
          roomCode,
          userName,
          sessionType: 'break',
          duration: breakMinutes * 60
        });
      }
      
      toast.success("☕ Break over!", {
        description: "Ready to focus again?",
        action: {
          label: "Start Focus",
          onClick: () => startFocus()
        }
      });
    }
  };

  const startFocus = () => {
    const newStartTime = Date.now();
    sessionStartTimeRef.current = newStartTime;
    setMode('focus');
    setTimeLeft(focusMinutes * 60);
    setIsActive(true);
    setElapsedTimeWhenPaused(0); // Clear any previous elapsed time - fresh start
    
    console.log('▶️ TIMER: Starting new focus session:', {
      dbMinutes: dbFocusMinutes,
      sessionStartTime: newStartTime,
      duration: focusMinutes,
      clearedElapsed: true
    });
    
    // Emit to room if connected
    if (socket && roomCode && userName) {
      socket.emit('focus-session-start', {
        roomCode,
        userName,
        sessionType: 'focus',
        duration: focusMinutes * 60
      });
    }
    
    // Dispatch event to update other components
    window.dispatchEvent(new CustomEvent('timerStateChange'));
    
    toast.info(`⏱️ Focus session started - ${focusMinutes} minutes`);
  };

  const startBreak = () => {
    const newStartTime = Date.now();
    sessionStartTimeRef.current = newStartTime;
    setMode('break');
    setTimeLeft(breakMinutes * 60);
    setIsActive(true);
    
    // Immediately persist the new sessionStartTime
    localStorage.setItem('pomodoroState', JSON.stringify({
      mode: 'break',
      timeLeft: breakMinutes * 60,
      isActive: true,
      focusMinutes,
      breakMinutes,
      soundEnabled,
      volume,
      completedSessions,
      sessionStartTime: newStartTime,
      lastSavedTime: Date.now()
    }));
    
    // Emit to room if connected
    if (socket && roomCode && userName) {
      socket.emit('focus-session-start', {
        roomCode,
        userName,
        sessionType: 'break',
        duration: breakMinutes * 60
      });
    }
    
    toast.info(`☕ Break started - ${breakMinutes} minutes`);
  };

  const toggleTimer = () => {
    const newActiveState = !isActive;
    
    if (!newActiveState) {
      // PAUSING - Calculate and store elapsed time so far
      if (mode === 'focus' && sessionStartTimeRef.current) {
        const now = Date.now();
        const elapsedMs = now - sessionStartTimeRef.current;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        // Store the elapsed time (in seconds) - this will be added back on resume
        const totalElapsed = elapsedTimeWhenPaused + elapsedSeconds;
        setElapsedTimeWhenPaused(totalElapsed);
        
        const elapsedMinutes = Math.floor(totalElapsed / 60);
        
        console.log('⏸️ TIMER: Pausing session', {
          previousElapsed: elapsedTimeWhenPaused,
          thisSessionElapsed: elapsedSeconds,
          totalElapsed: totalElapsed,
          totalMinutes: elapsedMinutes,
          dbMinutes: dbFocusMinutes,
          grandTotal: dbFocusMinutes + elapsedMinutes
        });
        
        // Save to database for persistence
        if (user && elapsedMinutes > 0) {
          api.focus.updateActiveSession(elapsedMinutes)
            .then(() => {
              console.log('✅ TIMER: Paused session saved to database');
              // Dispatch event to update other components
              window.dispatchEvent(new CustomEvent('timerStateChange'));
            })
            .catch(err => {
              console.error('❌ Failed to save paused session:', err);
            });
        }
      }
      
      if (socket && roomCode && userName) {
        socket.emit('focus-session-pause', { roomCode, userName });
      }
    } else {
      // RESUMING - Start new tracking from now, keep elapsed time
      if (mode === 'focus') {
        const newStartTime = Date.now();
        sessionStartTimeRef.current = newStartTime;
        
        const elapsedMinutes = Math.floor(elapsedTimeWhenPaused / 60);
        
        console.log('▶️ TIMER: Resuming session', {
          elapsedWhenPaused: elapsedTimeWhenPaused,
          elapsedMinutes: elapsedMinutes,
          dbMinutes: dbFocusMinutes,
          total: dbFocusMinutes + elapsedMinutes,
          newStartTime: new Date(newStartTime).toLocaleTimeString()
        });
      }
      
      if (socket && roomCode && userName) {
        socket.emit('focus-session-resume', { roomCode, userName });
      }
      
      // Dispatch event to update other components
      window.dispatchEvent(new CustomEvent('timerStateChange'));
    }
    
    setIsActive(newActiveState);
  };

  const resetTimer = () => {
    // If there's an active focus session, save progress before resetting
    if (isActive && mode === 'focus' && user && sessionStartTimeRef.current) {
      const calculation = calculateCurrentFocusTime(dbFocusMinutes);
      
      console.log('🔄 TIMER: Resetting timer - saving progress first:', {
        dbMinutes: calculation.dbMinutes,
        activeMinutes: calculation.activeMinutes,
        totalMinutes: calculation.totalMinutes
      });
      
      // Save active session progress to database
      api.focus.updateActiveSession(calculation.activeMinutes)
        .then(() => {
          console.log('✅ TIMER: Progress saved before reset');
          // Reload from database to get updated value
          return api.focus.getTodayProgress();
        })
        .then(({ focusMinutes: dbMinutes }) => {
          console.log('🔄 TIMER: Reloaded after reset:', dbMinutes, 'minutes');
          setDbFocusMinutes(dbMinutes);
          setTotalFocusTime(dbMinutes);
          // Dispatch event to update other components
          window.dispatchEvent(new CustomEvent('timerStateChange'));
        })
        .catch(err => {
          console.error('❌ Failed to save before reset:', err);
        });
    }
    
    // Clear session start time AND elapsed time (no active session anymore)
    sessionStartTimeRef.current = 0;
    setElapsedTimeWhenPaused(0);
    
    // Reset timer state
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
    
    toast.info("Timer reset - progress saved!");
  };

  const handleTimeEdit = (minutes: number) => {
    if (minutes >= 1 && minutes <= 120) {
      if (mode === 'focus') {
        setFocusMinutes(minutes);
        if (!isActive) setTimeLeft(minutes * 60);
      } else {
        setBreakMinutes(minutes);
        if (!isActive) setTimeLeft(minutes * 60);
      }
    }
  };

  const handleSaveSettings = () => {
    setSettingsOpen(false);
    if (!isActive) {
      setTimeLeft(mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
    }
    toast.success("Settings saved!");
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalDuration = mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <>
      <div className="bg-gradient-to-br from-card to-card/80 border-2 border-border rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-full transition-colors",
              mode === 'focus' 
                ? "bg-purple-500/20 text-purple-500" 
                : "bg-green-500/20 text-green-500"
            )}>
              {mode === 'focus' ? <Timer className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {mode === 'focus' ? 'Focus Time' : 'Break Time'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {completedSessions} sessions completed
              </p>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="rounded-full h-8 w-8"
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
            
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  disabled={isActive}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Timer Settings</DialogTitle>
                  <DialogDescription>
                    Customize your focus and break durations
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Focus Duration */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Focus Duration (minutes)</label>
                    <div className="space-y-3">
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={focusMinutes}
                        onChange={(e) => setFocusMinutes(Math.min(120, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="text-center text-xl font-bold"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setFocusMinutes(15)} className="flex-1">15</Button>
                        <Button size="sm" variant="outline" onClick={() => setFocusMinutes(25)} className="flex-1">25</Button>
                        <Button size="sm" variant="outline" onClick={() => setFocusMinutes(45)} className="flex-1">45</Button>
                        <Button size="sm" variant="outline" onClick={() => setFocusMinutes(60)} className="flex-1">60</Button>
                      </div>
                    </div>
                  </div>

                  {/* Break Duration */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Break Duration (minutes)</label>
                    <div className="space-y-3">
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="text-center text-xl font-bold"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setBreakMinutes(5)} className="flex-1">5</Button>
                        <Button size="sm" variant="outline" onClick={() => setBreakMinutes(10)} className="flex-1">10</Button>
                        <Button size="sm" variant="outline" onClick={() => setBreakMinutes(15)} className="flex-1">15</Button>
                      </div>
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Alarm Volume
                      </label>
                      <span className="text-sm font-bold text-purple-500">{volume}%</span>
                    </div>
                    <Slider
                      value={[volume]}
                      onValueChange={(value) => setVolume(value[0])}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    className="w-full"
                    size="lg"
                  >
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Time Display */}
        <div className="text-center mb-5">
          <div className="text-6xl font-bold font-mono tracking-tight mb-2">
            {String(minutes).padStart(2, "0")}
            <span className="text-muted-foreground">:</span>
            {String(seconds).padStart(2, "0")}
          </div>
          
          {/* Quick Time Adjust (only when paused) */}
          {!isActive && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTimeEdit((mode === 'focus' ? focusMinutes : breakMinutes) - 5)}
                disabled={isActive}
                className="h-7 text-xs"
              >
                -5 min
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTimeEdit((mode === 'focus' ? focusMinutes : breakMinutes) + 5)}
                disabled={isActive}
                className="h-7 text-xs"
              >
                +5 min
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted/50 rounded-full h-3 mb-5 overflow-hidden">
          <div
            className={cn(
              "h-3 rounded-full transition-all duration-1000 shadow-lg",
              mode === 'focus' 
                ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                : "bg-gradient-to-r from-green-500 to-emerald-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats */}
        {totalFocusTime > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-background/50 backdrop-blur p-3 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">Sessions</div>
              <div className="text-2xl font-bold text-purple-500">{completedSessions}</div>
            </div>
            <div className="bg-background/50 backdrop-blur p-3 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">Focus Time</div>
              <div className="text-2xl font-bold text-green-500">
                {Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="space-y-2">
          {/* Main Control */}
          <div className="flex gap-2">
            <Button
              onClick={toggleTimer}
              className={cn(
                "flex-1 h-12 text-base font-semibold",
                isActive 
                  ? "bg-yellow-500 hover:bg-yellow-600" 
                  : mode === 'focus'
                  ? "bg-purple-500 hover:bg-purple-600"
                  : "bg-green-500 hover:bg-green-600"
              )}
              size="lg"
            >
              {isActive ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={resetTimer}
              variant="outline"
              size="lg"
              className="h-12 px-5"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Mode Switch */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={startFocus}
              variant={mode === 'focus' ? 'default' : 'outline'}
              disabled={isActive}
              className={cn(
                "h-10 text-sm",
                mode === 'focus' && "bg-purple-500 hover:bg-purple-600"
              )}
            >
              <Timer className="w-4 h-4 mr-1" />
              Focus ({focusMinutes}m)
            </Button>
            <Button
              onClick={startBreak}
              variant={mode === 'break' ? 'default' : 'outline'}
              disabled={isActive}
              className={cn(
                "h-10 text-sm",
                mode === 'break' && "bg-green-500 hover:bg-green-600"
              )}
            >
              <Coffee className="w-4 h-4 mr-1" />
              Break ({breakMinutes}m)
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
