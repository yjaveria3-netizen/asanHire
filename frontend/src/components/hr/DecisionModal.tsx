"use client";

import React, { useState, useEffect } from "react";
import { NeuModal } from "@/components/neu/NeuModal";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuToggle } from "@/components/neu/NeuToggle";
import { CheckCircle2, XCircle, PauseCircle, Mail, Eye, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId?: string;
  candidateName: string;
  currentStatus?: string;
  initialDecision?: "Hire" | "Reject" | "Hold";
  onConfirm: (decision: "Hire" | "Reject" | "Hold", sendEmail: boolean, notes: string) => Promise<void>;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  currentStatus,
  initialDecision = "Hire",
  onConfirm,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<"Hire" | "Reject" | "Hold">(initialDecision);
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  useEffect(() => {
    if (initialDecision) {
      setSelectedDecision(initialDecision);
    }
  }, [initialDecision, isOpen]);

  // Fetch live email preview when decision or candidate changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingPreview(true);

    const templateType =
      selectedDecision === "Hire" ? "hired" : selectedDecision === "Reject" ? "rejected" : "on_hold";

    api
      .getEmailPreview(candidateId || "demo-id", templateType)
      .then((data) => {
        if (!isMounted) return;
        setEmailPreview(data);
      })
      .catch(() => {
        if (!isMounted) return;
        setEmailPreview({
          subject: `Status Update: ${templateType.toUpperCase()} - asanHire`,
          html: `<p>Dear candidate, your application has been evaluated as <strong>${templateType}</strong>.</p>`,
        });
      })
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDecision, candidateId]);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    await onConfirm(selectedDecision, sendEmail, notes);
    setLoading(false);
    onClose();
  };

  const isChangingDecision =
    currentStatus &&
    ["hired", "rejected", "on_hold"].includes(currentStatus) &&
    currentStatus !== selectedDecision.toLowerCase();

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title={isChangingDecision ? "Modify / Correct Hiring Decision" : "Make Final Hiring Decision"}
      description={`Record official status for ${candidateName}. Changes write to the permanent audit trail.`}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Decision Selector */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSelectedDecision("Hire")}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              selectedDecision === "Hire"
                ? "bg-[rgba(62,90,68,0.3)] border-[#8FD19E] text-[#8FD19E] neu-inset"
                : "bg-[#242724] border-[#8A8B82]/20 text-[#8A8B82] hover:text-[#D9DADF]"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-[#8FD19E]" />
            <span className="text-xs font-semibold">Extend Offer (Hire)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDecision("Hold")}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              selectedDecision === "Hold"
                ? "bg-[rgba(252,248,216,0.15)] border-[#FCF8D8] text-[#FCF8D8] neu-inset"
                : "bg-[#242724] border-[#8A8B82]/20 text-[#8A8B82] hover:text-[#D9DADF]"
            }`}
          >
            <PauseCircle className="w-5 h-5 text-[#FCF8D8]" />
            <span className="text-xs font-semibold">Put On Hold</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDecision("Reject")}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              selectedDecision === "Reject"
                ? "bg-[rgba(90,42,42,0.3)] border-[#E57373] text-[#E57373] neu-inset"
                : "bg-[#242724] border-[#8A8B82]/20 text-[#8A8B82] hover:text-[#D9DADF]"
            }`}
          >
            <XCircle className="w-5 h-5 text-[#E57373]" />
            <span className="text-xs font-semibold">Reject</span>
          </button>
        </div>

        {isChangingDecision && (
          <div className="p-3 rounded-xl bg-[rgba(221,112,11,0.15)] border border-[#DD700B]/30 flex items-start gap-2.5 text-xs text-[#DD700B]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Decision Adjustment:</strong> Transitioning from <code>{currentStatus}</code> to{" "}
              <code>{selectedDecision.toLowerCase()}</code> will send a corrected decision email if notifications are enabled.
            </span>
          </div>
        )}

        {/* Required Notes / Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider flex items-center justify-between">
            <span>Mandatory Decision Reason</span>
            <span className="text-[10px] text-[#DD700B] font-mono">* Required</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document detailed rationale for this hiring decision (mandatory for audit compliance)..."
            rows={3}
            required
            className="neu-inset text-xs text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/50 border border-[#8A8B82]/20"
          />
        </div>

        {/* Email Notification Toggle */}
        <div className="p-3.5 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#D9DADF] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#DD700B]" /> Dispatch Notification Email
            </p>
            <p className="text-[11px] text-[#8A8B82]">Send templated transactional notification via Resend</p>
          </div>
          <NeuToggle checked={sendEmail} onChange={setSendEmail} />
        </div>

        {/* Live Email Preview Box */}
        {sendEmail && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[#8A8B82] font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#DD700B]" /> Live Email Preview:
            </span>
            <div className="neu-inset p-3.5 rounded-xl bg-[#202320] text-xs text-[#D9DADF] border border-[#8A8B82]/15 flex flex-col gap-2 max-h-48 overflow-y-auto">
              {loadingPreview ? (
                <p className="text-[#8A8B82] italic text-xs">Loading email preview...</p>
              ) : emailPreview ? (
                <>
                  <div className="pb-2 border-b border-[#8A8B82]/20 font-semibold text-[#DD700B]">
                    Subject: {emailPreview.subject}
                  </div>
                  <div
                    className="text-xs text-[#D9DADF]/90 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: emailPreview.html }}
                  />
                </>
              ) : (
                <p className="text-[#8A8B82] italic text-xs">Preview unavailable.</p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8A8B82]/10">
          <NeuButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </NeuButton>
          <NeuButton
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !notes.trim()}
          >
            {loading ? "Recording Decision..." : `Confirm ${selectedDecision}`}
          </NeuButton>
        </div>
      </div>
    </NeuModal>
  );
};
