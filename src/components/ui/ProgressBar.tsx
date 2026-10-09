import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
}

export function ProgressBar({
  value,
  max,
  className,
  showLabel = false,
  color = "bg-blue-600",
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span>
            {value}/{max}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
