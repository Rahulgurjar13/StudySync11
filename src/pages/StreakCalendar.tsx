import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Award, ChevronLeft, ChevronRight, Target, Zap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface FocusDay {
  date: string;
  focusMinutes: number;
  sessionsCompleted: number;
  achieved: boolean;
}

interface MonthStats {
  totalMinutes: number;
  totalSessions: number;
  daysAchieved: number;
  currentStreak: number;
  longestStreak: number;
}

const StreakCalendar = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [focusData, setFocusData] = useState<FocusDay[]>([]);
  const [monthStats, setMonthStats] = useState<MonthStats>({
    totalMinutes: 0,
    totalSessions: 0,
    daysAchieved: 0,
    currentStreak: 0,
    longestStreak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFocusData();
    }
  }, [user, currentMonth]);

  const fetchFocusData = async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const sessions = await api.focus.getMonthData(year, month);
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const data: FocusDay[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        
        const session = sessions.find((s: any) => {
          const sessionDate = new Date(s.date).toISOString().split('T')[0];
          return sessionDate === dateStr;
        });

        data.push({
          date: dateStr,
          focusMinutes: session?.focusMinutes || 0,
          sessionsCompleted: session?.sessionsCompleted || 0,
          achieved: session?.achieved || false,
        });
      }

      setFocusData(data);
      calculateStats(data);
    } catch (error) {
      console.error("Error fetching focus data:", error);
      const mockData = generateMockData();
      setFocusData(mockData);
      calculateStats(mockData);
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
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      const focusMinutes = date <= new Date() ? Math.floor(Math.random() * 240) : 0;

      data.push({
        date: dateStr,
        focusMinutes,
        sessionsCompleted: date <= new Date() ? Math.floor(Math.random() * 6) : 0,
        achieved: focusMinutes >= 120,
      });
    }

    return data;
  };

  const calculateStats = (data: FocusDay[]) => {
    let totalMinutes = 0;
    let totalSessions = 0;
    let daysAchieved = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const sortedData = [...data].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedData.forEach((day, index) => {
      const dayDate = new Date(day.date);
      if (dayDate <= new Date()) {
        totalMinutes += day.focusMinutes;
        totalSessions += day.sessionsCompleted;
        
        if (day.achieved) {
          daysAchieved++;
          tempStreak++;
          if (index === 0 || new Date(sortedData[index - 1].date).getTime() - dayDate.getTime() === 86400000) {
            if (currentStreak === 0) currentStreak = tempStreak;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    });

    setMonthStats({
      totalMinutes,
      totalSessions,
      daysAchieved,
      currentStreak,
      longestStreak,
    });
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (FocusDay | null)[] = [];
    
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    for (let i = 0; i < adjustedStart; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
      const dayData = focusData.find(d => d.date === dateStr);
      days.push(dayData || { date: dateStr, focusMinutes: 0, sessionsCompleted: 0, achieved: false });
    }

    return days;
  };

  const getIntensityLevel = (minutes: number): number => {
    if (minutes === 0) return 0;
    if (minutes < 30) return 1;
    if (minutes < 60) return 2;
    if (minutes < 90) return 3;
    if (minutes < 120) return 4;
    return 5;
  };

  const getDayStyle = (level: number, isToday: boolean) => {
    const baseClasses = "aspect-square rounded-full flex items-center justify-center relative group cursor-pointer transition-all duration-300";
    
    if (level === 0) {
      return cn(
        baseClasses,
        "bg-gray-200 dark:bg-gray-700",
        isToday && "ring-2 ring-blue-500 ring-offset-2 scale-110"
      );
    }
    
    if (level === 5) {
      return cn(
        baseClasses,
        "bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500",
        "shadow-lg shadow-orange-300/50",
        "hover:scale-125 hover:shadow-xl hover:shadow-orange-400/60",
        isToday && "ring-2 ring-orange-500 ring-offset-2 scale-110 animate-pulse"
      );
    }
    
    const colors = [
      "",
      "bg-yellow-200 dark:bg-yellow-800/40",
      "bg-yellow-300 dark:bg-yellow-700/60",
      "bg-yellow-400 dark:bg-yellow-600/80",
      "bg-orange-300 dark:bg-orange-600/80",
    ];
    
    return cn(
      baseClasses,
      colors[level],
      "hover:scale-110 hover:shadow-md",
      isToday && "ring-2 ring-blue-500 ring-offset-2 scale-110"
    );
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

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card className="border-none shadow-xl">
            <CardContent className="p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-muted rounded-lg w-1/3 mx-auto" />
                <div className="grid grid-cols-7 gap-3">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded-full" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Focus Streak Calendar
            </h1>
            <p className="text-muted-foreground">
              Track your daily focus time and build your streak! 🔥
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-orange-500/10 rounded-full mb-3">
                    <Flame className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-700 dark:text-orange-400 mb-1">
                    {monthStats.currentStreak}
                  </div>
                  <div className="text-sm font-medium text-orange-600 dark:text-orange-500">
                    Day Streak
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-purple-500/10 rounded-full mb-3">
                    <Award className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                    {monthStats.longestStreak}
                  </div>
                  <div className="text-sm font-medium text-purple-600 dark:text-purple-500">
                    Best Streak
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-blue-500/10 rounded-full mb-3">
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                    {monthStats.daysAchieved}
                  </div>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-500">
                    Goals Hit
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-green-500/10 rounded-full mb-3">
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-1">
                    {Math.floor(monthStats.totalMinutes / 60)}h
                  </div>
                  <div className="text-sm font-medium text-green-600 dark:text-green-500">
                    Total Time
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Card */}
          <Card className="border-none shadow-xl">
            <CardContent className="p-8">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-8">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previousMonth}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <h2 className="text-2xl font-bold tracking-tight">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                </h2>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  disabled={isCurrentMonth()}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-3 mb-4">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-3">
                {getDaysInMonth().map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dayDate = new Date(day.date);
                  const isToday = dayDate.toDateString() === new Date().toDateString();
                  const isFuture = dayDate > new Date();
                  const intensityLevel = getIntensityLevel(day.focusMinutes);

                  return (
                    <div
                      key={day.date}
                      className={cn(
                        getDayStyle(intensityLevel, isToday),
                        isFuture && "opacity-30 cursor-not-allowed hover:scale-100"
                      )}
                    >
                      {intensityLevel === 5 ? (
                        <Flame className="w-5 h-5 text-white drop-shadow-lg" />
                      ) : null}
                      
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                        <div className="font-bold mb-1">
                          {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{day.focusMinutes} minutes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3" />
                            <span>{day.sessionsCompleted} sessions</span>
                          </div>
                          {day.achieved && (
                            <div className="flex items-center gap-2 text-orange-400 font-bold mt-2 pt-2 border-t border-gray-700">
                              <Flame className="w-3 h-3" />
                              <span>Goal Achieved!</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Less</span>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="w-8 h-8 rounded-full bg-yellow-200 dark:bg-yellow-800/40" />
                  <div className="w-8 h-8 rounded-full bg-yellow-300 dark:bg-yellow-700/60" />
                  <div className="w-8 h-8 rounded-full bg-yellow-400 dark:bg-yellow-600/80" />
                  <div className="w-8 h-8 rounded-full bg-orange-300 dark:bg-orange-600/80" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">More</span>
              </div>

              {/* Goal info */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete <span className="font-bold text-orange-600">2 hours</span> of focus time to earn a{" "}
                  <Flame className="w-4 h-4 inline text-orange-500" /> streak day!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;
