import { Calendar, Flame, Trophy, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  userName: string;
  streak: number;
  xp: number;
  level: number;
}

export const DashboardHeader = ({ userName, streak, xp, level }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">Let's make today count</p>
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-subtle">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-sm text-muted-foreground">Streak</div>
              <div className="text-xl font-bold text-foreground">{streak} days</div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/study-room')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-xl px-4 py-3 shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            <Video className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs font-medium opacity-90">Video Connect</div>
              <div className="text-sm font-bold">Study Together</div>
            </div>
          </button>
          
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-subtle">
            <Trophy className="w-5 h-5 text-accent" />
            <div>
              <div className="text-sm text-muted-foreground">Level {level}</div>
              <div className="text-xl font-bold text-foreground">{xp} XP</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
  );
};
