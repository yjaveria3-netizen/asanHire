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
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title,
      department,
      description,
      requirements,
      top_n: parseInt(topN, 10),
      min_score: parseFloat(minScore),
      deadline: new Date(deadline).toISOString(),
    };

    try {
      const created = await api.createHRJob(payload);
      router.push(`/hr/jobs/${created.id}`);
    } catch {
      router.push("/hr/jobs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/jobs">
          <NeuButton size="sm" variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </NeuButton>
        </Link>
        <div className="flex items-center gap-3">
          <Logo variant="mark" size="md" href={null} />
          <div>
            <h1 className="text-2xl font-bold text-[#D9DADF]">Post New Requisition</h1>
            <p className="text-xs text-[#8A8B82] mt-0.5">
              Define requirements. The Rubric Agent will automatically synthesize objective evaluation criteria.
            </p>
          </div>
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
              label="Application Deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              helperText="When auto-scheduling triggers"
              required
            />
          </div>

          <div className="p-4 rounded-xl bg-[#242724] border border-[#DD700B]/20 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#DD700B] shrink-0" />
            <div className="text-xs text-[#8A8B82]">
              <strong className="text-[#D9DADF]">Rubric Agent Preview:</strong> Upon submission, Gemini 1.5 will
              analyze your specifications and generate 3–5 weighted evaluation dimensions summing to 100%.
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
