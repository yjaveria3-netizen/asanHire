"use client";

import React from "react";
import { CandidateStatus } from "@/lib/types";
import { CANDIDATE_STATUSES } from "@/lib/constants";

interface StatusSelectProps {
  value: CandidateStatus;
  onChange: (status: CandidateStatus) => void;
  disabled?: boolean;
}

// OWNER: M1 (frontend developer)
export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="relative inline-block w-full">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as CandidateStatus)}
        className="w-full neu-inset text-sm font-medium text-[#D9DADF] bg-[#232623] px-3.5 py-2.5 rounded-lg border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] cursor-pointer capitalize"
      >
        {CANDIDATE_STATUSES.map((s) => (
          <option key={s.value} value={s.value} className="bg-[#1E201E] text-[#D9DADF]">
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
};
