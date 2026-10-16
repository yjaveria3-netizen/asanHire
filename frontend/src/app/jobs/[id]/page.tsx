"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuBadge } from "@/components/neu/NeuBadge";
import { Briefcase, Calendar, Upload, CheckCircle2, FileText, ArrowLeft, AlertCircle } from "lucide-react";

export default function PublicJobPage() {
  const params = useParams();
  const jobId = (params?.id as string) || "";

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobNotFound, setJobNotFound] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJobNotFound(true);
      setLoadingJob(false);
      return;
    }

    api
      .getPublicJob(jobId)
      .then((data) => {
        if (!data || !data.title) {
          setJobNotFound(true);
        } else {
          setJob(data);
        }
      })
      .catch(() => {
        setJobNotFound(true);
      })
      .finally(() => {
        setLoadingJob(false);
      });
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Client-side check: Must end with .pdf or have type application/pdf
      const isPdf =
        selectedFile.name.toLowerCase().endsWith(".pdf") ||
        selectedFile.type === "application/pdf";
      if (!isPdf) {
        setErrorMessage("Please select a valid PDF file.");
        setFile(null);
        e.target.value = "";
        return;
      }

      // Client-side check: Max 5 MB (5 * 1024 * 1024 bytes)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setErrorMessage("File exceeds maximum allowed size of 5 MB.");
        setFile(null);
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate inputs
    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!file) {
      setErrorMessage("Please upload your resume in PDF format.");
      return;
    }

    if (!consent) {
      setErrorMessage("Please agree to the consent terms before submitting.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("email", email.trim().toLowerCase());
    formData.append("consent", "true");
    formData.append("resume", file);
    formData.append("job_id", jobId);

    try {
      await api.applyToJob(jobId, formData);
      setSubmitted(true);
    } catch {
      // Show generic error message only
      setErrorMessage("Something went wrong while submitting your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen bg-[#1E201E] flex flex-col items-center justify-center text-[#8A8B82] gap-3">
        <Logo variant="mark" size="md" />
        <p className="text-sm font-medium">Loading position details...</p>
      </div>
    );
  }

  if (jobNotFound || !job) {
    return (
      <div className="min-h-screen bg-[#1E201E] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-[#262826] border border-[#383A38] rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
          <Logo variant="tile" size="md" href="/" priority />
          <h1 className="text-xl font-bold text-[#D9DADF]">Position Not Found</h1>
          <p className="text-xs text-[#8A8B82]">
            This requisition may have expired, closed, or does not exist.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#DD700B] hover:bg-[#c26006] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Parse skills safely (can be an array or string)
  let skillsList: string[] = [];
  if (Array.isArray(job.skills)) {
    skillsList = job.skills.map(String).filter(Boolean);
  } else if (typeof job.skills === "string") {
    skillsList = (job.skills as string)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (job.requirements && typeof job.requirements === "string") {
    // Fallback if skills field isn't present
    skillsList = (job.requirements as string)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 50)
      .slice(0, 10);
  }

  return (
    <div className="min-h-screen bg-[#1E201E] py-8 px-4 flex flex-col justify-between selection:bg-[#DD700B] selection:text-[#1E201E]">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-[#D9DADF]/10">
          <Logo variant="full" size="md" href="/" priority />
          <span className="text-xs font-mono text-[#8A8B82]">Careers Portal</span>
        </header>

        {/* Job Title & Summary Card */}
        <div className="rounded-2xl border border-[#383A38] bg-[#262826] p-6 md:p-8 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1E201E] border border-[#383A38] flex items-center justify-center text-[#DD700B] shrink-0 mt-0.5">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#D9DADF]">{job.title}</h1>
                <p className="text-sm text-[#8A8B82] mt-1">
                  {job.department ? `${job.department} • ` : ""}Remote / Hybrid
                </p>
              </div>
            </div>
            <NeuBadge status="applied" label="Applications Open" />
          </div>

          {job.deadline && (
            <div className="flex items-center gap-6 text-xs text-[#8A8B82] pt-4 border-t border-[#383A38]">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-[#DD700B]" />
                Application Deadline: {new Date(job.deadline).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </div>
          )}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Job Description & Skills (NO rubric shown) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Description */}
            <div className="rounded-2xl border border-[#383A38] bg-[#262826] p-6 shadow-xl">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#D9DADF] mb-3">
                Job Description
              </h2>
              <div className="text-sm text-[#8A8B82] leading-relaxed whitespace-pre-line">
                {job.description || "No description provided."}
              </div>
            </div>

            {/* Skills */}
            {skillsList.length > 0 && (
              <div className="rounded-2xl border border-[#383A38] bg-[#262826] p-6 shadow-xl">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#D9DADF] mb-3">
                  Required Skills &amp; Qualifications
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-[#1E201E] border border-[#383A38] text-[#D9DADF]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Application Form or Success Page */}
          <div>
            <div className="rounded-2xl border border-[#383A38] bg-[#262826] p-6 shadow-xl sticky top-6">
              {submitted ? (
                /* Success Page View */
                <div className="text-center py-6 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#8FD19E]/20 text-[#8FD19E] flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[#D9DADF]">Application Submitted</h3>
                  <p className="text-xs text-[#8A8B82] leading-relaxed">
                    Thank you, <span className="text-[#D9DADF] font-semibold">{name}</span>. Your application and resume have been received.
                  </p>
                  <p className="text-xs text-[#8A8B82] leading-relaxed">
                    If your profile matches the role requirements, you will receive an interview invitation link via email.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#DD700B] hover:bg-[#c26006] transition-colors"
                  >
                    Return to Home
                  </Link>
                </div>
              ) : (
                /* Application Form */
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="border-b border-[#383A38] pb-3">
                    <h3 className="text-lg font-bold text-[#D9DADF]">Apply for this Position</h3>
                    <p className="text-xs text-[#8A8B82] mt-0.5">Submit your resume for evaluation.</p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-[rgba(90,42,42,0.3)] border border-[#9E4A4A] text-xs text-[#E57373] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E57373]" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
                      Full Name <span className="text-[#DD700B]">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={submitting}
                      required
                      className="block w-full h-10 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
                      Email Address <span className="text-[#DD700B]">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      required
                      className="block w-full h-10 rounded-md border border-[#8A8B82]/30 bg-[#1E201E] px-3 py-2 text-sm text-[#D9DADF] placeholder:text-[#8A8B82]/60 focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* PDF Resume Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82]">
                      Resume PDF (Max 5 MB) <span className="text-[#DD700B]">*</span>
                    </label>
                    <label className="p-4 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer border border-dashed border-[#8A8B82]/40 hover:border-[#DD700B] bg-[#1E201E] transition-colors">
                      {file ? (
                        <>
                          <FileText className="w-6 h-6 text-[#DD700B]" />
                          <span className="text-xs font-medium text-[#D9DADF] truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-[#8A8B82]">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-[#DD700B]" />
                          <span className="text-xs font-medium text-[#D9DADF]">Select PDF file</span>
                          <span className="text-[10px] text-[#8A8B82]">Max size: 5 MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleFileChange}
                        disabled={submitting}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2 pt-2">
                    <input
                      id="consent"
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      disabled={submitting}
                      required
                      className="mt-1 h-4 w-4 rounded border-[#8A8B82]/40 bg-[#1E201E] text-[#DD700B] focus:ring-[#DD700B] focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-xs text-[#8A8B82] leading-tight cursor-pointer select-none">
                      I agree my resume is processed by AI and my interview is monitored for tab switches and paste events; video is not recorded
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center rounded-lg bg-[#DD700B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c26006] focus:outline-none focus:ring-2 focus:ring-[#DD700B] focus:ring-offset-2 focus:ring-offset-[#262826] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting Application..." : "Submit Application"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-6 border-t border-[#D9DADF]/5 max-w-4xl mx-auto w-full flex items-center justify-center gap-2 text-xs text-[#8A8B82]">
        <span>Powered by</span>
        <Logo variant="mark" size="sm" href="/" />
        <span className="font-semibold text-[#D9DADF]">
          asan<span className="text-[#DD700B]">Hire</span>
        </span>
      </footer>
    </div>
  );
}
