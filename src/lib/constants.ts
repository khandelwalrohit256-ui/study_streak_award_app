export const CATEGORIES = [
  "DSA",
  "Machine Learning",
  "College Study",
  "SQL",
  "Web Dev",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Language",
  "Reading",
  "Project",
  "Revision",
  "General",
] as const;

export const PRIORITY_CONFIG: Record<
  "high" | "medium" | "low",
  { label: string; color: string; bg: string; ring: string; text: string }
> = {
  high: {
    label: "High",
    color: "#ef4444",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
    text: "text-red-500",
  },
  medium: {
    label: "Medium",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    text: "text-amber-500",
  },
  low: {
    label: "Low",
    color: "#10b981",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    text: "text-emerald-500",
  },
};

export const REWARD_TYPES: Record<
  string,
  { label: string; emoji: string }
> = {
  entertainment: { label: "Entertainment", emoji: "🎬" },
  social: { label: "Social Media", emoji: "📱" },
  gaming: { label: "Gaming", emoji: "🎮" },
  movie: { label: "Movie", emoji: "🍿" },
  free_time: { label: "Free Time", emoji: "☕" },
  other: { label: "Other", emoji: "🎁" },
};

export const MOTIVATIONAL_MESSAGES: Record<string, string[]> = {
  pending: [
    "Keep going — every task completed is a step toward your goals!",
    "You've got this. Focus on one task at a time.",
    "Progress over perfection. Start with the next task.",
    "Discipline is the bridge between goals and accomplishment.",
    "Small steps every day lead to big results.",
  ],
  completed: [
    "Amazing work! All required tasks complete. Enjoy your reward!",
    "Perfect day! You're building unbreakable discipline.",
    "Streak secured! Consistency is your superpower.",
    "All done! Take a moment to celebrate your dedication.",
    "Incredible focus today. Tomorrow, we go again!",
  ],
  missed: [
    "Today didn't go as planned. Tomorrow is a fresh start.",
    "A missed day isn't failure — it's feedback. Let's bounce back!",
    "Reset and refocus. Your streak starts anew tomorrow.",
    "Every champion was once a contender who refused to give up.",
    "Learn from today, conquer tomorrow. You've got this.",
  ],
  in_progress: [
    "Great momentum! Keep the streak alive!",
    "You're on fire — don't stop now!",
    "More than halfway there. Push through!",
    "Almost done — finish strong!",
  ],
};
