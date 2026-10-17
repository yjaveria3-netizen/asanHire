"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import {
  ArrowLeft,
  Users,
  Briefcase,
  FileCheck,
  ShieldAlert,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Lock,
} from "lucide-react";

export default function AdminHRUserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    api
      .getAdminHRUserDetail(userId)
      .then(setData)
      .catch((err) => console.error("Failed to load HR recruiter detail:", err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-xs text-[#8A8B82]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
          Loading recruiter dossier and requisition registry...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <Link href="/admin/hr-users">
          <NeuButton size="sm" variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to HR Users
          </NeuButton>
        </Link>
        <NeuCard variant="raised" className="p-8 text-center text-xs text-[#8A8B82]">
          Recruiter profile not found.
        </NeuCard>
      </div>
    );
  }

  const { hr_user, jobs = [] } = data;
  const isHighOverride = (hr_user.override_rate_pct || 0) > 30 && (hr_user.decisions_count || 0) >= 5;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/hr-users">
            <NeuButton size="sm" variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to HR Users
            </NeuButton>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#D9DADF]">
              {hr_user.full_name || hr_user.email}
            </h1>
            <p className="text-xs text-[#8A8B82] font-mono mt-0.5">
              Account ID: {hr_user.id} &bull; Org: {hr_user.organization || "Independent"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hr_user.reply_to_enabled ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#8FD19E] bg-[#8FD19E]/10 px-3 py-1.5 rounded-xl border border-[#8FD19E]/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Reply-To Active: {hr_user.contact_email || hr_user.email}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#8A8B82] bg-[#242724] px-3 py-1.5 rounded-xl border border-[#8A8B82]/20">
              <XCircle className="w-3.5 h-3.5" />
              Reply-To Suppressed
            </span>
          )}
        </div>
      </div>

      {/* Strict Privacy Shield Notice */}
      <div className="p-3.5 rounded-xl bg-[rgba(62,90,68,0.2)] border border-[#8FD19E]/30 flex items-start gap-2.5 text-xs text-[#D9DADF]">
        <ShieldCheck className="w-4 h-4 text-[#8FD19E] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#8FD19E]">Candidate Privacy Guard Active:</strong> In accordance with security TRD specifications, candidate resumes, evaluation rubrics, per-question transcripts, and individual scores are strictly secluded to the recruiter and never disclosed in administrative oversight panels.
        </div>
      </div>

      {/* Recruiter Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NeuCard variant="raised" className="p-4">
          <div className="flex items-center justify-between text-xs text-[#8A8B82] mb-1">
            <span>Total Requisitions</span>
            <Briefcase className="w-4 h-4 text-[#DD700B]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#D9DADF]">
            {hr_user.jobs_count || jobs.length}
          </span>
          <p className="text-[10px] text-[#8A8B82] mt-1">Requisitions posted</p>
        </NeuCard>

        <NeuCard variant="raised" className="p-4">
          <div className="flex items-center justify-between text-xs text-[#8A8B82] mb-1">
            <span>Candidates Handled</span>
            <FileCheck className="w-4 h-4 text-[#8FD19E]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#D9DADF]">
            {hr_user.candidates_count || 0}
          </span>
          <p className="text-[10px] text-[#8A8B82] mt-1">Applications received</p>
        </NeuCard>

        <NeuCard variant="raised" className="p-4">
          <div className="flex items-center justify-between text-xs text-[#8A8B82] mb-1">
            <span>Total Overrides</span>
            <ShieldAlert className="w-4 h-4 text-[#DD700B]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#DD700B]">
            {hr_user.overrides_count || 0}
          </span>
          <p className="text-[10px] text-[#8A8B82] mt-1">Audited actions</p>
        </NeuCard>

        <NeuCard variant="raised" className="p-4">
          <div className="flex items-center justify-between text-xs text-[#8A8B82] mb-1">
            <span>Override Ratio</span>
            <Clock className="w-4 h-4 text-[#FCF8D8]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-bold font-mono ${
                isHighOverride ? "text-[#E57373]" : "text-[#D9DADF]"
              }`}
            >
              {(hr_user.override_rate_pct || 0).toFixed(1)}%
            </span>
            {isHighOverride && (
              <span className="text-[9px] font-bold text-[#E57373] bg-[#E57373]/10 px-1 rounded">
                ADVISORY
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#8A8B82] mt-1">
            {hr_user.overrides_count || 0} of {hr_user.decisions_count || 0} decisions
          </p>
        </NeuCard>
      </div>

      {/* Recruiter's Job Requisitions Table */}
      <NeuCard variant="raised" className="p-6">
        <div className="pb-3 mb-4 border-b border-[#8A8B82]/20 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#D9DADF]">Job Requisitions Posted</h3>
            <p className="text-xs text-[#8A8B82] mt-0.5">
              High-level status and candidate volumes for this recruiter.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8A8B82]">
            {jobs.length} Requisition{jobs.length === 1 ? "" : "s"}
          </span>
        </div>

        {jobs.length === 0 ? (
          <p className="text-xs text-[#8A8B82] italic text-center py-6">
            This recruiter has not created any job requisitions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#D9DADF]">
              <thead className="bg-[#242724] border-b border-[#8A8B82]/20 uppercase tracking-wider text-[11px] text-[#8A8B82]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Candidates</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/40">
                {jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-[#2A2D2A] transition-colors">
                    <td className="px-4 py-3 font-medium text-sm text-[#D9DADF]">
                      {job.title}
                    </td>
                    <td className="px-4 py-3">
                      <NeuBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {job.candidate_count ?? 0}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#8A8B82]">
                      {job.deadline ? new Date(job.deadline).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#8A8B82]">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeuCard>
    </div>
  );
}
