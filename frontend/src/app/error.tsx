"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";
import { RotateCcw, Home, ChevronDown, ChevronUp, Terminal } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    console.error("asanHire Runtime Diagnostic:", error);
  }, [error]);

  const cleanErrorMessage =
    error?.message && !error.message.includes("digest")
      ? error.message
      : "A temporary processing error was encountered while communicating with the recruitment ledger.";

  return (
    <div className="min-h-screen bg-[#1E201E] flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-lg w-full bg-[#242724] border border-[#D9DADF]/10 p-8 rounded-2xl shadow-xl">
        {/* Centered Mark Logo */}
        <Logo variant="mark" size="xl" href={null} priority />

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-[#E57373] uppercase tracking-wider font-semibold">
            System Operational Notice
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF]">
            We Encountered an Issue
          </h1>
          <p className="text-sm text-[#8A8B82] leading-relaxed">
            {cleanErrorMessage}
          </p>
        </div>

        {/* Diagnostics & Logs Toggle */}
        <div className="w-full text-left">
          <button
            type="button"
            onClick={() => setShowLogs((prev) => !prev)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-[#1E201E] text-xs font-mono text-[#8A8B82] hover:text-[#D9DADF] border border-[#8A8B82]/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#DD700B]" />
              Technical Diagnostics & Logs
            </span>
            {showLogs ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showLogs && (
            <div className="mt-2 p-3 bg-[#1A1C1A] rounded-xl border border-[#8A8B82]/25 font-mono text-xs text-[#8FD19E] overflow-x-auto max-h-40 text-left">
              <p className="text-[#DD700B] font-semibold">
                Error: {error?.name || "SystemException"}
              </p>
              <p className="mt-1 text-[#D9DADF]">
                {error?.message || "No stack description provided."}
              </p>
              {error?.digest && (
                <p className="mt-1 text-[11px] text-[#8A8B82]">
                  Digest Trace: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 w-full flex-wrap pt-2">
          <NeuButton variant="primary" size="md" onClick={() => reset()}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Try Again
          </NeuButton>
          <Link href="/">
            <NeuButton variant="secondary" size="md">
              <Home className="w-4 h-4 mr-1.5" /> Return to Dashboard
            </NeuButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
