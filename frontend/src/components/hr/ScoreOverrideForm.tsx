"use client";

import React, { useState } from "react";
import { NeuInput } from "@/components/neu/NeuInput";
import { NeuButton } from "@/components/neu/NeuButton";
import { Edit3 } from "lucide-react";

interface ScoreOverrideFormProps {
  currentScore?: number;
  onSaveOverride: (newScore: number, reason: string) => Promise<void>;
}

// OWNER: M1 (frontend developer)
export const ScoreOverrideForm: React.FC<ScoreOverrideFormProps> = ({
  currentScore = 75.0,
  onSaveOverride,
}) => {
  const [score, setScore] = useState<string>(currentScore.toString());
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    await onSaveOverride(parseFloat(score), reason);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="neu-raised rounded-xl p-5 border border-[#D9DADF]/5 flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-[#8A8B82]/20">
        <Edit3 className="w-4 h-4 text-[#DD700B]" />
        <h4 className="text-sm font-semibold text-[#D9DADF]">Manual Score Override</h4>
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
        <div className="md:col-span-2">
          <NeuInput
            label="Mandatory Justification Reason"
            placeholder="e.g., Prior open source project confirms distributed expertise..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-[#8A8B82]">
          {success ? "Score override saved and audit-logged." : "Changes are recorded in the immutable audit log."}
        </span>
        <NeuButton type="submit" size="sm" variant="primary" disabled={loading || !reason.trim()}>
          {loading ? "Saving..." : "Apply Override"}
        </NeuButton>
      </div>
    </form>
  );
};
