"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle2, Loader2, X, RefreshCw, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { NeuButton } from "@/components/neu/NeuButton";

interface EditDeadlineModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedJob: Job) => void;
}

function toLocalInputString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const EditDeadlineModal: React.FC<EditDeadlineModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset selectedDateTime whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      const rawDeadline = job.deadline_at || job.deadline;
      if (rawDeadline) {
        const d = new Date(rawDeadline);
        if (!isNaN(d.getTime())) {
          setSelectedDateTime(toLocalInputString(d));
          return;
        }
      }
      // Fallback: 7 days from now
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 7);
      setSelectedDateTime(toLocalInputString(fallback));
    }
  }, [isOpen, job.deadline, job.deadline_at]);

  const parsedSelectedDate = useMemo(() => {
    if (!selectedDateTime) return null;
    const d = new Date(selectedDateTime);
    return isNaN(d.getTime()) ? null : d;
  }, [selectedDateTime]);

  const isFuture = useMemo(() => {
    if (!parsedSelectedDate) return false;
    return parsedSelectedDate.getTime() > Date.now();
  }, [parsedSelectedDate]);

  const relativeTimeDescription = useMemo(() => {
    if (!parsedSelectedDate) return "";
    const diffSecs = Math.floor((parsedSelectedDate.getTime() - Date.now()) / 1000);
    if (diffSecs <= 0) {
      return "Deadline is in the past (triggers immediate cutoff)";
    }
    const days = Math.floor(diffSecs / 86400);
    const hours = Math.floor((diffSecs % 86400) / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);

    if (days > 0) return `Deadline will be in ${days} day${days > 1 ? "s" : ""} ${hours}h ${mins}m`;
    if (hours > 0) return `Deadline will be in ${hours}h ${mins}m`;
    return `Deadline will be in ${mins} minute${mins !== 1 ? "s" : ""}`;
  }, [parsedSelectedDate]);

  const applyPreset = (daysToAdd: number) => {
    // If current selected date is in the future, add to it; otherwise add to now
    const base = parsedSelectedDate && parsedSelectedDate.getTime() > Date.now()
      ? new Date(parsedSelectedDate.getTime())
      : new Date();
    base.setDate(base.getDate() + daysToAdd);
    base.setSeconds(0, 0);
    setSelectedDateTime(toLocalInputString(base));
  };

  const setNow = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    setSelectedDateTime(toLocalInputString(now));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedSelectedDate) {
      setErrorMsg("Please select a valid deadline date and time.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isoString = parsedSelectedDate.toISOString();
      const updatedJob = await api.updateJobDeadline(job.id, isoString);
      if (onSuccess) {
        onSuccess(updatedJob);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to update deadline:", err);
      setErrorMsg(err.message || "Failed to update deadline. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-deadline-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 neu-raised bg-[#1E201E] border border-[rgba(217,218,223,0.12)] rounded-2xl max-w-lg w-full p-6 text-[#D9DADF] space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(221,112,11,0.15)] border border-[#DD700B]/30 text-[#DD700B]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-deadline-modal-title" className="text-lg font-bold text-[#D9DADF]">
                Edit Application Deadline
              </h2>
              <p className="text-xs text-[#8A8B82] mt-0.5">
                {job.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#242724] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Current Deadline Info */}
          <div className="neu-inset p-3.5 rounded-xl bg-[#242724] flex items-center justify-between text-xs">
            <span className="text-[#8A8B82] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#DD700B]" /> Current Setting:
            </span>
            <span className="font-semibold text-[#D9DADF]">
              {job.deadline_at || job.deadline
                ? new Date(job.deadline_at || job.deadline).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "None"}
            </span>
          </div>

          {/* Date & Time Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#D9DADF] uppercase tracking-wider">
              New Cutoff Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={selectedDateTime}
              onChange={(e) => setSelectedDateTime(e.target.value)}
              required
              className="neu-inset w-full px-3.5 py-2.5 rounded-lg bg-[#242724] border border-[rgba(217,218,223,0.12)] text-sm text-[#D9DADF] focus:border-[#DD700B] focus:outline-none transition-colors"
            />
            {relativeTimeDescription && (
              <p className={`text-xs font-medium flex items-center gap-1.5 ${isFuture ? "text-[#8FD19E]" : "text-[#DD700B]"}`}>
                {isFuture ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {relativeTimeDescription}
              </p>
            )}
          </div>

          {/* Quick Increment Preset Pills */}
          <div className="space-y-1.5">
            <label className="block text-xs text-[#8A8B82]">
              Quick extension presets:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(1)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#242724] hover:bg-[#2e322e] text-[#D9DADF] border border-[rgba(217,218,223,0.1)] hover:border-[#DD700B]/50 transition-all"
              >
                +1 Day
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#242724] hover:bg-[#2e322e] text-[#D9DADF] border border-[rgba(217,218,223,0.1)] hover:border-[#DD700B]/50 transition-all"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#242724] hover:bg-[#2e322e] text-[#D9DADF] border border-[rgba(217,218,223,0.1)] hover:border-[#DD700B]/50 transition-all"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => applyPreset(14)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#242724] hover:bg-[#2e322e] text-[#D9DADF] border border-[rgba(217,218,223,0.1)] hover:border-[#DD700B]/50 transition-all"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={setNow}
                className="px-2.5 py-1 text-xs rounded-lg bg-[rgba(221,112,11,0.15)] text-[#DD700B] hover:bg-[rgba(221,112,11,0.25)] border border-[#DD700B]/30 transition-all flex items-center gap-1"
                title="Set to now to trigger immediate cutoff"
              >
                <Zap className="w-3 h-3" />
                <span>Now</span>
              </button>
            </div>
          </div>

          {/* Status Explanation Card */}
          <div className="p-3.5 rounded-xl bg-[#242724]/80 border border-[rgba(217,218,223,0.08)] text-xs text-[#8A8B82] space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 text-[#D9DADF] font-semibold">
              <RefreshCw className="w-3.5 h-3.5 text-[#DD700B]" />
              <span>Automated Pipeline Behavior</span>
            </div>
            {isFuture ? (
              <p>
                Extending the deadline re-arms the autonomous Scheduling Agent. If this requisition was previously closed or expired, it will automatically reopen to <span className="text-[#8FD19E] font-medium">&quot;open&quot;</span> so candidates can continue applying.
              </p>
            ) : (
              <p>
                Setting the deadline to the past or right now marks the job as immediately due. The scheduling pipeline will run to shortlist candidates and dispatch interview invitations.
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[rgba(90,42,42,0.3)] border border-[#9E4A4A]/40 text-xs text-[#E57373] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(217,218,223,0.08)]">
            <NeuButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </NeuButton>

            <NeuButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !parsedSelectedDate}
              className="font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Saving Deadline...</span>
                </>
              ) : (
                <span>Save Deadline</span>
              )}
            </NeuButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDeadlineModal;
