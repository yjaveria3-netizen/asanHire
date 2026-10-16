import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DD700B] disabled:opacity-50",
          variant === "default" && "bg-[#DD700B] text-[#1E201E] hover:bg-[#DD700B]/90",
          variant === "outline" && "border border-[#8A8B82]/30 bg-transparent hover:bg-[#2A2D2A] text-[#D9DADF]",
          variant === "ghost" && "hover:bg-[#2A2D2A] text-[#D9DADF]",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
