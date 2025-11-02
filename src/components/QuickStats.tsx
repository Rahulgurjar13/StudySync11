import { useEffect, useState } from "react";
import { TrendingUp, Target, Zap, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PomodoroTimer } from "./PomodoroTimer";
import { calculateCurrentFocusTime } from "@/lib/focusTimeCalculator";

interface Stats {
  tasksCompleted: number;
  focusTime: number;
  productivity: number;
  weeklyProgress: number;
}

export const QuickStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    tasksCompleted: 0,
    focusTime: 0,
    productivity: 0,
    weeklyProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
      
      // Listen for focus session completions to update stats
      const handleSessionComplete = () => {
        console.log('📊 STATS: Focus session completed - refreshing stats');
        fetchStats();
      };
      
      // Listen for timer state changes (start/pause/resume)
      const handleTimerUpdate = () => {
        console.log('📊 STATS: Timer state changed - refreshing stats');
        fetchStats();
      };
      
      window.addEventListener('focusSessionComplete', handleSessionComplete);
      window.addEventListener('timerStateChange', handleTimerUpdate);
      
      // Poll every 5 seconds for real-time updates during active sessions
      const interval = setInterval(() => {
        // Only poll if there's an active timer
        try {
          const timerState = JSON.parse(localStorage.getItem('pomodoroState') || '{}');
          if (timerState.isActive && timerState.mode === 'focus') {
            fetchStats();
          }
        } catch (e) {
          // Silent fail
        }
      }, 5000);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('focusSessionComplete', handleSessionComplete);
        window.removeEventListener('timerStateChange', handleTimerUpdate);
      };
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      console.log('📊 STATS: Fetching stats...');

      // Get all tasks and calculate stats
      const tasks = await api.tasks.getAll();
      const completedToday = tasks.filter(t => t.completed).length;

      // Get today's focus time from database
      const { focusMinutes: completedMinutes, activeMinutes } = await api.focus.getTodayProgress();

      // Use shared calculation function to ensure consistency
      const calculation = calculateCurrentFocusTime(completedMinutes);
      
      console.log('📊 STATS: Focus time calculation:', {
        dbMinutes: calculation.dbMinutes,
        activeMinutes: calculation.activeMinutes,
        totalMinutes: calculation.totalMinutes,
        isActive: calculation.isActive,
        mode: calculation.mode
      });

      // Total focus time = completed + current active session progress
      const totalFocusMinutes = calculation.totalMinutes;
      const focusHours = totalFocusMinutes / 60;

      console.log('📊 STATS: Focus time breakdown:', {
        completedMinutes: calculation.dbMinutes + ' minutes',
        activeMinutes: calculation.activeMinutes + ' minutes (in progress)',
        totalFocusMinutes: totalFocusMinutes + ' minutes',
        focusHours: focusHours.toFixed(2) + ' hours'
      });
      console.log('📊 STATS: Tasks completed:', completedToday);

      setStats({
        tasksCompleted: completedToday,
        focusTime: focusHours,
        productivity: completedToday > 0 ? Math.min(100, completedToday * 20) : 0,
        weeklyProgress: tasks.length,
      });
    } catch (error) {
      console.error("❌ STATS: Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };  const statItems = [
    {
      icon: Target,
      label: "Tasks Completed",
      value: stats.tasksCompleted.toString(),
      change: "Today",
      color: "text-primary",
    },
    {
      icon: Zap,
      label: "Focus Time",
      value: `${stats.focusTime.toFixed(1)}h`,
      change: `${stats.focusTime >= 2 ? '✓ Goal reached!' : stats.focusTime > 0 ? `${(120 - stats.focusTime * 60).toFixed(0)}min to 2h goal` : 'Start focusing!'}`,
      color: "text-accent",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-6 shadow-subtle animate-pulse"
          >
            <div className="h-10 bg-muted rounded w-10 mb-4" />
            <div className="h-8 bg-muted rounded w-16 mb-2" />
            <div className="h-4 bg-muted rounded w-24 mb-1" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {statItems.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-card border border-border rounded-xl p-6 shadow-subtle hover:shadow-elevated transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg bg-background ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {stat.label}
            </div>
            <div className="text-xs text-muted-foreground">{stat.change}</div>
          </div>
        );
      })}
      
      {/* Focus Timer Card */}
      <PomodoroTimer />
    </div>
  );
};
