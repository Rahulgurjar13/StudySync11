import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, AlertCircle, CheckCircle2, Circle, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Task {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  isShared?: boolean;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  } | string;
  partnershipId?: string;
  createdAt: string;
}

export const SharedTodoList = () => {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [partnerTasks, setPartnerTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchPartnerships();
      fetchTasks();
    }
  }, [user]);

  const fetchPartnerships = async () => {
    try {
      console.log('[SharedTodoList] Fetching partnerships...');
      const data = await api.partnerships.getAll();
      console.log('[SharedTodoList] Partnerships fetched:', data);
      setPartnerships(data || []);
    } catch (error) {
      console.error('[SharedTodoList] Error fetching partnerships:', error);
      toast.error('Failed to load partnerships');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      console.log('[SharedTodoList] Fetching all tasks...');
      const allTasks = await api.tasks.getAll();
      console.log('[SharedTodoList] All tasks fetched:', allTasks);
      console.log('[SharedTodoList] Current user ID:', user?.id);
      
      // Separate my tasks and partner tasks
      const mine = allTasks.filter((t: Task) => {
        const userId = typeof t.userId === 'string' ? t.userId : t.userId._id;
        const isShared = t.isShared === true;
        const isMine = userId === user?.id;
        console.log(`[SharedTodoList] Task: ${t.title}, userId: ${userId}, isShared: ${isShared}, isMine: ${isMine}`);
        return isMine && isShared;
      });
      
      const partners = allTasks.filter((t: Task) => {
        const userId = typeof t.userId === 'string' ? t.userId : t.userId._id;
        const isShared = t.isShared === true;
        const isPartner = userId !== user?.id;
        return isPartner && isShared;
      });
      
      console.log('[SharedTodoList] My shared tasks:', mine);
      console.log('[SharedTodoList] Partner shared tasks:', partners);
      
      setMyTasks(mine);
      setPartnerTasks(partners);
    } catch (error) {
      console.error('[SharedTodoList] Error fetching tasks:', error);
      toast.error("Failed to load shared tasks");
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) {
      toast.error("Please enter a task");
      return;
    }

    if (partnerships.length === 0) {
      toast.error("Connect with a partner first to share tasks");
      return;
    }

    try {
      console.log('[SharedTodoList] Creating shared task:', {
        title: newTask,
        isShared: true,
        partnershipId: partnerships[0]._id
      });
      
      const created = await api.tasks.create({
        title: newTask,
        description: "",
        isShared: true,
        partnershipId: partnerships[0]._id,
      });
      
      console.log('[SharedTodoList] Task created:', created);
      setNewTask("");
      toast.success("Shared task created!");
      await fetchTasks(); // Refresh
    } catch (error: any) {
      console.error('[SharedTodoList] Error adding task:', error);
      toast.error(error.message || "Failed to create task");
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      console.log('[SharedTodoList] Toggling task:', taskId, 'from', currentStatus, 'to', !currentStatus);
      await api.tasks.update(taskId, { completed: !currentStatus });
      toast.success(!currentStatus ? "Task completed! +50 XP" : "Task uncompleted");
      await fetchTasks(); // Refresh
    } catch (error: any) {
      console.error('[SharedTodoList] Error updating task:', error);
      toast.error(error.message || "Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      console.log('[SharedTodoList] Deleting task:', taskId);
      await api.tasks.delete(taskId);
      toast.success("Task deleted");
      await fetchTasks(); // Refresh
    } catch (error: any) {
      console.error('[SharedTodoList] Error deleting task:', error);
      toast.error(error.message || "Failed to delete task");
    }
  };

  const getTaskOwnerName = (task: Task) => {
    if (typeof task.userId === 'object' && task.userId) {
      return task.userId.fullName || task.userId.email;
    }
    return "Unknown";
  };

  const isMyTask = (task: Task) => {
    const userId = typeof task.userId === 'string' ? task.userId : task.userId._id;
    return userId === user?.id;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shared Partner Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (partnerships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shared Partner Tasks
          </CardTitle>
          <CardDescription>Collaborate on tasks with your study partner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground mb-4">
              Connect with a partner to share tasks and work together!
            </p>
            <Button variant="outline" onClick={() => {
              document.querySelector('[value="connect"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }}>
              Go to Partners Tab
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          Shared Partner Tasks
        </CardTitle>
        <CardDescription className="text-purple-100">
          Tasks shared with your partner - both can see and complete them
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* IMPORTANT: Add Shared Tasks Here */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              ⚡ USE THIS INPUT FOR SHARED TASKS
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="🤝 Type your shared task here and press Enter..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTask()}
              className="flex-1 border-2 border-purple-300 focus:border-purple-500 bg-white text-lg"
            />
            <Button onClick={addTask} size="icon" className="gradient-primary h-11 w-11">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-purple-700 mt-2 font-medium">
            💡 Tasks added here will automatically be shared with your partner!
          </p>
        </div>

        {/* Task Lists Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Shared Tasks */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              My Shared Tasks ({myTasks.length})
            </h3>
            <div className="space-y-2">
              {myTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No shared tasks yet</p>
                  <p className="text-xs mt-1">Add tasks above to share with your partner</p>
                </div>
              ) : (
                myTasks.map((task) => (
                  <div
                    key={task._id}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 border-blue-200 transition-all hover:bg-blue-100/50",
                      task.completed && "opacity-60"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task._id, task.completed)}
                      className="flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium text-sm",
                          task.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1 bg-blue-100 text-blue-700">
                        You
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Partner's Shared Tasks */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Partner's Tasks ({partnerTasks.length})
            </h3>
            <div className="space-y-2">
              {partnerTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No partner tasks yet</p>
                  <p className="text-xs mt-1">Your partner hasn't shared any tasks</p>
                </div>
              ) : (
                partnerTasks.map((task) => (
                  <div
                    key={task._id}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg border bg-green-50/50 border-green-200 transition-all hover:bg-green-100/50",
                      task.completed && "opacity-60"
                    )}
                  >
                    <button
                      onClick={() => toggleTask(task._id, task.completed)}
                      className="flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium text-sm",
                          task.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1 bg-green-100 text-green-700">
                        {getTaskOwnerName(task)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How shared tasks work:</p>
              <ul className="space-y-1 text-xs">
                <li>• Both you and your partner can see all shared tasks</li>
                <li>• Anyone can mark tasks as complete</li>
                <li>• Only the task creator can delete their tasks</li>
                <li>• Completing tasks gives +50 XP to whoever marks them</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
