"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuInput } from "@/components/neu/NeuInput";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { Briefcase, Calendar, Upload, CheckCircle2, ShieldCheck } from "lucide-react";

// OWNER: M1 (frontend developer) & M2 (backend engineer)
// TODO M1: Implement drag-and-drop PDF upload UI with client-side file size guard (max 5 MB)
export default function PublicJobPage() {
  const params = useParams();
  const jobId = (params?.id as string) || "11111111-1111-1111-1111-111111111111";

  const [job, setJob] = useState<Job | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicJob(jobId).then(setJob);
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("Resume must be under 5 MB.");
        setFile(null);
        return;
      }
      if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported.");
        setFile(null);
        return;
      }
      setError(null);
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select your PDF resume.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("resume", file);

    try {
      await api.applyToJob(jobId, formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-[#1E201E] flex items-center justify-center text-[#8A8B82]">
        Loading job posting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E201E] py-8 px-4 flex flex-col justify-between selection:bg-[#DD700B] selection:text-[#1E201E]">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Top Header with 'full' Logo */}
        <header className="flex items-center justify-between pb-4 border-b border-[#D9DADF]/10">
          <Logo variant="full" size="md" href="/" priority />
          <span className="text-xs font-mono text-[#8A8B82]">Careers Portal</span>
        </header>

        {/* Job Header Card */}
        <NeuCard variant="raised" className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#242724] neu-inset flex items-center justify-center text-[#DD700B]">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#D9DADF]">{job.title}</h1>
                <p className="text-sm text-[#8A8B82]">{job.department} &bull; Remote / Hybrid</p>
              </div>
            </div>
            <NeuBadge status="applied" label="Applications Open" />
          </div>

          <div className="flex items-center gap-6 text-xs text-[#8A8B82] pt-4 border-t border-[#8A8B82]/20">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#DD700B]" />
              Deadline: {new Date(job.deadline).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8FD19E]" />
              AI Rubric Match + Voice Screening
            </span>
          </div>
        </NeuCard>

        {/* Content & Application Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Description & Rubric */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <NeuCard variant="raised" className="p-6">
              <h2 className="text-base font-semibold text-[#D9DADF] mb-3">About the Role</h2>
              <p className="text-sm text-[#8A8B82] leading-relaxed whitespace-pre-line">{job.description}</p>
            </NeuCard>

            <NeuCard variant="raised" className="p-6">
              <h2 className="text-base font-semibold text-[#D9DADF] mb-3">Requirements</h2>
              <p className="text-sm text-[#8A8B82] leading-relaxed whitespace-pre-line">{job.requirements}</p>
            </NeuCard>

            {job.rubric?.criteria && (
              <NeuCard variant="raised" className="p-6">
                <h2 className="text-base font-semibold text-[#D9DADF] mb-1">Evaluation Dimensions</h2>
                <p className="text-xs text-[#8A8B82] mb-4">
                  asanHire scores candidates against objective, pre-published criteria:
                </p>
                <div className="flex flex-col gap-3">
                  {job.rubric.criteria.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#242724] border border-[#8A8B82]/10 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#D9DADF]">
                        <span>{c.name}</span>
                        <span className="font-mono text-[#DD700B]">{c.weight}% Weight</span>
                      </div>
                      <p className="text-[11px] text-[#8A8B82]">{c.description}</p>
                    </div>
                  ))}
                </div>
              </NeuCard>
            )}
          </div>

          {/* Right Column: Apply Form */}
          <div>
            <NeuCard variant="raised" className="p-6 sticky top-8">
              {submitted ? (
                <div className="text-center py-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#8FD19E]/20 text-[#8FD19E] flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#D9DADF]">Application Received</h3>
                  <p className="text-xs text-[#8A8B82] leading-relaxed">
                    Our Resume Matcher Agent is reviewing your credentials against the job rubric. Qualified applicants
                    will receive an interview invitation via email.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <h3 className="text-base font-semibold text-[#D9DADF] mb-1">Apply for this Position</h3>
                  <p className="text-xs text-[#8A8B82] mb-2">Upload your resume to receive AI evaluation.</p>

                  {error && (
                    <div className="p-3 rounded-lg bg-[rgba(90,42,42,0.3)] border border-[#9E4A4A] text-xs text-[#E57373]">
                      {error}
                    </div>
                  )}

                  <NeuInput
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                  />

                  <NeuInput
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                  />

                  <NeuInput
                    label="Phone Number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0123"
                  />

                  {/* File Upload Inset Area */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[#8A8B82] uppercase tracking-wider">
                      Resume PDF (Max 5 MB)
                    </label>
                    <label className="neu-inset p-5 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer border border-[#8A8B82]/20 hover:border-[#DD700B]/50 transition-colors">
                      <Upload className="w-6 h-6 text-[#DD700B]" />
                      <span className="text-xs font-medium text-[#D9DADF] truncate max-w-[200px]">
                        {file ? file.name : "Select PDF Document"}
                      </span>
                      <span className="text-[10px] text-[#8A8B82]">Format: PDF only</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <NeuButton
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? "Analyzing Resume..." : "Submit Application"}
                    </NeuButton>
                  </div>
                </form>
              )}
            </NeuCard>
          </div>
        </div>
      </div>

      {/* Footer with small "Powered by asanHire" and the 'mark' */}
      <footer className="mt-16 pt-6 border-t border-[#D9DADF]/5 max-w-4xl mx-auto w-full flex items-center justify-center gap-2 text-xs text-[#8A8B82]">
        <span>Powered by</span>
        <Logo variant="mark" size="sm" href="/" />
        <span className="font-semibold text-[#D9DADF]">asan<span className="text-[#DD700B]">Hire</span></span>
      </footer>
    </div>
  );
}
