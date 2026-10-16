"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Job, Candidate } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { CandidateTable } from "@/components/hr/CandidateTable";
import { AgentTimeline } from "@/components/hr/AgentTimeline";
import { Briefcase, Calendar, Users, ExternalLink, ArrowLeft } from "lucide-react";

// OWNER: M1 (frontend developer) & M2 (backend engineer)
export default function JobDetailPage() {
  const params = useParams();
  const jobId = (params?.id as string) || "11111111-1111-1111-1111-111111111111";

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getHRJobDetail(jobId), api.getHRCandidates(jobId)]).then(
      ([jobData, candidateData]) => {
        setJob(jobData);
        setCandidates(candidateData);
        setLoading(false);
      }
    );
  }, [jobId]);

  if (!job) {
    return (
      <div className="flex items-center justify-center p-12 text-[#8A8B82]">
        Loading job requisition...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Header with small 'mark' logo next to title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/jobs">
            <NeuButton size="sm" variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-1" /> Requisitions
            </NeuButton>
          </Link>
          <div className="flex items-center gap-3">
            <Logo variant="mark" size="md" href={null} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#D9DADF]">{job.title}</h1>
                <NeuBadge status="applied" label={job.status} />
              </div>
              <p className="text-xs text-[#8A8B82] mt-0.5">{job.department} &bull; ID: {job.id.substring(0, 8)}...</p>
            </div>
          </div>
        </div>

        <Link href={`/jobs/${job.id}`} target="_blank">
          <NeuButton size="sm" variant="secondary">
            Public Application Page <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </NeuButton>
        </Link>
      </div>

      {/* Requisition Meta Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Auto-Invite Quota</span>
            <p className="text-xl font-bold font-mono text-[#D9DADF] mt-0.5">Top {job.top_n}</p>
          </div>
          <Users className="w-5 h-5 text-[#DD700B]" />
        </NeuCard>

        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Min Qualification</span>
            <p className="text-xl font-bold font-mono text-[#D9DADF] mt-0.5">&ge; {job.min_score}%</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FCF8D8]/10 text-[#FCF8D8]">Cutoff</span>
        </NeuCard>

        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Deadline</span>
            <p className="text-sm font-bold text-[#D9DADF] mt-0.5">{new Date(job.deadline).toLocaleDateString()}</p>
          </div>
          <Calendar className="w-5 h-5 text-[#8FD19E]" />
        </NeuCard>

        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Applicants Triaged</span>
            <p className="text-xl font-bold font-mono text-[#DD700B] mt-0.5">{candidates.length}</p>
          </div>
          <Briefcase className="w-5 h-5 text-[#8A8B82]" />
        </NeuCard>
      </div>

      {/* Multi-Agent Pipeline */}
      <AgentTimeline currentStage="supervisor" />

      {/* Rubric Dimensions */}
      {job.rubric?.criteria && (
        <NeuCard variant="raised" className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
              Rubric Agent Evaluation Criteria (Sum: 100%)
            </h3>
            <span className="text-xs text-[#DD700B] font-mono">Gemini 1.5 Generated</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {job.rubric.criteria.map((c, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#D9DADF]">
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono text-[#DD700B] shrink-0">{c.weight}%</span>
                </div>
                <p className="text-[11px] text-[#8A8B82] line-clamp-2">{c.description}</p>
              </div>
            ))}
          </div>
        </NeuCard>
      )}

      {/* Candidate Leaderboard */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#D9DADF]">Candidate Leaderboard & Rankings</h2>
          <span className="text-xs text-[#8A8B82]">Click candidate for dossier, transcript & decision actions</span>
        </div>
        <CandidateTable candidates={candidates} />
      </div>
    </div>
  );
}
