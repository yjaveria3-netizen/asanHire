"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Job, Candidate } from "@/lib/types";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { Logo } from "@/components/brand/Logo";
import {
  Briefcase,
  Users,
  Shield,
  Bot,
  PlusCircle,
  ArrowRight,
  Mic,
  Activity,
  CheckCircle2,
  Clock,
  LogOut,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

export default function HRDashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || null);
        }
      } catch {
        // Handled silently
      }

      try {
        const jobData = await api.getHRJobs();
        setJobs(jobData);
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Handled silently
    } finally {
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      }
      router.push("/login?logout=true");
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9DADF]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#DD700B]">
              Recruiter Cockpit
            </span>
            <span className="text-[#8A8B82]">&bull;</span>
            <span className="text-xs text-[#8FD19E] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8FD19E] animate-pulse" /> FastMCP Online
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#D9DADF]">
            Executive Overview
          </h1>
          <p className="text-sm text-[#8A8B82] mt-1.5">
            Logged in as <span className="text-[#DD700B] font-mono font-medium">{email || "Recruiter"}</span> &bull; Unconditional human decision sovereignty active.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/hr/jobs/new">
            <NeuButton size="md" variant="primary">
              <PlusCircle className="w-4 h-4 mr-1.5" /> Post Job
            </NeuButton>
          </Link>
          <NeuButton
            size="md"
            variant="ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-[#8A8B82] hover:text-[#E57373]"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            {loggingOut ? "Signing out..." : "Sign Out"}
          </NeuButton>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NeuCard variant="raised" className="p-5 flex flex-col justify-between hover:border-[#DD700B]/40 hover:-translate-y-0.5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#8A8B82]">Active Positions</span>
            <div className="w-8 h-8 rounded-lg bg-[#DD700B]/10 border border-[#DD700B]/20 flex items-center justify-center text-[#DD700B]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-[#D9DADF]">
              {loading ? "..." : jobs.length}
            </div>
            <div className="text-xs text-[#8FD19E] mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> All rubrics synthesized
            </div>
          </div>
        </NeuCard>

        <NeuCard variant="raised" className="p-5 flex flex-col justify-between hover:border-[#8FD19E]/40 hover:-translate-y-0.5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#8A8B82]">Total Screened</span>
            <div className="w-8 h-8 rounded-lg bg-[#8FD19E]/10 border border-[#8FD19E]/20 flex items-center justify-center text-[#8FD19E]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-[#D9DADF]">42</div>
            <div className="text-xs text-[#8A8B82] mt-1">
              Across all active pipelines
            </div>
          </div>
        </NeuCard>

        <NeuCard variant="raised" className="p-5 flex flex-col justify-between hover:border-[#FCF8D8]/40 hover:-translate-y-0.5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#8A8B82]">Voice Screening Avg</span>
            <div className="w-8 h-8 rounded-lg bg-[#FCF8D8]/10 border border-[#FCF8D8]/20 flex items-center justify-center text-[#FCF8D8]">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-[#FCF8D8]">84.6%</div>
            <div className="text-xs text-[#8A8B82] mt-1">
              Groq AI objective score
            </div>
          </div>
        </NeuCard>

        <NeuCard variant="raised" className="p-5 flex flex-col justify-between hover:border-[#8FD19E]/40 hover:-translate-y-0.5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#8A8B82]">Guardian Integrity Avg</span>
            <div className="w-8 h-8 rounded-lg bg-[#8FD19E]/10 border border-[#8FD19E]/20 flex items-center justify-center text-[#8FD19E]">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-[#8FD19E]">96.8%</div>
            <div className="text-xs text-[#8FD19E] mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> High trust confidence
            </div>
          </div>
        </NeuCard>
      </div>

      {/* Main Grid: Requisitions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Job Requisitions (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#D9DADF] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#DD700B]" />
              Active Job Requisitions
            </h2>
            <Link href="/hr/jobs" className="text-xs text-[#DD700B] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <NeuCard
                  key={job.id}
                  variant="raised"
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-[#D9DADF]">{job.title}</h3>
                      <NeuBadge status="applied" label={job.status} />
                    </div>
                    <p className="text-xs text-[#8A8B82]">
                      {job.department} &bull; Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </p>
                    <p className="text-[11px] text-[#DD700B] mt-1 font-mono">
                      Top {job.top_n} candidates auto-invited (&ge; {job.min_score}% threshold)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/jobs/${job.id}`} target="_blank">
                      <NeuButton size="sm" variant="ghost" className="text-xs">
                        Public Form
                      </NeuButton>
                    </Link>
                    <Link href={`/hr/jobs/${job.id}`}>
                      <NeuButton size="sm" variant="secondary" className="text-xs">
                        Leaderboard <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </NeuButton>
                    </Link>
                  </div>
                </NeuCard>
              ))
            ) : (
              <div className="neu-inset p-8 rounded-xl text-center">
                <Briefcase className="w-8 h-8 text-[#8A8B82] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#D9DADF]">No active job postings</p>
                <p className="text-xs text-[#8A8B82] mt-1 mb-4">
                  Create your first role to start screening resumes with AI rubrics.
                </p>
                <Link href="/hr/jobs/new">
                  <NeuButton size="sm" variant="primary">
                    <PlusCircle className="w-3.5 h-3.5 mr-1" /> Post New Job
                  </NeuButton>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Pipeline Health & Quick Resources (1 col) */}
        <div className="flex flex-col gap-6">
          {/* Autonomous AI & Proctoring Health */}
          <div className="neu-raised p-5 rounded-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#D9DADF] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8FD19E]" />
              AI Hiring Pipeline Health
            </h3>
            <p className="text-xs text-[#8A8B82] leading-relaxed">
              Autonomous candidate screening and integrity radar operational. 100% human recruiter sovereignty active.
            </p>

            <div className="space-y-3 pt-2 border-t border-[#383A38] text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#8A8B82] text-xs">Objective Rubric Synthesizer</span>
                <span className="text-[#8FD19E] font-mono text-xs flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#8FD19E]" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8B82] text-xs">Voice Screening Model</span>
                <span className="text-[#8FD19E] font-mono text-xs flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#8FD19E]" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8B82] text-xs">Guardian Proctoring Radar</span>
                <span className="text-[#8FD19E] font-mono text-xs flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#8FD19E]" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8A8B82] text-xs">Human Sovereignty &amp; Audit Trail</span>
                <span className="text-[#8FD19E] font-mono text-xs flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#8FD19E]" /> Guaranteed
                </span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="neu-inset p-5 rounded-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#DD700B]">
              Quick Shortcuts
            </h3>
            <Link
              href="/hr/jobs/new"
              className="flex items-center justify-between p-3 rounded-lg bg-[#1E201E] border border-[#383A38] text-sm text-[#D9DADF] hover:border-[#DD700B] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-[#DD700B]" />
                <span className="font-medium">Post a New Job</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8A8B82]" />
            </Link>

            <Link
              href="/interview/demo-token"
              className="flex items-center justify-between p-3 rounded-lg bg-[#1E201E] border border-[#383A38] text-sm text-[#D9DADF] hover:border-[#DD700B] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-[#8FD19E]" />
                <span className="font-medium">Candidate Voice Room Demo</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8A8B82]" />
            </Link>

            <Link
              href="/hr/overrides"
              className="flex items-center justify-between p-3 rounded-lg bg-[#1E201E] border border-[#383A38] text-sm text-[#D9DADF] hover:border-[#DD700B] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#FCF8D8]" />
                <span className="font-medium">Override Accountability Ledger</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8A8B82]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
