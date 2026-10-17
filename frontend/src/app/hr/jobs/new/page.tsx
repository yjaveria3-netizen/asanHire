"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuInput } from "@/components/neu/NeuInput";
import { NeuButton } from "@/components/neu/NeuButton";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

// OWNER: M1 (frontend developer) & M2 (backend engineer)
// TODO M2: Ensure POST /api/hr/jobs triggers Rubric Agent (Gemini) and saves weighted criteria to Supabase
export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [topN, setTopN] = useState("5");
  const [minScore, setMinScore] = useState("65.0");
  // Default to 3 days ahead at 18:00 local time
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    d.setHours(18, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Local Time";
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      setFormError("Please enter a valid deadline date and time.");
      return;
    }

    if (deadlineDate.getTime() <= Date.now() + 60 * 1000) {
      setFormError("Deadline must be at least 1 minute in the future.");
      return;
    }

    setLoading(true);

    const payload = {
      title,
      department,
      description,
      requirements,
      top_n: parseInt(topN, 10),
      min_score: parseFloat(minScore),
      deadline: deadlineDate.toISOString(), // Strictly ISO 8601 with Z
    };

    try {
      const created = await api.createHRJob(payload);
      router.push(`/hr/jobs/${created.id}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create job requisition.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <Link
          href="/hr/jobs"
          className="inline-flex items-center gap-2 text-sm text-[#8A8B82] hover:text-[#DD700B] transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-[#242724]"
        >
          <ArrowLeft className="w-4 h-4 text-[#DD700B]" />
          <span>Back to Jobs</span>
        </Link>
      </div>

      <div className="flex items-center gap-3.5">
        <Logo variant="mark" size="md" href={null} />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#D9DADF]">Post New Requisition</h1>
          <p className="text-sm text-[#8A8B82] mt-1 leading-relaxed">
            Define role requirements. The AI Rubric Agent will automatically synthesize objective, fair evaluation criteria.
          </p>
        </div>
      </div>

      <NeuCard variant="raised" className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NeuInput
              label="Job Requisition Title"
              placeholder="e.g. Senior Distributed Systems Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <NeuInput
              label="Department / Team"
              placeholder="e.g. Infrastructure & AI Core"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8A8B82] uppercase tracking-wider">
              Role Overview & Mission
            </label>
            <textarea
              rows={4}
              placeholder="Describe the responsibilities, high-level challenges, and architectural priorities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="neu-inset text-sm text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8A8B82] uppercase tracking-wider">
              Core Technical Requirements
            </label>
            <textarea
              rows={4}
              placeholder="Years of experience, language fluency (TypeScript, Python), database paradigms, and soft skills..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              required
              className="neu-inset text-sm text-[#D9DADF] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#8A8B82]/20">
            <NeuInput
              label="Top N Auto-Invited"
              type="number"
              min="1"
              max="50"
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              helperText="Quota of top scorers auto-invited at deadline"
              required
            />
            <NeuInput
              label="Minimum Score (%)"
              type="number"
              min="0"
              max="100"
              step="1"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              helperText="Cutoff threshold for shortlist qualification"
              required
            />
            <NeuInput
              label="Applications close at"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              helperText={`Timezone: ${userTimezone}. Pipeline starts automatically at this exact moment.`}
              required
            />
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-[rgba(90,42,42,0.3)] border border-[#9E4A4A]/40 text-xs text-[#E57373]">
              {formError}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#242724] border border-[#DD700B]/20 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#DD700B] shrink-0" />
            <div className="text-xs text-[#8A8B82]">
              <strong className="text-[#D9DADF]">Rubric Agent Preview:</strong> Upon submission, Gemini 2.5 will
              analyze your specifications and generate 4–7 weighted evaluation dimensions summing to 100%.
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <NeuButton type="submit" variant="primary" size="lg" disabled={loading}>
              {loading ? "Generating Rubric & Publishing..." : "Publish Job & Generate Rubric"}{" "}
              <ArrowRight className="w-4 h-4 ml-1" />
            </NeuButton>
          </div>
        </form>
      </NeuCard>
    </div>
  );
}
