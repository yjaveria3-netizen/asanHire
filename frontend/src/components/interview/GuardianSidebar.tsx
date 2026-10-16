"use client";

import React from "react";
import { Shield, AlertTriangle, Eye, Copy, Monitor } from "lucide-react";
import { NeuProgress } from "@/components/neu/NeuProgress";

interface GuardianSidebarProps {
  trustScore: number;
  recentEvents: Array<{ type: string; timestamp: string; penalty: number }>;
}

// OWNER: M1 (frontend developer)
export const GuardianSidebar: React.FC<GuardianSidebarProps> = ({
  trustScore = 100,
  recentEvents = [],
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-[#8FD19E]";
    if (score >= 65) return "text-[#FCF8D8]";
    return "text-[#E57373]";
  };

  return (
    <aside className="neu-raised rounded-2xl p-5 border border-[#D9DADF]/10 flex flex-col gap-5 w-full md:w-80">
      <div className="flex items-center justify-between pb-3 border-b border-[#8A8B82]/20">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#DD700B]" />
          <h4 className="text-sm font-semibold text-[#D9DADF]">Guardian Proctor</h4>
        </div>
        <span className="text-[10px] font-mono uppercase bg-[#8FD19E]/10 text-[#8FD19E] px-2 py-0.5 rounded-full">
          Active
        </span>
      </div>

      {/* Trust Score Display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#8A8B82]">Integrity Trust Score</span>
          <span className={`text-2xl font-bold font-mono ${getScoreColor(trustScore)}`}>
            {trustScore.toFixed(0)}%
          </span>
        </div>
        <NeuProgress value={trustScore} showPercent={false} />
      </div>

      {/* Monitored Metrics Checklist */}
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#242724]">
          <span className="flex items-center gap-2 text-[#D9DADF]">
            <Monitor className="w-3.5 h-3.5 text-[#8A8B82]" /> Fullscreen Lock
          </span>
          <span className="text-[11px] font-mono text-[#8FD19E]">Enforced</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#242724]">
          <span className="flex items-center gap-2 text-[#D9DADF]">
            <Eye className="w-3.5 h-3.5 text-[#8A8B82]" /> Tab Switch Monitor
          </span>
          <span className="text-[11px] font-mono text-[#8FD19E]">Tracking</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#242724]">
          <span className="flex items-center gap-2 text-[#D9DADF]">
            <Copy className="w-3.5 h-3.5 text-[#8A8B82]" /> Paste Interception
          </span>
          <span className="text-[11px] font-mono text-[#8FD19E]">Guarded</span>
        </div>
      </div>

      {/* Recent Infractions Log */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[#8A8B82]/20">
        <span className="text-[11px] uppercase tracking-wider text-[#8A8B82] font-semibold">
          Proctoring Telemetry Log
        </span>
        {recentEvents.length === 0 ? (
          <p className="text-xs text-[#8A8B82] italic">Zero infractions recorded. High integrity session.</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {recentEvents.map((evt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-[rgba(90,42,42,0.2)] border border-[#9E4A4A]/40 text-xs"
              >
                <div className="flex items-center gap-1.5 text-[#E57373]">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="truncate capitalize">{evt.type.replace("_", " ")}</span>
                </div>
                <span className="text-[10px] font-mono text-[#E57373]">-{evt.penalty} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
