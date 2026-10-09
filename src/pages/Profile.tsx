import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import type { NotificationSettings } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import {
  Moon,
  Sun,
  Bell,
  LogOut,
  User,
  Flame,
  Trophy,
  Shield,
  Info,
} from "lucide-react";

export function Profile() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    profile?.notification_settings ?? {
      task_reminders: true,
      study_reminders: true,
      evening_warning: true,
      streak_risk: true,
      warning_time: "20:00",
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setNotifSettings(profile.notification_settings);
    }
  }, [profile]);

  async function handleSaveProfile() {
    if (!session) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          notification_settings: notifSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  function updateNotif(key: keyof NotificationSettings, value: boolean | string) {
    setNotifSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and settings</p>
      </div>

      {/* User info */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
            {(displayName || session?.user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {displayName || "Student"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30">
            <Flame size={20} className="text-orange-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Longest Streak</p>
              <p className="font-bold text-gray-900 dark:text-white">{profile?.longest_streak ?? 0} days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <Trophy size={20} className="text-amber-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Achievements</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {(profile?.longest_streak ?? 0) >= 7 ? "Week Warrior" : "Getting Started"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit profile */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <User size={18} />
          Edit Profile
        </h3>
        <div>
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </Card>

      {/* Appearance */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          </div>
          <Toggle checked={theme === "dark"} onChange={toggleTheme} />
        </div>
      </Card>

      {/* Notification settings */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell size={18} />
          Notifications
        </h3>

        <div className="space-y-3">
          <NotifRow
            label="Task Reminders"
            description="Get reminded about upcoming tasks"
            checked={notifSettings.task_reminders}
            onChange={(v) => updateNotif("task_reminders", v)}
          />
          <NotifRow
            label="Study Session Reminders"
            description="Reminders to start study sessions"
            checked={notifSettings.study_reminders}
            onChange={(v) => updateNotif("study_reminders", v)}
          />
          <NotifRow
            label="Evening Warning"
            description="Alert about incomplete tasks in the evening"
            checked={notifSettings.evening_warning}
            onChange={(v) => updateNotif("evening_warning", v)}
          />
          <NotifRow
            label="Streak at Risk"
            description="Warning when your streak is in danger"
            checked={notifSettings.streak_risk}
            onChange={(v) => updateNotif("streak_risk", v)}
          />
        </div>

        <div>
          <Label htmlFor="warning-time">Evening Warning Time</Label>
          <Input
            id="warning-time"
            type="time"
            value={notifSettings.warning_time}
            onChange={(e) => updateNotif("warning_time", e.target.value)}
          />
        </div>

        <Button onClick={handleSaveProfile} disabled={saving} variant="secondary" className="w-full">
          {saving ? "Saving..." : "Save Notification Settings"}
        </Button>
      </Card>

      {/* Notification architecture info */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-2">
          <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-400">Notification Architecture</p>
            <p>Notifications use the browser Notification API. Configurable reminders for tasks, study sessions, evening warnings, and streak-at-risk alerts are stored per user and evaluated client-side. Server-side day-end evaluation runs automatically via the edge function.</p>
            <p className="mt-1">Example: "⚠️ You have 2 required tasks remaining. Complete them before the day ends to protect your 12-day streak."</p>
          </div>
        </div>
      </Card>

      {/* Security info */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2 text-sm">
          <Shield size={16} />
          Security & Anti-Cheating
        </h3>
        <ul className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <li>• Streak is calculated server-side — cannot be manually edited</li>
          <li>• Each task must be individually completed (no bulk complete)</li>
          <li>• Study sessions stored separately from task completions</li>
          <li>• Day-end evaluation runs via database SQL functions</li>
          <li>• All data protected by Row Level Security policies</li>
        </ul>
      </Card>

      {/* Sign out */}
      <Button variant="danger" onClick={signOut} size="lg" className="w-full">
        <LogOut size={18} />
        Sign Out
      </Button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-4">
        Study Streak v1.0 · Built with React, Supabase & Tailwind CSS
      </p>
    </div>
  );
}

function NotifRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
