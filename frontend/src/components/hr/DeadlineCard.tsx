"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Clock, Calendar, AlertCircle, CheckCircle, Zap, ShieldAlert, Edit3 } from "lucide-react";
import { Job } from "@/lib/types";
import { NeuButton } from "@/components/neu/NeuButton";
import { EditDeadlineModal } from "./EditDeadlineModal";

interface DeadlineCardProps {
  job: Job;
  onSimulateDeadline?: () => void;
  isSimulating?: boolean;
  onDeadlineUpdated?: (job: Job) => void;
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({
  job,
  onSimulateDeadline,
  isSimulating = false,
  onDeadlineUpdated,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Compute server time offset at fetch time: serverTime - clientTime
  const serverOffsetMs = useMemo(() => {
    if (!job.server_time) return 0;
    try {
      const serverDt = new Date(job.server_time).getTime();
      return serverDt - Date.now();
    } catch {
      return 0;
    }
  }, [job.server_time]);

  // Current synchronized time in ms
  const [currentSyncTime, setCurrentSyncTime] = useState<number>(() => Date.now() + serverOffsetMs);

  useEffect(() => {
    let intervalId: any = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (intervalId) clearInterval(intervalId);
      } else {
        // Tab visible, resume ticking
        setCurrentSyncTime(Date.now() + serverOffsetMs);
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
          setCurrentSyncTime(Date.now() + serverOffsetMs);
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    intervalId = setInterval(() => {
      setCurrentSyncTime(Date.now() + serverOffsetMs);
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [serverOffsetMs]);

  // Format local deadline and timezone
  const deadlineDt = useMemo(() => {
    const raw = job.deadline_at || job.deadline;
    return raw ? new Date(raw) : null;
  }, [job.deadline_at, job.deadline]);

  const localDeadlineFormatted = useMemo(() => {
    if (!deadlineDt || isNaN(deadlineDt.getTime())) return "No deadline set";
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(deadlineDt);
    } catch {
      return deadlineDt.toLocaleString();
    }
  }, [deadlineDt]);

  const utcDeadlineFormatted = useMemo(() => {
    if (!deadlineDt || isNaN(deadlineDt.getTime())) return "";
    return deadlineDt.toUTCString();
  }, [deadlineDt]);

  // Compute live seconds remaining
  const secondsRemaining = useMemo(() => {
    if (!deadlineDt || isNaN(deadlineDt.getTime())) return null;
    return Math.floor((deadlineDt.getTime() - currentSyncTime) / 1000);
  }, [deadlineDt, currentSyncTime]);

  const countdownText = useMemo(() => {
    if (secondsRemaining === null) return "";
    if (secondsRemaining <= 0) return "Applications closed";

    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = secondsRemaining % 60;

    if (days > 0) return `Closes in ${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `Closes in ${hours}h ${mins}m ${secs}s`;
    return `Closes in ${mins}m ${secs}s`;
  }, [secondsRemaining]);

  // Scheduler state display
  const isPastDeadline = secondsRemaining !== null && secondsRemaining <= 0;
  const isAutoInvite = job.auto_invite !== false;
  const hasRun = Boolean(job.scheduler_ran_at);

  const renderStateBadge = () => {
    if (!isAutoInvite) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2A2D2A] text-xs text-[#8A8B82] border border-[rgba(217,218,223,0.08)]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#8A8B82]" />
          <span>Auto-invite off (manual invites)</span>
        </div>
      );
    }
    if (hasRun) {
      const ranTime = new Date(job.scheduler_ran_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(143,209,158,0.1)] text-xs text-[#8FD19E] border border-[#8FD19E]/30">
          <CheckCircle className="w-3.5 h-3.5 text-[#8FD19E]" />
          <span>Pipeline ran at {ranTime}</span>
        </div>
      );
    }
    if (isPastDeadline) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(221,112,11,0.15)] text-xs text-[#DD700B] border border-[#DD700B]/30 animate-pulse">
          <Zap className="w-3.5 h-3.5 text-[#DD700B]" />
          <span>Starting pipeline...</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2A2D2A] text-xs text-[#DD700B] border border-[#DD700B]/30">
        <Clock className="w-3.5 h-3.5 text-[#DD700B]" />
        <span>{countdownText}</span>
      </div>
    );
  };

  return (
    <div className="neu-raised rounded-xl p-5 bg-[#1E201E] border border-[rgba(217,218,223,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#DD700B]" />
          <h3 className="text-sm font-semibold text-[#D9DADF] uppercase tracking-wider">
            Application Deadline
          </h3>
          {renderStateBadge()}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#D9DADF] font-medium" title={`UTC: ${utcDeadlineFormatted}`}>
            {localDeadlineFormatted}
          </span>
          <span className="text-[#8A8B82]">
            • Server-clock synchronized
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <NeuButton
          variant="secondary"
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
          className="flex-shrink-0"
          title="Change or extend the application cutoff deadline"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#DD700B]" />
          <span>Edit Deadline</span>
        </NeuButton>

        {onSimulateDeadline && (
          <NeuButton
            variant="ghost"
            size="sm"
            onClick={onSimulateDeadline}
            disabled={isSimulating}
            className="flex-shrink-0 text-[#8A8B82] hover:text-[#DD700B]"
            title="Simulate the deadline passing immediately and run the Scheduling Agent"
          >
            <Zap className={`w-3.5 h-3.5 text-[#DD700B] ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Running..." : "Simulate deadline now"}</span>
          </NeuButton>
        )}
      </div>

      <EditDeadlineModal
        job={job}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updatedJob) => {
          if (onDeadlineUpdated) {
            onDeadlineUpdated(updatedJob);
          }
        }}
      />
    </div>
  );
};

export default DeadlineCard;
