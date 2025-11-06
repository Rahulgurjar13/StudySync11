import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { calculateCurrentFocusTime } from "@/lib/focusTimeCalculator";

interface FocusDay {
  date: string;
  focusMinutes: number;
  achieved: boolean;
}

export const CompactStreakCalendar = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [focusData, setFocusData] = useState<FocusDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);

  useEffect(() => {
    // ✅ CRITICAL: Don't do anything while auth is still loading
    if (authLoading) {
      console.log('⏳ CALENDAR: Waiting for auth to complete...');
      return;
    }
    
    if (user) {
      console.log('🔄 CALENDAR: User authenticated, loading all data');
      
      // ✅ CRITICAL: Load data in the correct order
      // 1. First load the monthly calendar data
      fetchFocusData();
      
      // 2. Then load today's specific progress (this takes priority)
      fetchTodayProgress();
      
      // ✅ NEW: Poll every 10 seconds to keep progress updated
      const pollInterval = setInterval(() => {
        console.log('🔄 CALENDAR: Polling today\'s progress');
        fetchTodayProgress();
      }, 10000); // 10 seconds
      
      // Listen for focus session completions
      const handleSessionComplete = () => {
        console.log('🎉 CALENDAR EVENT: Focus session completed - refreshing calendar immediately');
        fetchFocusData();
        fetchTodayProgress();
      };
      
      // Listen for real-time timer updates
      const handleTimerUpdate = () => {
        console.log('⏱️ CALENDAR EVENT: Timer state changed - updating today\'s progress');
        fetchTodayProgress();
      };
      
      window.addEventListener('focusSessionComplete', handleSessionComplete);
      window.addEventListener('timerStateChange', handleTimerUpdate);
      console.log('👂 CALENDAR: Listening for focus events');
      
      return () => {
        clearInterval(pollInterval); // ✅ Clear polling on unmount
        window.removeEventListener('focusSessionComplete', handleSessionComplete);
        window.removeEventListener('timerStateChange', handleTimerUpdate);
      };
    } else {
      // User logged out (not loading, just no user) - reset today's progress
      console.log('🔄 CALENDAR: User logged out, resetting progress');
      setTodayMinutes(0);
    }
  }, [user, currentMonth, authLoading]);

  const fetchTodayProgress = async () => {
    // ✅ CRITICAL: Only fetch if user is authenticated
    if (!user) {
      console.log('⚠️ CALENDAR: Cannot fetch progress - no user authenticated');
      return;
    }
    
    try {
      console.log('📅 CALENDAR: Fetching real-time today\'s progress');
      console.log('🔑 CALENDAR: User authenticated:', !!user, 'Token:', !!localStorage.getItem('authToken'));
      
      // Get today's progress from the API
      const { focusMinutes: completedMinutes, activeMinutes } = await api.focus.getTodayProgress();
      
      console.log('📊 CALENDAR: Database returned:', {
        completedMinutes,
        activeMinutes,
        total: completedMinutes + (activeMinutes || 0)
      });
      
      // Use shared calculation function to ensure consistency with active timer
      const calculation = calculateCurrentFocusTime(completedMinutes);
      
      console.log('📊 CALENDAR: Focus time calculation:', {
        dbMinutes: calculation.dbMinutes,
        activeMinutes: calculation.activeMinutes,
        totalMinutes: calculation.totalMinutes,
        isActive: calculation.isActive,
        mode: calculation.mode
      });
      
      console.log('✅ CALENDAR: Setting todayMinutes to:', calculation.totalMinutes);
      setTodayMinutes(calculation.totalMinutes);
      console.log('✅ CALENDAR: todayMinutes has been set');
      
    } catch (error) {
      console.error("❌ CALENDAR: Error fetching today's progress:", error);
      // Don't set to 0 on error - keep the previous value
    }
  };

  const fetchFocusData = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const sessions = await api.focus.getMonthData(year, month);
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const data: FocusDay[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        // Use UTC to avoid timezone issues
        const date = new Date(Date.UTC(year, month, day));
        const dateStr = date.toISOString().split('T')[0];
        
        const session = sessions.find((s: any) => {
          const sessionDate = new Date(s.date).toISOString().split('T')[0];
          return sessionDate === dateStr;
        });

        data.push({
          date: dateStr,
          focusMinutes: session?.focusMinutes || 0,
          achieved: (session?.focusMinutes || 0) >= 120, // 2 hours minimum
        });
      }

      setFocusData(data);
      calculateStreak(data);
      
      // ✅ REMOVED: Don't set todayMinutes here - it's handled by fetchTodayProgress()
      // This was causing a race condition where todayMinutes would be overwritten to 0
      // after fetchTodayProgress() had already set it to the correct value
      
    } catch (error) {
      console.error("Error fetching focus data:", error);
      const mockData = generateMockData();
      setFocusData(mockData);
      calculateStreak(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): FocusDay[] => {
    const data: FocusDay[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      // Use UTC to avoid timezone issues
      const date = new Date(Date.UTC(year, month, day));
      const dateStr = date.toISOString().split('T')[0];
      
      const focusMinutes = date <= new Date() ? Math.floor(Math.random() * 240) : 0;

      data.push({
        date: dateStr,
        focusMinutes,
        achieved: focusMinutes >= 120,
      });
    }

    return data;
  };

  const calculateStreak = (data: FocusDay[]) => {
    const sortedData = [...data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    for (const day of sortedData) {
      const dayDate = new Date(day.date);
      if (dayDate > new Date()) break;
      
      if (day.achieved) {
        streak++;
      } else {
        break;
      }
    }

    setCurrentStreak(streak);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: FocusDay[] = [];

    // Only get days for the current month (1 to 28/29/30/31)
    for (let day = 1; day <= daysInMonth; day++) {
      // Use UTC to avoid timezone issues
      const date = new Date(Date.UTC(year, month, day));
      const dateStr = date.toISOString().split('T')[0];
      const dayData = focusData.find(d => d.date === dateStr);
      days.push(dayData || { date: dateStr, focusMinutes: 0, achieved: false });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const today = new Date();
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= today) {
      setCurrentMonth(next);
    }
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-6">
          {/* Header Section - Left */}
          <div className="flex flex-col gap-2 min-w-[160px]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/10 rounded">
                <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Focus Streak</div>
                <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded mt-1">
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                    {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Today's Progress */}
            {isCurrentMonth() && (
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground mb-1">Today's Progress</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">
                    {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    / 2h
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      todayMinutes >= 120 ? "bg-green-500" : "bg-orange-500"
                    )}
                    style={{ width: `${Math.min(100, (todayMinutes / 120) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  {todayMinutes >= 120 ? (
                    <span className="text-green-600 font-semibold">✓ Goal achieved!</span>
                  ) : (
                    <span>{120 - todayMinutes} min remaining</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={previousMonth}
                className="h-6 w-6 hover:bg-accent"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              
              <span className="text-xs font-semibold text-foreground">
                {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={nextMonth}
                disabled={isCurrentMonth()}
                className="h-6 w-6 hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-24 w-px bg-border"></div>

          {/* Horizontal Calendar Grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {getDaysInMonth().map((day) => {
                const dayDate = new Date(day.date);
                const isToday = dayDate.toDateString() === new Date().toDateString();
                const isFuture = dayDate > new Date();
                const dayNumber = dayDate.getDate();
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

                return (
                  <div
                    key={day.date}
                    className="relative group flex flex-col items-center gap-1"
                  >
                    {/* Day letter */}
                    <div className="text-[9px] font-medium text-muted-foreground/70">
                      {dayName}
                    </div>
                    
                    {/* Day cell */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded flex items-center justify-center text-[10px] font-medium transition-all duration-150",
                        "hover:scale-110 cursor-default",
                        day.achieved && !isFuture && "bg-green-500 text-white shadow-sm",
                        !day.achieved && !isFuture && "bg-muted/50 text-muted-foreground",
                        isFuture && "bg-muted/30 text-muted-foreground/40",
                        isToday && "ring-2 ring-blue-500"
                      )}
                    >
                      {day.achieved && !isFuture ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <span>{dayNumber}</span>
                      )}
                    </div>

                    {/* Tooltip */}
                    {!isFuture && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1.5 bg-popover border text-popover-foreground text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 pointer-events-none">
                        <div className="font-semibold text-[11px]">
                          {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {Math.floor(day.focusMinutes / 60)}h {day.focusMinutes % 60}m
                        </div>
                        {day.achieved && (
                          <div className="text-green-600 font-semibold text-[10px] mt-0.5">
                            ✓ Goal Achieved
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Goal info - bottom */}
            <div className="text-center pt-2 mt-2 border-t">
              <p className="text-[9px] text-muted-foreground leading-tight">
                Complete <span className="font-semibold text-green-600">2 hours</span> daily to earn ✓
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
