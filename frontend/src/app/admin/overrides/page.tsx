"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { HROverrideEvent } from "@/lib/types";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuModal } from "@/components/neu/NeuModal";
import { OVERRIDE_REASON_CATEGORIES } from "@/lib/constants";
import {
  ShieldAlert,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Send,
  Eye,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminOverridesPage() {
  const [overrides, setOverrides] = useState<HROverrideEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed" | "questions">("all");
  const [onlyWorthALook, setOnlyWorthALook] = useState(false);

  // Selected item for review modal
  const [selectedOverride, setSelectedOverride] = useState<HROverrideEvent | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchOverrides = async () => {
    try {
      const data = await api.getAdminOverrides();
      setOverrides(data);
    } catch (err) {
      console.error("Failed to load admin overrides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverrides();
  }, []);

  const handleMarkReviewed = async (overrideId: string) => {
    setSubmittingAction(true);
    try {
      await api.reviewAdminOverride(overrideId);
      setFeedback("Override event marked as reviewed.");
      await fetchOverrides();
      if (selectedOverride?.id === overrideId) {
        setSelectedOverride((prev: any) => ({
          ...prev,
          reviewed_by_admin: true,
          reviewed_at: new Date().toISOString(),
        }));
      }
    } catch (err: any) {
      setFeedback(err?.message || "Failed to mark as reviewed.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAskQuestion = async (overrideId: string) => {
    const qText = newQuestion.trim();
    if (!qText) return;

    setSubmittingAction(true);
    try {
      await api.askAdminOverrideQuestion(overrideId, qText);
      setFeedback("Inquiry dispatched to recruiter's override portal.");
      setNewQuestion("");
      await fetchOverrides();
      // Update selected item in modal
      const updatedList = await api.getAdminOverrides();
      const match = updatedList.find((o) => o.id === overrideId);
      if (match) setSelectedOverride(match);
    } catch (err: any) {
      setFeedback(err?.message || "Failed to send inquiry to recruiter.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getCategoryLabel = (catVal: string) => {
    const found = OVERRIDE_REASON_CATEGORIES.find((c) => c.value === catVal);
    return found ? found.label : catVal.replace("_", " ");
  };

  const filteredOverrides = overrides.filter((item) => {
    if (categoryFilter !== "all" && item.reason_category !== categoryFilter) {
      return false;
    }
    if (onlyWorthALook && !item.worth_a_look) {
      return false;
    }
    if (statusFilter === "pending" && (item.reviewed_by_admin || (item.questions && item.questions.length > 0))) {
      return false;
    }
    if (statusFilter === "reviewed" && !item.reviewed_by_admin) {
      return false;
    }
    if (statusFilter === "questions" && (!item.questions || item.questions.length === 0)) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCand = item.candidate_name?.toLowerCase().includes(q);
      const matchEmail = item.hr_email?.toLowerCase().includes(q);
      const matchJob = item.job_title?.toLowerCase().includes(q);
      const matchReason = item.reason?.toLowerCase().includes(q);
      return matchCand || matchEmail || matchJob || matchReason;
    }
    return true;
  });

  const worthALookCount = overrides.filter((o) => o.worth_a_look).length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#D9DADF] flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-[#DD700B]" />
            Administrative Override Supervision
          </h1>
          <p className="text-xs text-[#8A8B82] mt-1">
            Audit sovereign recruiter decisions, review justifications, and dispatch compliance inquiries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8A8B82] bg-[#242724] px-3 py-1.5 rounded-xl border border-[#D9DADF]/10">
            Total Overrides: <strong className="text-[#DD700B]">{overrides.length}</strong>
          </span>
          {worthALookCount > 0 && (
            <span className="text-xs font-mono text-[#DD700B] bg-[rgba(221,112,11,0.15)] px-3 py-1.5 rounded-xl border border-[#DD700B]/30 font-semibold">
              Worth a Look: {worthALookCount}
            </span>
          )}
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
        {/* Search */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#8A8B82] shrink-0" />
          <input
            type="text"
            placeholder="Search candidate name, recruiter email, job title, or rationale..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="neu-inset w-full bg-[#1E201E] text-xs text-[#D9DADF] px-3 py-2 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B]"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="neu-inset bg-[#1E201E] text-xs text-[#D9DADF] px-3 py-2 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B] cursor-pointer"
          >
            <option value="all">All Categories</option>
            {OVERRIDE_REASON_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="neu-inset bg-[#1E201E] text-xs text-[#D9DADF] px-3 py-2 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="questions">Has Inquiries</option>
          </select>

          {/* Worth a Look Toggle */}
          <button
            onClick={() => setOnlyWorthALook(!onlyWorthALook)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              onlyWorthALook
                ? "bg-[rgba(221,112,11,0.25)] border-[#DD700B] text-[#DD700B] neu-inset"
                : "bg-[#1E201E] border-[#8A8B82]/20 text-[#8A8B82] hover:text-[#D9DADF]"
            }`}
          >
            Worth a Look ({worthALookCount})
          </button>
        </div>
      </div>

      {/* Overrides Table */}
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center text-xs text-[#8A8B82]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
            Loading override logs...
          </div>
        </div>
      ) : filteredOverrides.length === 0 ? (
        <NeuCard variant="raised" className="p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-[#8A8B82] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-[#D9DADF]">No Override Events</h3>
          <p className="text-xs text-[#8A8B82] mt-1">No overrides match your current filter selection.</p>
        </NeuCard>
      ) : (
        <div className="neu-raised rounded-2xl overflow-hidden border border-[#D9DADF]/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#D9DADF]">
              <thead className="bg-[#242724] border-b border-[#8A8B82]/20 uppercase tracking-wider text-[11px] text-[#8A8B82]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Date & Recruiter</th>
                  <th className="px-5 py-3.5 font-semibold">Candidate & Job</th>
                  <th className="px-5 py-3.5 font-semibold">Action Delta</th>
                  <th className="px-5 py-3.5 font-semibold">Category & Reason</th>
                  <th className="px-5 py-3.5 font-semibold">Supervision</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/60">
                {filteredOverrides.map((item) => {
                  const hasQuestions = item.questions && item.questions.length > 0;
                  const hasUnansweredQuestion = item.questions?.some((q) => !q.answer);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#2A2D2A] transition-colors ${
                        item.worth_a_look ? "bg-[rgba(221,112,11,0.03)]" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono text-[11px] text-[#8A8B82]">
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                        <div className="font-semibold text-sm text-[#D9DADF] mt-0.5">
                          {item.hr_email || "Recruiter"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm text-[#D9DADF]">
                          {item.candidate_name || "Confidential Candidate"}
                        </div>
                        <div className="text-[11px] text-[#8A8B82] mt-0.5 truncate max-w-[200px]">
                          {item.job_title || "Job Requisition"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="bg-[#1E201E] px-2 py-0.5 rounded border border-[#8A8B82]/20">
                            {item.from_value || "—"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-[#DD700B] shrink-0" />
                          <span className="bg-[#1E201E] text-[#DD700B] font-bold px-2 py-0.5 rounded border border-[#DD700B]/30">
                            {item.to_value || item.override_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8A8B82] capitalize mt-1 block">
                          {item.override_type.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold bg-[#1E201E] px-2 py-0.5 rounded border border-[#8A8B82]/20 text-[#D9DADF]">
                            {getCategoryLabel(item.reason_category)}
                          </span>
                        </div>
                        <p className="text-xs text-[#8A8B82] italic line-clamp-2">
                          &ldquo;{item.reason}&rdquo;
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          {item.worth_a_look && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(221,112,11,0.2)] text-[#DD700B] border border-[#DD700B]/40">
                              <AlertTriangle className="w-3 h-3" /> Worth a Look
                            </span>
                          )}

                          {item.reviewed_by_admin ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#8FD19E] bg-[#8FD19E]/10 px-2 py-0.5 rounded border border-[#8FD19E]/20">
                              <CheckCircle2 className="w-3 h-3" /> Reviewed
                            </span>
                          ) : hasQuestions ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#FCF8D8] bg-[#FCF8D8]/10 px-2 py-0.5 rounded border border-[#FCF8D8]/20">
                              <HelpCircle className="w-3 h-3" />
                              {hasUnansweredQuestion ? "Inquiry Pending" : "Inquiry Answered"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#8A8B82] bg-[#1E201E] px-2 py-0.5 rounded border border-[#8A8B82]/20">
                              <Clock className="w-3 h-3" /> Unreviewed
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <NeuButton
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedOverride(item)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                        </NeuButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Drawer / Modal */}
      {selectedOverride && (
        <NeuModal
          isOpen={Boolean(selectedOverride)}
          onClose={() => {
            setSelectedOverride(null);
            setNewQuestion("");
          }}
          title="Override Supervision & Audit Dossier"
          description={`Logged override ID: ${selectedOverride.id}`}
          maxWidth="xl"
        >
          <div className="flex flex-col gap-5">
            {/* Worth a Look Warning Banner */}
            {selectedOverride.worth_a_look && (
              <div className="p-3.5 rounded-xl bg-[rgba(221,112,11,0.18)] border border-[#DD700B]/40 flex items-start gap-2.5 text-xs text-[#DD700B]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Advisory Flag (Worth a look):</strong> This action was flagged by rule-based supervision (recruiter override rate &gt;30% with 5+ decisions or candidate overridden repeatedly).
                </div>
              </div>
            )}

            {/* Change Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/15">
                <span className="text-[10px] text-[#8A8B82] uppercase tracking-wider block">Recruiter</span>
                <span className="text-xs font-semibold text-[#D9DADF] font-mono mt-0.5 block truncate">
                  {selectedOverride.hr_email || "Recruiter"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/15">
                <span className="text-[10px] text-[#8A8B82] uppercase tracking-wider block">Candidate</span>
                <span className="text-xs font-semibold text-[#D9DADF] mt-0.5 block truncate">
                  {selectedOverride.candidate_name || "Confidential"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/15">
                <span className="text-[10px] text-[#8A8B82] uppercase tracking-wider block">Requisition</span>
                <span className="text-xs font-semibold text-[#D9DADF] mt-0.5 block truncate">
                  {selectedOverride.job_title || "Job Requisition"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/15">
                <span className="text-[10px] text-[#8A8B82] uppercase tracking-wider block">Timestamp</span>
                <span className="text-xs font-mono text-[#D9DADF] mt-0.5 block">
                  {new Date(selectedOverride.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Delta Details */}
            <div className="p-4 rounded-xl bg-[#242724] border border-[#DD700B]/20 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-[#DD700B] tracking-wider">
                Action Delta ({selectedOverride.override_type.replace(/_/g, " ")})
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm bg-[#1E201E] text-[#D9DADF] px-3 py-1 rounded-lg border border-[#8A8B82]/20">
                  {selectedOverride.from_value || "—"}
                </span>
                <ArrowRight className="w-4 h-4 text-[#DD700B]" />
                <span className="font-mono text-sm bg-[#1E201E] text-[#DD700B] font-bold px-3 py-1 rounded-lg border border-[#DD700B]/30">
                  {selectedOverride.to_value || selectedOverride.override_type}
                </span>
              </div>
            </div>

            {/* Justification Box */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#D9DADF] uppercase tracking-wider">
                  Recruiter Justification
                </span>
                <span className="text-[11px] text-[#DD700B] font-mono bg-[#DD700B]/10 px-2 py-0.5 rounded border border-[#DD700B]/20">
                  Category: {getCategoryLabel(selectedOverride.reason_category)}
                </span>
              </div>
              <div className="neu-inset p-3.5 rounded-xl bg-[#202320] text-xs text-[#D9DADF] italic border border-[#8A8B82]/20 leading-relaxed">
                &ldquo;{selectedOverride.reason}&rdquo;
              </div>
            </div>

            {/* Inquiries & Recruiter Answers */}
            {selectedOverride.questions && selectedOverride.questions.length > 0 && (
              <div className="flex flex-col gap-3 pt-3 border-t border-[#8A8B82]/20">
                <h4 className="text-xs font-bold text-[#D9DADF] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#DD700B]" />
                  Inquiry History ({selectedOverride.questions.length})
                </h4>
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto">
                  {selectedOverride.questions.map((q) => (
                    <div
                      key={q.id}
                      className="neu-inset p-3 rounded-xl bg-[#1E201E] border border-[#8A8B82]/20 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#8A8B82]">
                        <span className="font-bold text-[#DD700B]">Admin Inquiry:</span>
                        <span className="font-mono">{new Date(q.asked_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[#D9DADF] font-medium">{q.question}</p>
                      {q.answer ? (
                        <div className="pt-2 mt-1 border-t border-[#8A8B82]/15">
                          <span className="text-[10px] font-bold text-[#8FD19E]">Recruiter Response:</span>
                          <p className="text-xs text-[#D9DADF] mt-0.5">{q.answer}</p>
                          {q.answered_at && (
                            <span className="text-[9px] font-mono text-[#8A8B82]">
                              Answered {new Date(q.answered_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#FCF8D8] italic">
                          Awaiting recruiter response in HR portal...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ask Recruiter a Question Input */}
            <div className="flex flex-col gap-1.5 pt-3 border-t border-[#8A8B82]/20">
              <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#DD700B]" />
                Ask Recruiter for Clarification
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. Please clarify why the candidate's portfolio links warrant score adjustment..."
                  className="neu-inset flex-1 bg-[#1E201E] text-xs text-[#D9DADF] px-3.5 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-1 focus:ring-[#DD700B]"
                />
                <NeuButton
                  size="sm"
                  variant="secondary"
                  disabled={!newQuestion.trim() || submittingAction}
                  onClick={() => handleAskQuestion(selectedOverride.id)}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Dispatch
                </NeuButton>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-[#8A8B82]/20">
              <NeuButton
                variant="ghost"
                onClick={() => setSelectedOverride(null)}
              >
                Close
              </NeuButton>

              <div className="flex items-center gap-2">
                {!selectedOverride.reviewed_by_admin ? (
                  <NeuButton
                    variant="primary"
                    disabled={submittingAction}
                    onClick={() => handleMarkReviewed(selectedOverride.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {submittingAction ? "Updating..." : "Mark as Reviewed"}
                  </NeuButton>
                ) : (
                  <span className="text-xs text-[#8FD19E] font-medium flex items-center gap-1.5 bg-[#8FD19E]/10 px-3 py-2 rounded-xl border border-[#8FD19E]/20">
                    <CheckCircle2 className="w-4 h-4" /> Reviewed by Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </NeuModal>
      )}
    </div>
  );
}
