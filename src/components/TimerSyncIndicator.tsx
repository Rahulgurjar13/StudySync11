import { useState, useEffect } from "react";
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatus {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message?: string;
  lastSyncTime?: number;
}

export const TimerSyncIndicator = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });

  useEffect(() => {
    // Listen for sync events from PomodoroTimer
    const handleSyncStart = () => {
      setSyncStatus({ status: 'syncing', message: 'Saving...' });
    };

    const handleSyncSuccess = () => {
      setSyncStatus({ 
        status: 'synced', 
        message: 'Saved',
        lastSyncTime: Date.now()
      });
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSyncStatus({ status: 'idle' });
      }, 2000);
    };

    const handleSyncError = (event: any) => {
      setSyncStatus({ 
        status: 'error', 
        message: event.detail?.message || 'Save failed'
      });
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSyncStatus({ status: 'idle' });
      }, 3000);
    };

    window.addEventListener('timerSyncStart', handleSyncStart);
    window.addEventListener('timerSyncSuccess', handleSyncSuccess);
    window.addEventListener('timerSyncError', handleSyncError);

    return () => {
      window.removeEventListener('timerSyncStart', handleSyncStart);
      window.removeEventListener('timerSyncSuccess', handleSyncSuccess);
      window.removeEventListener('timerSyncError', handleSyncError);
    };
  }, []);

  // Don't show anything when idle
  if (syncStatus.status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
        syncStatus.status === 'syncing' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        syncStatus.status === 'synced' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        syncStatus.status === 'error' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {syncStatus.status === 'syncing' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{syncStatus.message}</span>
        </>
      )}
      {syncStatus.status === 'synced' && (
        <>
          <Check className="w-3 h-3" />
          <span>{syncStatus.message}</span>
        </>
      )}
      {syncStatus.status === 'error' && (
        <>
          <CloudOff className="w-3 h-3" />
          <span>{syncStatus.message}</span>
        </>
      )}
    </div>
  );
};
