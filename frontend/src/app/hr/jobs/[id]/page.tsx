"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Job, Candidate, JobProgress } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { CandidateTable } from "@/components/hr/CandidateTable";
import { ProgressTracker } from "@/components/hr/ProgressTracker";
import { DeadlineCard } from "@/components/hr/DeadlineCard";
import { DeleteJobModal } from "@/components/hr/DeleteJobModal";
import {
  Briefcase,
  Calendar,
  Users,
  ExternalLink,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = (params?.id as string) || "";

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSimulatingDeadline, setIsSimulatingDeadline] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data fetching
  const refreshAllData = useCallback(async () => {
    if (!jobId) return;
    try {
      const [jobData, candidateData, progressData] = await Promise.all([
        api.getHRJobDetail(jobId),
        api.getHRCandidates(jobId),
        api.getJobProgress(jobId),
      ]);
      setJob(jobData);
      setCandidates(candidateData);
      setProgress(progressData);
    } catch (err) {
      console.error("Failed to fetch job data:", err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // 5-second polling while tab is visible
  useEffect(() => {
    let intervalId: any = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          api
            .getJobProgress(jobId)
            .then((data) => setProgress(data))
            .catch(() => {});
        }
      }, 5000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (intervalId) clearInterval(intervalId);
      } else {
        refreshAllData();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, refreshAllData]);

  // Simulate deadline handler
  const handleSimulateDeadline = async () => {
    if (isSimulatingDeadline) return;
    setIsSimulatingDeadline(true);
    setFeedbackMsg(null);

    try {
      const res = await api.runScheduler(jobId);
      setFeedbackMsg(
        `Deadline simulated successfully. ${res?.invited_count ?? 0} candidate(s) invited.`
      );
      await refreshAllData();
    } catch (err: any) {
      console.error("Failed to run scheduler:", err);
      setFeedbackMsg(err.message || "Failed to trigger pipeline scheduler.");
    } finally {
      setIsSimulatingDeadline(false);
    }
  };

  // Next action trigger handler
  const handleTriggerNextAction = (actionLabel: string) => {
    const label = actionLabel.toLowerCase();
    if (label.includes("simulate") || label.includes("pipeline") || label.includes("scheduler")) {
      handleSimulateDeadline();
    } else if (label.includes("report") || label.includes("review")) {
      setSelectedStep(5);
    } else if (label.includes("decision")) {
      setSelectedStep(6);
    } else if (label.includes("interview")) {
      setSelectedStep(4);
    }
  };

  // Filter candidates by selected step if active
  const filteredCandidates = useMemo(() => {
    if (selectedStep === null) return candidates;
    return candidates.filter((c) => {
      if (c.stage?.step) {
        return c.stage.step === selectedStep;
      }
      // Fallback status mapping
      if (selectedStep === 2) return c.status === "applied" || c.status === "shortlisted";
      if (selectedStep === 4) return c.status === "invited" || c.status === "interviewing";
      if (selectedStep === 5) return c.status === "interviewed";
      if (selectedStep === 6) return ["hired", "rejected", "on_hold"].includes(c.status);
      return true;
    });
  }, [candidates, selectedStep]);

  if (!job) {
    return (
      <div className="flex items-center justify-center p-12 text-[#8A8B82]">
        Loading job requisition...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back to Jobs Navigation */}
      <div>
        <Link
          href="/hr/jobs"
          className="inline-flex items-center gap-2 text-sm text-[#8A8B82] hover:text-[#DD700B] transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-[#242724]"
        >
          <ArrowLeft className="w-4 h-4 text-[#DD700B]" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      {/* 1. Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Logo variant="mark" size="md" href={null} />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF]">{job.title}</h1>
              <NeuBadge status="applied" label={job.status} />
            </div>
            <p className="text-sm text-[#8A8B82] mt-1">
              {job.department || "General"} &bull; ID: <span className="font-mono text-xs">{job.id.substring(0, 8)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/jobs/${job.id}`} target="_blank">
            <NeuButton size="sm" variant="secondary" className="text-xs font-semibold">
              Public Application Page <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </NeuButton>
          </Link>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-[rgba(221,112,11,0.12)] border border-[#DD700B]/30 text-xs text-[#DD700B] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8FD19E]" />
            {feedbackMsg}
          </span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-[#DD700B] hover:text-[#D9DADF] font-bold ml-4 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Prominent Deadline Card */}
      <DeadlineCard
        job={job}
        onSimulateDeadline={handleSimulateDeadline}
        isSimulating={isSimulatingDeadline}
      />

      {/* 3. 6-Step Workflow Progress Tracker */}
      <ProgressTracker
        progress={progress}
        selectedStep={selectedStep}
        onSelectStep={setSelectedStep}
        onTriggerNextAction={handleTriggerNextAction}
      />

      {/* 4. Requisition Meta Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Auto-Invite Quota</span>
            <p className="text-xl font-bold font-mono text-[#D9DADF] mt-0.5">
              Top {job.top_n ?? 5}
            </p>
          </div>
          <Users className="w-5 h-5 text-[#DD700B]" />
        </NeuCard>

        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Min Qualification</span>
            <p className="text-xl font-bold font-mono text-[#D9DADF] mt-0.5">
              &ge; {job.min_score ?? 60}%
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FCF8D8]/10 text-[#FCF8D8]">
            Cutoff
          </span>
        </NeuCard>

        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Pipeline State</span>
            <p className="text-sm font-bold text-[#D9DADF] mt-0.5 capitalize">
              {job.scheduler_state || "waiting"}
            </p>
          </div>
          <Calendar className="w-5 h-5 text-[#8FD19E]" />
        </NeuCard>

        <NeuCard variant="raised" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#8A8B82]">Candidates Triaged</span>
            <p className="text-xl font-bold font-mono text-[#DD700B] mt-0.5">
              {candidates.length}
            </p>
          </div>
          <Briefcase className="w-5 h-5 text-[#8A8B82]" />
        </NeuCard>
      </div>

      {/* 5. Rubric Dimensions */}
      {job.rubric?.criteria && (
        <NeuCard variant="raised" className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
              Rubric Agent Evaluation Criteria (Sum: 100%)
            </h3>
            <span className="text-xs text-[#DD700B] font-mono">Custom Rubric Criteria</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {job.rubric.criteria.map((c: any, i: number) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#D9DADF]">
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono text-[#DD700B] shrink-0">{c.weight}%</span>
                </div>
                <p className="text-[11px] text-[#8A8B82] line-clamp-2">{c.description}</p>
              </div>
            ))}
          </div>
        </NeuCard>
      )}

      {/* 6. Candidate Leaderboard & Rankings */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#D9DADF]">
              Candidate Leaderboard & Rankings
            </h2>
            {selectedStep !== null && (
              <span className="text-xs text-[#DD700B] bg-[#DD700B]/10 px-2 py-0.5 rounded border border-[#DD700B]/30">
                Filtered by Step {selectedStep}
              </span>
            )}
          </div>
          <span className="text-xs text-[#8A8B82]">
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? "s" : ""}
          </span>
        </div>
        <CandidateTable candidates={filteredCandidates} />
      </div>

      {/* 7. Danger Zone: Job Deletion */}
      <div className="mt-8 border-t border-[rgba(217,218,223,0.08)] pt-6">
        <div className="p-5 rounded-2xl bg-[rgba(90,42,42,0.15)] border border-[#9E4A4A]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#E57373]">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-sm font-bold">Danger Zone</h4>
            </div>
            <p className="text-xs text-[#8A8B82]">
              Permanently delete this job requisition, candidate dossiers, interviews, and telemetry.
            </p>
          </div>

          <NeuButton
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Delete Job</span>
          </NeuButton>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteJobModal
        job={job}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
