import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[#8A8B82]/30 bg-[#232623] px-3 py-2 text-sm text-[#D9DADF] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8A8B82] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DD700B] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
