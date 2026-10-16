import React from "react";
import { CandidateStatus } from "@/lib/types";

interface NeuBadgeProps {
  status?: CandidateStatus | string;
  label?: string;
  className?: string;
}

export const NeuBadge: React.FC<NeuBadgeProps> = ({ status, label, className = "" }) => {
  const displayLabel = label || status || "unknown";

  const statusMap: Record<string, string> = {
    applied: "bg-[#2A2D2A] text-[#8A8B82] border border-[#8A8B82]/50",
    shortlisted: "bg-[rgba(252,248,216,0.12)] text-[#FCF8D8] border border-[#FCF8D8]/50",
    invited: "bg-transparent text-[#DD700B] border border-[#DD700B]",
    interviewing: "bg-[rgba(221,112,11,0.2)] text-[#DD700B] border border-[#DD700B]",
    interviewed: "bg-[#2A2D2A] text-[#D9DADF] border border-[#D9DADF]/40",
    hired: "bg-[rgba(62,90,68,0.3)] text-[#8FD19E] border border-[#689F77]",
    rejected: "bg-[rgba(90,42,42,0.3)] text-[#E57373] border border-[#9E4A4A]",
    on_hold: "bg-transparent text-[#FCF8D8] border border-dashed border-[#FCF8D8]/60",
  };

  const badgeStyle = (status && statusMap[status]) || "bg-[#2A2D2A] text-[#D9DADF] border border-[#8A8B82]/30";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide capitalize select-none ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {displayLabel.replace("_", " ")}
    </span>
  );
};
