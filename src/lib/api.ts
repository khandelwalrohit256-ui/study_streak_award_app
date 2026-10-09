import { supabase } from "./supabase";
import { getTodayDate } from "./date";
import type {
  Task,
  TaskCompletion,
  StudySession,
  DailyProgress,
  Reward,
  RewardUnlock,
  FocusSession,
  TaskWithCompletion,
} from "@/types";

export async function fetchTodayTasks(
  userId: string
): Promise<TaskWithCompletion[]> {
  const today = getTodayDate();

  const [tasksResult, completionsResult, sessionsResult] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", userId).eq("is_active", true),
    supabase
      .from("task_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("completion_date", today),
    supabase
      .from("study_sessions")
      .select("task_id, duration_seconds")
      .eq("user_id", userId)
      .eq("session_date", today),
  ]);

  if (tasksResult.error) throw tasksResult.error;

  const tasks = (tasksResult.data || []) as Task[];
  const completions = (completionsResult.data || []) as TaskCompletion[];
  const sessions = (sessionsResult.data || []) as {
    task_id: string;
    duration_seconds: number;
  }[];

  const studyByTask = sessions.reduce((acc, s) => {
    acc[s.task_id] = (acc[s.task_id] || 0) + s.duration_seconds;
    return acc;
  }, {} as Record<string, number>);

  return tasks.map((task) => {
    const completion = completions.find((c) => c.task_id === task.id);
    return {
      ...task,
      completed_today: completion?.is_completed ?? false,
      completion_id: completion?.id ?? null,
      study_seconds_today: studyByTask[task.id] || 0,
    } as TaskWithCompletion;
  });
}

export async function toggleTaskCompletion(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const today = getTodayDate();

  if (completed) {
    const { error } = await supabase.from("task_completions").upsert(
      {
        user_id: userId,
        task_id: taskId,
        completion_date: today,
        is_completed: true,
      },
      { onConflict: "task_id,completion_date" }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("task_completions")
      .delete()
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("completion_date", today);
    if (error) throw error;
  }

  await supabase.rpc("sync_user_progress");
}

export async function createTask(
  userId: string,
  task: Omit<Task, "id" | "user_id" | "is_active" | "created_at" | "updated_at">
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  await supabase.from("tasks").update({ is_active: false }).eq("id", taskId);
}

export async function saveStudySession(
  session: Omit<StudySession, "id" | "user_id" | "created_at">
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { error } = await supabase.from("study_sessions").insert({
    ...session,
    user_id: userData.user.id,
  });
  if (error) throw error;

  await supabase.rpc("sync_user_progress");
}

export async function saveFocusSession(
  session: Omit<FocusSession, "id" | "user_id" | "created_at">
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { error } = await supabase.from("focus_sessions").insert({
    ...session,
    user_id: userData.user.id,
  });
  if (error) throw error;
}

export async function fetchDailyProgress(
  userId: string,
  date: string
): Promise<DailyProgress | null> {
  const { data, error } = await supabase
    .from("daily_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("progress_date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchDailyProgressRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyProgress[]> {
  const { data, error } = await supabase
    .from("daily_progress")
    .select("*")
    .eq("user_id", userId)
    .gte("progress_date", startDate)
    .lte("progress_date", endDate)
    .order("progress_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchStudySessions(
  userId: string,
  startDate: string,
  endDate: string
): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .order("started_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRewards(userId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createReward(
  userId: string,
  reward: Omit<Reward, "id" | "user_id" | "is_active" | "created_at">
): Promise<Reward> {
  const { data, error } = await supabase
    .from("rewards")
    .insert({ ...reward, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReward(rewardId: string): Promise<void> {
  await supabase.from("rewards").update({ is_active: false }).eq("id", rewardId);
}

export async function fetchRewardUnlocks(
  userId: string,
  date: string
): Promise<RewardUnlock[]> {
  const { data, error } = await supabase
    .from("reward_unlocks")
    .select("*")
    .eq("user_id", userId)
    .eq("unlock_date", date);
  if (error) throw error;
  return data || [];
}

export async function markRewardUsed(unlockId: string): Promise<void> {
  const { error } = await supabase
    .from("reward_unlocks")
    .update({ used_at: new Date().toISOString() })
    .eq("id", unlockId);
  if (error) throw error;
}

export async function syncProgress(): Promise<void> {
  await supabase.rpc("sync_user_progress");
}
