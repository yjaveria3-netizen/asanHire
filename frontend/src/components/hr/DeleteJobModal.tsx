"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X, ShieldAlert, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { DeletePreview, Job } from "@/lib/types";
import { NeuButton } from "@/components/neu/NeuButton";

interface DeleteJobModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteJobModal: React.FC<DeleteJobModalProps> = ({ job, isOpen, onClose }) => {
  const router = useRouter();
  const [typedTitle, setTypedTitle] = useState("");
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTypedTitle("");
      setConfirmedCheckbox(false);
      setErrorMsg(null);
      setIsLoadingPreview(true);
      api
        .getDeletePreview(job.id)
        .then((data) => setPreview(data))
        .catch((err) => {
          console.error("Failed to load delete preview:", err);
          setErrorMsg("Could not fetch preview data.");
        })
        .finally(() => setIsLoadingPreview(false));
    }
  }, [isOpen, job.id]);

  if (!isOpen) return null;

  const isTitleMatching = typedTitle.trim() === (job.title || "").trim();
  const canDelete = isTitleMatching && confirmedCheckbox && !isDeleting && !isClosing;

  const handleCloseInstead = async () => {
    setIsClosing(true);
    setErrorMsg(null);
    try {
      await api.updateJob(job.id, { status: "closed" });
      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to close job.");
      setIsClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await api.deleteJob(job.id, typedTitle.trim());
      onClose();
      router.push("/hr/jobs");
    } catch (err: any) {
      console.error("Job deletion failed:", err);
      setErrorMsg(err.message || "Failed to delete job. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="neu-raised bg-[#1E201E] border border-[#9E4A4A]/50 rounded-2xl max-w-lg w-full p-6 text-[#D9DADF] space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-[#E57373]">
            <div className="p-2.5 rounded-xl bg-[rgba(90,42,42,0.4)] border border-[#9E4A4A]/40">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-lg font-bold text-[#D9DADF]">
                Delete Job Requisition
              </h2>
              <p className="text-xs text-[#8A8B82]">
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#2A2D2A]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-[rgba(90,42,42,0.25)] border border-[#9E4A4A]/40 text-xs text-[#E57373] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Permanent Deletion Notice</p>
            <p className="text-[#D9DADF]/80">
              Deleting this job will immediately terminate all active interviews, permanently purge all candidate records, resume files from storage, evaluation reports, and proctor telemetry.
            </p>
          </div>
        </div>

        {/* Preview Impact Counts */}
        <div className="neu-inset p-4 rounded-xl bg-[#242624] space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
            Data to be removed:
          </h4>
          {isLoadingPreview ? (
            <div className="flex items-center gap-2 text-xs text-[#8A8B82] py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DD700B]" />
              <span>Calculating affected records...</span>
            </div>
          ) : preview ? (
            <div className="grid grid-cols-2 gap-2 text-xs text-[#D9DADF]">
              <div>• Candidates: <span className="font-semibold text-white">{preview.candidates}</span></div>
              <div>• Resume Files: <span className="font-semibold text-white">{preview.resume_files}</span></div>
              <div>• Interviews: <span className="font-semibold text-white">{preview.interviews}</span></div>
              <div>• Proctor Events: <span className="font-semibold text-white">{preview.proctor_events}</span></div>
              <div>• Reports: <span className="font-semibold text-white">{preview.reports}</span></div>
              <div>• Audit/Agent Logs: <span className="font-semibold text-white">{preview.agent_runs + preview.email_logs}</span></div>
            </div>
          ) : (
            <p className="text-xs text-[#8A8B82]">All candidate and interview data</p>
          )}
        </div>

        {/* Confirmation Typing Field */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#8A8B82]">
            To confirm, type the exact job title:{" "}
            <span className="font-bold text-[#D9DADF] select-all">
              {job.title}
            </span>
          </label>
          <input
            type="text"
            value={typedTitle}
            onChange={(e) => setTypedTitle(e.target.value)}
            placeholder={job.title}
            className="neu-inset w-full px-3.5 py-2.5 rounded-lg bg-[#1E201E] border border-[rgba(217,218,223,0.12)] text-sm text-[#D9DADF] placeholder-[#8A8B82]/50 focus:border-[#DD700B] focus:outline-none"
            autoFocus
          />
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 text-xs text-[#D9DADF] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmedCheckbox}
            onChange={(e) => setConfirmedCheckbox(e.target.checked)}
            className="mt-0.5 rounded border-[#8A8B82]/30 text-[#E57373] focus:ring-[#E57373] cursor-pointer"
          />
          <span>
            I understand that this action is irreversible and all candidate profiles, resumes, and reports will be deleted immediately.
          </span>
        </label>

        {errorMsg && (
          <p className="text-xs text-[#E57373] bg-[rgba(90,42,42,0.3)] p-2.5 rounded-lg border border-[#9E4A4A]/30">
            {errorMsg}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#8A8B82]/10">
          <NeuButton
            variant="secondary"
            size="sm"
            onClick={handleCloseInstead}
            disabled={isDeleting || isClosing}
          >
            {isClosing ? "Closing Job..." : "Close job instead"}
          </NeuButton>

          <div className="flex items-center gap-2">
            <NeuButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isDeleting || isClosing}
            >
              Cancel
            </NeuButton>
            <NeuButton
              variant="danger"
              size="sm"
              disabled={!canDelete}
              onClick={handleDelete}
              className="font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Deleting Job & Records...</span>
                </>
              ) : (
                <span>Permanently Delete Job</span>
              )}
            </NeuButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteJobModal;
