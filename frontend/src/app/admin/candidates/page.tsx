"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminCandidateLookupResult } from "@/lib/types";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Calendar,
  AlertTriangle,
  Mail,
  Lock,
  Briefcase,
  ArrowLeft,
} from "lucide-react";

export default function AdminCandidateLookupPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminCandidateLookupResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = query.trim();
    if (!cleanKey) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await api.getAdminCandidateLookup(cleanKey);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Candidate lookup query failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-16">
      {/* Back to Admin Overview */}
      <div>
        <Link
          href="/admin/overview"
          className="inline-flex items-center gap-2 text-sm text-[#8A8B82] hover:text-[#DD700B] transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-[#242724]"
        >
          <ArrowLeft className="w-4 h-4 text-[#DD700B]" />
          <span>Back to Admin Overview</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF] flex items-center gap-2.5">
          <Search className="w-7 h-7 text-[#DD700B]" />
          Platform Candidate Lookup
        </h1>
        <p className="text-sm text-[#8A8B82] mt-1.5 leading-relaxed">
          Verify candidate application records, platform status, and blocked email registries across all organizations.
        </p>
      </div>

      {/* Strict Privacy Shield Banner */}
      <div className="p-3.5 rounded-xl bg-[rgba(62,90,68,0.2)] border border-[#8FD19E]/30 flex items-start gap-2.5 text-xs text-[#D9DADF]">
        <ShieldCheck className="w-4 h-4 text-[#8FD19E] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#8FD19E]">Zero-PII Compliance Architecture:</strong> This administrative view surfaces cross-platform lifecycle metadata only. Candidate resume documents, AI rubrics, per-question transcripts, and audio telemetry are strictly secluded.
        </div>
      </div>

      {/* Search Input Box */}
      <NeuCard variant="raised" className="p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8A8B82] absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter candidate email_key or email address..."
              required
              className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] pl-10 pr-4 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B]"
            />
          </div>
          <NeuButton
            type="submit"
            variant="primary"
            disabled={loading || !query.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? "Searching..." : "Lookup Candidate"}
          </NeuButton>
        </form>
      </NeuCard>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[rgba(90,42,42,0.3)] border border-[#E57373]/30 text-xs text-[#E57373] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Results */}
      {searched && !loading && result && (
        <div className="flex flex-col gap-6">
          {/* Candidate Platform Profile Card */}
          <NeuCard variant="raised" className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#8A8B82]/20">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8B82]">
                  Normalized Identifier
                </span>
                <span className="text-base font-mono font-bold text-[#D9DADF]">
                  {result.email_key}
                </span>
              </div>

              {/* Blocked Status */}
              <div>
                {result.is_blocked ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(90,42,42,0.4)] border border-[#E57373]/50 text-xs text-[#E57373]">
                    <ShieldAlert className="w-4 h-4" />
                    <span>
                      <strong>Blocked on Platform:</strong> {result.blocked_reason || "Access restricted by administrator"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(62,90,68,0.3)] border border-[#8FD19E]/30 text-xs text-[#8FD19E]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Eligible & Active Candidate</span>
                  </div>
                )}
              </div>
            </div>

            {/* Applications Platform History */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#D9DADF] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#DD700B]" />
                  Cross-Platform Application Ledger
                </h3>
                <span className="text-xs font-mono text-[#8A8B82]">
                  {result.applications?.length || 0} Submissions
                </span>
              </div>

              {!result.applications || result.applications.length === 0 ? (
                <p className="text-xs text-[#8A8B82] italic py-4">
                  No active or historical job applications recorded under this key.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#D9DADF]">
                    <thead className="bg-[#242724] border-b border-[#8A8B82]/20 uppercase tracking-wider text-[11px] text-[#8A8B82]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Job Title</th>
                        <th className="px-4 py-3 font-semibold">Applied Date</th>
                        <th className="px-4 py-3 font-semibold">Current State</th>
                        <th className="px-4 py-3 font-semibold">Recruiter Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/40">
                      {result.applications.map((app, idx) => (
                        <tr key={idx} className="hover:bg-[#2A2D2A] transition-colors">
                          <td className="px-4 py-3.5 font-medium text-sm text-[#D9DADF]">
                            {app.job_title}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-[#8A8B82]">
                            {app.applied_at
                              ? new Date(app.applied_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <NeuBadge status={app.status as any} />
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] text-[#8A8B82]">
                            {app.hr_email || "hr@asanhire.dev"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </NeuCard>
        </div>
      )}
    </div>
  );
}
