import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTodayTasks, saveStudySession, saveFocusSession, toggleTaskCompletion } from "@/lib/api";
import { formatTimer, getTodayDate } from "@/lib/date";
import { MOTIVATIONAL_MESSAGES } from "@/lib/constants";
import type { TaskWithCompletion, SessionMode } from "@/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Play,
  Pause,
  Square,
  Check,
  Brain,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { PageId } from "@/components/Layout";

type TimerState = "idle" | "running" | "paused" | "completed";

export function Focus({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [mode, setMode] = useState<SessionMode>("custom");
  const [targetSeconds, setTargetSeconds] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [focusMode, setFocusMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const data = await fetchTodayTasks(session.user.id);
    setTasks(data);
    if (data.length > 0 && !selectedTaskId) {
      setSelectedTaskId(data[0].id);
    }
  }, [session, selectedTaskId]);

  useEffect(() => {
    load();
  }, [load]);

  // Timer tick
  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (mode === "pomodoro" && next >= targetSeconds) {
            return targetSeconds;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, mode, targetSeconds]);

  // Check completion
  useEffect(() => {
    if (mode === "pomodoro" && elapsed >= targetSeconds && timerState === "running") {
      setTimerState("completed");
      if (soundEnabled) playBeep();
    }
  }, [elapsed, targetSeconds, mode, timerState, soundEnabled]);

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 300);
    } catch {}
  }

  function handleStart() {
    if (timerState === "idle" || timerState === "completed") {
      setElapsed(0);
      sessionStartRef.current = Date.now();
    }
    setTimerState("running");
    setFocusMode(true);
  }

  function handlePause() {
    setTimerState("paused");
  }

  function handleResume() {
    setTimerState("running");
  }

  async function handleStop() {
    if (elapsed > 0) {
      setSaving(true);
      try {
        await saveStudySession({
          task_id: selectedTaskId || null,
          session_date: getTodayDate(),
          started_at: new Date(sessionStartRef.current || Date.now() - elapsed * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: elapsed,
          mode,
        });
        await saveFocusSession({
          task_id: selectedTaskId || null,
          started_at: new Date(sessionStartRef.current || Date.now() - elapsed * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: elapsed,
          was_interrupted: false,
        });
        await load();
      } catch {}
      setSaving(false);
    }
    setTimerState("idle");
    setElapsed(0);
    setFocusMode(false);
    sessionStartRef.current = null;
  }

  async function handleComplete() {
    if (!session || !selectedTaskId) return;
    setSaving(true);
    try {
      if (elapsed > 0) {
        await saveStudySession({
          task_id: selectedTaskId,
          session_date: getTodayDate(),
          started_at: new Date(sessionStartRef.current || Date.now() - elapsed * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: elapsed,
          mode,
        });
        await saveFocusSession({
          task_id: selectedTaskId,
          started_at: new Date(sessionStartRef.current || Date.now() - elapsed * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: elapsed,
          was_interrupted: false,
        });
      }
      await toggleTaskCompletion(session.user.id, selectedTaskId, true);
      await load();
      setTimerState("idle");
      setElapsed(0);
      setFocusMode(false);
      sessionStartRef.current = null;
    } catch {}
    setSaving(false);
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const remaining = mode === "pomodoro" ? Math.max(targetSeconds - elapsed, 0) : 0;
  const displayTime = mode === "pomodoro" ? formatTimer(remaining) : formatTimer(elapsed);
  const progress = mode === "pomodoro" && targetSeconds > 0 ? (elapsed / targetSeconds) * 100 : 0;

  // Focus Mode UI (Do Not Disturb style)
  if (focusMode) {
    const msgKey = timerState === "completed" ? "completed" : "in_progress";
    const msgs = MOTIVATIONAL_MESSAGES[msgKey];
    const motivation = msgs[Math.floor((Date.now() / 10000) % msgs.length)];

    return (
      <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col items-center justify-center px-6 animate-[fadeIn_0.3s_ease-out]">
        <button
          onClick={() => setFocusMode(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center space-y-8 max-w-sm w-full">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800 text-sm text-gray-400">
              <Brain size={14} />
              Focus Mode
            </div>
            <h2 className="text-2xl font-bold">{selectedTask?.name || "Study Session"}</h2>
            {selectedTask && (
              <p className="text-sm text-gray-500">{selectedTask.category}</p>
            )}
          </div>

          {/* Timer */}
          <div className="relative">
            {mode === "pomodoro" && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgb(31,41,55)" strokeWidth="6" />
                <circle
                  cx="100" cy="100" r="90" fill="none" stroke="rgb(59,130,246)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 565.5} 565.5`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
            )}
            <div className={`text-7xl font-bold font-mono tabular-nums ${mode === "pomodoro" ? "py-12" : ""}`}>
              {displayTime}
            </div>
          </div>

          {timerState === "completed" && (
            <div className="space-y-3 animate-[fadeIn_0.5s_ease-out]">
              <p className="text-lg text-emerald-400 font-semibold">Pomodoro Complete!</p>
              <p className="text-sm text-gray-400">{motivation}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleStop} size="lg">
                  Save & Exit
                </Button>
                <Button onClick={handleComplete} size="lg" disabled={saving || !selectedTaskId}>
                  <Check size={18} />
                  Mark Task Done
                </Button>
              </div>
            </div>
          )}

          {timerState === "running" && (
            <>
              <p className="text-sm text-gray-500 italic">{motivation}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handlePause} size="lg">
                  <Pause size={20} />
                  Pause
                </Button>
                <Button variant="danger" onClick={handleStop} size="lg" disabled={saving}>
                  <Square size={20} />
                  Stop
                </Button>
              </div>
            </>
          )}

          {timerState === "paused" && (
            <div className="flex gap-3 justify-center">
              <Button onClick={handleResume} size="lg">
                <Play size={20} />
                Resume
              </Button>
              <Button variant="danger" onClick={handleStop} size="lg" disabled={saving}>
                <Square size={20} />
                Stop
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <button onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? "Sound On" : "Sound Off"}
              </button>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Normal Focus page UI
  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Focus Mode</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Start a study session with a distraction-free timer
        </p>
      </div>

      {/* Task selector */}
      <Card className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Select Task
          </label>
          <Select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
            {tasks.length === 0 ? (
              <option value="">No tasks available</option>
            ) : (
              tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.completed_today ? "(Done)" : ""} — {t.category}
                </option>
              ))
            )}
          </Select>
        </div>

        {selectedTask && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={selectedTask.is_required ? "required" : "optional"}>
              {selectedTask.is_required ? "Required" : "Optional"}
            </Badge>
            <Badge variant={selectedTask.priority}>
              {selectedTask.priority}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Est: {selectedTask.estimated_minutes}m
            </span>
            {selectedTask.completed_today && (
              <Badge variant="success">
                <Check size={12} /> Completed
              </Badge>
            )}
          </div>
        )}

        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("custom"); setTimerState("idle"); setElapsed(0); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              mode === "custom"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            Custom Timer
          </button>
          <button
            onClick={() => { setMode("pomodoro"); setTimerState("idle"); setElapsed(0); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              mode === "pomodoro"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            Pomodoro
          </button>
        </div>

        {/* Duration presets */}
        {mode === "pomodoro" ? (
          <div className="flex gap-2">
            {[15, 25, 50].map((min) => (
              <button
                key={min}
                onClick={() => { setTargetSeconds(min * 60); setTimerState("idle"); setElapsed(0); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  targetSeconds === min * 60
                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            {[10, 30, 60, 90].map((min) => (
              <button
                key={min}
                onClick={() => { setTargetSeconds(min * 60); setTimerState("idle"); setElapsed(0); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  targetSeconds === min * 60
                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
        )}

        {/* Timer display */}
        <div className="text-center py-6">
          <div className="text-5xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
            {mode === "pomodoro" ? formatTimer(remaining) : formatTimer(elapsed)}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {timerState === "idle" && "Ready to start"}
            {timerState === "running" && "In progress..."}
            {timerState === "paused" && "Paused"}
            {timerState === "completed" && "Session complete!"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {timerState === "idle" || timerState === "completed" ? (
            <Button onClick={handleStart} size="lg" className="flex-1" disabled={tasks.length === 0}>
              <Play size={20} />
              Start Focus
            </Button>
          ) : timerState === "running" ? (
            <>
              <Button variant="secondary" onClick={handlePause} size="lg" className="flex-1">
                <Pause size={20} />
                Pause
              </Button>
              <Button variant="danger" onClick={handleStop} size="lg" className="flex-1" disabled={saving}>
                <Square size={20} />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleResume} size="lg" className="flex-1">
                <Play size={20} />
                Resume
              </Button>
              <Button variant="danger" onClick={handleStop} size="lg" className="flex-1" disabled={saving}>
                <Square size={20} />
                Stop
              </Button>
            </>
          )}
        </div>

        {timerState === "completed" && (
          <Button onClick={handleComplete} variant="success" size="lg" className="w-full" disabled={saving || !selectedTaskId}>
            <Check size={20} />
            Mark Task as Completed
          </Button>
        )}
      </Card>

      {/* Today's study summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Today's Sessions</h3>
        {tasks.filter((t) => t.study_seconds_today > 0).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No study sessions yet today</p>
        ) : (
          <div className="space-y-2">
            {tasks.filter((t) => t.study_seconds_today > 0).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{t.name}</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {Math.floor(t.study_seconds_today / 60)}m
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Android integration note */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-2">
          <Brain size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-400">App Blocking Integration (Android)</p>
            <p>Focus Mode is architected for future Android app-blocking via Usage Access API (PACKAGE_USAGE_STATS) and AccessibilityService. On web/PWA, the Notification API + Screen Wake Lock API can supplement distraction control.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
