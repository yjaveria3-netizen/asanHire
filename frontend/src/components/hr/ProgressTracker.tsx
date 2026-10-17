"use client";

import React from "react";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Play, RefreshCw, Eye, Sparkles } from "lucide-react";
import { JobProgress, ProgressStepItem } from "@/lib/types";
import { NeuButton } from "@/components/neu/NeuButton";

interface ProgressTrackerProps {
  progress: JobProgress | null;
  selectedStep?: number | null;
  onSelectStep?: (step: number | null) => void;
  onTriggerNextAction?: (actionLabel: string) => void;
  isLoading?: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  selectedStep = null,
  onSelectStep,
  onTriggerNextAction,
  isLoading = false,
}) => {
  if (!progress) {
    return (
      <div className="neu-raised rounded-xl p-6 bg-[#1E201E] border border-[rgba(217,218,223,0.06)] animate-pulse">
        <div className="h-6 w-48 bg-[#2A2D2A] rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-[#2A2D2A] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const { current_step, steps, next_action, warnings } = progress;

  const renderStepIcon = (item: ProgressStepItem, isCurrent: boolean) => {
    switch (item.state) {
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" aria-hidden="true" />;
      case "attention":
        return <AlertTriangle className="w-4 h-4 text-[#FCF8D8]" aria-hidden="true" />;
      case "current":
        return (
          <span
            className="w-2.5 h-2.5 rounded-full bg-[#DD700B] motion-safe:animate-pulse"
            aria-hidden="true"
          />
        );
      case "upcoming":
      default:
        return <Clock className="w-3.5 h-3.5 text-[#8A8B82]" aria-hidden="true" />;
    }
  };

  const getStepBorder = (item: ProgressStepItem, isSelected: boolean) => {
    if (isSelected) {
      return "ring-2 ring-[#DD700B] border-[#DD700B] bg-[#2A2D2A]";
    }
    switch (item.state) {
      case "current":
        return "border-[#DD700B] bg-[#2A2D2A]/80 shadow-[0_0_12px_rgba(221,112,11,0.15)]";
      case "done":
        return "border-[#8FD19E]/30 bg-[#2A2D2A]/40";
      case "attention":
        return "border-[#FCF8D8]/50 bg-[rgba(252,248,216,0.05)]";
      case "upcoming":
      default:
        return "border-[rgba(217,218,223,0.08)] bg-[#242624]/60";
    }
  };

  const getStepStateBadge = (state: string) => {
    switch (state) {
      case "done":
        return <span className="text-[10px] font-semibold tracking-wide text-[#8FD19E] uppercase">Done</span>;
      case "current":
        return <span className="text-[10px] font-semibold tracking-wide text-[#DD700B] uppercase">Current</span>;
      case "attention":
        return <span className="text-[10px] font-semibold tracking-wide text-[#FCF8D8] uppercase">Attention</span>;
      case "upcoming":
      default:
        return <span className="text-[10px] font-medium tracking-wide text-[#8A8B82] uppercase">Upcoming</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Stepper Bar (Horizontal on Desktop, Vertical on Mobile) */}
      <div className="neu-raised rounded-xl p-4 sm:p-5 bg-[#1E201E] border border-[rgba(217,218,223,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#D9DADF] uppercase tracking-wider">
              Hiring Pipeline Progress
            </h3>
            {selectedStep !== null && (
              <button
                onClick={() => onSelectStep?.(null)}
                className="text-xs text-[#DD700B] hover:underline cursor-pointer ml-2"
                title="Clear step filter"
              >
                Clear filter (Showing Step {selectedStep})
              </button>
            )}
          </div>
          <span className="text-xs text-[#8A8B82]">
            Step {current_step} of 6 active
          </span>
        </div>

        {/* Stepper items grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {steps.map((item) => {
            const isCurrent = item.step === current_step;
            const isSelected = selectedStep === item.step;
            const borderClass = getStepBorder(item, isSelected);

            return (
              <div
                key={item.step}
                role="button"
                tabIndex={0}
                onClick={() => onSelectStep?.(isSelected ? null : item.step)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectStep?.(isSelected ? null : item.step);
                  }
                }}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${item.step}: ${item.name}. Status: ${item.state}. Summary: ${item.summary}`}
                className={`flex flex-col justify-between p-3 rounded-lg border transition-all cursor-pointer select-none text-left ${borderClass} hover:border-[#DD700B]/60`}
              >
                <div>
                  {/* Top line: Number/Icon & State Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#1E201E] text-xs font-semibold text-[#D9DADF]">
                        {item.step}
                      </div>
                      {renderStepIcon(item, isCurrent)}
                    </div>
                    {getStepStateBadge(item.state)}
                  </div>

                  {/* Step Title */}
                  <h4 className="text-xs font-semibold text-[#D9DADF] leading-tight mb-1 line-clamp-2">
                    {item.name}
                  </h4>
                </div>

                {/* Step Summary */}
                <p className="text-[11px] text-[#8A8B82] leading-tight line-clamp-2 mt-2 pt-1 border-t border-[rgba(217,218,223,0.06)]">
                  {item.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Warnings Banner (if any) */}
      {warnings && warnings.length > 0 && (
        <div className="bg-[rgba(252,248,216,0.06)] border border-[#FCF8D8]/30 rounded-xl p-3.5 sm:p-4 text-xs text-[#FCF8D8] space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-[#FCF8D8] flex-shrink-0" />
            <span>Attention Required ({warnings.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-2 text-[#D9DADF]/90">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. "What's Next" Action Card */}
      {next_action && (
        <div className="neu-raised rounded-xl p-4 bg-[#2A2D2A] border border-[rgba(217,218,223,0.08)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E201E] text-[#DD700B] border border-[#DD700B]/30">
                What's Next
              </span>
              <h4 className="text-sm font-semibold text-[#D9DADF]">
                {next_action.label}
              </h4>
            </div>
            <p className="text-xs text-[#8A8B82]">
              {next_action.hint}
            </p>
          </div>

          <NeuButton
            variant={next_action.type === "action" || next_action.type === "warning" ? "primary" : "secondary"}
            size="sm"
            onClick={() => onTriggerNextAction?.(next_action.label)}
            className="flex-shrink-0 self-end sm:self-center"
          >
            <span>{next_action.label}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </NeuButton>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
