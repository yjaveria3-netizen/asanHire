import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border border-[#D9DADF]/10 bg-[#2A2D2A] text-[#D9DADF] shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";
