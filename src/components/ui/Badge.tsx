import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "high" | "medium" | "low" | "required" | "optional" | "success" | "warning" | "error";
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  required: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  optional: "bg-gray-500/10 text-gray-500 dark:text-gray-500",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
};

import type { ReactNode } from "react";

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
