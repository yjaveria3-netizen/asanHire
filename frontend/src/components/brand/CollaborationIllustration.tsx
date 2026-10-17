"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Cpu,
  UserCheck,
  Activity,
  Mic,
  CheckCircle2,
  Lock,
  Sparkles,
  Sliders,
  ChevronRight,
  Zap,
} from "lucide-react";

interface CollaborationIllustrationProps {
  className?: string;
}

export const CollaborationIllustration: React.FC<CollaborationIllustrationProps> = ({
  className = "",
}) => {
  const [activeTelemetry, setActiveTelemetry] = useState<"ai" | "human" | "bridge">("bridge");

  return (
    <div className={`w-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* Outer Glow Wrapper */}
      <div className="w-full max-w-4xl rounded-3xl p-[2px] bg-gradient-to-r from-[#DD700B] via-[#E88930]/40 to-[#DD700B]/80 shadow-[0_8px_32px_rgba(221,112,11,0.2)]">
        {/* Main Console Surface */}
        <div className="w-full bg-[#242724] rounded-[22px] p-6 sm:p-10 flex flex-col gap-8 overflow-hidden relative">
          {/* Subtle Ambient Background Mesh */}
          <div
            className="absolute -top-24 -right-24 w-72 h-72 bg-[#DD700B]/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#8FD19E]/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Header Title & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#383A38] pb-6 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#DD700B] bg-[#DD700B]/15 border border-[#DD700B]/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Human &bull; AI Collaborative Architecture
                </span>
                <span className="text-xs text-[#8FD19E] font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#8FD19E] animate-pulse" /> Live Telemetry
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#D9DADF] mt-2.5 tracking-tight">
                Dual-Node Sovereign Orchestration
              </h3>
              <p className="text-sm text-[#8A8B82] mt-1.5 max-w-xl leading-relaxed">
                Autonomous AI conducts continuous objective criteria evaluation in real time, while the human recruiter maintains absolute veto sovereignty over all final decisions.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1E201E] border border-[#383A38] self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTelemetry("bridge")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTelemetry === "bridge"
                    ? "bg-[#DD700B] text-[#1E201E] font-bold"
                    : "text-[#8A8B82] hover:text-[#D9DADF]"
                }`}
              >
                Orchestration Bridge
              </button>
              <button
                type="button"
                onClick={() => setActiveTelemetry("ai")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTelemetry === "ai"
                    ? "bg-[#DD700B] text-[#1E201E] font-bold"
                    : "text-[#8A8B82] hover:text-[#D9DADF]"
                }`}
              >
                AI Agent Pipeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTelemetry("human")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTelemetry === "human"
                    ? "bg-[#DD700B] text-[#1E201E] font-bold"
                    : "text-[#8A8B82] hover:text-[#D9DADF]"
                }`}
              >
                Human Sovereignty
              </button>
            </div>
          </div>

          {/* Interactive Three-Pillar Architecture Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
            {/* Column 1: AI Agent Node */}
            <div className={`p-5 rounded-2xl bg-[#1E201E] border transition-all duration-300 flex flex-col justify-between gap-4 ${
              activeTelemetry === "ai" || activeTelemetry === "bridge"
                ? "border-[#DD700B]/50 shadow-[0_4px_20px_rgba(221,112,11,0.1)]"
                : "border-[#383A38] opacity-70"
            }`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#DD700B]/15 border border-[#DD700B]/30 flex items-center justify-center text-[#DD700B]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#D9DADF]">Autonomous Agent</h4>
                      <p className="text-[11px] text-[#8A8B82] font-mono">Edge Multi-Agent Cluster</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#DD700B]/20 text-[#DD700B]">
                    Active
                  </span>
                </div>

                {/* Animated Waveform & Criteria Feed */}
                <div className="bg-[#262826] p-3 rounded-xl border border-[#383A38] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-[#8A8B82]">
                    <span className="flex items-center gap-1 font-mono">
                      <Mic className="w-3 h-3 text-[#DD700B]" /> Acoustic Scoring
                    </span>
                    <span className="font-mono text-[#8FD19E]">16kHz Live</span>
                  </div>

                  {/* Audio Bars */}
                  <div className="flex items-center justify-between gap-1 h-8 px-1">
                    {[40, 75, 55, 90, 65, 80, 45, 95, 70, 50, 85, 60, 75, 40].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="w-1 rounded-full bg-gradient-to-t from-[#DD700B]/40 to-[#DD700B] animate-pulse"
                      />
                    ))}
                  </div>

                  <div className="text-[11px] text-[#D9DADF] font-mono mt-1 pt-1.5 border-t border-[#383A38] truncate">
                    &gt; Rubric synthesis: 94% alignment
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#383A38]/50 text-xs text-[#8A8B82]">
                <div className="flex items-center justify-between">
                  <span>Resume Vector Match:</span>
                  <span className="font-mono font-bold text-[#D9DADF]">96%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Voice Latency:</span>
                  <span className="font-mono font-bold text-[#8FD19E]">~420ms</span>
                </div>
              </div>
            </div>

            {/* Column 2: Integrity & Tamper-Proof Audit Radar (The Bridge) */}
            <div className={`p-5 rounded-2xl bg-[#1E201E] border transition-all duration-300 flex flex-col justify-between gap-4 ${
              activeTelemetry === "bridge"
                ? "border-[#8FD19E]/50 shadow-[0_4px_20px_rgba(143,209,158,0.1)]"
                : "border-[#383A38] opacity-70"
            }`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#8FD19E]/15 border border-[#8FD19E]/30 flex items-center justify-center text-[#8FD19E]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#D9DADF]">Integrity Bridge</h4>
                      <p className="text-[11px] text-[#8A8B82] font-mono">Real-Time Telemetry</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8FD19E]/20 text-[#8FD19E]">
                    Secured
                  </span>
                </div>

                {/* Radar Status Indicators */}
                <div className="bg-[#262826] p-3 rounded-xl border border-[#383A38] flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8B82] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#8FD19E]" /> Guardian Protocol
                    </span>
                    <span className="text-[#8FD19E] font-mono font-bold text-[11px]">Enforced</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8B82] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#DD700B]" /> Audit Ledger
                    </span>
                    <span className="text-[#D9DADF] font-mono text-[11px]">Immutable</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8B82] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD19E]" /> Vision Presence
                    </span>
                    <span className="text-[#8FD19E] font-mono text-[11px]">Zero-Store Edge</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#383A38]/50 text-center">
                <span className="text-[11px] text-[#8A8B82] font-mono">
                  Autonomous Recommendations are 100% Advisory
                </span>
              </div>
            </div>

            {/* Column 3: Sovereign Recruiter Human Node */}
            <div className={`p-5 rounded-2xl bg-[#1E201E] border transition-all duration-300 flex flex-col justify-between gap-4 ${
              activeTelemetry === "human" || activeTelemetry === "bridge"
                ? "border-[#FCF8D8]/50 shadow-[0_4px_20px_rgba(252,248,216,0.1)]"
                : "border-[#383A38] opacity-70"
            }`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#FCF8D8]/15 border border-[#FCF8D8]/30 flex items-center justify-center text-[#FCF8D8]">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#D9DADF]">Human Sovereign</h4>
                      <p className="text-[11px] text-[#8A8B82] font-mono">Certified HR Recruiter</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FCF8D8]/20 text-[#FCF8D8] font-bold">
                    Veto Authority
                  </span>
                </div>

                {/* Recruiter Action Ledger */}
                <div className="bg-[#262826] p-3 rounded-xl border border-[#383A38] flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8B82]">Recommendation:</span>
                    <span className="text-[#8FD19E] font-bold">Strong Hire (94%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8B82]">Human Sovereign Veto:</span>
                    <span className="text-[#FCF8D8] font-bold font-mono">Unrestricted</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#383A38] flex items-center justify-between">
                    <span className="text-[11px] text-[#8A8B82]">Override Logging:</span>
                    <span className="text-[11px] text-[#DD700B] font-mono font-bold">Accountable</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#383A38]/50 text-xs">
                <span className="text-[#8A8B82]">Human Decision Control:</span>
                <span className="text-[#8FD19E] font-bold flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Final
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Collaboration Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#383A38] text-xs text-[#8A8B82] relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#DD700B]" />
              <span>
                <strong>Zero Bias Synthesis:</strong> Every score is anchored strictly to job rubric criteria with tamper-proof rationale.
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-[#D9DADF]">Latency: &lt;1s</span>
              <span>&bull;</span>
              <span className="text-[#8FD19E]">Encrypted Transit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
