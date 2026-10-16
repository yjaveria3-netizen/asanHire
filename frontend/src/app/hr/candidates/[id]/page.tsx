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
} from "lucide-react";

// OWNER: M1 (frontend developer) & M2 (backend engineer)
export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = (params?.id as string) || "22222222-2222-2222-2222-222222222201";

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [isStatusOverrideOpen, setIsStatusOverrideOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CandidateStatus>("shortlisted");
  const [statusReason, setStatusReason] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.getHRCandidateDetail(candidateId).then((data) => {
      setCandidate(data);
      if (data?.status) setTargetStatus(data.status);
      setLoading(false);
    });
  }, [candidateId]);

  const handleDecisionConfirm = async (decision: "Hire" | "Reject" | "Hold", sendEmail: boolean, notes: string) => {
    await api.submitDecision(candidateId, decision, sendEmail, notes);
    const newStatus = decision === "Hire" ? "hired" : decision === "Reject" ? "rejected" : "on_hold";
    setCandidate((prev: any) => ({ ...prev, status: newStatus }));
    setActionFeedback(`Decision recorded: ${decision}. Notification email ${sendEmail ? "sent" : "suppressed"}.`);
  };

  const handleScoreOverride = async (newScore: number, reason: string) => {
    await api.overrideScore(candidateId, newScore, reason);
    setCandidate((prev: any) => ({
      ...prev,
      manual_score_override: newScore,
      override_reason: reason,
    }));
    setActionFeedback(`Score manually adjusted to ${newScore.toFixed(1)}%. Audit event logged.`);
  };

  const handleStatusOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) return;

    await api.overrideStatus(candidateId, targetStatus, statusReason);
    setCandidate((prev: any) => ({ ...prev, status: targetStatus }));
    setIsStatusOverrideOpen(false);
    setStatusReason("");
    setActionFeedback(`Status updated to ${targetStatus}. Audit logged.`);
  };

  const handleManualInvite = async () => {
    await api.inviteCandidate(candidateId, true);
    setCandidate((prev: any) => ({ ...prev, status: "invited" }));
    setActionFeedback("Interview invitation dispatched via Resend.");
  };

  const handleCancelInvite = async () => {
    await api.cancelInvite(candidateId, "Recruiter cancelled invitation manually.");
    setCandidate((prev: any) => ({ ...prev, status: "shortlisted" }));
    setActionFeedback("Interview invitation revoked. Token invalidated.");
  };

  const handleAllowRetry = async () => {
    await api.allowRetry(candidateId, "Candidate granted retry.");
    setCandidate((prev: any) => ({ ...prev, status: "invited" }));
    setActionFeedback("Interview reset. Fresh token issued.");
  };

  const handleRegenerateReport = async () => {
    setActionFeedback("Supervisor Agent triggered to re-synthesize evaluation report...");
    await api.regenerateReport(candidateId);
  };

  if (!candidate) {
    return <div className="p-12 text-center text-[#8A8B82]">Loading candidate dossier...</div>;
  }

  const effectiveScore = candidate.manual_score_override ?? candidate.resume_score ?? 0;
  const report: EvaluationReport | undefined = candidate.evaluation_report;
  const proctoring: ProctoringEvent[] = candidate.proctoring_events || [];
  const auditLogs: AuditLog[] = candidate.audit_logs || [];

  return (
    <div className="flex flex-col gap-8">
      {/* Print-Only Header with 'full' Logo */}
      <div className="hidden print:flex items-center justify-between pb-6 mb-4 border-b border-[#D9DADF]/20">
        <Logo variant="full" size="md" href={null} />
        <div className="text-right text-xs text-[#8A8B82]">
          <p className="font-semibold text-[#D9DADF]">Official Candidate Dossier & Evaluation Report</p>
          <p>Confidential &bull; Generated by asanHire Multi-Agent Engine</p>
        </div>
      </div>

      {/* Top Navigation & Feedback Banner */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/hr/jobs/${candidate.job_id}`}>
              <NeuButton size="sm" variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-1" /> Requisition Leaderboard
              </NeuButton>
            </Link>
            <div className="flex items-center gap-3">
              <Logo variant="mark" size="md" href={null} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#D9DADF]">{candidate.full_name}</h1>
                  <NeuBadge status={candidate.status} />
                </div>
                <p className="text-xs text-[#8A8B82]">Applied: {new Date(candidate.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NeuButton size="sm" variant="ghost" onClick={() => window.print()}>
              Print Report
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={() => setIsStatusOverrideOpen(true)}>
              Override Status
            </NeuButton>
            <NeuButton size="sm" variant="primary" onClick={() => setIsDecisionOpen(true)}>
              <Award className="w-4 h-4 mr-1.5" /> Make Final Decision
            </NeuButton>
          </div>
        </div>

        {actionFeedback && (
          <div className="p-3 rounded-xl bg-[rgba(252,248,216,0.15)] border border-[#FCF8D8]/40 text-xs text-[#FCF8D8] flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-[#FCF8D8] font-bold ml-2">
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Candidate Header Dossier Card */}
      <NeuCard variant="raised" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">Contact Info</span>
            <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
              <Mail className="w-3.5 h-3.5 text-[#DD700B]" /> {candidate.email}
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
                <Phone className="w-3.5 h-3.5 text-[#DD700B]" /> {candidate.phone}
              </div>
            )}
            <div className="pt-2">
              <a href={candidate.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#DD700B] hover:underline">
                <FileText className="w-3.5 h-3.5" /> View Uploaded PDF Resume
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#242724]">
            <span className="text-xs text-[#8A8B82]">Resume Match Score</span>
            <span className="text-2xl font-bold font-mono text-[#D9DADF]">{candidate.resume_score?.toFixed(1) || "N/A"}%</span>
            <span className="text-[10px] text-[#8A8B82]">Objective Rubric Match</span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#242724]">
            <span className="text-xs text-[#8A8B82]">Effective Score</span>
            <span className="text-2xl font-bold font-mono text-[#DD700B]">{effectiveScore.toFixed(1)}%</span>
            <span className="text-[10px] text-[#DD700B]">
              {candidate.manual_score_override ? "HR Overridden" : "Automated Score"}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#242724]">
            <span className="text-xs text-[#8A8B82]">Guardian Trust Score</span>
            <span className="text-2xl font-bold font-mono text-[#8FD19E]">
              {candidate.interview?.trust_score ? `${candidate.interview.trust_score}%` : "100%"}
            </span>
            <span className="text-[10px] text-[#8FD19E]">Proctoring Integrity</span>
          </div>
        </div>
      </NeuCard>

      {/* HR Direct Overrides Bar */}
      <NeuCard variant="raised" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            HR Sovereign Actions:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <NeuButton size="sm" variant="secondary" onClick={handleManualInvite}>
              <Send className="w-3.5 h-3.5 mr-1 text-[#DD700B]" /> Manual Invite
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={handleCancelInvite}>
              <XCircle className="w-3.5 h-3.5 mr-1 text-[#E57373]" /> Revoke Token
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={handleAllowRetry}>
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#FCF8D8]" /> Allow Retry
            </NeuButton>
            <NeuButton size="sm" variant="secondary" onClick={handleRegenerateReport}>
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#8FD19E]" /> Regenerate Report
            </NeuButton>
            <NeuButton size="sm" variant="ghost" onClick={() => setIsEmailPreviewOpen(true)}>
              Preview Notification Email
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {/* Score Override Form */}
      <ScoreOverrideForm
        currentScore={effectiveScore}
        onSaveOverride={handleScoreOverride}
      />

      {/* Evaluation Supervisor Report */}
      {report && (
        <NeuCard variant="raised" className="p-6 border-l-4 border-l-[#DD700B]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#8A8B82]/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#DD700B]" />
              <h3 className="text-base font-bold text-[#D9DADF]">Evaluation Supervisor Executive Dossier</h3>
            </div>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-[#8FD19E]/20 text-[#8FD19E] border border-[#8FD19E]/40">
              Recommendation: {report.recommendation}
            </span>
          </div>

          <p className="text-sm text-[#D9DADF] leading-relaxed mb-6 italic bg-[#242724] p-4 rounded-xl">
            &quot;{report.summary}&quot;
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#242724]">
              <span className="text-xs text-[#8A8B82]">Technical Depth</span>
              <p className="text-xl font-bold font-mono text-[#D9DADF] mt-1">{report.technical_rating}%</p>
            </div>
            <div className="p-3 rounded-xl bg-[#242724]">
              <span className="text-xs text-[#8A8B82]">Communication Clarity</span>
              <p className="text-xl font-bold font-mono text-[#D9DADF] mt-1">{report.communication_rating}%</p>
            </div>
            <div className="p-3 rounded-xl bg-[#242724]">
              <span className="text-xs text-[#8A8B82]">Cultural Alignment</span>
              <p className="text-xl font-bold font-mono text-[#D9DADF] mt-1">{report.cultural_rating}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#242724] border border-[#8FD19E]/20">
              <h4 className="text-xs font-bold uppercase text-[#8FD19E] mb-2">Verified Strengths</h4>
              <ul className="list-disc list-inside text-xs text-[#D9DADF] flex flex-col gap-1">
                {report.key_strengths?.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#242724] border border-[#E57373]/20">
              <h4 className="text-xs font-bold uppercase text-[#E57373] mb-2">Red Flags / Gaps</h4>
              {report.red_flags?.length === 0 ? (
                <p className="text-xs text-[#8A8B82] italic">No red flags or integrity violations identified.</p>
              ) : (
                <ul className="list-disc list-inside text-xs text-[#E57373] flex flex-col gap-1">
                  {report.red_flags?.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </NeuCard>
      )}

      {/* Proctoring Log & Audit Trail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Proctoring Incidents */}
        <NeuCard variant="raised" className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#8A8B82]/20">
            <Shield className="w-4 h-4 text-[#DD700B]" />
            <h4 className="text-sm font-semibold text-[#D9DADF]">Guardian Proctoring Incident Feed</h4>
          </div>

          {proctoring.length === 0 ? (
            <p className="text-xs text-[#8A8B82] italic">Zero telemetry infractions recorded.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {proctoring.map((evt) => (
                <div key={evt.id} className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#D9DADF] capitalize">{evt.event_type.replace("_", " ")}</span>
                    <p className="text-[10px] text-[#8A8B82]">{evt.payload?.note || "Event captured"}</p>
                  </div>
                  <span className="text-xs font-mono text-[#E57373]">-{evt.penalty} pts</span>
                </div>
              ))}
            </div>
          )}
        </NeuCard>

        {/* Immutable Audit Log */}
        <AuditTrail logs={auditLogs} />
      </div>

      {/* Decision Modal */}
      <DecisionModal
        isOpen={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
        candidateName={candidate.full_name}
        onConfirm={handleDecisionConfirm}
      />

      {/* Status Override Modal */}
      <NeuModal
        isOpen={isStatusOverrideOpen}
        onClose={() => setIsStatusOverrideOpen(false)}
        title="Override Candidate Status"
        description="Transition candidate state backwards or forwards. Requires mandatory justification."
      >
        <form onSubmit={handleStatusOverride} className="flex flex-col gap-4">
          <StatusSelect value={targetStatus} onChange={setTargetStatus} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8A8B82] uppercase tracking-wider">
              Mandatory Justification Reason
            </label>
            <textarea
              rows={3}
              required
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="State the reason for this manual override (recorded in audit log)..."
              className="neu-inset text-xs text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <NeuButton variant="ghost" size="sm" type="button" onClick={() => setIsStatusOverrideOpen(false)}>
              Cancel
            </NeuButton>
            <NeuButton variant="primary" size="sm" type="submit" disabled={!statusReason.trim()}>
              Save Override
            </NeuButton>
          </div>
        </form>
      </NeuModal>

      {/* Email Preview Modal */}
      <NeuModal
        isOpen={isEmailPreviewOpen}
        onClose={() => setIsEmailPreviewOpen(false)}
        title="Email Template Preview"
        maxWidth="lg"
      >
        <EmailPreview
          recipient={candidate.email}
          subject={`Interview Invitation: Senior AI Engineer at asanHire`}
          htmlBody={`<p>Hello ${candidate.full_name},</p><p>You have been invited to interview. Access your link here: https://asanhire.dev/interview/sample_token</p>`}
        />
      </NeuModal>
    </div>
  );
}
