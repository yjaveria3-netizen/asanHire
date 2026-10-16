"use client";

import React, { useState } from "react";
import { NeuModal } from "@/components/neu/NeuModal";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuToggle } from "@/components/neu/NeuToggle";
import { CheckCircle2, XCircle, PauseCircle } from "lucide-react";

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  onConfirm: (decision: "Hire" | "Reject" | "Hold", sendEmail: boolean, notes: string) => void;
}

// OWNER: M1 (frontend developer)
export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  onConfirm,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<"Hire" | "Reject" | "Hold">("Hire");
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onConfirm(selectedDecision, sendEmail, notes);
    setLoading(false);
    onClose();
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={onClose}
      title="Make Hiring Decision"
      description={`Record final status for ${candidateName}. Fully reversible at any time.`}
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
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-semibold">Extend Offer</span>
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
            <PauseCircle className="w-5 h-5" />
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
            <XCircle className="w-5 h-5" />
            <span className="text-xs font-semibold">Reject</span>
          </button>
        </div>

        {/* Email Notification Toggle */}
        <div className="p-3.5 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#D9DADF]">Send Notification Email</p>
            <p className="text-[11px] text-[#8A8B82]">Dispatch templated outcome email via Resend</p>
          </div>
          <NeuToggle checked={sendEmail} onChange={setSendEmail} />
        </div>

        {/* Notes / Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#8A8B82] uppercase tracking-wider">
            Internal Justification Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document rationale for this hiring decision (recorded in immutable audit trail)..."
            rows={3}
            className="neu-inset text-sm text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8A8B82]/10">
          <NeuButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </NeuButton>
          <NeuButton variant="primary" onClick={handleSubmit} disabled={loading}>
            Confirm {selectedDecision}
          </NeuButton>
        </div>
      </div>
    </NeuModal>
  );
};
