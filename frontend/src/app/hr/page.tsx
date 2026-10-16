"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Job, Candidate } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { CandidateTable } from "@/components/hr/CandidateTable";
import { AgentTimeline } from "@/components/hr/AgentTimeline";
import {
  Briefcase,
  Users,
  CheckCircle2,
  Calendar,
  PlusCircle,
  ArrowRight,
} from "lucide-react";

// OWNER: M1 (frontend developer)
export default function HROverviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getHRJobs(), api.getHRCandidates("11111111-1111-1111-1111-111111111111")]).then(
      ([jobsData, candidatesData]) => {
        setJobs(jobsData);
        setCandidates(candidatesData);
        setLoading(false);
      }
    );
  }, []);

  const stats = [
    { label: "Active Requisitions", value: jobs.length.toString(), icon: Briefcase, color: "text-[#DD700B]" },
    { label: "Candidates Triaged", value: candidates.length.toString(), icon: Users, color: "text-[#D9DADF]" },
    { label: "Screenings Completed", value: "1", icon: CheckCircle2, color: "text-[#8FD19E]" },
    { label: "Auto-Invites Queued", value: "3", icon: Calendar, color: "text-[#FCF8D8]" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner with small 'mark' logo next to page title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo variant="mark" size="md" href={null} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#D9DADF]">Talent Overview</h1>
            <p className="text-xs md:text-sm text-[#8A8B82] mt-0.5">
              Welcome back, HR Lead. AI agents are active across 1 requisition.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/hr/jobs/new">
            <NeuButton variant="primary">
              <PlusCircle className="w-4 h-4 mr-1.5" /> Post Requisition
            </NeuButton>
          </Link>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <NeuCard key={i} variant="raised" className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8A8B82]">{s.label}</p>
                <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#242724] neu-inset flex items-center justify-center text-[#DD700B]">
                <Icon className="w-5 h-5" />
              </div>
            </NeuCard>
          );
        })}
      </div>

      {/* Agent Execution Timeline */}
      <AgentTimeline currentStage="supervisor" />

      {/* Active Requisition Card */}
      {jobs.length > 0 && (
        <NeuCard variant="raised" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-mono uppercase bg-[#DD700B]/10 text-[#DD700B] px-2 py-0.5 rounded font-semibold">
                Active Requisition
              </span>
              <h3 className="text-lg font-bold text-[#D9DADF] mt-2">{jobs[0].title}</h3>
              <p className="text-xs text-[#8A8B82]">{jobs[0].department} &bull; Deadline in 3 days</p>
            </div>
            <Link href={`/hr/jobs/${jobs[0].id}`}>
              <NeuButton variant="secondary" size="sm">
                View Full Leaderboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </NeuButton>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs pt-4 border-t border-[#8A8B82]/20">
            <div className="p-3 rounded-xl bg-[#242724]">
              <span className="text-[#8A8B82]">Auto-Invite Quota</span>
              <p className="text-base font-bold font-mono text-[#D9DADF] mt-1">Top {jobs[0].top_n}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#242724]">
              <span className="text-[#8A8B82]">Score Threshold</span>
              <p className="text-base font-bold font-mono text-[#D9DADF] mt-1">&ge; {jobs[0].min_score}%</p>
            </div>
            <div className="p-3 rounded-xl bg-[#242724]">
              <span className="text-[#8A8B82]">Applicants Triaged</span>
              <p className="text-base font-bold font-mono text-[#DD700B] mt-1">{candidates.length}</p>
            </div>
          </div>
        </NeuCard>
      )}

      {/* Candidate Leaderboard Table */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#D9DADF]">Ranked Applicant Leaderboard</h2>
          <span className="text-xs text-[#8A8B82]">AI Scored &bull; Fully Overridable</span>
        </div>
        <CandidateTable candidates={candidates} />
      </div>
    </div>
  );
}
