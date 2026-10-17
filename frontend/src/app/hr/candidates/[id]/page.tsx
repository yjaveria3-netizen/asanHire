"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Candidate, EvaluationReport, ProctoringEvent, AuditLog, CandidateStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { NeuModal } from "@/components/neu/NeuModal";
import { DecisionModal } from "@/components/hr/DecisionModal";
import { ScoreOverrideForm } from "@/components/hr/ScoreOverrideForm";
import { AuditTrail } from "@/components/hr/AuditTrail";
import { EmailPreview } from "@/components/hr/EmailPreview";
import { StatusSelect } from "@/components/hr/StatusSelect";
import { OverrideModal } from "@/components/hr/OverrideModal";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Shield,
  Bot,
  Sparkles,
  RotateCcw,
  RefreshCw,
  Send,
  XCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  MessageSquare,
  Lock,
} from "lucide-react";

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = (params?.id as string) || "demo-cand-id";

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionPreset, setDecisionPreset] = useState<"Hire" | "Reject" | "Hold">("Hire");
  const [isStatusOverrideOpen, setIsStatusOverrideOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CandidateStatus>("shortlisted");
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [isCancelInviteModalOpen, setIsCancelInviteModalOpen] = useState(false);
  const [showExtractedResume, setShowExtractedResume] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load candidate dossier
  useEffect(() => {
    api.getHRCandidateDetail(candidateId).then((data) => {
      setCandidate(data);
      if (data?.status) setTargetStatus(data.status);
      setLoading(false);
    });
  }, [candidateId]);

  // Decision Modal Handler
  const handleDecisionConfirm = async (
    decision: "Hire" | "Reject" | "Hold",
    sendEmail: boolean,
    notes: string,
    reasonCategory?: string
  ) => {
    await api.submitDecision(candidateId, decision, sendEmail, notes, reasonCategory);
    const newStatus = decision === "Hire" ? "hired" : decision === "Reject" ? "rejected" : "on_hold";
    setCandidate((prev: any) => ({
      ...prev,
      status: newStatus,
      hr_notes: notes,
    }));
    setActionFeedback(
      `Decision recorded: ${decision.toUpperCase()}. Notification email ${
        sendEmail ? "dispatched via Resend" : "suppressed"
      }. Override accountability logged.`
    );
  };

  // Score Override Handler
  const handleScoreOverride = async (newScore: number, reason: string, reasonCategory: string) => {
    await api.overrideScore(candidateId, newScore, reason, reasonCategory);
    setCandidate((prev: any) => ({
      ...prev,
      manual_score_override: newScore,
      hr_score_override: newScore,
      override_reason: reason,
    }));
    setActionFeedback(`Score adjusted to ${newScore.toFixed(1)}%. Sovereign HR override audit logged.`);
  };

  // Status Override Handler
  const handleStatusOverrideConfirm = async (category: string, reason: string) => {
    await api.overrideStatus(candidateId, targetStatus, reason, category);
    setCandidate((prev: any) => ({ ...prev, status: targetStatus }));
    setIsStatusOverrideOpen(false);
    setActionFeedback(`Status updated to ${targetStatus}. Justification written to immutable override trail.`);
  };

  // Sovereign Action Handlers
  const handleAllowRetryConfirm = async (category: string, reason: string) => {
    await api.allowRetry(candidateId, reason, category);
    setCandidate((prev: any) => ({ ...prev, status: "invited" }));
    setIsRetryModalOpen(false);
    setActionFeedback("Interview session reset and re-authorized with fresh 48h token. Override logged.");
  };

  const handleCancelInviteConfirm = async (category: string, reason: string) => {
    await api.cancelInvite(candidateId, reason, category);
    setCandidate((prev: any) => ({ ...prev, status: "shortlisted" }));
    setIsCancelInviteModalOpen(false);
    setActionFeedback("Interview token voided. Candidate reverted to shortlisted status. Override logged.");
  };

  const handleRegenerateReport = async () => {
    setActionFeedback("Supervisor Agent (Gemini) triggered to re-synthesize evaluation dossier...");
    await api.regenerateReport(candidateId);
    // Reload candidate detail
    const updated = await api.getHRCandidateDetail(candidateId);
    setCandidate(updated);
    setActionFeedback("Supervisor evaluation report regenerated successfully.");
  };

  const openDecisionWithPreset = (preset: "Hire" | "Reject" | "Hold") => {
    setDecisionPreset(preset);
    setIsDecisionOpen(true);
  };

  if (loading || !candidate) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#8A8B82] text-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
          Loading candidate dossier and telemetry...
        </div>
      </div>
    );
  }

  const effectiveScore =
    candidate.hr_score_override ??
    candidate.manual_score_override ??
    candidate.resume_score ??
    candidate.ai_score ??
    0;

  const isDecided = ["hired", "rejected", "on_hold"].includes(candidate.status);
  const report: EvaluationReport | undefined = candidate.evaluation_report;
  const proctoring: ProctoringEvent[] = candidate.proctoring_events || [];
  const auditLogs: AuditLog[] = candidate.audit_logs || [];
  const interviewData = candidate.interview || {};
  const transcriptTurns = interviewData.transcript || [];
  const transcriptScores = interviewData.scores || [];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/hr/jobs/${candidate.job_id}`}>
              <NeuButton size="sm" variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-1" /> Requisition Board
              </NeuButton>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#D9DADF]">
                  {candidate.full_name || candidate.name || "Candidate Dossier"}
                </h1>
                <NeuBadge status={candidate.status} />
              </div>
              <p className="text-xs text-[#8A8B82] mt-0.5">
                Applied: {new Date(candidate.created_at || Date.now()).toLocaleDateString()} &bull; Candidate ID:{" "}
                <span className="font-mono text-[11px] text-[#8A8B82]">{candidate.id.slice(0, 8)}...</span>
              </p>
            </div>
          </div>

          {/* Quick Print & Override Buttons */}
          <div className="flex items-center gap-2">
            <NeuButton size="sm" variant="ghost" onClick={() => window.print()}>
              Print Dossier
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={() => setIsStatusOverrideOpen(true)}>
              Override Status
            </NeuButton>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="p-3.5 rounded-xl bg-[rgba(221,112,11,0.12)] border border-[#DD700B]/30 text-xs text-[#DD700B] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8FD19E]" /> {actionFeedback}
            </span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-[#DD700B] hover:text-[#D9DADF] font-bold ml-4 text-sm"
            >
              &times;
            </button>
          </div>
        )}

        {/* Candidate Workflow Stage (Mini 6-Step Stepper) */}
        {candidate.stage && (
          <div className="neu-raised rounded-xl p-4 bg-[#1E201E] border border-[rgba(217,218,223,0.06)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-[#D9DADF]">
                  Candidate Pipeline Stage:
                </span>
                <span className="px-2 py-0.5 rounded font-medium bg-[#2A2D2A] text-[#DD700B] border border-[#DD700B]/30">
                  Step {candidate.stage.step}: {candidate.stage.label}
                </span>
              </div>
              <span className="text-[#8A8B82]">
                {candidate.stage.detail}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {[
                { num: 1, name: "Rubric" },
                { num: 2, name: "Scored" },
                { num: 3, name: "Invite" },
                { num: 4, name: "Interview" },
                { num: 5, name: "Report" },
                { num: 6, name: "Decision" },
              ].map((s) => {
                const isCurrent = candidate.stage.step === s.num;
                const isPast = candidate.stage.step > s.num;

                let borderStyle = "border-[rgba(217,218,223,0.08)] bg-[#242624]";
                let textStyle = "text-[#8A8B82]";
                let dot = <span className="w-1.5 h-1.5 rounded-full bg-[#8A8B82]/50" />;

                if (isPast) {
                  borderStyle = "border-[#8FD19E]/30 bg-[#2A2D2A]";
                  textStyle = "text-[#8FD19E]";
                  dot = <CheckCircle2 className="w-3 h-3 text-[#8FD19E]" />;
                } else if (isCurrent) {
                  borderStyle = "border-[#DD700B] bg-[#2A2D2A] ring-1 ring-[#DD700B]/50";
                  textStyle = "text-[#DD700B] font-semibold";
                  dot = <span className="w-2 h-2 rounded-full bg-[#DD700B] motion-safe:animate-pulse" />;
                }

                return (
                  <div
                    key={s.num}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md border text-center select-none ${borderStyle}`}
                    title={`Step ${s.num}: ${s.name}`}
                  >
                    {dot}
                    <span className={`text-[11px] truncate ${textStyle}`}>
                      {s.num}. {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PROMPT INJECTION WARNING BANNER (If Flagged) */}
      {candidate.injection_suspected && (
        <div className="p-4 rounded-xl bg-[rgba(90,42,42,0.3)] border border-[#E57373]/50 flex items-start gap-3 text-xs text-[#E57373]">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-sm text-[#E57373]">
              Prompt Injection Attempt Suspected
            </h4>
            <p className="leading-relaxed text-[#D9DADF]/90">
              The automated Resume Matcher or Guardian Agent flagged potential prompt injection instructions inside this candidate&apos;s submission (e.g. phrases instructing the AI to ignore instructions or award arbitrary scores). Scores have been clamped and calculated without modification, but human recruiter verification is strongly advised before advancing.
            </p>
          </div>
        </div>
      )}

      {/* PRIMARY ACTION BAR (Hire, Reject, Hold & Undo) */}
      <NeuCard variant="raised" className="p-5 border-l-4 border-l-[#DD700B]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#D9DADF] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#DD700B]" /> Sovereign Decision Actions
            </h3>
            <p className="text-xs text-[#8A8B82] mt-0.5">
              Current state: <strong className="text-[#DD700B] uppercase">{candidate.status}</strong>. Decisions record full audit rationale and optionally dispatch templated candidate notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isDecided ? (
              <>
                <NeuButton
                  size="md"
                  variant="primary"
                  onClick={() => openDecisionWithPreset("Hire")}
                  className="bg-[#8FD19E] text-[#1E201E] hover:bg-[#8FD19E]/90"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Extend Offer (Hire)
                </NeuButton>
                <NeuButton
                  size="md"
                  variant="secondary"
                  onClick={() => openDecisionWithPreset("Hold")}
                >
                  <Clock className="w-4 h-4 mr-1.5 text-[#FCF8D8]" /> Put On Hold
                </NeuButton>
                <NeuButton
                  size="md"
                  variant="danger"
                  onClick={() => openDecisionWithPreset("Reject")}
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject Candidate
                </NeuButton>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#8FD19E] bg-[#8FD19E]/10 px-3 py-1.5 rounded-lg border border-[#8FD19E]/20">
                  Decided: {candidate.status.toUpperCase()}
                </span>
                <NeuButton
                  size="md"
                  variant="secondary"
                  onClick={() =>
                    openDecisionWithPreset(
                      candidate.status === "hired" ? "Hold" : candidate.status === "rejected" ? "Hire" : "Hire"
                    )
                  }
                  className="border-[#DD700B]/40 text-[#DD700B]"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Undo / Change Decision
                </NeuButton>
              </div>
            )}
          </div>
        </div>
      </NeuCard>

      {/* High-Level Candidate Dossier Metrics Card */}
      <NeuCard variant="raised" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Contact Info */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
              Contact Information
            </span>
            <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
              <Mail className="w-3.5 h-3.5 text-[#DD700B]" /> {candidate.email || "Confidential"}
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
                <Phone className="w-3.5 h-3.5 text-[#DD700B]" /> {candidate.phone}
              </div>
            )}
            <div className="pt-2 flex flex-col gap-1.5">
              {candidate.resume_url ? (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#DD700B] hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" /> Download Uploaded Resume (PDF)
                </a>
              ) : (
                <span className="text-xs text-[#8A8B82] italic">Resume uploaded as text</span>
              )}
              <button
                type="button"
                onClick={() => setShowExtractedResume(!showExtractedResume)}
                className="text-left text-xs text-[#8A8B82] hover:text-[#D9DADF] flex items-center gap-1"
              >
                {showExtractedResume ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showExtractedResume ? "Hide extracted text" : "View parsed resume text"}
              </button>
            </div>
          </div>

          {/* AI Match Score */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[#242724]">
            <span className="text-xs text-[#8A8B82]">AI Match Score</span>
            <span className="text-2xl font-bold font-mono text-[#D9DADF]">
              {(candidate.ai_score ?? candidate.resume_score ?? 0).toFixed(0)}%
            </span>
            <span className="text-[10px] text-[#8A8B82]">Weighted Rubric Match</span>
          </div>

          {/* Effective Score */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[#242724]">
            <span className="text-xs text-[#8A8B82]">Effective Score</span>
            <span className="text-2xl font-bold font-mono text-[#DD700B]">
              {effectiveScore.toFixed(0)}%
            </span>
            <span className="text-[10px] text-[#DD700B]">
              {candidate.hr_score_override !== undefined && candidate.hr_score_override !== null
                ? "HR Override Active"
                : "Automated AI Match"}
            </span>
          </div>

          {/* Guardian Trust Score */}
          <div className="flex flex-col gap-1 p-3.5 rounded-xl bg-[#242724]">
            <span className="text-xs text-[#8A8B82]">Proctoring Trust Score</span>
            <span className="text-2xl font-bold font-mono text-[#8FD19E]">
              {interviewData.trust_score !== undefined ? `${interviewData.trust_score}%` : "100%"}
            </span>
            <span className="text-[10px] text-[#8FD19E]">Integrity Telemetry</span>
          </div>
        </div>

        {/* Collapsible Extracted Resume Text Box */}
        {showExtractedResume && (
          <div className="mt-5 pt-4 border-t border-[#8A8B82]/15">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82] block mb-2">
              Parsed Resume Plain Text
            </span>
            <div className="neu-inset p-4 rounded-xl bg-[#202320] max-h-60 overflow-y-auto text-xs text-[#D9DADF] font-mono leading-relaxed whitespace-pre-wrap">
              {candidate.resume_text || "No parsed resume text on file."}
            </div>
          </div>
        )}
      </NeuCard>

      {/* Secondary Management Actions: Allow Retry, Cancel Invite, Regenerate Report */}
      <NeuCard variant="raised" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            Candidate Workflow Controls:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <NeuButton size="sm" variant="secondary" onClick={() => setIsRetryModalOpen(true)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#FCF8D8]" /> Allow Retry
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={() => setIsCancelInviteModalOpen(true)}>
              <XCircle className="w-3.5 h-3.5 mr-1 text-[#E57373]" /> Cancel Invite
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={handleRegenerateReport}>
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#8FD19E]" /> Regenerate Report
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {/* Score Override Form */}
      <ScoreOverrideForm
        currentScore={effectiveScore}
        onSaveOverride={handleScoreOverride}
      />

      {/* AI SUPERVISOR REPORT (CLEARLY LABELED ADVISORY) */}
      <NeuCard variant="raised" className="p-6 border-l-4 border-l-[#DD700B]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#8A8B82]/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#DD700B]" />
            <h3 className="text-base font-bold text-[#D9DADF]">
              AI Evaluation Supervisor Synthesis
            </h3>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#FCF8D8]/20 text-[#FCF8D8] border border-[#FCF8D8]/40 uppercase">
              Advisory Only &bull; Human Discretion
            </span>
          </div>

          {report && (
            <span
              className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                report.recommendation?.toLowerCase() === "advance" ||
                report.recommendation?.toLowerCase() === "hire"
                  ? "bg-[#8FD19E]/20 text-[#8FD19E] border-[#8FD19E]/40"
                  : report.recommendation?.toLowerCase() === "reject"
                  ? "bg-[#E57373]/20 text-[#E57373] border-[#E57373]/40"
                  : "bg-[#FCF8D8]/20 text-[#FCF8D8] border-[#FCF8D8]/40"
              }`}
            >
              Supervisor Recommendation: {report.recommendation?.toUpperCase() || "HOLD"}
            </span>
          )}
        </div>

        {report ? (
          <div className="flex flex-col gap-5">
            <div className="neu-inset p-4 rounded-xl bg-[#202320] text-sm text-[#D9DADF] leading-relaxed italic">
              &ldquo;{report.summary}&rdquo;
            </div>

            {/* Strengths & Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#242724] border border-[#8FD19E]/20">
                <h4 className="text-xs font-bold uppercase text-[#8FD19E] mb-2">
                  Verified Candidate Strengths
                </h4>
                <ul className="list-disc list-inside text-xs text-[#D9DADF] flex flex-col gap-1.5">
                  {(report.strengths || report.key_strengths || ["Strong technical foundation"]).map(
                    (s: string, idx: number) => (
                      <li key={idx}>{s}</li>
                    )
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#242724] border border-[#E57373]/20">
                <h4 className="text-xs font-bold uppercase text-[#E57373] mb-2">
                  Gaps & Areas to Verify
                </h4>
                <ul className="list-disc list-inside text-xs text-[#D9DADF] flex flex-col gap-1.5">
                  {(report.weaknesses || report.red_flags || ["No critical red flags recorded."]).map(
                    (w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#8A8B82] italic">
            Interview report pending. The Supervisor Agent will generate an evaluation summary upon interview completion.
          </p>
        )}
      </NeuCard>

      {/* INTERVIEW TRANSCRIPT WITH PER-ANSWER SCORES */}
      <NeuCard variant="raised" className="p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#8A8B82]/20">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#DD700B]" />
            <h3 className="text-sm font-bold text-[#D9DADF]">
              Interview Transcript & Per-Answer Scoring
            </h3>
          </div>
          <span className="text-xs font-mono text-[#8A8B82]">
            {transcriptTurns.length > 0 ? `${Math.ceil(transcriptTurns.length / 2)} Questions` : "No turns yet"}
          </span>
        </div>

        {transcriptTurns.length === 0 ? (
          <p className="text-xs text-[#8A8B82] italic">
            No interview transcript recorded yet. As the candidate completes technical screening questions, turns and per-answer ratings will appear here.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {transcriptTurns.map((turn: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-xl text-xs flex flex-col gap-2 ${
                  turn.speaker === "agent"
                    ? "bg-[#202320] border border-[#8A8B82]/10"
                    : "neu-inset bg-[#1E201E] border border-[#DD700B]/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold uppercase tracking-wider text-[11px] ${
                      turn.speaker === "agent" ? "text-[#DD700B]" : "text-[#8FD19E]"
                    }`}
                  >
                    {turn.speaker === "agent" ? "AI Interviewer (Groq)" : "Candidate Response"}
                  </span>
                  {turn.speaker === "candidate" && transcriptScores[idx] && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#8FD19E]/10 text-[#8FD19E] border border-[#8FD19E]/20">
                      Score: {transcriptScores[idx].score || transcriptScores[idx]}/10
                    </span>
                  )}
                </div>
                <p className="text-[#D9DADF] leading-relaxed whitespace-pre-wrap">
                  {turn.message || turn.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </NeuCard>

      {/* PROCTORING TELEMETRY LOG & IMMUTABLE AUDIT TRAIL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proctoring Log */}
        <NeuCard variant="raised" className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#8A8B82]/20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#DD700B]" />
              <h4 className="text-sm font-semibold text-[#D9DADF]">Guardian Proctoring Feed</h4>
            </div>
            <span className="text-xs font-mono text-[#8FD19E]">
              Trust: {interviewData.trust_score !== undefined ? `${interviewData.trust_score}%` : "100%"}
            </span>
          </div>

          {proctoring.length === 0 ? (
            <p className="text-xs text-[#8A8B82] italic">Zero telemetry infractions recorded.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {proctoring.map((evt: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#D9DADF] capitalize">
                      {(evt.type || evt.event_type || "Event").replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-[#8A8B82]">
                      {evt.detail || evt.payload?.note || "Telemetry recorded"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#E57373]">
                    -{evt.penalty || 5} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </NeuCard>

        {/* Immutable Audit Trail */}
        <AuditTrail logs={auditLogs} />
      </div>

      {/* DECISION MODAL (Hire, Reject, Hold + Undo with reason, override categories & email preview) */}
      <DecisionModal
        isOpen={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
        candidateId={candidateId}
        candidateName={candidate.full_name || candidate.name || "Candidate"}
        currentStatus={candidate.status}
        aiRecommendation={report?.recommendation}
        initialDecision={decisionPreset}
        onConfirm={handleDecisionConfirm}
      />

      {/* STATUS OVERRIDE MODAL */}
      <OverrideModal
        isOpen={isStatusOverrideOpen}
        onClose={() => setIsStatusOverrideOpen(false)}
        title="Why are you overriding candidate status?"
        changeDescription={`Status change: ${candidate.status} → ${targetStatus}`}
        fromValue={candidate.status}
        toValue={targetStatus}
        confirmLabel="Override and save status"
        onConfirm={handleStatusOverrideConfirm}
      >
        <div className="flex flex-col gap-1.5 pb-2">
          <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
            Target Status <span className="text-[#DD700B]">*</span>
          </label>
          <StatusSelect value={targetStatus} onChange={setTargetStatus} />
        </div>
      </OverrideModal>

      {/* ALLOW RETRY OVERRIDE MODAL */}
      <OverrideModal
        isOpen={isRetryModalOpen}
        onClose={() => setIsRetryModalOpen(false)}
        title="Authorize Interview Retry"
        changeDescription="Granting candidate a fresh 48-hour interview attempt session"
        fromValue={candidate.status}
        toValue="invited"
        defaultCategory="technical_issue"
        confirmLabel="Override and authorize retry"
        onConfirm={handleAllowRetryConfirm}
      />

      {/* CANCEL INVITE OVERRIDE MODAL */}
      <OverrideModal
        isOpen={isCancelInviteModalOpen}
        onClose={() => setIsCancelInviteModalOpen(false)}
        title="Cancel Interview Invitation"
        changeDescription="Revoking candidate active interview invitation link and reverting to shortlisted"
        fromValue="invited"
        toValue="shortlisted"
        defaultCategory="recruiter_discretion"
        confirmLabel="Override and cancel invite"
        onConfirm={handleCancelInviteConfirm}
      />
    </div>
  );
}
