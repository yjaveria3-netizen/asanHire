import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#DD700B]",
        variant === "default" && "border-transparent bg-[#DD700B] text-[#1E201E]",
        variant === "secondary" && "border-transparent bg-[#2A2D2A] text-[#D9DADF]",
        variant === "outline" && "text-[#D9DADF] border-[#8A8B82]/30",
        className
      )}
      {...props}
    />
  );
}
