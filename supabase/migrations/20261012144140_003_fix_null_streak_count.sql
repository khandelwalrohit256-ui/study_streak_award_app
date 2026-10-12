/*
# Fix evaluate_day_internal null streak_count bug

## Problem
When there's no daily_progress row for the previous day, SELECT INTO sets
v_prev_streak to NULL (ignoring the initial := 0). Then for 'pending' status,
v_new_streak becomes NULL, which violates the NOT NULL constraint on
streak_count when inserting into daily_progress.

## Fix
Add COALESCE after the SELECT to guarantee v_prev_streak is never NULL.
*/

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
  SELECT COUNT(*) INTO v_total_required
  FROM tasks
  WHERE user_id = p_user_id
    AND is_required = true
    AND is_active = true
    AND created_at::date <= p_date;

  SELECT COUNT(*) INTO v_completed_required
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.user_id = p_user_id
    AND tc.completion_date = p_date
    AND tc.is_completed = true
    AND t.is_required = true
    AND t.is_active = true
    AND t.created_at::date <= p_date;

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

  SELECT COALESCE(SUM(duration_seconds), 0) INTO v_study_seconds
  FROM study_sessions
  WHERE user_id = p_user_id
    AND session_date = p_date;

  IF v_total_required = 0 THEN
    v_status := 'completed';
  ELSIF v_completed_required >= v_total_required THEN
    v_status := 'completed';
  ELSIF p_date < CURRENT_DATE THEN
    v_status := 'missed';
  ELSE
    v_status := 'pending';
  END IF;

  -- Get previous day's streak (COALESCE handles NULL when no row exists)
  SELECT COALESCE(streak_count, 0) INTO v_prev_streak
  FROM daily_progress
  WHERE user_id = p_user_id
    AND progress_date = p_date - 1;

  v_prev_streak := COALESCE(v_prev_streak, 0);

  IF v_status = 'completed' THEN
    v_new_streak := v_prev_streak + 1;
  ELSIF v_status = 'missed' THEN
    v_new_streak := 0;
  ELSE
    v_new_streak := v_prev_streak;
  END IF;

  v_new_streak := COALESCE(v_new_streak, 0);

  SELECT COALESCE(longest_streak, 0) INTO v_longest
  FROM profiles WHERE id = p_user_id;

  IF v_new_streak > v_longest THEN
    UPDATE profiles SET longest_streak = v_new_streak, updated_at = now() WHERE id = p_user_id;
    v_longest := v_new_streak;
  END IF;

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
