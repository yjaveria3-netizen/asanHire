"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminHRUser } from "@/lib/types";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Users,
  Search,
  ArrowUpDown,
  Mail,
  ShieldAlert,
  Briefcase,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function AdminHRUsersPage() {
  const [users, setUsers] = useState<AdminHRUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"jobs" | "candidates" | "override_rate" | "last_active">("jobs");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    api
      .getAdminHRUsers()
      .then(setUsers)
      .catch((err) => console.error("Failed to load HR users:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: "jobs" | "candidates" | "override_rate" | "last_active") => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const filteredUsers = users
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.organization?.toLowerCase().includes(q) ||
        u.contact_email?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === "jobs") {
        valA = a.jobs_count || 0;
        valB = b.jobs_count || 0;
      } else if (sortBy === "candidates") {
        valA = a.candidates_count || 0;
        valB = b.candidates_count || 0;
      } else if (sortBy === "override_rate") {
        valA = a.override_rate_pct || 0;
        valB = b.override_rate_pct || 0;
      } else if (sortBy === "last_active") {
        valA = a.last_active ? new Date(a.last_active).getTime() : 0;
        valB = b.last_active ? new Date(b.last_active).getTime() : 0;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D9DADF] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#DD700B]" />
            HR Recruiters Directory
          </h1>
          <p className="text-xs text-[#8A8B82] mt-1">
            Supervise recruiter workloads, override accountability ratios, and Reply-To communication configurations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8A8B82] bg-[#242724] px-3 py-1.5 rounded-xl border border-[#D9DADF]/10">
            Total HR Accounts: <strong className="text-[#DD700B]">{users.length}</strong>
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="neu-raised rounded-2xl p-4 bg-[#242724] border border-[#D9DADF]/5 flex items-center gap-2.5 max-w-md">
        <Search className="w-4 h-4 text-[#8A8B82] shrink-0" />
        <input
          type="text"
          placeholder="Filter by email, name, organization, or reply-to..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] px-3 py-2 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center text-xs text-[#8A8B82]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
            Loading recruiter telemetry...
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <NeuCard variant="raised" className="p-8 text-center">
          <Users className="w-10 h-10 text-[#8A8B82] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-[#D9DADF]">No HR Users Found</h3>
          <p className="text-xs text-[#8A8B82] mt-1">No recruiters matched your search term.</p>
        </NeuCard>
      ) : (
        <div className="neu-raised rounded-2xl overflow-hidden border border-[#D9DADF]/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#D9DADF]">
              <thead className="bg-[#242724] border-b border-[#8A8B82]/20 uppercase tracking-wider text-[11px] text-[#8A8B82]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Recruiter / Org</th>
                  <th
                    onClick={() => handleSort("jobs")}
                    className="px-5 py-3.5 font-semibold cursor-pointer hover:text-[#D9DADF] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Jobs</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("candidates")}
                    className="px-5 py-3.5 font-semibold cursor-pointer hover:text-[#D9DADF] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Candidates</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("override_rate")}
                    className="px-5 py-3.5 font-semibold cursor-pointer hover:text-[#D9DADF] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Override Rate</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Reply-To Routing</th>
                  <th
                    onClick={() => handleSort("last_active")}
                    className="px-5 py-3.5 font-semibold cursor-pointer hover:text-[#D9DADF] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Active</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/60">
                {filteredUsers.map((user) => {
                  const isHighOverride = (user.override_rate_pct || 0) > 30 && (user.decisions_count || 0) >= 5;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#2A2D2A] transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#D9DADF] text-sm">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-[11px] text-[#8A8B82] font-mono">
                          {user.email} &bull; {user.organization || "Independent Recruiter"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-sm">
                        {user.jobs_count || 0}
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-sm">
                        {user.candidates_count || 0}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isHighOverride ? "text-[#E57373]" : "text-[#D9DADF]"
                            }`}
                          >
                            {(user.override_rate_pct || 0).toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-[#8A8B82]">
                            ({user.overrides_count || 0} / {user.decisions_count || 0})
                          </span>
                          {isHighOverride && (
                            <span
                              title="Override rate exceeds 30% threshold with 5+ decisions"
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(221,112,11,0.2)] text-[#DD700B] border border-[#DD700B]/40"
                            >
                              HIGH
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[11px] text-[#D9DADF] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#DD700B]" />
                            {user.contact_email || user.email}
                          </span>
                          <div>
                            {user.reply_to_enabled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#8FD19E] bg-[#8FD19E]/10 px-1.5 py-0.5 rounded border border-[#8FD19E]/20">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Reply-To Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#8A8B82] bg-[#1E201E] px-1.5 py-0.5 rounded border border-[#8A8B82]/20">
                                <XCircle className="w-2.5 h-2.5" /> Suppressed
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-[#8A8B82]">
                        {user.last_active
                          ? new Date(user.last_active).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/admin/hr-users/${user.id}`}>
                          <NeuButton size="sm" variant="secondary">
                            View Dossier <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
      )}
    </div>
  );
}
