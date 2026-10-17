"use client";

import React, { useState } from "react";
import { NeuInput } from "@/components/neu/NeuInput";
import { NeuButton } from "@/components/neu/NeuButton";
import { Edit3, ShieldAlert } from "lucide-react";
import { OVERRIDE_REASON_CATEGORIES, OverrideReasonCategory } from "@/lib/constants";

interface ScoreOverrideFormProps {
  currentScore?: number;
  onSaveOverride: (newScore: number, reason: string, reasonCategory: string) => Promise<void>;
}

// OWNER: M1 (frontend developer)
export const ScoreOverrideForm: React.FC<ScoreOverrideFormProps> = ({
  currentScore = 75.0,
  onSaveOverride,
}) => {
  const [score, setScore] = useState<string>(currentScore.toString());
  const [category, setCategory] = useState<OverrideReasonCategory>("recruiter_discretion");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const trimmed = reason.trim();
  const isTooShort = trimmed.length < 10;
  const isTooLong = trimmed.length > 500;
  const canSubmit = !isTooShort && !isTooLong && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    await onSaveOverride(parseFloat(score), trimmed, category);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="neu-raised rounded-xl p-5 border border-[#D9DADF]/5 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#8A8B82]/20">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-[#DD700B]" />
          <h4 className="text-sm font-semibold text-[#D9DADF]">Manual Score Override</h4>
        </div>
        <span className="text-[11px] font-mono text-[#DD700B] bg-[#DD700B]/10 px-2 py-0.5 rounded border border-[#DD700B]/20">
          Accountable Action
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <NeuInput
          label="Adjusted Score (0-100)"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
            Reason Category <span className="text-[#DD700B]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as OverrideReasonCategory)}
            className="w-full neu-inset text-xs font-medium text-[#D9DADF] bg-[#232623] px-3 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] cursor-pointer"
          >
            {OVERRIDE_REASON_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-[#1E201E] text-[#D9DADF]">
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#D9DADF] uppercase tracking-wider">
              Mandatory Justification Reason <span className="text-[#DD700B]">*</span>
            </label>
            <span
              className={`font-mono text-[11px] ${
                isTooShort ? "text-[#8A8B82]" : isTooLong ? "text-[#E57373] font-bold" : "text-[#8FD19E]"
              }`}
            >
              {trimmed.length} / 500 chars (min 10)
            </span>
          </div>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this score adjustment is necessary (min 10 chars)..."
            required
            className="neu-inset text-xs text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/50 border border-[#8A8B82]/20 resize-none"
            maxLength={520}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-[#8A8B82]">
          {success ? "Score override saved and logged to hr_override_events." : "Recorded in immutable override logs."}
        </span>
        <NeuButton type="submit" size="sm" variant="primary" disabled={!canSubmit}>
          {loading ? "Saving..." : "Apply Override"}
        </NeuButton>
      </div>
    </form>
  );
};

