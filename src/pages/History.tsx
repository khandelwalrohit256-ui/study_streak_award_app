import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDailyProgressRange, fetchStudySessions } from "@/lib/api";
import { getDaysAgo, getTodayDate, formatShortDate, formatDuration, getMonthLabel } from "@/lib/date";
import type { DailyProgress } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Flame, Trophy, TrendingUp, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function History() {
  const { session, profile } = useAuth();
  const [allProgress, setAllProgress] = useState<DailyProgress[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Load 120 days of history for the GitHub-style calendar
  const load = useCallback(async () => {
    if (!session) return;
    try {
      const start = getDaysAgo(119);
      const data = await fetchDailyProgressRange(session.user.id, start, getTodayDate());
      setAllProgress(data);
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const progressMap = new Map(allProgress.map((p) => [p.progress_date, p]));

  // Calendar grid for selected month
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const calendarCells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(calYear, calMonth, d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    calendarCells.push(`${y}-${m}-${day}`);
  }

  // Stats
  const completedDays = allProgress.filter((p) => p.status === "completed").length;
  const missedDays = allProgress.filter((p) => p.status === "missed").length;
  const totalStudySeconds = allProgress.reduce((sum, p) => sum + p.total_study_seconds, 0);
  const completionPct = allProgress.length > 0 ? Math.round((completedDays / allProgress.length) * 100) : 0;

  const selectedProgress = selectedDate ? progressMap.get(selectedDate) : null;

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  const today = getTodayDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your study journey over time</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <Flame size={18} className="mx-auto text-orange-500 mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{completedDays}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Completed</p>
        </Card>
        <Card className="p-3 text-center">
          <Trophy size={18} className="mx-auto text-amber-500 mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{profile?.longest_streak ?? 0}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Best Streak</p>
        </Card>
        <Card className="p-3 text-center">
          <TrendingUp size={18} className="mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{completionPct}%</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Success Rate</p>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {getMonthLabel(calMonth)} {calYear}
          </h3>
          <button
            onClick={nextMonth}
            disabled={calYear === new Date().getFullYear() && calMonth === new Date().getMonth()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-gray-400 pb-1">{d}</div>
          ))}
          {calendarCells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const progress = progressMap.get(dateStr);
            const isToday = dateStr === today;
            const isFuture = dateStr > today;
            const isSelected = dateStr === selectedDate;

            let bgColor = "bg-gray-100 dark:bg-gray-800";
            if (progress?.status === "completed") bgColor = "bg-emerald-500";
            else if (progress?.status === "missed") bgColor = "bg-red-500";
            else if (progress?.status === "pending" && !isFuture) bgColor = "bg-amber-400";
            if (isFuture) bgColor = "bg-gray-50 dark:bg-gray-900/50 opacity-40";

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "aspect-square rounded-lg text-[10px] font-medium transition-all hover:scale-105 hover:ring-2 hover:ring-blue-500/30",
                  bgColor,
                  isSelected && "ring-2 ring-blue-500",
                  isToday && "ring-1 ring-blue-400"
                )}
              >
                <span className={cn(
                  progress?.status === "completed" || progress?.status === "missed" ? "text-white" : "text-gray-600 dark:text-gray-400"
                )}>
                  {parseInt(dateStr.split("-")[2])}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Completed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Missed</span>
        </div>
      </Card>

      {/* Selected day detail */}
      {selectedDate && (
        <Card className="p-5 animate-[fadeIn_0.2s_ease-out]">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {formatShortDate(selectedDate)}
          </h3>
          {selectedProgress ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {selectedProgress.status === "completed" && <Badge variant="success">🎉 Completed</Badge>}
                {selectedProgress.status === "missed" && <Badge variant="error">❌ Missed</Badge>}
                {selectedProgress.status === "pending" && <Badge variant="warning">⏳ Pending</Badge>}
                <Badge variant="default">
                  🔥 {selectedProgress.streak_count} day streak
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Required Tasks</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedProgress.completed_required}/{selectedProgress.total_required}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Optional Tasks</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedProgress.completed_optional}/{selectedProgress.total_optional}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Study Time</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <Clock size={14} className="text-blue-500" />
                    {formatDuration(selectedProgress.total_study_seconds)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Evaluated</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedProgress.evaluated_at ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">No data for this day</p>
          )}
        </Card>
      )}

      {/* Recent days list */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Days</h3>
        <div className="space-y-2">
          {allProgress
            .slice()
            .reverse()
            .slice(0, 14)
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  {p.status === "completed" && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  {p.status === "missed" && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  {p.status === "pending" && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                  <span className="text-gray-700 dark:text-gray-300">{formatShortDate(p.progress_date)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{p.completed_required}/{p.total_required} tasks</span>
                  <span>{formatDuration(p.total_study_seconds)}</span>
                  <span className="flex items-center gap-0.5">
                    <Flame size={12} className="text-orange-500" />
                    {p.streak_count}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* GitHub-style heatmap */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">120-Day Heatmap</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-[3px] min-w-fit">
            {Array.from({ length: 17 }, (_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const dayOffset = weekIdx * 7 + dayIdx - new Date().getDay();
                  const date = getDaysAgo(119 - dayOffset);
                  if (date > today) return <div key={dayIdx} className="w-3 h-3 rounded-sm bg-transparent" />;
                  const progress = progressMap.get(date);
                  let bg = "bg-gray-100 dark:bg-gray-800";
                  if (progress?.status === "completed") bg = "bg-emerald-500";
                  else if (progress?.status === "missed") bg = "bg-red-500";
                  else if (progress?.status === "pending") bg = "bg-amber-400";
                  return (
                    <div
                      key={dayIdx}
                      className={cn("w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-pointer", bg)}
                      title={`${formatShortDate(date)}: ${progress?.status || "no data"}`}
                      onClick={() => setSelectedDate(date)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
