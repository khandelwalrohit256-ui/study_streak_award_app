import { type ReactNode } from "react";
import { Home, ListTodo, Timer, Gift, BarChart3, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export type PageId = "dashboard" | "tasks" | "focus" | "rewards" | "stats" | "history" | "profile";

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "history", label: "History", icon: History },
  { id: "profile", label: "Profile", icon: User },
];

interface LayoutProps {
  children: ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Top bar - desktop only */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-30 h-16 items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-lg">Study Streak</span>
        </div>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                currentPage === item.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
          <button
            onClick={toggleTheme}
            className="ml-2 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <span className="font-bold">Study Streak</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Content */}
      <main className="md:pt-16 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">{children}</div>
      </main>

      {/* Bottom nav - mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-around h-16 px-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px]",
                currentPage === item.id
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-500"
              )}
            >
              <item.icon size={20} strokeWidth={currentPage === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
