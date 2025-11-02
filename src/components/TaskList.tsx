import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Circle, Trash2, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Task {
  id: string;
  _id?: string;
  title: string;
  completed: boolean;
  category: string;
  userId?: string;
  isShared?: boolean;
}

export const TaskList = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchPartnerships();
      fetchTasks();
      
      // Start polling for real-time updates every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchTasks();
      }, 3000);
    }
    
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user]);

  const fetchPartnerships = async () => {
    try {
      const data = await api.partnerships.getAll();
      const accepted = data.filter((p: any) => p.status === "accepted");
      setPartnerships(accepted);
      console.log('[TaskList] Partnerships loaded:', accepted.length);
    } catch (error) {
      console.error("Error fetching partnerships:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await api.tasks.getAll();
      // Only log on initial load, not on polling
      if (tasks.length === 0) {
        console.log('[TaskList] All tasks fetched:', data);
        console.log('[TaskList] Current user ID:', user?.id);
      }
      
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim() || !user) return;

    try {
      // Automatically make task shared if user has a partner
      const taskData: any = {
        title: newTask,
        description: "",
      };

      if (partnerships.length > 0) {
        taskData.isShared = true;
        taskData.partnershipId = partnerships[0]._id;
        console.log('[TaskList] Creating shared task:', taskData);
      } else {
        console.log('[TaskList] Creating personal task (no partner):', taskData);
      }

      const task = await api.tasks.create(taskData);
      console.log('[TaskList] Task created from API:', task);
      console.log('[TaskList] Task userId:', task.userId, 'Current user ID:', user?.id);
      
      setTasks((current) => [task, ...current]);
      setNewTask("");
      toast.success(partnerships.length > 0 ? "Shared task added!" : "Task added!");
      
      // Refresh tasks to ensure sync
      await fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      const response = await api.tasks.update(id, { completed: !currentStatus });
      const updated = response.task;
      const pointsInfo = response.points;
      
      setTasks((current) =>
        current.map((task) => (task.id === id ? updated : task))
      );
      
      // Show point notification based on backend response
      if (pointsInfo?.awarded) {
        const points = pointsInfo.awarded;
        const level = pointsInfo.level;
        const balance = pointsInfo.newBalance;
        
        if (points > 0) {
          // Task completed
          toast.success(`✅ +${points} XP Earned!`, {
            description: `Task completed • Total: ${balance} XP (Level ${level})`,
            duration: 4000,
          });
        } else if (points < 0) {
          // Task uncompleted (penalty)
          toast.warning(`⚠️ ${points} XP Deducted`, {
            description: `Task uncompleted • Total: ${balance} XP (Level ${level})`,
            duration: 4000,
          });
        }
      } else if (pointsInfo?.reason) {
        // Show reason why points weren't awarded/deducted
        toast.info("ℹ️ " + pointsInfo.reason, {
          duration: 3000,
        });
      } else if (!currentStatus) {
        // Fallback for when no point info is returned
        toast.success("Task completed!", {
          description: "Keep up the great work!",
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.tasks.delete(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  const saveEdit = async (taskId: string) => {
    if (!editingTitle.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    try {
      const updated = await api.tasks.update(taskId, { title: editingTitle });
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? updated : task))
      );
      setEditingTaskId(null);
      setEditingTitle("");
      toast.success("Task updated!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  // Separate tasks into my tasks and partner's tasks
  const myTasks = tasks.filter((t) => t.userId === user?.id);
  const partnerTasks = tasks.filter((t) => t.userId !== user?.id && t.isShared === true);
  
  const myCompletedCount = myTasks.filter((t) => t.completed).length;
  const partnerCompletedCount = partnerTasks.filter((t) => t.completed).length;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-elevated animate-pulse">
          <div className="h-8 bg-muted rounded w-1/2 mb-4" />
          <div className="h-12 bg-muted rounded mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-elevated animate-pulse">
          <div className="h-8 bg-muted rounded w-1/2 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* MY TASKS CARD - Left Side */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-1">My Tasks</h2>
          <p className="text-sm text-blue-700">
            {partnerships.length > 0 
              ? "✨ Shared with your partner" 
              : "📝 Connect with a partner to share"}
          </p>
          <div className="text-xs text-blue-600 mt-1">
            {myCompletedCount} of {myTasks.length} completed
          </div>
        </div>

        {/* Add Task Input */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTask()}
            className="flex-1 bg-white border-blue-300 focus:border-blue-500"
          />
          <Button onClick={addTask} size="icon" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* My Tasks List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {myTasks.length === 0 ? (
            <div className="text-center py-12 text-blue-600">
              <Circle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No tasks yet. Add your first task!</p>
            </div>
          ) : (
            myTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-3 p-4 rounded-lg border-2 border-blue-200 bg-white transition-all hover:shadow-md",
                  task.completed && "opacity-60"
                )}
              >
                <button
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-blue-400" />
                  )}
                </button>

                <div className="flex-1">
                  {editingTaskId === task.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") saveEdit(task.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => saveEdit(task.id)}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={cancelEditing}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "font-medium text-blue-900",
                        task.completed && "line-through text-blue-500"
                      )}
                    >
                      {task.title}
                    </p>
                  )}
                </div>

                {editingTaskId !== task.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEditing(task)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* PARTNER'S TASKS CARD - Right Side */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-2xl p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-green-900 mb-1">Partner's Tasks</h2>
          <p className="text-sm text-green-700">
            {partnerships.length > 0 
              ? "👀 View only - they manage their tasks" 
              : "🤝 Connect to see partner's tasks"}
          </p>
          <div className="text-xs text-green-600 mt-1">
            {partnerCompletedCount} of {partnerTasks.length} completed
          </div>
        </div>

        {/* Partner's Tasks List (View Only) */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto mt-[76px]">
          {partnerships.length === 0 ? (
            <div className="text-center py-12 text-green-600">
              <Circle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Go to Partners tab to connect</p>
              <p className="text-xs mt-2">Partner's tasks will appear here</p>
            </div>
          ) : partnerTasks.length === 0 ? (
            <div className="text-center py-12 text-green-600">
              <Circle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Your partner hasn't added any tasks yet</p>
            </div>
          ) : (
            partnerTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 border-green-200 bg-white",
                  task.completed && "opacity-60"
                )}
              >
                <div className="flex-shrink-0">
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-green-400" />
                  )}
                </div>

                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium text-green-900",
                      task.completed && "line-through text-green-500"
                    )}
                  >
                    {task.title}
                  </p>
                </div>

                {/* No edit/delete buttons - view only */}
                <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs">
                  View Only
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
