import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchTodayTasks,
  fetchDailyProgress,
  syncProgress,
} from "@/lib/api";
import { getTodayDate, formatDate, formatDuration } from "@/lib/date";
import { MOTIVATIONAL_MESSAGES } from "@/lib/constants";
import type { TaskWithCompletion, DailyProgress } from "@/types";
import type { PageId } from "@/components/Layout";
import { Flame, Trophy, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

export function Dashboard({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { session, profile } = useAuth();
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      await syncProgress();
      const [t, p] = await Promise.all([
        fetchTodayTasks(session.user.id),
        fetchDailyProgress(session.user.id, getTodayDate()),
      ]);
      setTasks(t);
      setProgress(p);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const today = getTodayDate();
  const dateLabel = formatDate(today);

  const requiredTasks = tasks.filter((t) => t.is_required);
  const optionalTasks = tasks.filter((t) => !t.is_required);
  const completedRequired = requiredTasks.filter((t) => t.completed_today).length;
  const completedOptional = optionalTasks.filter((t) => t.completed_today).length;
  const totalStudySeconds = tasks.reduce((sum, t) => sum + t.study_seconds_today, 0);
  const tasksRemaining = requiredTasks.length - completedRequired;
  const pct = requiredTasks.length > 0 ? Math.round((completedRequired / requiredTasks.length) * 100) : 0;
  const streak = progress?.streak_count ?? 0;
  const longest = profile?.longest_streak ?? 0;

  const status = progress?.status ?? "pending";
  const messageKey = status === "completed" ? "completed" : status === "missed" ? "missed" : tasksRemaining === 0 ? "completed" : tasksRemaining <= requiredTasks.length / 2 ? "in_progress" : "pending";
  const messages = MOTIVATIONAL_MESSAGES[messageKey];
  const motivation = messages[Math.floor(Math.random() * messages.length)];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Date */}
      <div className="text-center pt-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{dateLabel}</p>
      </div>

      {/* Streak card */}
      <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
        <div className="absolute inset-0 opacity-20">
          <Flame size={200} className="absolute -right-10 -bottom-20" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">Current Streak</p>
            <div className="flex items-baseline gap-2 mt-1">
              <Flame size={40} className="text-white" />
              <span className="text-5xl font-bold">{streak}</span>
              <span className="text-lg font-medium text-white/80">days</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-white/90">
              <Trophy size={18} />
              <span className="text-sm font-medium">Best: {longest}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Progress card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Today's Progress</h2>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pct}%</span>
        </div>
        <ProgressBar
          value={completedRequired}
          max={requiredTasks.length}
          showLabel
          color="bg-gradient-to-r from-blue-600 to-blue-400"
        />
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
              <CheckCircle2 size={14} />
              <span className="text-xs">Done</span>
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {completedRequired}/{requiredTasks.length}
            </p>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
              <Clock size={14} />
              <span className="text-xs">Studied</span>
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {formatDuration(totalStudySeconds)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-1">
              <AlertTriangle size={14} />
              <span className="text-xs">Left</span>
            </div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {tasksRemaining}
            </p>
          </div>
        </div>
      </Card>

      {/* Status + optional */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Day Status</p>
          {status === "completed" ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
            </div>
          ) : status === "missed" ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <span className="font-semibold text-red-500">Missed</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏳</span>
              <span className="font-semibold text-amber-500">In Progress</span>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Optional Tasks</p>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              {completedOptional}
            </span>
            <span className="text-sm text-gray-400">/ {optionalTasks.length}</span>
          </div>
        </Card>
      </div>

      {/* Motivational message */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-2">
          <TrendingUp size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 dark:text-gray-300">{motivation}</p>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => onNavigate("tasks")} size="lg">
          View Tasks
        </Button>
        <Button onClick={() => onNavigate("focus")} size="lg">
          Start Focus
        </Button>
      </div>

      {/* Reward status */}
      {status === "completed" ? (
        <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                🎁 Rewards Unlocked!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                You earned your daily rewards. Enjoy!
              </p>
            </div>
            <Button variant="success" size="sm" onClick={() => onNavigate("rewards")}>
              Claim
            </Button>
          </div>
        </Card>
      ) : tasksRemaining > 0 ? (
        <Card className="p-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-600 dark:text-gray-400">
                🔒 Rewards Locked
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Complete all {requiredTasks.length} required tasks to unlock
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("rewards")}>
              View
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Streak risk warning */}
      {status === "pending" && tasksRemaining > 0 && tasksRemaining <= 2 && streak > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ You have {tasksRemaining} required task{tasksRemaining > 1 ? "s" : ""} remaining.
              Complete them before the day ends to protect your {streak}-day streak!
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
