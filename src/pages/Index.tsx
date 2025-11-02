import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { QuickStats } from "@/components/QuickStats";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { TaskList } from "@/components/TaskList";
import { SharedTodoList } from "@/components/SharedTodoList";
import { SharedResources } from "@/components/SharedResources";
import { PartnerConnection } from "@/components/PartnerConnection";
import { CompactStreakCalendar } from "@/components/CompactStreakCalendar";
import { PointsDisplay } from "@/components/PointsDisplay";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Loader2, CheckSquare, Users, Share2, UserPlus, Flame, Trophy } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        // Profile data is already in the user object from useAuth
        setProfile(user);
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => navigate("/streak")} variant="default" size="sm" className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600">
            <Flame className="w-4 h-4 mr-2" />
            View Full Calendar
          </Button>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Dashboard Header */}
        <DashboardHeader 
          userName={profile?.fullName || user?.email || "User"}
          streak={profile?.profile?.streak || 0}
          xp={profile?.profile?.xp || 0}
          level={profile?.profile?.level || 1}
        />
        
        {/* Horizontal Streak Calendar - Top Position */}
        <div className="mt-6">
          <CompactStreakCalendar />
        </div>
        
        {/* Quick Stats - Below Calendar */}
        <div className="mt-6">
          <QuickStats />
        </div>
        
        {/* Tabs Section */}
        <Tabs defaultValue="tasks" className="mt-8">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              All Tasks
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Points
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="connect" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Partners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TaskList />
          </TabsContent>

          <TabsContent value="points">
            <PointsDisplay />
          </TabsContent>

          <TabsContent value="resources">
            <SharedResources />
          </TabsContent>

          <TabsContent value="connect">
            <PartnerConnection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
