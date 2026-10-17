"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminOverview } from "@/lib/types";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Users,
  Briefcase,
  FileCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserPlus,
  Mail,
  TrendingUp,
  BarChart3,
  Calendar,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTrend, setActiveTrend] = useState<"applications" | "jobs">("applications");

  useEffect(() => {
    api
      .getAdminOverview()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to fetch admin overview:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-xs text-[#8A8B82]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
          Loading administrative metrics and 14-day telemetry...
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Total HR Users",
      value: data.total_hr_users,
      hint: "Registered recruiters",
      icon: Users,
      color: "text-[#DD700B]",
      href: "/admin/hr-users",
    },
    {
      label: "Active Jobs",
      value: data.active_jobs,
      hint: `${data.closed_jobs} closed requisitions`,
      icon: Briefcase,
      color: "text-[#8FD19E]",
      href: "/admin/hr-users",
    },
    {
      label: "Total Candidates",
      value: data.total_candidates,
      hint: "All-time applications",
      icon: FileCheck,
      color: "text-[#D9DADF]",
      href: "/admin/candidates",
    },
    {
      label: "Completed Interviews",
      value: data.completed_interviews,
      hint: "Evaluated screenings",
      icon: CheckCircle2,
      color: "text-[#8FD19E]",
    },
    {
      label: "Hiring Decisions",
      value: data.total_decisions,
      hint: "Extended offers & rejections",
      icon: Clock,
      color: "text-[#D9DADF]",
    },
    {
      label: "Overrides This Week",
      value: data.overrides_this_week,
      hint: "Requires supervision review",
      icon: ShieldAlert,
      color: "text-[#DD700B]",
      href: "/admin/overrides",
    },
    {
      label: "Pending Access Requests",
      value: data.pending_access_requests,
      hint: "Awaiting approval",
      icon: UserPlus,
      color: "text-[#FCF8D8]",
    },
    {
      label: "Emails Sent Today",
      value: data.emails_sent_today,
      hint: "SPF/DKIM verified dispatches",
      icon: Mail,
      color: "text-[#D9DADF]",
    },
  ];

  // Prepare custom 14-day bar chart data
  const dates = data.trends_14d?.dates || [];
  const currentValues =
    activeTrend === "applications"
      ? data.trends_14d?.applications || []
      : data.trends_14d?.jobs_created || [];
  const maxValue = Math.max(...currentValues, 1);

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF]">Platform Overview</h1>
          <p className="text-sm text-[#8A8B82] mt-1.5 leading-relaxed">
            Real-time operations dashboard, pipeline aggregates, and 14-day activity trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8A8B82] bg-[#242724] px-3.5 py-1.5 rounded-xl border border-[#D9DADF]/10">
            System Status: <strong className="text-[#8FD19E]">Healthy & Audited</strong>
          </span>
        </div>
      </div>

      {/* Top Metric Cards (8 key metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((m, idx) => {
          const Icon = m.icon;
          const CardContent = (
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#8A8B82] font-medium truncate">{m.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${m.color}`} />
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-bold font-mono text-[#D9DADF]">
                  {m.value}
                </span>
                <p className="text-xs text-[#8A8B82] mt-1 truncate">{m.hint}</p>
              </div>
            </div>
          );

          if (m.href) {
            return (
              <Link key={idx} href={m.href} className="block group">
                <NeuCard
                  variant="raised"
                  className="p-4 h-full border border-[#D9DADF]/5 group-hover:border-[#DD700B]/40 transition-colors cursor-pointer"
                >
                  {CardContent}
                </NeuCard>
              </Link>
            );
          }

          return (
            <NeuCard
              key={idx}
              variant="raised"
              className="p-4 h-full border border-[#D9DADF]/5"
            >
              {CardContent}
            </NeuCard>
          );
        })}
      </div>

      {/* 14-Day Activity Trends (Custom HTML/CSS Neu Bar Chart) */}
      <NeuCard variant="raised" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#8A8B82]/20">
          <div>
            <h3 className="text-sm font-bold text-[#D9DADF] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#DD700B]" />
              14-Day Platform Velocity
            </h3>
            <p className="text-xs text-[#8A8B82] mt-0.5">
              Daily aggregates without external telemetry trackers or chart script overhead.
            </p>
          </div>

          {/* Toggle between Applications and Jobs Created */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1E201E] border border-[#8A8B82]/20">
            <button
              onClick={() => setActiveTrend("applications")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTrend === "applications"
                  ? "bg-[#2A2D2A] text-[#DD700B] font-semibold neu-inset"
                  : "text-[#8A8B82] hover:text-[#D9DADF]"
              }`}
            >
              Applications ({data.trends_14d?.applications.reduce((a, b) => a + b, 0)})
            </button>
            <button
              onClick={() => setActiveTrend("jobs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTrend === "jobs"
                  ? "bg-[#2A2D2A] text-[#8FD19E] font-semibold neu-inset"
                  : "text-[#8A8B82] hover:text-[#D9DADF]"
              }`}
            >
              Jobs Created ({data.trends_14d?.jobs_created.reduce((a, b) => a + b, 0)})
            </button>
          </div>
        </div>

        {/* Custom HTML/CSS Bar Chart Grid */}
        <div className="neu-inset rounded-2xl p-6 bg-[#1A1C1A] border border-[#8A8B82]/15">
          <div className="h-56 flex items-end gap-2 sm:gap-3 pt-6 pb-2">
            {dates.map((dateStr, idx) => {
              const val = currentValues[idx] || 0;
              const heightPct = Math.round((val / maxValue) * 100);
              const barColor =
                activeTrend === "applications"
                  ? "bg-gradient-to-t from-[#DD700B]/80 to-[#DD700B]"
                  : "bg-gradient-to-t from-[#8FD19E]/80 to-[#8FD19E]";

              // Format date label e.g. "12 Oct"
              const d = new Date(dateStr);
              const dayLabel = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;

              return (
                <div
                  key={dateStr}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2A2D2A] text-[#D9DADF] text-[11px] font-mono px-2 py-1 rounded-md border border-[#8A8B82]/30 shadow-lg pointer-events-none whitespace-nowrap z-10">
                    <span className="font-bold text-[#DD700B]">{val}</span>{" "}
                    {activeTrend === "applications" ? "applied" : "posted"} on {dayLabel}
                  </div>

                  {/* Value Label above bar if non-zero */}
                  <span className="text-[10px] font-mono text-[#8A8B82] mb-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {val > 0 ? val : ""}
                  </span>

                  {/* The Bar */}
                  <div className="w-full max-w-[28px] h-full flex items-end">
                    <div
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 group-hover:brightness-125 ${barColor} shadow-sm`}
                    />
                  </div>

                  {/* X-axis Day Label */}
                  <span className="text-[9px] font-mono text-[#8A8B82] mt-2 truncate w-full text-center">
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#8A8B82]/15 text-[11px] text-[#8A8B82]">
            <span>14 days ago</span>
            <span className="flex items-center gap-1.5 font-medium text-[#D9DADF]">
              <Calendar className="w-3.5 h-3.5 text-[#DD700B]" />
              Hover bars for detailed daily breakdowns
            </span>
            <span>Today</span>
          </div>
        </div>
      </NeuCard>
    </div>
  );
}
