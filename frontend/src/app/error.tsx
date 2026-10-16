"use client";

import React, { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("asanHire Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#1E201E] flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Centered Mark Logo */}
        <Logo variant="mark" size="xl" href={null} priority />

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-[#E57373] uppercase tracking-wider font-semibold">
            System Alert
          </span>
          <h1 className="text-2xl font-bold text-[#D9DADF]">Something Went Wrong</h1>
          <p className="text-sm text-[#8A8B82] leading-relaxed">
            An unexpected error occurred during execution. The system state has been preserved.
          </p>
        </div>

        <NeuButton variant="primary" size="md" onClick={() => reset()}>
          <RotateCcw className="w-4 h-4 mr-1.5" /> Try Again
        </NeuButton>
      </div>
    </div>
  );
}
