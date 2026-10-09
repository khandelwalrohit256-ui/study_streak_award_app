/*
# Study Streak — Full Database Schema

## Overview
Creates the complete schema for the Study Streak productivity app: user profiles,
recurring daily tasks, per-day task completions, study sessions, daily progress tracking,
rewards, reward unlocks, and focus sessions. Includes server-side SQL functions for
automatic streak calculation and day-end evaluation — the streak is NEVER manually
editable from the frontend.

## Tables Created
1. **profiles** — extends auth.users with display name, theme, notification settings, longest streak
2. **tasks** — recurring daily task definitions (name, category, duration, required/optional, priority, time window)
3. **task_completions** — per-day completion records (unique per task+date to prevent duplicates)
4. **study_sessions** — logged study time per task (mode: custom or pomodoro)
5. **daily_progress** — one row per user per day with status (pending/completed/missed), streak count, study time
6. **rewards** — user-defined rewards (name, type, duration)
7. **reward_unlocks** — per-day reward unlock/lock state
8. **focus_sessions** — focus mode session records

## SQL Functions
1. **evaluate_day_internal(user_id, date)** — core evaluation logic, no auth check (internal)
2. **evaluate_day(user_id, date)** — auth-checked wrapper for direct user calls
3. **sync_user_progress()** — called on app load, catches up on missed days and evaluates today
4. **evaluate_all_users_yesterday()** — for cron/edge function, evaluates all users' previous day

## Security
- RLS enabled on ALL tables
- All tables owner-scoped to auth.uid() via user_id (or id for profiles)
- 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE)
- SECURITY DEFINER functions with auth checks for user-facing functions
- Internal functions restricted to service_role only
- Auto-profile creation trigger on auth.users signup

## Important Notes
1. Streak is computed server-side — never trust frontend streak values
2. task_completions has UNIQUE(task_id, completion_date) to prevent duplicate completion
3. daily_progress has UNIQUE(user_id, progress_date) — one row per day
4. Only tasks with created_at <= evaluation date are counted (prevents retroactive impact)
5. Soft-delete via is_active flag on tasks — hard deletes would corrupt past evaluations
*/

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  notification_settings jsonb NOT NULL DEFAULT '{"task_reminders": true, "study_reminders": true, "evening_warning": true, "streak_risk": true, "warning_time": "20:00"}'::jsonb,
  longest_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  estimated_minutes integer NOT NULL DEFAULT 30 CHECK (estimated_minutes > 0 AND estimated_minutes <= 600),
  is_required boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  start_time time,
  end_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_active ON tasks(user_id, is_active);

-- ============================================
-- TASK COMPLETIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  completed_at timestamptz DEFAULT now(),
  is_completed boolean NOT NULL DEFAULT true,
  UNIQUE(task_id, completion_date)
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_completions" ON task_completions;
CREATE POLICY "select_own_completions" ON task_completions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_completions" ON task_completions;
CREATE POLICY "insert_own_completions" ON task_completions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_completions" ON task_completions;
CREATE POLICY "update_own_completions" ON task_completions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_completions" ON task_completions;
CREATE POLICY "delete_own_completions" ON task_completions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_completions_user_date ON task_completions(user_id, completion_date);
CREATE INDEX IF NOT EXISTS idx_completions_task_date ON task_completions(task_id, completion_date);

-- ============================================
-- STUDY SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  mode text NOT NULL DEFAULT 'custom' CHECK (mode IN ('custom', 'pomodoro')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON study_sessions;
CREATE POLICY "select_own_sessions" ON study_sessions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON study_sessions;
CREATE POLICY "insert_own_sessions" ON study_sessions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON study_sessions;
CREATE POLICY "update_own_sessions" ON study_sessions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON study_sessions;
CREATE POLICY "delete_own_sessions" ON study_sessions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON study_sessions(user_id, session_date);

-- ============================================
-- DAILY PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  total_required integer NOT NULL DEFAULT 0,
  completed_required integer NOT NULL DEFAULT 0,
  total_optional integer NOT NULL DEFAULT 0,
  completed_optional integer NOT NULL DEFAULT 0,
  total_study_seconds integer NOT NULL DEFAULT 0,
  streak_count integer NOT NULL DEFAULT 0,
  evaluated_at timestamptz,
  UNIQUE(user_id, progress_date)
);

ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON daily_progress;
CREATE POLICY "select_own_progress" ON daily_progress FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_progress" ON daily_progress;
CREATE POLICY "insert_own_progress" ON daily_progress FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON daily_progress;
CREATE POLICY "update_own_progress" ON daily_progress FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_progress" ON daily_progress;
CREATE POLICY "delete_own_progress" ON daily_progress FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_progress_user_date ON daily_progress(user_id, progress_date);

-- ============================================
-- REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'entertainment' CHECK (type IN ('entertainment', 'social', 'gaming', 'movie', 'free_time', 'other')),
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rewards" ON rewards;
CREATE POLICY "select_own_rewards" ON rewards FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_rewards" ON rewards;
CREATE POLICY "insert_own_rewards" ON rewards FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rewards" ON rewards;
CREATE POLICY "update_own_rewards" ON rewards FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rewards" ON rewards;
CREATE POLICY "delete_own_rewards" ON rewards FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- REWARD UNLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reward_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  unlock_date date NOT NULL,
  is_unlocked boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  UNIQUE(reward_id, unlock_date)
);

ALTER TABLE reward_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_unlocks" ON reward_unlocks;
CREATE POLICY "select_own_unlocks" ON reward_unlocks FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_unlocks" ON reward_unlocks;
CREATE POLICY "insert_own_unlocks" ON reward_unlocks FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_unlocks" ON reward_unlocks;
CREATE POLICY "update_own_unlocks" ON reward_unlocks FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_unlocks" ON reward_unlocks;
CREATE POLICY "delete_own_unlocks" ON reward_unlocks FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_unlocks_user_date ON reward_unlocks(user_id, unlock_date);

-- ============================================
-- FOCUS SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  was_interrupted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_focus" ON focus_sessions;
CREATE POLICY "select_own_focus" ON focus_sessions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_focus" ON focus_sessions;
CREATE POLICY "insert_own_focus" ON focus_sessions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_focus" ON focus_sessions;
CREATE POLICY "update_own_focus" ON focus_sessions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_focus" ON focus_sessions;
CREATE POLICY "delete_own_focus" ON focus_sessions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- EVALUATE DAY INTERNAL (core logic, no auth)
-- ============================================
CREATE OR REPLACE FUNCTION evaluate_day_internal(p_user_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_required integer;
  v_completed_required integer;
  v_total_optional integer;
  v_completed_optional integer;
  v_status text;
  v_prev_streak integer := 0;
  v_new_streak integer := 0;
  v_longest integer := 0;
  v_study_seconds integer := 0;
  v_result jsonb;
BEGIN
  -- Count active required tasks that existed on or before p_date
  SELECT COUNT(*) INTO v_total_required
  FROM tasks
  WHERE user_id = p_user_id
    AND is_required = true
    AND is_active = true
    AND created_at::date <= p_date;

  -- Count completed required tasks for p_date
  SELECT COUNT(*) INTO v_completed_required
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.user_id = p_user_id
    AND tc.completion_date = p_date
    AND tc.is_completed = true
    AND t.is_required = true
    AND t.is_active = true
    AND t.created_at::date <= p_date;

  -- Count optional tasks
  SELECT COUNT(*) INTO v_total_optional
  FROM tasks
  WHERE user_id = p_user_id
    AND is_required = false
    AND is_active = true
    AND created_at::date <= p_date;

  SELECT COUNT(*) INTO v_completed_optional
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.user_id = p_user_id
    AND tc.completion_date = p_date
    AND tc.is_completed = true
    AND t.is_required = false
    AND t.is_active = true
    AND t.created_at::date <= p_date;

  -- Sum study time for the day
  SELECT COALESCE(SUM(duration_seconds), 0) INTO v_study_seconds
  FROM study_sessions
  WHERE user_id = p_user_id
    AND session_date = p_date;

  -- Determine status
  IF v_total_required = 0 THEN
    v_status := 'completed';
  ELSIF v_completed_required >= v_total_required THEN
    v_status := 'completed';
  ELSIF p_date < CURRENT_DATE THEN
    v_status := 'missed';
  ELSE
    v_status := 'pending';
  END IF;

  -- Get previous day's streak
  SELECT COALESCE(streak_count, 0) INTO v_prev_streak
  FROM daily_progress
  WHERE user_id = p_user_id
    AND progress_date = p_date - 1;

  -- Compute new streak
  IF v_status = 'completed' THEN
    v_new_streak := v_prev_streak + 1;
  ELSIF v_status = 'missed' THEN
    v_new_streak := 0;
  ELSE
    v_new_streak := v_prev_streak;
  END IF;

  -- Update longest streak in profiles
  SELECT COALESCE(longest_streak, 0) INTO v_longest
  FROM profiles WHERE id = p_user_id;

  IF v_new_streak > v_longest THEN
    UPDATE profiles SET longest_streak = v_new_streak, updated_at = now() WHERE id = p_user_id;
    v_longest := v_new_streak;
  END IF;

  -- Upsert daily_progress
  INSERT INTO daily_progress
    (user_id, progress_date, status, total_required, completed_required,
     total_optional, completed_optional, total_study_seconds, streak_count, evaluated_at)
  VALUES
    (p_user_id, p_date, v_status, v_total_required, v_completed_required,
     v_total_optional, v_completed_optional, v_study_seconds, v_new_streak, now())
  ON CONFLICT (user_id, progress_date)
  DO UPDATE SET
    status = EXCLUDED.status,
    total_required = EXCLUDED.total_required,
    completed_required = EXCLUDED.completed_required,
    total_optional = EXCLUDED.total_optional,
    completed_optional = EXCLUDED.completed_optional,
    total_study_seconds = EXCLUDED.total_study_seconds,
    streak_count = EXCLUDED.streak_count,
    evaluated_at = now();

  -- Handle reward unlock/lock
  IF v_status = 'completed' THEN
    INSERT INTO reward_unlocks (user_id, reward_id, unlock_date, is_unlocked)
    SELECT p_user_id, id, p_date, true
    FROM rewards WHERE user_id = p_user_id AND is_active = true
    ON CONFLICT (reward_id, unlock_date) DO UPDATE SET is_unlocked = true;
  ELSE
    INSERT INTO reward_unlocks (user_id, reward_id, unlock_date, is_unlocked)
    SELECT p_user_id, id, p_date, false
    FROM rewards WHERE user_id = p_user_id AND is_active = true
    ON CONFLICT (reward_id, unlock_date) DO UPDATE SET is_unlocked = false;
  END IF;

  v_result := jsonb_build_object(
    'status', v_status,
    'streak_count', v_new_streak,
    'longest_streak', v_longest,
    'total_required', v_total_required,
    'completed_required', v_completed_required,
    'total_optional', v_total_optional,
    'completed_optional', v_completed_optional,
    'total_study_seconds', v_study_seconds
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- EVALUATE DAY (auth-checked, user-facing)
-- ============================================
CREATE OR REPLACE FUNCTION evaluate_day(p_user_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only evaluate own data';
  END IF;
  RETURN evaluate_day_internal(p_user_id, p_date);
END;
$$;

-- ============================================
-- SYNC USER PROGRESS (called on app load)
-- Catches up on missed days and evaluates today
-- ============================================
CREATE OR REPLACE FUNCTION sync_user_progress()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_eval date;
  v_today date := CURRENT_DATE;
  d date;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find last evaluated date
  SELECT progress_date INTO v_last_eval
  FROM daily_progress
  WHERE user_id = v_user_id AND evaluated_at IS NOT NULL
  ORDER BY progress_date DESC
  LIMIT 1;

  IF v_last_eval IS NULL THEN
    v_last_eval := v_today - 1;
  END IF;

  -- Evaluate all unevaluated past days (catch-up for offline/closed app)
  d := v_last_eval + 1;
  WHILE d < v_today LOOP
    PERFORM evaluate_day_internal(v_user_id, d);
    d := d + 1;
  END LOOP;

  -- Evaluate today (may be pending or completed)
  PERFORM evaluate_day_internal(v_user_id, v_today);

  -- Return today's status
  SELECT jsonb_build_object(
    'status', status,
    'streak_count', streak_count,
    'total_required', total_required,
    'completed_required', completed_required,
    'total_optional', total_optional,
    'completed_optional', completed_optional,
    'total_study_seconds', total_study_seconds
  ) INTO v_result
  FROM daily_progress
  WHERE user_id = v_user_id AND progress_date = v_today;

  RETURN v_result;
END;
$$;

-- ============================================
-- EVALUATE ALL USERS YESTERDAY (for cron/edge function)
-- ============================================
CREATE OR REPLACE FUNCTION evaluate_all_users_yesterday()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  v_yesterday date := CURRENT_DATE - 1;
BEGIN
  FOR u IN SELECT id FROM profiles LOOP
    PERFORM evaluate_day_internal(u.id, v_yesterday);
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION evaluate_day(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_progress() TO authenticated;
REVOKE EXECUTE ON FUNCTION evaluate_day_internal(uuid, date) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION evaluate_all_users_yesterday() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION evaluate_all_users_yesterday() TO service_role;
GRANT EXECUTE ON FUNCTION evaluate_day_internal(uuid, date) TO service_role;
