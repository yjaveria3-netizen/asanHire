"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { HROverrideEvent, HROverrideQuestion } from "@/lib/types";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { OVERRIDE_REASON_CATEGORIES } from "@/lib/constants";
import {
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";

export default function HROverridesPage() {
  const [overrides, setOverrides] = useState<HROverrideEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [submittingAnswerId, setSubmittingAnswerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOverrides = async () => {
    try {
      const data = await api.getHROverrides();
      const list = Array.isArray(data) ? data : ((data as any)?.overrides || []);
      setOverrides(list);
    } catch (err) {
      console.error("Failed to load overrides:", err);
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  const handleSendAnswer = async (overrideId: string, questionId: string) => {
    const draftKey = `${overrideId}_${questionId}`;
    const answer = (answerDrafts[draftKey] || "").trim();
    if (!answer) return;

    setSubmittingAnswerId(draftKey);
    try {
      await api.answerAdminQuestion(overrideId, questionId, answer);
      setFeedback("Your answer was submitted to the admin team.");
      setAnswerDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
      await loadOverrides();
    } catch (err: any) {
      setFeedback(err?.message || "Failed to submit answer. Please try again.");
    } finally {
      setSubmittingAnswerId(null);
    }
  };

  const safeOverrides = Array.isArray(overrides) ? overrides : [];

  const filteredOverrides = safeOverrides.filter((item) => {
    if (!item) return false;
    if (categoryFilter !== "all" && item.reason_category !== categoryFilter) {
      return false;
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchCandidate = item.candidate_name?.toLowerCase().includes(query);
      const matchJob = item.job_title?.toLowerCase().includes(query);
      const matchReason = item.reason?.toLowerCase().includes(query);
      return Boolean(matchCandidate || matchJob || matchReason);
    }
    return true;
  });

  const getCategoryLabel = (catVal?: string) => {
    if (!catVal) return "General Override";
    const found = OVERRIDE_REASON_CATEGORIES.find((c) => c.value === catVal);
    return found ? found.label : catVal.replace(/_/g, " ");
  };

  const getReviewStatusInfo = (item: HROverrideEvent) => {
    const pendingQuestion = item.questions?.some((q) => !q.answer);
    if (pendingQuestion) {
      return {
        label: "Question from Admin",
        style: "bg-[rgba(221,112,11,0.2)] text-[#DD700B] border-[#DD700B]/50",
        hasPendingQuestion: true,
      };
    }
    if (item.reviewed_by_admin) {
      return {
        label: "Reviewed",
        style: "bg-[rgba(143,209,158,0.2)] text-[#8FD19E] border-[#8FD19E]/30",
        hasPendingQuestion: false,
      };
    }
    return {
      label: "Not reviewed",
      style: "bg-[#1E201E] text-[#8A8B82] border-[#8A8B82]/20",
      hasPendingQuestion: false,
    };
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D9DADF] flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-[#DD700B]" />
            Override Accountability Trail
          </h1>
          <p className="text-xs text-[#8A8B82] mt-1">
            History of sovereign deviations, manual score adjustments, and status overrides with administration review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8A8B82] bg-[#242724] px-3 py-1.5 rounded-xl border border-[#D9DADF]/10">
            Total Overrides: <strong className="text-[#DD700B]">{overrides.length}</strong>
          </span>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[rgba(221,112,11,0.12)] border border-[#DD700B]/30 text-xs text-[#DD700B] flex items-center justify-between">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#DD700B] hover:text-[#D9DADF] font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="neu-raised rounded-2xl p-4 bg-[#242724] border border-[#D9DADF]/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#8A8B82] shrink-0" />
          <input
            type="text"
            placeholder="Search candidate, job title, or override rationale..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] px-3 py-2 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#8A8B82]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="neu-inset bg-[#1E201E] text-xs text-[#D9DADF] px-3 py-2 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B] cursor-pointer"
          >
            <option value="all">All Reason Categories</option>
            {OVERRIDE_REASON_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overrides List */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center text-xs text-[#8A8B82]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
            Loading override ledger...
          </div>
        </div>
      ) : filteredOverrides.length === 0 ? (
        <NeuCard variant="raised" className="p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-[#8A8B82] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-[#D9DADF]">No Override Events Found</h3>
          <p className="text-xs text-[#8A8B82] mt-1 max-w-sm mx-auto">
            {overrides.length === 0
              ? "You have not recorded any manual score adjustments, status overrides, or AI recommendation divergences yet."
              : "No overrides match your search or category filter criteria."}
          </p>
        </NeuCard>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOverrides.map((item) => {
            const statusInfo = getReviewStatusInfo(item);
            const isHighlighted = statusInfo.hasPendingQuestion;

            return (
              <div
                key={item.id}
                className={`neu-raised rounded-2xl p-5 border transition-all ${
                  isHighlighted
                    ? "border-[#DD700B] bg-[rgba(221,112,11,0.05)] ring-1 ring-[#DD700B]/40"
                    : "border-[#D9DADF]/10 bg-[#2A2D2A]"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#8A8B82]/20">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/hr/candidates/${item.candidate_id}`}
                        className="text-sm font-bold text-[#D9DADF] hover:text-[#DD700B] flex items-center gap-1 transition-colors"
                      >
                        {item.candidate_name || "Candidate"}
                        <ExternalLink className="w-3 h-3 text-[#8A8B82]" />
                      </Link>
                      <span className="text-xs text-[#8A8B82]">&bull;</span>
                      <Link
                        href={`/hr/jobs/${item.job_id}`}
                        className="text-xs text-[#8A8B82] hover:text-[#D9DADF] transition-colors"
                      >
                        {item.job_title || "Job Requisition"}
                      </Link>
                    </div>
                    <span className="text-[11px] text-[#8A8B82] mt-0.5 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${statusInfo.style}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Change details & Reason */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* What Changed */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-[#8A8B82] uppercase tracking-wider">
                      Action Type & Delta
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-[#1E201E] text-[#D9DADF] px-2 py-1 rounded border border-[#8A8B82]/20">
                        {item.from_value || "—"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#DD700B] shrink-0" />
                      <span className="font-mono text-xs bg-[#1E201E] text-[#DD700B] font-bold px-2 py-1 rounded border border-[#DD700B]/30">
                        {item.to_value || item.override_type || "Override"}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8A8B82] capitalize">
                      {(item.override_type || "override").replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Reason Category */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-[#8A8B82] uppercase tracking-wider">
                      Reason Category
                    </span>
                    <span className="inline-block text-xs font-medium text-[#D9DADF] bg-[#1E201E] px-2.5 py-1 rounded-lg border border-[#8A8B82]/20 w-fit">
                      {getCategoryLabel(item.reason_category)}
                    </span>
                  </div>

                  {/* Justification Text */}
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <span className="text-[10px] font-semibold text-[#8A8B82] uppercase tracking-wider">
                      Recruiter Justification
                    </span>
                    <p className="text-xs text-[#D9DADF] bg-[#1E201E]/60 p-2.5 rounded-xl border border-[#8A8B82]/15 leading-relaxed italic">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Admin Questions Section */}
                {item.questions && item.questions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#8A8B82]/20 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#DD700B]">
                      <MessageSquare className="w-4 h-4" />
                      <span>Admin Review Inquiries ({item.questions.length})</span>
                    </div>

                    {item.questions.map((q) => {
                      const draftKey = `${item.id}_${q.id}`;
                      const draft = answerDrafts[draftKey] ?? "";
                      const isSubmitting = submittingAnswerId === draftKey;

                      return (
                        <div
                          key={q.id}
                          className="neu-inset rounded-xl p-3.5 bg-[#202320] border border-[#DD700B]/30 flex flex-col gap-2.5"
                        >
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#DD700B] tracking-wider">
                              Question from Administration:
                            </span>
                            <p className="text-xs text-[#D9DADF] mt-0.5 font-medium">
                              {q.question}
                            </p>
                            <span className="text-[10px] text-[#8A8B82] font-mono">
                              Asked on {q.asked_at ? new Date(q.asked_at).toLocaleString() : "Recently"}
                            </span>
                          </div>

                          {q.answer ? (
                            <div className="pt-2 border-t border-[#8A8B82]/20">
                              <span className="text-[10px] uppercase font-bold text-[#8FD19E] tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-[#8FD19E]" /> Your Response:
                              </span>
                              <p className="text-xs text-[#D9DADF] mt-0.5 leading-relaxed">
                                {q.answer}
                              </p>
                              {q.answered_at && (
                                <span className="text-[10px] text-[#8A8B82] font-mono">
                                  Answered on {new Date(q.answered_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-[#8A8B82]/20 flex flex-col gap-2">
                              <label className="text-[10px] uppercase font-semibold text-[#DD700B] tracking-wider">
                                Provide Response (up to 1000 characters):
                              </label>
                              <textarea
                                rows={2}
                                value={draft}
                                onChange={(e) =>
                                  setAnswerDrafts((prev) => ({
                                    ...prev,
                                    [draftKey]: e.target.value,
                                  }))
                                }
                                placeholder="State your clarification or further details for admin review..."
                                className="neu-inset text-xs text-[#D9DADF] p-2.5 rounded-xl bg-[#1A1C1A] border border-[#8A8B82]/30 focus:outline-none focus:ring-1 focus:ring-[#DD700B] resize-none"
                                maxLength={1000}
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-[#8A8B82]">
                                  {draft.length} / 1000 chars
                                </span>
                                <NeuButton
                                  size="sm"
                                  variant="primary"
                                  disabled={!draft.trim() || isSubmitting}
                                  onClick={() => handleSendAnswer(item.id, q.id)}
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  {isSubmitting ? "Sending..." : "Send answer"}
                                </NeuButton>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
