import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Coffee, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Socket } from 'socket.io-client';

interface PartnerTimerData {
  userName: string;
  mode: 'focus' | 'break';
  timeLeft: number;
  totalDuration: number;
  isActive: boolean;
  timestamp: number;
}

interface PartnerTimerProps {
  socket: Socket | null;
  roomCode: string;
}

export const PartnerTimer = ({ socket, roomCode }: PartnerTimerProps) => {
  const [partnerTimers, setPartnerTimers] = useState<Map<string, PartnerTimerData>>(new Map());

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (data: PartnerTimerData & { socketId: string }) => {
      console.log('📥 Received timer update:', data);
      setPartnerTimers(prev => {
        const newMap = new Map(prev);
        newMap.set(data.socketId, {
          userName: data.userName,
          mode: data.mode,
          timeLeft: data.timeLeft,
          totalDuration: data.totalDuration,
          isActive: data.isActive,
          timestamp: data.timestamp
        });
        return newMap;
      });
    };

    const handlePartnerLeft = ({ socketId }: { socketId: string }) => {
      console.log('👋 Partner left:', socketId);
      setPartnerTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
    };

    socket.on('partner-timer-update', handleTimerUpdate);
    socket.on('user-left', handlePartnerLeft);

    return () => {
      socket.off('partner-timer-update', handleTimerUpdate);
      socket.off('user-left', handlePartnerLeft);
    };
  }, [socket]);

  // Local countdown interpolation for smooth timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setPartnerTimers(prev => {
        const newMap = new Map(prev);
        let hasChanges = false;

        prev.forEach((timer, socketId) => {
          if (timer.isActive && timer.timeLeft > 0) {
            // Calculate how much time has passed since last update
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - timer.timestamp) / 1000);
            
            // Decrement by 1 second for smooth countdown
            const newTimeLeft = Math.max(0, timer.timeLeft - 1);
            
            newMap.set(socketId, {
              ...timer,
              timeLeft: newTimeLeft,
              timestamp: now
            });
            hasChanges = true;
          } else {
            newMap.set(socketId, timer);
          }
        });

        return hasChanges ? newMap : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (partnerTimers.size === 0) {
    return (
      <div className="text-center py-4">
        <div className="relative inline-block mb-2">
          <Clock className="h-8 w-8 text-gray-500/50 mx-auto" />
          <div className="absolute -inset-1 border border-gray-600/20 rounded-full animate-pulse"></div>
        </div>
        <p className="text-gray-300 text-xs font-medium">No active timers</p>
        <p className="text-gray-500 text-[10px] mt-0.5">Partners' timers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from(partnerTimers.entries()).map(([socketId, timer]) => {
        const minutes = Math.floor(timer.timeLeft / 60);
        const seconds = timer.timeLeft % 60;
        const progress = ((timer.totalDuration - timer.timeLeft) / timer.totalDuration) * 100;

        return (
          <Card key={socketId} className="bg-gradient-to-br from-black/90 to-gray-900/90 border-gray-700/40 shadow-md hover:shadow-red-900/20 transition-all hover:border-gray-600/50 overflow-hidden">
            <CardContent className="p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-gray-800 flex items-center justify-center shadow-md">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-black animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs">{timer.userName}</p>
                    <p className="text-gray-400 text-[10px] font-medium capitalize flex items-center gap-1">
                      {timer.mode === 'focus' ? (
                        <>
                          <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                          Focus Mode
                        </>
                      ) : (
                        <>
                          <Coffee className="w-2.5 h-2.5" />
                          Break Time
                        </>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full border",
                  timer.isActive 
                    ? "bg-green-950/30 border-green-600/40"
                    : "bg-gray-800/50 border-gray-600/40"
                )}>
                  {timer.isActive ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-[10px] font-bold uppercase">Active</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-400 text-[10px] font-bold uppercase">Paused</span>
                    </>
                  )}
                </div>
              </div>

              {/* Timer Display */}
              <div className="text-center mb-2">
                <div className="text-2xl font-bold text-white font-mono tracking-wider">
                  {String(minutes).padStart(2, '0')}
                  <span className="text-red-500">:</span>
                  {String(seconds).padStart(2, '0')}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-gray-900/80 rounded-full overflow-hidden border border-gray-800/50 shadow-inner">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 shadow-md",
                    timer.mode === 'focus' 
                      ? "bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-red-600/50" 
                      : "bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 shadow-green-600/50"
                  )}
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                </div>
              </div>

              {/* Footer Stats */}
              <div className="flex justify-between items-center mt-2 text-[10px]">
                <span className="text-gray-500 font-medium">
                  {Math.floor(timer.totalDuration / 60)} min total
                </span>
                <span className={cn(
                  "font-bold",
                  timer.mode === 'focus' ? "text-red-400" : "text-green-400"
                )}>
                  {Math.round(progress)}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
