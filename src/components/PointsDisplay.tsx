import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface PointsData {
  xp: number;
  level: number;
  xpForNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForLevel: number;
  progressToNextLevel: number;
}

interface PointTransaction {
  _id: string;
  points: number;
  type: string;
  reason: string;
  createdAt: string;
  metadata: {
    focusMinutes?: number;
    taskId?: { title: string };
  };
}

export function PointsDisplay() {
  const { user } = useAuth();
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPointsData();
      fetchRecentTransactions();
    }
  }, [user]);

  const fetchPointsData = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/points/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setPointsData(data);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/points/history?limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  if (loading || !pointsData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading points...</div>
        </CardContent>
      </Card>
    );
  }

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'bg-purple-500';
    if (level >= 5) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'FOCUS_SESSION_COMPLETED':
        return '🎯';
      case 'TASK_COMPLETED':
        return '✅';
      case 'TASK_UNCOMPLETED':
        return '❌';
      case 'DAILY_STREAK':
        return '🔥';
      default:
        return '⭐';
    }
  };

  return (
    <div className="space-y-4">
      {/* Level & XP Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Level {pointsData.level}</CardTitle>
              <CardDescription>
                {pointsData.xp.toLocaleString()} XP Total
              </CardDescription>
            </div>
            <Badge className={`${getLevelColor(pointsData.level)} text-white px-4 py-2 text-lg`}>
              <Trophy className="w-5 h-5 mr-2" />
              {pointsData.level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to Level {pointsData.level + 1}</span>
              <span className="font-semibold">
                {pointsData.xpInCurrentLevel} / {pointsData.xpNeededForLevel} XP
              </span>
            </div>
            <Progress value={pointsData.progressToNextLevel} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              {(pointsData.xpNeededForLevel - pointsData.xpInCurrentLevel).toLocaleString()} XP until next level
            </p>
          </div>

          {/* Point Rules Info */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                🎯
              </div>
              <div>
                <p className="font-semibold text-sm">Focus Time</p>
                <p className="text-xs text-muted-foreground">1 XP per minute</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                ✅
              </div>
              <div>
                <p className="font-semibold text-sm">Task Done</p>
                <p className="text-xs text-muted-foreground">+10 XP</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                ❌
              </div>
              <div>
                <p className="font-semibold text-sm">Uncheck Task</p>
                <p className="text-xs text-muted-foreground">-5 XP penalty</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                🔥
              </div>
              <div>
                <p className="font-semibold text-sm">7-Day Streak</p>
                <p className="text-xs text-muted-foreground">+50 XP bonus</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest point transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No activity yet. Complete focus sessions and tasks to earn points!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
                    <div>
                      <p className="font-medium text-sm">{transaction.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()} at{' '}
                        {new Date(transaction.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={transaction.points > 0 ? 'default' : 'destructive'}
                    className="font-bold"
                  >
                    {transaction.points > 0 ? '+' : ''}
                    {transaction.points} XP
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-Cheat Notice */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Fair Play System
              </p>
              <ul className="text-amber-800 dark:text-amber-200 space-y-1 text-xs">
                <li>• Focus sessions must be at least 5 minutes to earn points</li>
                <li>• Tasks must stay completed for 5 minutes before points are locked</li>
                <li>• Unchecking completed tasks results in a -5 XP penalty</li>
                <li>• All point transactions are tracked and logged</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
