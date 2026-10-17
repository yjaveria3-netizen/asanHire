"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuBadge } from "@/components/neu/NeuBadge";
import {
  Briefcase,
  Search,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Video,
  Sparkles,
  Building2,
  UserCheck,
  ShieldCheck,
  Calendar,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function CandidateJobsPortal() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [interviewToken, setInterviewToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    role: string;
    full_name?: string;
  } | null>(null);
  const [activeInterview, setActiveInterview] = useState<{
    has_interview: boolean;
    interview_id?: string;
    candidate_name?: string;
    job_title?: string;
    department?: string;
    expires_at?: string;
    interview_url?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Fetch current user session
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata || {};
        const email = user.email || "";
        setCurrentUser({
          email: email,
          role: meta.role || "candidate",
          full_name: meta.full_name || email.split("@")[0] || "Candidate",
        });

        // 2. Check for active interview invitation for this candidate email
        if (email) {
          api.getCandidateActiveInterview(email).then((res) => {
            if (res && res.has_interview) {
              setActiveInterview(res);
            }
          }).catch(() => {});
        }
      }
    });

    // 3. Fetch active public jobs
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getPublicJobs();
      if (data && Array.isArray(data) && data.length > 0) {
        setJobs(data);
      } else {
        setJobs([
          {
            id: "junior-python-backend-engineer",
            title: "Junior Python Backend Engineer",
            department: "Engineering & Platform",
            description:
              "Build scalable asynchronous microservices, FastAPI REST APIs, LLM rubric evaluators, and proctored automated interview pipelines using Python, FastAPI, and PostgreSQL.",
            requirements: "Experience with Python, FastAPI, relational databases, Docker, and REST APIs.",
            skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "REST APIs"],
            deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
            status: "open",
          },
        ]);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.push("/login?logout=true");
  };

  const handleJoinInterview = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = interviewToken.trim();
    if (!clean) {
      setTokenError("Please enter your interview invitation token");
      return;
    }
    setTokenError("");
    router.push(`/interview/${encodeURIComponent(clean)}`);
  };

  const allTags = Array.from(
    new Set(jobs.flatMap((j) => (Array.isArray(j.skills) ? j.skills : [])))
  ).slice(0, 8);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.department && job.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag =
      selectedTag === "all" ||
      (Array.isArray(job.skills) && job.skills.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex flex-col font-sans selection:bg-[#DD700B] selection:text-[#1E201E]">
      {/* Top Header Navbar - Dark Neumorphic */}
      <header className="sticky top-0 z-40 bg-[#1E201E]/90 backdrop-blur-md border-b border-[#383A38]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo variant="full" size="lg" href="/" priority />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#242724] border border-[#383A38] rounded-full text-xs font-semibold text-[#DD700B]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Candidate Career Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#8A8B82] hover:text-[#D9DADF] bg-[#242724] hover:bg-[#2A2D2A] border border-[#383A38] rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-[#DD700B]" />
              <span>Return Home</span>
            </Link>

            {currentUser ? (
              <div className="flex items-center gap-3 pl-3 border-l border-[#383A38]">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-bold text-[#D9DADF]">
                    {currentUser.full_name || currentUser.email}
                  </span>
                  <span className="text-[11px] text-[#8FD19E] font-medium flex items-center justify-end gap-1">
                    <UserCheck className="w-3 h-3" /> Candidate Account
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="px-3 py-2 text-[#E57373] hover:bg-[#E57373]/15 border border-[#E57373]/30 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold text-[#DD700B] bg-[#242724] hover:bg-[#2A2D2A] border border-[#DD700B]/40 rounded-xl transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* ACTIVE INTERVIEW INVITATION BANNER (If Candidate was Invited) */}
        {activeInterview && activeInterview.has_interview && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2B231B] via-[#242724] to-[#1E201E] border-2 border-[#DD700B] p-6 sm:p-8 shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DD700B]/20 border border-[#DD700B]/40 text-xs font-bold text-[#DD700B]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DD700B] animate-ping" />
                  <span>ACTION REQUIRED • INTERVIEW INVITATION READY</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#D9DADF] tracking-tight">
                  You are invited to interview for {activeInterview.job_title}
                </h2>
                <p className="text-sm text-[#8A8B82] max-w-2xl">
                  Congratulations! Your resume was screened and ranked in the top candidates. Your AI-proctored technical screening session is active and ready to start.
                </p>
                {activeInterview.expires_at && (
                  <p className="text-xs text-[#8FD19E] flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Session valid until:{" "}
                      {new Date(activeInterview.expires_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })}
                    </span>
                  </p>
                )}
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href={activeInterview.interview_url || `/interview/${activeInterview.interview_id}`}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#DD700B] hover:bg-[#C25E06] text-white font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Technical Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Hero Banner - Dark Theme */}
        <div className="rounded-2xl border border-[#383A38] bg-[#242724] p-8 sm:p-10 shadow-xl space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E201E] border border-[#383A38] text-xs font-bold text-[#DD700B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8FD19E]" />
              <span>Autonomous Fair Hiring • 100% Objective AI Rubrics</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#D9DADF] tracking-tight">
              Active Career Openings
            </h1>
            <p className="text-sm sm:text-base text-[#8A8B82] leading-relaxed">
              Explore open engineering roles, submit your resume for automated instant qualification matching, or enter your interview token to launch your live technical screening.
            </p>
          </div>

          {/* Quick Token Launcher Bar */}
          <div className="pt-6 border-t border-[#383A38]">
            <div className="bg-[#1E201E] rounded-xl p-4 border border-[#383A38] max-w-2xl">
              <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-[#D9DADF]">
                <KeyRound className="w-4 h-4 text-[#DD700B]" />
                <span>Have an Interview Invitation Token?</span>
              </div>
              <form onSubmit={handleJoinInterview} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={interviewToken}
                    onChange={(e) => {
                      setInterviewToken(e.target.value);
                      setTokenError("");
                    }}
                    placeholder="Enter interview token or ID (e.g. 31a8191b...)"
                    className="w-full px-3.5 py-2 bg-[#262826] border border-[#383A38] rounded-lg text-xs font-mono text-[#D9DADF] focus:outline-none focus:border-[#DD700B] placeholder:text-[#8A8B82]/60"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#DD700B] hover:bg-[#C25E06] text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>Launch Interview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
              {tokenError && (
                <p className="mt-2 text-xs font-semibold text-[#E57373] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {tokenError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar - Dark */}
        <div className="bg-[#242724] border border-[#383A38] rounded-2xl p-4 space-y-4 shadow-md">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8B82]" />
              <input
                type="text"
                placeholder="Search by title, department, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1E201E] border border-[#383A38] rounded-xl text-xs text-[#D9DADF] focus:outline-none focus:border-[#DD700B] placeholder:text-[#8A8B82]/60"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#8A8B82] self-start md:self-center">
              <span>Showing</span>
              <span className="px-2.5 py-1 bg-[#1E201E] border border-[#383A38] text-[#DD700B] rounded-lg font-mono font-bold text-xs">
                {filteredJobs.length}
              </span>
              <span>active {filteredJobs.length === 1 ? "position" : "positions"}</span>
            </div>
          </div>

          {/* Skill Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#383A38]">
              <span className="text-xs font-bold text-[#8A8B82] mr-1">Filter by Skill:</span>
              <button
                onClick={() => setSelectedTag("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedTag === "all"
                    ? "bg-[#DD700B] text-white shadow-sm"
                    : "bg-[#1E201E] hover:bg-[#2A2D2A] text-[#8A8B82] border border-[#383A38]"
                }`}
              >
                All Skills
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? "all" : tag)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedTag === tag
                      ? "bg-[#DD700B] text-white shadow-sm"
                      : "bg-[#1E201E] hover:bg-[#2A2D2A] text-[#8A8B82] border border-[#383A38]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Job Listings Grid - Dark Neumorphic */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-3 border-[#DD700B] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[#8A8B82]">Loading positions...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-[#242724] border border-dashed border-[#383A38] rounded-2xl p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-xl bg-[#1E201E] border border-[#383A38] flex items-center justify-center text-[#DD700B]">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#D9DADF]">No Active Positions Found</h3>
            <p className="text-xs text-[#8A8B82] max-w-md mx-auto">
              {searchTerm || selectedTag !== "all"
                ? "No roles match your search filters. Try clearing your search keyword."
                : "There are currently no active job openings posted. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => {
              const deadlineDate = job.deadline ? new Date(job.deadline) : null;
              const isDeadlineValid = deadlineDate && !isNaN(deadlineDate.getTime());

              return (
                <div
                  key={job.id}
                  className="rounded-2xl border border-[#383A38] bg-[#262826] hover:border-[#DD700B]/60 p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1E201E] border border-[#383A38] text-[11px] font-mono text-[#DD700B] mb-2">
                          <Building2 className="w-3 h-3" />
                          <span>{job.department || "Technology & Product"}</span>
                        </div>
                        <h2 className="text-xl font-bold text-[#D9DADF] group-hover:text-[#DD700B] transition-colors leading-snug">
                          {job.title}
                        </h2>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 bg-[#8FD19E]/15 text-[#8FD19E] border border-[#8FD19E]/30 rounded-full text-[11px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#8A8B82] leading-relaxed line-clamp-3">
                      {job.description}
                    </p>

                    {/* Skills */}
                    {Array.isArray(job.skills) && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-[#1E201E] text-[#8A8B82] border border-[#383A38] rounded-md text-[11px] font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & Apply CTA */}
                  <div className="pt-6 mt-6 border-t border-[#383A38] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#8A8B82]">
                      <Calendar className="w-3.5 h-3.5 text-[#DD700B]" />
                      <span>
                        Deadline:{" "}
                        {isDeadlineValid
                          ? deadlineDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Open"}
                      </span>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DD700B] hover:bg-[#C25E06] text-white font-bold text-xs rounded-xl transition-all shadow-sm group-hover:translate-x-0.5"
                    >
                      <span>View & Apply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer - Dark */}
      <footer className="border-t border-[#383A38] bg-[#1A1C1A] py-8 mt-16 text-center text-xs text-[#8A8B82]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} asanHire Sovereign AI Recruiting Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/" className="hover:text-[#DD700B] transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-[#DD700B] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
