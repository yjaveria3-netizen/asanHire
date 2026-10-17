"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { NeuBadge } from "@/components/neu/NeuBadge";
import {
  Briefcase,
  Search,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Clock,
  Video,
  Sparkles,
  Building2,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  KeyRound,
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

  useEffect(() => {
    // 1. Fetch current user session
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata || {};
        setCurrentUser({
          email: user.email || "",
          role: meta.role || "candidate",
          full_name: meta.full_name || user.email?.split("@")[0] || "Candidate",
        });
      }
    });

    // 2. Fetch active public jobs
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getPublicJobs();
      if (data && Array.isArray(data) && data.length > 0) {
        setJobs(data);
      } else {
        // Fallback demo job if no jobs in database yet
        setJobs([
          {
            id: "senior-ai-fullstack-engineer",
            title: "Senior AI / Full-Stack Engineer",
            department: "Engineering & Applied AI",
            description:
              "Build next-generation sovereign AI recruiting workflows, LLM evaluators, and proctored automated interview pipelines using Next.js, FastAPI, and Groq.",
            requirements: "Experience with Python, Next.js, WebRTC, LLM prompt engineering, and PostgreSQL.",
            skills: ["Python", "FastAPI", "Next.js", "TypeScript", "AI / LLMs"],
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

  // Extract unique skills/tags across all jobs
  const allTags = Array.from(
    new Set(
      jobs.flatMap((j) => (Array.isArray(j.skills) ? j.skills : []))
    )
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
    <div className="min-h-screen bg-[#FDFCFB] text-[#1F1E1D] flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-[#FDFCFB]/90 backdrop-blur-md border-b border-[#EADFD6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <Logo />
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#F4EDE4] border border-[#E2D2C3] rounded-full text-xs font-semibold text-[#8C4308]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Candidate Career Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#66605B] hover:text-[#1F1E1D] bg-[#F7F3EE] hover:bg-[#EFE8DF] border border-[#EADFD6] rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-[#EADFD6]">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-bold text-[#1F1E1D]">
                    {currentUser.full_name || currentUser.email}
                  </span>
                  <span className="text-xs text-[#8C4308] font-semibold flex items-center justify-end gap-1">
                    <UserCheck className="w-3 h-3" /> Candidate Account
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-2.5 text-[#8A3B14] hover:bg-[#FBEAE5] border border-[#F3C4B3] rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-bold text-[#DD700B] bg-[#FDF0E2] hover:bg-[#F9E2C7] border border-[#EAC29E] rounded-xl transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAF5EE] via-[#F6EDE2] to-[#ECE0D0] border-2 border-[#DEC9B5] p-8 sm:p-12 shadow-sm">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF]/80 border border-[#DEC9B5] text-xs font-bold text-[#8C4308] shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#DD700B]" />
              <span>Bias-Free Autonomous Hiring • Instant AI Review</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1F1E1D] tracking-tight">
              Explore Active Career Openings
            </h1>
            <p className="text-base sm:text-lg text-[#554F49] font-medium leading-relaxed">
              Welcome to the asanHire candidate hub. Browse live roles, submit your resume for instant AI rubric matching, or join your scheduled AI-proctored technical interview directly.
            </p>
          </div>

          {/* Quick Interview Launcher Card */}
          <div className="mt-8 pt-8 border-t border-[#DEC9B5]/80">
            <div className="bg-[#FFFFFF]/90 backdrop-blur-sm rounded-2xl p-5 border border-[#DEC9B5] max-w-2xl shadow-sm">
              <div className="flex items-center gap-2.5 mb-3 text-[#1F1E1D] font-bold text-base">
                <Video className="w-5 h-5 text-[#DD700B]" />
                <span>Have an Interview Invitation Token?</span>
              </div>
              <form onSubmit={handleJoinInterview} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
                  <input
                    type="text"
                    value={interviewToken}
                    onChange={(e) => {
                      setInterviewToken(e.target.value);
                      setTokenError("");
                    }}
                    placeholder="Paste your 8-digit interview token (e.g. abcd-1234)"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#DEC9B5] rounded-xl text-sm font-semibold text-[#1F1E1D] focus:outline-none focus:ring-2 focus:ring-[#DD700B]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#DD700B] hover:bg-[#C25E06] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
                >
                  <span>Launch Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
              {tokenError && (
                <p className="mt-2 text-xs font-semibold text-[#B92A1D] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {tokenError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#FFFFFF] border-2 border-[#EADFD6] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
              <input
                type="text"
                placeholder="Search job title, skills, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#DEC9B5] rounded-xl text-sm font-medium text-[#1F1E1D] focus:outline-none focus:ring-2 focus:ring-[#DD700B]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#66605B] self-start md:self-center">
              <span>Showing</span>
              <span className="px-2.5 py-1 bg-[#F4EDE4] text-[#1F1E1D] rounded-lg font-black text-sm">
                {filteredJobs.length}
              </span>
              <span>active {filteredJobs.length === 1 ? "position" : "positions"}</span>
            </div>
          </div>

          {/* Skill Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2EAE1]">
              <span className="text-xs font-bold text-[#8C827A] mr-1">Filter by Skill:</span>
              <button
                onClick={() => setSelectedTag("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedTag === "all"
                    ? "bg-[#DD700B] text-white shadow-sm"
                    : "bg-[#F7F3EE] hover:bg-[#EFE8DF] text-[#66605B] border border-[#EADFD6]"
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
                      : "bg-[#F7F3EE] hover:bg-[#EFE8DF] text-[#66605B] border border-[#EADFD6]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Job Listings Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-[#DD700B] border-t-transparent rounded-full animate-spin" />
            <p className="text-base font-bold text-[#66605B]">Loading active career opportunities...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-[#FFFFFF] border-2 border-dashed border-[#DEC9B5] rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FAF5EE] flex items-center justify-center text-[#DD700B]">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#1F1E1D]">No Active Jobs Found</h3>
            <p className="text-sm font-medium text-[#66605B] max-w-md mx-auto">
              {searchTerm || selectedTag !== "all"
                ? "No roles match your search filters. Try clearing your search term or selecting a different skill filter."
                : "There are currently no open positions posted. Check back soon for new career opportunities!"}
            </p>
            {(searchTerm || selectedTag !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTag("all");
                }}
                className="mt-2 px-4 py-2 bg-[#F4EDE4] hover:bg-[#EAE0D4] text-[#1F1E1D] font-bold text-xs rounded-xl transition-all"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => {
              const deadlineDate = job.deadline ? new Date(job.deadline) : null;
              const isDeadlineValid = deadlineDate && !isNaN(deadlineDate.getTime());

              return (
                <div
                  key={job.id}
                  className="bg-[#FFFFFF] border-2 border-[#EADFD6] hover:border-[#DD700B] rounded-2xl p-6 transition-all duration-200 hover:shadow-md flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FAF4ED] border border-[#DEC9B5] text-[11px] font-bold text-[#8C4308] mb-2">
                          <Building2 className="w-3 h-3" />
                          <span>{job.department || "Technology & Product"}</span>
                        </div>
                        <h2 className="text-xl font-black text-[#1F1E1D] group-hover:text-[#DD700B] transition-colors leading-snug">
                          {job.title}
                        </h2>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-full text-xs font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#554F49] font-normal leading-relaxed line-clamp-3">
                      {job.description}
                    </p>

                    {/* Skill Tags */}
                    {Array.isArray(job.skills) && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-[#F7F3EE] text-[#443E3A] border border-[#EADFD6] rounded-lg text-xs font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & Apply CTA */}
                  <div className="pt-6 mt-6 border-t border-[#F2EAE1] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8C827A]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Deadline:{" "}
                        {isDeadlineValid
                          ? deadlineDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Open until filled"}
                      </span>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#DD700B] hover:bg-[#C25E06] text-white font-bold text-xs rounded-xl transition-all shadow-sm group-hover:translate-x-0.5"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EADFD6] bg-[#FAF8F5] py-8 mt-16 text-center text-xs font-semibold text-[#8C827A]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} asanHire Sovereign AI Recruiting Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#1F1E1D] transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-[#1F1E1D] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
