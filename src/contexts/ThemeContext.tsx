import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  initialTheme,
  userId,
}: {
  children: ReactNode;
  initialTheme: Theme;
  userId?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (userId) {
      supabase
        .from("profiles")
        .update({ theme: t, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .then(() => {});
    }
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark" as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
