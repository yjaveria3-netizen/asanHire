"use client";

import React, { useState, useEffect, useRef } from "react";
import { NeuModal } from "@/components/neu/NeuModal";
import { NeuButton } from "@/components/neu/NeuButton";
import { OVERRIDE_REASON_CATEGORIES, OverrideReasonCategory } from "@/lib/constants";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

export interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  changeDescription: string;
  fromValue?: string | number;
  toValue?: string | number;
  confirmLabel?: string;
  defaultCategory?: OverrideReasonCategory;
  children?: React.ReactNode;
  onConfirm: (reasonCategory: string, reason: string) => Promise<void>;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  title = "Why are you overriding this?",
  changeDescription,
  fromValue,
  toValue,
  confirmLabel = "Override and save",
  defaultCategory = "recruiter_discretion",
  children,
  onConfirm,
}) => {
  const [category, setCategory] = useState<OverrideReasonCategory>(defaultCategory);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setReason("");
      setError(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, defaultCategory]);

  const trimmedLength = reason.trim().length;
  const isTooShort = trimmedLength < 10;
  const isTooLong = trimmedLength > 500;
  const canSubmit = !isTooShort && !isTooLong && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    try {
      await onConfirm(category, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record override. Please check the justification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeuModal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      description="All overrides are recorded in the sovereign audit trail and reviewed by administration."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Change Banner */}
        <div className="p-3.5 rounded-xl bg-[#242724] border border-[#DD700B]/30 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#DD700B]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Proposed Override</span>
          </div>
          <div className="text-sm font-medium text-[#D9DADF]">
            {changeDescription}
          </div>
          {(fromValue !== undefined || toValue !== undefined) && (
            <div className="flex items-center gap-2 text-xs text-[#8A8B82] pt-1">
              <span className="font-mono bg-[#1E201E] px-2 py-0.5 rounded border border-[#8A8B82]/20">
                {String(fromValue ?? "—")}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#DD700B]" />
              <span className="font-mono bg-[#1E201E] text-[#DD700B] font-semibold px-2 py-0.5 rounded border border-[#DD700B]/30">
                {String(toValue ?? "—")}
              </span>
            </div>
          )}
        </div>

        {/* Optional Custom Content (e.g. Status Select) */}
        {children}

        {/* Reason Category Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
            Reason Category <span className="text-[#DD700B]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as OverrideReasonCategory)}
            className="w-full neu-inset text-sm font-medium text-[#D9DADF] bg-[#232623] px-3.5 py-2.5 rounded-xl border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] cursor-pointer"
          >
            {OVERRIDE_REASON_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-[#1E201E] text-[#D9DADF]">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Free-text Reason with Live Counter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#D9DADF] uppercase tracking-wider">
              Override Justification <span className="text-[#DD700B]">*</span>
            </label>
            <span
              className={`font-mono text-[11px] ${
                isTooShort
                  ? "text-[#8A8B82]"
                  : isTooLong
                  ? "text-[#E57373] font-bold"
                  : "text-[#8FD19E]"
              }`}
            >
              {trimmedLength} / 500 chars (min 10)
            </span>
          </div>
          <textarea
            ref={textareaRef}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this override is necessary (plain text, 10 to 500 characters)..."
            className="neu-inset text-xs text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/50 border border-[#8A8B82]/20 resize-none"
            maxLength={520}
          />
          {isTooShort && trimmedLength > 0 && (
            <p className="text-[11px] text-[#DD700B]">
              Please write at least {10 - trimmedLength} more character{10 - trimmedLength === 1 ? "" : "s"}.
            </p>
          )}
          {isTooLong && (
            <p className="text-[11px] text-[#E57373]">
              Exceeded 500 character limit by {trimmedLength - 500} characters.
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[rgba(90,42,42,0.3)] border border-[#E57373]/30 text-xs text-[#E57373] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8A8B82]/20">
          <NeuButton
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </NeuButton>
          <NeuButton
            type="submit"
            variant="primary"
            disabled={!canSubmit}
          >
            {loading ? "Recording..." : confirmLabel}
          </NeuButton>
        </div>
      </form>
    </NeuModal>
  );
};
