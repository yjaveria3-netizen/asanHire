"use client";

import React from "react";
import { CheckCircle2, Clock, Sparkles, Shield, UserCheck, Calendar } from "lucide-react";

interface AgentTimelineProps {
  currentStage?: "rubric" | "matcher" | "scheduling" | "interview" | "guardian" | "supervisor";
}

// OWNER: M1 (frontend developer)
export const AgentTimeline: React.FC<AgentTimelineProps> = ({ currentStage = "supervisor" }) => {
  const stages = [
    { id: "rubric", name: "Rubric Agent", engine: "Gemini 1.5", icon: Sparkles },
    { id: "matcher", name: "Resume Matcher", engine: "Gemini 1.5", icon: UserCheck },
    { id: "scheduling", name: "Auto Scheduler", engine: "Rule-based", icon: Calendar },
    { id: "interview", name: "Voice Interview", engine: "Groq Llama 3.3", icon: Clock },
    { id: "guardian", name: "Guardian Proctor", engine: "Passive Event", icon: Shield },
    { id: "supervisor", name: "Supervisor Report", engine: "Gemini 1.5", icon: CheckCircle2 },
  ];

  return (
    <div className="neu-raised rounded-2xl p-6 border border-[#D9DADF]/5">
      <h4 className="text-xs uppercase font-semibold tracking-wider text-[#8A8B82] mb-4">
        Multi-Agent Execution Pipeline
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = true; // Scaffold displays completed pipeline for overview

          return (
            <div
              key={stage.id}
              className="flex flex-col p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/10 relative group hover:border-[#DD700B]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[#8A8B82]">0{idx + 1}</span>
                <span className="w-2 h-2 rounded-full bg-[#8FD19E] shadow-[0_0_6px_#8FD19E]" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-[#DD700B]" />
                <span className="text-xs font-semibold text-[#D9DADF] truncate">{stage.name}</span>
              </div>
              <span className="text-[10px] text-[#8A8B82] truncate">{stage.engine}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
