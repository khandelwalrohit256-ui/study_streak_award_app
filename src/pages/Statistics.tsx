import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDailyProgressRange, fetchStudySessions } from "@/lib/api";
import { getDaysAgo, getTodayDate, formatDuration, getDayLabel, getWeekDates, getMonthLabel } from "@/lib/date";
import type { DailyProgress, StudySession } from "@/types";
import { Card } from "@/components/ui/Card";
import { Flame, Trophy, Clock, Target, TrendingUp, Calendar } from "lucide-react";

export function Statistics() {
  const { session, profile } = useAuth();
  const [progress30, setProgress30] = useState<DailyProgress[]>([]);
  const [sessions30, setSessions30] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const start30 = getDaysAgo(29);
      const [p, s] = await Promise.all([
        fetchDailyProgressRange(session.user.id, start30, getTodayDate()),
        fetchStudySessions(session.user.id, start30, getTodayDate()),
      ]);
      setProgress30(p);
      setSessions30(s);
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayProgress = progress30.find((p) => p.progress_date === getTodayDate());
  const currentStreak = todayProgress?.streak_count ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;

  // Weekly study hours (last 7 days)
  const weekDates = getWeekDates();
  const weeklyData = weekDates.map((date) => {
    const sessions = sessions30.filter((s) => s.session_date === date);
    const seconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    return { date, seconds, hours: seconds / 3600 };
  });
  const weeklyTotal = weeklyData.reduce((sum, d) => sum + d.seconds, 0);

  // Monthly study hours (last 30 days)
  const monthlyTotal = sessions30.reduce((sum, s) => sum + s.duration_seconds, 0);

  // Task completion rate
  const totalRequiredAllDays = progress30.reduce((sum, p) => sum + p.total_required, 0);
  const completedRequiredAllDays = progress30.reduce((sum, p) => sum + p.completed_required, 0);
  const completionRate = totalRequiredAllDays > 0 ? Math.round((completedRequiredAllDays / totalRequiredAllDays) * 100) : 0;

  // Most consistent subject (by study time)
  const subjectTimes: Record<string, number> = {};
  // We need task info for sessions, but sessions only have task_id
  // Let's calculate from progress data instead - completed vs total by category
  // Actually we don't have category in sessions. Let's use completion data.
  const completedDays = progress30.filter((p) => p.status === "completed").length;
  const missedDays = progress30.filter((p) => p.status === "missed").length;

  // Missed tasks count
  const missedTasks = progress30.reduce((sum, p) => sum + (p.total_required - p.completed_required), 0);

  // Max weekly hours for chart scaling
  const maxWeeklyHours = Math.max(...weeklyData.map((d) => d.hours), 1);

  // Monthly bar chart - last 4 weeks
  const monthLabels: { label: string; seconds: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = getDaysAgo(i * 7 + 6);
    const weekEnd = getDaysAgo(i * 7);
    const weekSessions = sessions30.filter((s) => s.session_date >= weekStart && s.session_date <= weekEnd);
    const seconds = weekSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    monthLabels.push({ label: i === 0 ? "This week" : `${i}w ago`, seconds });
  }
  const maxMonthSeconds = Math.max(...monthLabels.map((d) => d.seconds), 1);

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Track your study performance</p>
      </div>

      {/* Streak stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-orange-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Current Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStreak} days</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} className="text-amber-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Longest Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{longestStreak} days</p>
        </Card>
      </div>

      {/* Weekly study hours chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Weekly Study Hours</h3>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {formatDuration(weeklyTotal)}
          </span>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center h-24">
                <div
                  className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 hover:opacity-80"
                  style={{ height: `${Math.max((d.hours / maxWeeklyHours) * 100, 2)}%` }}
                  title={`${formatDuration(d.seconds)}`}
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {getDayLabel(d.date).charAt(0)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly study hours chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Monthly Overview</h3>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {formatDuration(monthlyTotal)} total
          </span>
        </div>
        <div className="flex items-end justify-between gap-3 h-32">
          {monthLabels.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center h-24">
                <div
                  className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500"
                  style={{ height: `${Math.max((d.seconds / maxMonthSeconds) * 100, 2)}%` }}
                  title={formatDuration(d.seconds)}
                />
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={18} className="text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} className="text-purple-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Monthly Study</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(monthlyTotal)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-emerald-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Completed Days</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedDays}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-red-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Missed Days</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{missedDays}</p>
        </Card>
      </div>

      {/* Missed tasks */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Missed Tasks (30 days)</h3>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-red-500">{missedTasks}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            required tasks not completed
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Each missed task can break your streak. Stay consistent!
        </p>
      </Card>
    </div>
  );
}
