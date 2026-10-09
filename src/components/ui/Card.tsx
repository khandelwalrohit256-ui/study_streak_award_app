import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl bg-white shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
