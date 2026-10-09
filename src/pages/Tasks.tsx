import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchTodayTasks,
  toggleTaskCompletion,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/api";
import type { TaskWithCompletion, Priority, Task } from "@/types";
import { CATEGORIES, PRIORITY_CONFIG } from "@/lib/constants";
import { formatTime, formatDuration } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Label } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import {
  Plus,
  Check,
  Timer,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import type { PageId } from "@/components/Layout";

export function Tasks({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const data = await fetchTodayTasks(session.user.id);
      setTasks(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(taskId: string, completed: boolean) {
    if (!session) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed_today: completed } : t
      )
    );
    try {
      await toggleTaskCompletion(session.user.id, taskId, completed);
      await load();
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed_today: !completed } : t
        )
      );
      setError(String(err));
    }
  }

  async function handleDelete(taskId: string) {
    if (!session) return;
    try {
      await deleteTask(taskId);
      await load();
    } catch (err) {
      setError(String(err));
    }
  }

  const requiredTasks = tasks.filter((t) => t.is_required);
  const optionalTasks = tasks.filter((t) => !t.is_required);

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {requiredTasks.filter((t) => t.completed_today).length}/{requiredTasks.length} required done
          </p>
        </div>
        <Button onClick={() => { setEditingTask(null); setShowForm(true); }} size="md">
          <Plus size={18} />
          Add Task
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">No tasks yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Create your first daily study task to get started
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} />
            Create Task
          </Button>
        </Card>
      ) : (
        <>
          {requiredTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
                REQUIRED TASKS
              </h2>
              <div className="space-y-2">
                {requiredTasks
                  .sort((a, b) => {
                    const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
                    return order[a.priority] - order[b.priority];
                  })
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onEdit={() => { setEditingTask(task); setShowForm(true); }}
                      onDelete={handleDelete}
                      onStudy={() => onNavigate("focus")}
                    />
                  ))}
              </div>
            </div>
          )}

          {optionalTasks.length > 0 && (
            <div className="pt-2">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
                OPTIONAL TASKS
              </h2>
              <div className="space-y-2">
                {optionalTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggle}
                    onEdit={() => { setEditingTask(task); setShowForm(true); }}
                    onDelete={handleDelete}
                    onStudy={() => onNavigate("focus")}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <TaskForm
          task={editingTask}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
          onSaved={() => { setShowForm(false); setEditingTask(null); load(); }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onStudy,
}: {
  task: TaskWithCompletion;
  onToggle: (taskId: string, completed: boolean) => void;
  onEdit: () => void;
  onDelete: (taskId: string) => void;
  onStudy: () => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[task.priority];

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id, !task.completed_today)}
          className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
            task.completed_today
              ? "bg-blue-600 border-blue-600 text-white"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
          }`}
        >
          {task.completed_today && <Check size={16} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-medium ${
                task.completed_today
                  ? "text-gray-400 dark:text-gray-500 line-through"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {task.name}
            </h3>
            <Badge variant={task.priority}>{priorityCfg.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {task.estimated_minutes}m
            </span>
            <span>{task.category}</span>
            {task.start_time && (
              <span>
                {formatTime(task.start_time)}
                {task.end_time ? ` - ${formatTime(task.end_time)}` : ""}
              </span>
            )}
            {task.study_seconds_today > 0 && (
              <span className="text-blue-500">
                Studied {formatDuration(task.study_seconds_today)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onStudy}
            className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Start study session"
          >
            <Timer size={18} />
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function TaskForm({
  task,
  onClose,
  onSaved,
}: {
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState(task?.name ?? "");
  const [category, setCategory] = useState(task?.category ?? "DSA");
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimated_minutes ?? 30);
  const [isRequired, setIsRequired] = useState(task?.is_required ?? true);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [startTime, setStartTime] = useState(task?.start_time ?? "");
  const [endTime, setEndTime] = useState(task?.end_time ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError("");
    try {
      const data = {
        name,
        category,
        estimated_minutes: estimatedMinutes,
        is_required: isRequired,
        priority,
        start_time: startTime || null,
        end_time: endTime || null,
      };
      if (task) {
        await updateTask(task.id, data);
      } else {
        await createTask(session.user.id, data);
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={task ? "Edit Task" : "New Task"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="task-name">Task Name</Label>
          <Input
            id="task-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DSA Practice"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-category">Category</Label>
            <Select
              id="task-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="task-duration">Estimated Duration (minutes)</Label>
          <Input
            id="task-duration"
            type="number"
            min={1}
            max={600}
            required
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 30)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-start">Start Time</Label>
            <Input
              id="task-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="task-end">End Time</Label>
            <Input
              id="task-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Required Task</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Required tasks affect your streak
            </p>
          </div>
          <Toggle checked={isRequired} onChange={setIsRequired} />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving..." : task ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
