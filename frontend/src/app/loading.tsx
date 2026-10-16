import React from "react";
import { Logo } from "@/components/brand/Logo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#1E201E] flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Mark Logo (subtle pulse, respecting prefers-reduced-motion) */}
        <div className="animate-pulse motion-reduce:animate-none">
          <Logo variant="mark" size="lg" href={null} priority />
        </div>
        <p className="font-mono text-xs text-[#8A8B82] tracking-wider uppercase animate-fade-in">
          Loading asanHire...
        </p>
      </div>
    </div>
  );
}
