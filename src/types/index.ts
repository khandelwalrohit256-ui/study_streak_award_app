export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  theme: "dark" | "light";
  notification_settings: NotificationSettings;
  longest_streak: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  task_reminders: boolean;
  study_reminders: boolean;
  evening_warning: boolean;
  streak_risk: boolean;
  warning_time: string;
}

export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  user_id: string;
  name: string;
  category: string;
  estimated_minutes: number;
  is_required: boolean;
  priority: Priority;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  completion_date: string;
  completed_at: string;
  is_completed: boolean;
}

export type SessionMode = "custom" | "pomodoro";

export interface StudySession {
  id: string;
  user_id: string;
  task_id: string | null;
  session_date: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  mode: SessionMode;
  created_at: string;
}

export type DayStatus = "pending" | "completed" | "missed";

export interface DailyProgress {
  id: string;
  user_id: string;
  progress_date: string;
  status: DayStatus;
  total_required: number;
  completed_required: number;
  total_optional: number;
  completed_optional: number;
  total_study_seconds: number;
  streak_count: number;
  evaluated_at: string | null;
}

export type RewardType =
  | "entertainment"
  | "social"
  | "gaming"
  | "movie"
  | "free_time"
  | "other";

export interface Reward {
  id: string;
  user_id: string;
  name: string;
  type: RewardType;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface RewardUnlock {
  id: string;
  user_id: string;
  reward_id: string;
  unlock_date: string;
  is_unlocked: boolean;
  used_at: string | null;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  was_interrupted: boolean;
  created_at: string;
}

export interface TaskWithCompletion extends Task {
  completed_today: boolean;
  completion_id: string | null;
  study_seconds_today: number;
}
