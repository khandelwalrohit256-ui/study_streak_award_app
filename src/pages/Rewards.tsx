import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchRewards,
  createReward,
  deleteReward,
  fetchRewardUnlocks,
  markRewardUsed,
  syncProgress,
} from "@/lib/api";
import { getTodayDate } from "@/lib/date";
import { REWARD_TYPES } from "@/lib/constants";
import type { Reward, RewardUnlock, RewardType } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Label } from "@/components/ui/Input";
import { Plus, Lock, Gift, Check, Trash2, Play } from "lucide-react";

export function Rewards() {
  const { session } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [unlocks, setUnlocks] = useState<RewardUnlock[]>([]);
  const [dayCompleted, setDayCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    try {
      await syncProgress();
      const [r, u] = await Promise.all([
        fetchRewards(session.user.id),
        fetchRewardUnlocks(session.user.id, getTodayDate()),
      ]);
      setRewards(r);
      setUnlocks(u);
      setDayCompleted(u.length > 0 && u.every((x) => x.is_unlocked));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(rewardId: string) {
    try {
      await deleteReward(rewardId);
      await load();
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleUse(unlockId: string) {
    try {
      await markRewardUsed(unlockId);
      await load();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rewards</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Earn rewards by completing all required tasks
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="md">
          <Plus size={18} />
          Add Reward
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Status banner */}
      <Card className={`p-5 ${dayCompleted ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900" : "bg-gray-50 dark:bg-gray-900/50"}`}>
        <div className="text-center">
          {dayCompleted ? (
            <>
              <p className="text-3xl mb-2">🎉</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-400">Day Completed!</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                All rewards are unlocked. Enjoy your break!
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl mb-2">🔒</p>
              <p className="font-bold text-gray-600 dark:text-gray-400">Rewards Locked</p>
              <p className="text-sm text-gray-500 mt-1">
                Complete all required tasks to unlock your rewards
              </p>
            </>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rewards.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-4xl mb-3">🎁</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">No rewards configured</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Add rewards like "30 min YouTube" or "Gaming session"
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} />
            Add Your First Reward
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => {
            const unlock = unlocks.find((u) => u.reward_id === reward.id);
            const isUnlocked = unlock?.is_unlocked ?? false;
            const isUsed = !!unlock?.used_at;
            const typeInfo = REWARD_TYPES[reward.type] || REWARD_TYPES.other;

            return (
              <Card key={reward.id} className={`p-4 transition-all ${isUnlocked ? "border-emerald-300 dark:border-emerald-800" : "opacity-75"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isUnlocked ? "bg-emerald-500/10" : "bg-gray-500/10"}`}>
                    {isUnlocked ? typeInfo.emoji : "🔒"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">{reward.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={isUnlocked ? "success" : "default"}>
                        {isUnlocked ? "Unlocked" : "Locked"}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {reward.duration_minutes}m · {typeInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isUnlocked && !isUsed && (
                      <Button size="sm" variant="success" onClick={() => handleUse(unlock!.id)}>
                        <Play size={14} />
                        Use
                      </Button>
                    )}
                    {isUsed && (
                      <Badge variant="success">
                        <Check size={12} /> Used
                      </Badge>
                    )}
                    <button
                      onClick={() => handleDelete(reward.id)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Consequence info */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
        <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 text-sm">Consequences for Missed Days</h3>
        <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2"><span>❌</span> Day marked as failed</li>
          <li className="flex items-center gap-2"><span>🔥</span> Streak resets to 0</li>
          <li className="flex items-center gap-2"><span>🔒</span> Rewards locked for the day</li>
          <li className="flex items-center gap-2"><span>📚</span> Consider adding a revision task</li>
        </ul>
      </Card>

      {showForm && (
        <RewardForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function RewardForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<RewardType>("entertainment");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    setError("");
    try {
      await createReward(session.user.id, { name, type, duration_minutes: durationMinutes });
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New Reward">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reward-name">Reward Name</Label>
          <Input
            id="reward-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 30 min YouTube"
          />
        </div>
        <div>
          <Label htmlFor="reward-type">Reward Type</Label>
          <Select
            id="reward-type"
            value={type}
            onChange={(e) => setType(e.target.value as RewardType)}
          >
            {Object.entries(REWARD_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.emoji} {val.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="reward-duration">Duration (minutes)</Label>
          <Input
            id="reward-duration"
            type="number"
            min={1}
            max={480}
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Add Reward"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
