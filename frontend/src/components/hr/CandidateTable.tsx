"use client";

import React from "react";
import Link from "next/link";
import { Candidate } from "@/lib/types";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { NeuButton } from "@/components/neu/NeuButton";
import { ExternalLink, Award } from "lucide-react";

interface CandidateTableProps {
  candidates: Candidate[];
  onSelectCandidate?: (candidate: Candidate) => void;
}

// OWNER: M1 (frontend developer)
export const CandidateTable: React.FC<CandidateTableProps> = ({ candidates }) => {
  // Always sort candidates so the highest scoring candidate is at the TOP (#1)
  const sortedCandidates = [...candidates].sort((a, b) => {
    const scoreA =
      a.effective_score ??
      a.manual_score_override ??
      a.hr_score_override ??
      a.ai_score ??
      a.resume_score ??
      0;
    const scoreB =
      b.effective_score ??
      b.manual_score_override ??
      b.hr_score_override ??
      b.ai_score ??
      b.resume_score ??
      0;
    return scoreB - scoreA;
  });

  return (
    <div className="neu-raised rounded-2xl overflow-hidden border border-[#D9DADF]/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#D9DADF]">
          <thead className="bg-[#242724] border-b border-[#8A8B82]/20 text-xs uppercase tracking-wider text-[#8A8B82]">
            <tr>
              <th className="px-5 py-4 font-semibold">Rank</th>
              <th className="px-5 py-4 font-semibold">Candidate</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Stage</th>
              <th className="px-5 py-4 font-semibold">Resume Score</th>
              <th className="px-5 py-4 font-semibold">Effective Score</th>
              <th className="px-5 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/40">
            {sortedCandidates.map((candidate, index) => {
              const effectiveScore =
                candidate.effective_score ??
                candidate.hr_score_override ??
                candidate.manual_score_override ??
                candidate.ai_score ??
                candidate.resume_score ??
                0;
              const rawAiScore = candidate.ai_score ?? candidate.resume_score;
              const hasOverride =
                (candidate.hr_score_override !== undefined && candidate.hr_score_override !== null) ||
                (candidate.manual_score_override !== undefined && candidate.manual_score_override !== null);
              const displayName = candidate.full_name || candidate.name || "Candidate";

              return (
                <tr key={candidate.id} className="hover:bg-[#2A2D2A] transition-colors">
                  <td className="px-5 py-4 font-mono font-medium text-[#8A8B82]">
                    #{index + 1}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#D9DADF]">{displayName}</div>
                    <div className="text-xs text-[#8A8B82]">{candidate.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <NeuBadge status={candidate.status} />
                  </td>
                  <td className="px-5 py-4">
                    {candidate.stage ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#1E201E] border border-[rgba(217,218,223,0.1)] text-[#D9DADF]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B]" />
                          Step {candidate.stage.step}: {candidate.stage.label}
                        </span>
                        <span className="text-[10px] text-[#8A8B82] pl-1">
                          {candidate.stage.detail}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#8A8B82]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-sm">
                    {rawAiScore !== null && rawAiScore !== undefined ? `${Math.round(rawAiScore)}%` : "Pending"}
                  </td>
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-[#DD700B]">
                    <div className="flex items-center gap-1.5">
                      <span>{Math.round(effectiveScore)}%</span>
                      {hasOverride && (
                        <span title="Manually overridden by HR" className="text-[10px] bg-[#DD700B]/20 text-[#DD700B] px-1.5 py-0.5 rounded">
                          OVERRIDE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/hr/candidates/${candidate.id}`}>
                      <NeuButton size="sm" variant="secondary">
                        Review <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </NeuButton>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
