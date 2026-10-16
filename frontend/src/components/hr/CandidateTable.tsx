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
  return (
    <div className="neu-raised rounded-2xl overflow-hidden border border-[#D9DADF]/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#D9DADF]">
          <thead className="bg-[#242724] border-b border-[#8A8B82]/20 text-xs uppercase tracking-wider text-[#8A8B82]">
            <tr>
              <th className="px-5 py-4 font-semibold">Rank</th>
              <th className="px-5 py-4 font-semibold">Candidate</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Resume Score</th>
              <th className="px-5 py-4 font-semibold">Effective Score</th>
              <th className="px-5 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/40">
            {candidates.map((candidate, index) => {
              const effectiveScore = candidate.manual_score_override ?? candidate.resume_score ?? 0;
              const hasOverride = candidate.manual_score_override !== undefined && candidate.manual_score_override !== null;

              return (
                <tr key={candidate.id} className="hover:bg-[#2A2D2A] transition-colors">
                  <td className="px-5 py-4 font-mono font-medium text-[#8A8B82]">
                    #{index + 1}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#D9DADF]">{candidate.full_name}</div>
                    <div className="text-xs text-[#8A8B82]">{candidate.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <NeuBadge status={candidate.status} />
                  </td>
                  <td className="px-5 py-4 font-mono text-sm">
                    {candidate.resume_score ? `${candidate.resume_score.toFixed(1)}%` : "Pending"}
                  </td>
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-[#DD700B]">
                    <div className="flex items-center gap-1.5">
                      <span>{effectiveScore.toFixed(1)}%</span>
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
