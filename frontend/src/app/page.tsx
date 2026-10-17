"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { RobotWorker } from "@/components/brand/RobotWorker";
import { CollaborationIllustration } from "@/components/brand/CollaborationIllustration";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Shield,
  Mic,
  FileCheck2,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  Scale,
} from "lucide-react";

type TabId = "cockpit" | "rubrics" | "screening" | "integrity";

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  summary: string;
}

const TABS: TabItem[] = [
  {
    id: "cockpit",
    label: "Hiring Cockpit",
    icon: Users,
    summary: "Review candidate dossier, AI recommendations, and make final decisions.",
  },
  {
    id: "rubrics",
    label: "Job & Rubrics",
    icon: FileCheck2,
    summary: "Turn job descriptions into fair, objective criteria without personal bias.",
  },
  {
    id: "screening",
    label: "Voice Screening",
    icon: Mic,
    summary: "Real-time AI voice conversation with live speech-to-text transcription.",
  },
  {
    id: "integrity",
    label: "Integrity Radar",
    icon: Shield,
    summary: "Advisory anti-cheat telemetry and permanent audit records.",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("cockpit");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as TabId;
      if (hash && ["cockpit", "rubrics", "screening", "integrity"].includes(hash)) {
        setActiveTab(hash);
      }
    }
  }, []);

  const handleTabSelect = (tabId: TabId) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tabId}`);
      const target = document.getElementById("tab-panel");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex flex-col selection:bg-[#DD700B] selection:text-[#1E201E] overflow-x-hidden">
      {/* Top Navigation Bar: Logo on the FAR LEFT, 4 Sub-Tabs on the RIGHT */}
      <header className="sticky top-0 z-50 bg-[#1E201E] border-b border-[#343834]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Far Left: Noticeably Larger asanHire Logo */}
          <div className="shrink-0">
            <Logo variant="full" size="lg" href="/" priority />
          </div>

          {/* Far Right: 4 Core Recruiting Sub-Tabs */}
          <nav
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-2"
            aria-label="Recruiting sub-tabs"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSelect(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DD700B] ${
                    isActive
                      ? "bg-[#242724] text-[#FCF8D8] border border-[#DD700B]"
                      : "text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#242724]/60 border border-transparent"
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                      isActive ? "text-[#DD700B]" : "text-[#8A8B82]"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero Section: Left = Tagline + Guarantees, Right = Action Buttons + Robot below card */}
        <section className="pt-12 sm:pt-16 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Tagline & Plain-Language Copy */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Tagline with Load Animations, Elongated with Generous Spacing */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#D9DADF] leading-[1.3] sm:leading-[1.38] tracking-wider sm:tracking-widest flex flex-col gap-2">
                <span className="inline-block animate-slide-left text-[#D9DADF]">
                  AI recommends.
                </span>
                <span className="inline-block animate-slide-right text-[#DD700B]">
                  Human decides.
                </span>
              </h1>

              {/* Plain-Language Subtitle */}
              <p className="mt-6 text-base sm:text-lg text-[#8A8B82] max-w-xl leading-relaxed">
                Empower your hiring team with autonomous resume screening, objective rubrics, and real-time voice interviews — while every hire or rejection remains 100% under human recruiter control.
              </p>

              {/* Staggered Blur-to-Clear Animated Feature Lines with Generous Line Spacing */}
              <div className="mt-8 flex flex-col gap-4 sm:gap-5 text-sm sm:text-base text-[#D9DADF] leading-relaxed">
                <div className="flex items-center gap-3.5 feature-line-1">
                  <CheckCircle2 className="w-5 h-5 text-[#DD700B] shrink-0" />
                  <span className="tracking-wide">No automated rejections</span>
                </div>
                <div className="flex items-center gap-3.5 feature-line-2">
                  <CheckCircle2 className="w-5 h-5 text-[#DD700B] shrink-0" />
                  <span className="tracking-wide">Objective blind scoring</span>
                </div>
                <div className="flex items-center gap-3.5 feature-line-3">
                  <CheckCircle2 className="w-5 h-5 text-[#DD700B] shrink-0" />
                  <span className="tracking-wide">Advisory anti-cheat proctoring</span>
                </div>
              </div>
            </div>

            {/* Right Column: Action Buttons & Robot directly underneath the center */}
            <div className="lg:col-span-5 flex flex-col items-start sm:items-center lg:items-end gap-6 pt-2">
              {/* Action Buttons Box (Flat solid colors, thin crisp border, no heavy shadow) */}
              <div className="w-full max-w-md bg-[#242724] p-6 rounded-2xl border border-[#343834] flex flex-col gap-4">
                <div className="text-xs font-mono uppercase tracking-wider text-[#8A8B82]">
                  Recruiting Workspace
                </div>

                {/* Primary Action Button: Enter Recruiting Portal */}
                <Link href="/login" className="w-full">
                  <NeuButton
                    variant="primary"
                    size="lg"
                    className="w-full text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <span className="[word-spacing:0.25em] tracking-wide">Enter Recruiting Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </NeuButton>
                </Link>

                {/* Secondary Action Button: Launch Screening */}
                <Link href="/interview/demo-token" className="w-full">
                  <NeuButton
                    variant="secondary"
                    size="lg"
                    className="w-full text-sm flex items-center justify-center gap-2 border border-[#343834] hover:border-[#DD700B]"
                  >
                    <Mic className="w-4 h-4 text-[#DD700B]" />
                    <span className="[word-spacing:0.25em] tracking-wide">Launch Voice Screening</span>
                  </NeuButton>
                </Link>
              </div>

              {/* Robot with AH on its shirt: Positioned right under the CENTER of upper box recruiting workspace */}
              <div className="w-full max-w-md flex justify-center items-center pt-2 -ml-2 sm:-ml-4">
                <RobotWorker />
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Tabbed Content Section (Switches on click of the 4 sub-tabs) */}
        <section id="tab-panel" className="py-8 px-4 sm:px-6 max-w-7xl mx-auto w-full scroll-mt-24">
          {/* Active Tab Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-[#383A38] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#DD700B]">
                  Live Interactive Module
                </span>
                <span className="text-xs text-[#8A8B82]">&bull;</span>
                <span className="text-xs text-[#8A8B82]">
                  {TABS.find((t) => t.id === activeTab)?.summary}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#D9DADF] mt-1">
                {activeTab === "cockpit" && "Hiring Cockpit: Candidate Review & Human Veto"}
                {activeTab === "rubrics" && "Job & Rubrics: Objective Criteria Synthesis"}
                {activeTab === "screening" && "Voice Screening: Real-Time Audio Interview"}
                {activeTab === "integrity" && "Integrity Radar: Proctoring & Tamper-Proof Audit"}
              </h2>
            </div>

            {/* Quick Switcher Buttons */}
            <div className="flex items-center gap-1.5 self-start sm:self-center flex-wrap">
              {TABS.map((t) => {
                const Icon = t.icon;
                const isSelected = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTabSelect(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-[#DD700B] text-[#1E201E] font-bold"
                        : "bg-[#242724] text-[#8A8B82] hover:text-[#D9DADF] border border-[#343834]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: Hiring Cockpit */}
          {activeTab === "cockpit" && (
            <div className="bg-[#242724] rounded-2xl border border-[#343834] overflow-hidden animate-fade-in">
              <div className="bg-[#1E201E] px-6 py-3.5 border-b border-[#343834] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E57373]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FCF8D8]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#8FD19E]" />
                  <span className="text-xs font-mono text-[#8A8B82] ml-2">
                    Recruiter View &bull; Active Requisition: Senior Full-Stack Engineer
                  </span>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#DD700B]/20 text-[#DD700B] border border-[#DD700B]/30">
                  3 Candidates Shortlisted
                </span>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#1E201E]/60">
                {/* Candidate List (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                  {/* Candidate 1: Selected */}
                  <div className="bg-[#1E201E] border border-[#2E312E] p-4 rounded-xl border-l-4 border-l-[#DD700B] flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#D9DADF]">Alex Chen</h4>
                          <span className="tag-cream text-[10px]">Top Recommendation</span>
                        </div>
                        <p className="text-xs text-[#8A8B82] mt-0.5">
                          7 yrs exp &bull; Distributed Systems, TypeScript &amp; FastAPI
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#8FD19E]">92% Match</span>
                        <div className="text-[10px] text-[#8FD19E] font-mono">98% Trust Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#383A38] text-xs">
                      <div className="p-2 rounded bg-[#242724]">
                        <span className="text-[10px] text-[#8A8B82] block">Technical Rubric</span>
                        <span className="font-semibold text-[#D9DADF]">95 / 100</span>
                      </div>
                      <div className="p-2 rounded bg-[#242724]">
                        <span className="text-[10px] text-[#8A8B82] block">Voice Screening</span>
                        <span className="font-semibold text-[#D9DADF]">Completed (4/4)</span>
                      </div>
                      <div className="p-2 rounded bg-[#242724]">
                        <span className="text-[10px] text-[#8A8B82] block">Integrity Signals</span>
                        <span className="font-semibold text-[#8FD19E]">Clean &bull; 0 Flags</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate 2 */}
                  <div className="bg-[#1E201E] border border-[#2E312E] p-3.5 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div>
                      <h4 className="font-bold text-sm text-[#D9DADF]">Sarah Lin</h4>
                      <p className="text-xs text-[#8A8B82]">5 yrs exp &bull; Product Engineer</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#FCF8D8]">88% Match</span>
                      <div className="text-[10px] text-[#8A8B82] font-mono">Awaiting Review</div>
                    </div>
                  </div>

                  {/* Candidate 3 */}
                  <div className="bg-[#1E201E] border border-[#2E312E] p-3.5 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div>
                      <h4 className="font-bold text-sm text-[#D9DADF]">David Kim</h4>
                      <p className="text-xs text-[#8A8B82]">6 yrs exp &bull; Backend Specialist</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#D9DADF]">84% Match</span>
                      <div className="text-[10px] text-[#8A8B82] font-mono">Awaiting Review</div>
                    </div>
                  </div>
                </div>

                {/* Recruiter Decision Panel (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-[#1E201E] p-5 rounded-xl border border-[#383A38]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-[#DD700B]" />
                        <h4 className="text-xs font-mono uppercase tracking-wider text-[#D9DADF] font-bold">
                          Recruiter Final Decision
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-[#8FD19E] bg-[#8FD19E]/10 px-2 py-0.5 rounded">
                        Human Required
                      </span>
                    </div>

                    <p className="text-xs text-[#8A8B82] leading-relaxed mb-4">
                      AI only provides objective scoring and recommendations. As the recruiter, you have full sovereign veto to hire, hold, or reject.
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-[#232623]">
                        <span className="text-[#8A8B82]">AI Recommendation</span>
                        <span className="font-semibold text-[#8FD19E]">Strong Hire</span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded bg-[#232623]">
                        <span className="text-[#8A8B82]">Decision Status</span>
                        <span className="font-semibold text-[#FCF8D8]">Pending Human Confirmation</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#383A38]">
                    <span className="text-[11px] font-medium text-[#8A8B82] block mb-2.5">
                      Select Recruiter Action:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        className="py-2 px-3 rounded-lg bg-[#8FD19E]/20 text-[#8FD19E] hover:bg-[#8FD19E]/30 border border-[#8FD19E]/30 text-xs font-semibold transition-all"
                      >
                        Hire
                      </button>
                      <button
                        type="button"
                        className="py-2 px-3 rounded-lg bg-[#FCF8D8]/20 text-[#FCF8D8] hover:bg-[#FCF8D8]/30 border border-[#FCF8D8]/30 text-xs font-semibold transition-all"
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        className="py-2 px-3 rounded-lg bg-[#E57373]/20 text-[#E57373] hover:bg-[#E57373]/30 border border-[#E57373]/30 text-xs font-semibold transition-all"
                      >
                        Decline
                      </button>
                    </div>

                    <Link href="/login" className="block mt-4">
                      <NeuButton variant="primary" size="sm" className="w-full text-xs flex items-center justify-center gap-1.5">
                        <span>Open Full Dossier in Recruiter Portal</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </NeuButton>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Job & Rubrics */}
          {activeTab === "rubrics" && (
            <div className="bg-[#242724] rounded-2xl border border-[#343834] p-6 sm:p-8 animate-fade-in">
              <div className="max-w-3xl mb-8">
                <span className="text-xs font-mono uppercase text-[#DD700B] font-bold tracking-wider">
                  Objective Evaluation Criteria
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#D9DADF] mt-1 mb-2">
                  Transparent Rubric Scoring Without Personal Bias
                </h3>
                <p className="text-sm text-[#8A8B82] leading-relaxed">
                  asanHire turns unstructured job descriptions into standardized, weighted scoring dimensions. Resumes are evaluated strictly on verified skills and real experience — without personal demographics or bias.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Rubric Dimension 1 */}
                <div className="bg-[#1E201E] border border-[#2E312E] p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#DD700B] uppercase font-mono">Weight: 40%</span>
                      <span className="w-2 h-2 rounded-full bg-[#DD700B]" />
                    </div>
                    <h4 className="font-bold text-sm text-[#D9DADF] mb-1.5">Core Engineering &amp; Concurrency</h4>
                    <p className="text-xs text-[#8A8B82] leading-relaxed">
                      Evaluates distributed system design, race condition prevention, and fault tolerance in high-throughput environments.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#383A38] text-[11px] text-[#FCF8D8]">
                    Must-Have: Redis, PostgreSQL, Distributed Locks
                  </div>
                </div>

                {/* Rubric Dimension 2 */}
                <div className="bg-[#1E201E] border border-[#2E312E] p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#FCF8D8] uppercase font-mono">Weight: 35%</span>
                      <span className="w-2 h-2 rounded-full bg-[#FCF8D8]" />
                    </div>
                    <h4 className="font-bold text-sm text-[#D9DADF] mb-1.5">Modern Full-Stack Architecture</h4>
                    <p className="text-xs text-[#8A8B82] leading-relaxed">
                      Measures proficiency with Next.js App Router, clean API contracts, state management, and responsive design.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#383A38] text-[11px] text-[#FCF8D8]">
                    Must-Have: TypeScript, Next.js, Python FastAPI
                  </div>
                </div>

                {/* Rubric Dimension 3 */}
                <div className="bg-[#1E201E] border border-[#2E312E] p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#8FD19E] uppercase font-mono">Weight: 25%</span>
                      <span className="w-2 h-2 rounded-full bg-[#8FD19E]" />
                    </div>
                    <h4 className="font-bold text-sm text-[#D9DADF] mb-1.5">Problem Solving &amp; Integrity</h4>
                    <p className="text-xs text-[#8A8B82] leading-relaxed">
                      Evaluates articulate technical communication, architectural trade-off justification, and interview integrity telemetry.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#383A38] text-[11px] text-[#FCF8D8]">
                    Verified via: Live Voice Interview &amp; Radar
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#383A38]">
                <div className="flex items-center gap-2 text-xs text-[#8A8B82]">
                  <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                  <span>Customizable per department and role level</span>
                </div>
                <Link href="/login">
                  <NeuButton variant="primary" size="sm" className="text-xs">
                    Create Custom Job Rubric
                  </NeuButton>
                </Link>
              </div>
            </div>
          )}

          {/* Tab 3: Voice Screening */}
          {activeTab === "screening" && (
            <div className="bg-[#242724] rounded-2xl border border-[#343834] p-6 sm:p-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Voice Visualizer Demo (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="bg-[#1E201E] border border-[#2E312E] p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#DD700B] animate-pulse" />
                        <span className="text-xs font-semibold text-[#D9DADF]">AI Interviewer Speaking</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8A8B82]">Question 2 of 4</span>
                    </div>

                    <div className="p-4 rounded-lg bg-[#242724] border border-[#343834] text-sm text-[#FCF8D8] leading-relaxed">
                      &quot;How do you guarantee idempotency and avoid race conditions in distributed payment webhooks?&quot;
                    </div>

                    {/* Audio Waveform */}
                    <div className="my-5 flex items-center justify-center gap-1.5 h-10">
                      {[30, 65, 40, 85, 55, 95, 45, 100, 50, 90, 35, 75, 60, 45, 80, 50, 70, 30].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-[#DD700B] rounded-full transition-all duration-300"
                            style={{ height: `${h}%`, opacity: 0.4 + (h / 100) * 0.6 }}
                          />
                        )
                      )}
                    </div>

                    {/* Live STT Transcript */}
                    <div className="p-3.5 rounded-lg bg-[#1E201E] border border-[#343834]">
                      <span className="text-[10px] uppercase font-mono text-[#8A8B82] block mb-1">
                        Candidate Answer (Live Speech-to-Text)
                      </span>
                      <p className="text-xs text-[#D9DADF] italic">
                        &quot;We store idempotency keys in Redis with expiration windows and use atomic CAS operations before dispatching settlement events...&quot;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Screening Benefits (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div>
                    <span className="text-xs font-mono uppercase text-[#DD700B] font-bold tracking-wider">
                      Fatigue-Free Screening
                    </span>
                    <h3 className="text-xl font-bold text-[#D9DADF] mt-1 mb-2">
                      Converse Naturally, Anytime
                    </h3>
                    <p className="text-xs sm:text-sm text-[#8A8B82] leading-relaxed">
                      Candidates can take interviews at their own schedule via browser voice chat with zero latency. Recruiters receive full audio playback, transcripts, and verified rubric alignment.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#D9DADF]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                      <span>Web Speech recognition &amp; audio playback</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                      <span>Editable typed fallback for accessibility</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                      <span>Zero score leaks to candidates during screen</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/interview/demo-token">
                      <NeuButton variant="primary" size="md" className="text-xs flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5" />
                        <span>Launch Candidate Demo Room</span>
                      </NeuButton>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Integrity Radar */}
          {activeTab === "integrity" && (
            <div className="bg-[#242724] rounded-2xl border border-[#343834] p-6 sm:p-8 animate-fade-in">
              <div className="max-w-3xl mb-8">
                <span className="text-xs font-mono uppercase text-[#DD700B] font-bold tracking-wider">
                  Fair &amp; Respectful Proctoring
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#D9DADF] mt-1 mb-2">
                  Guardian Integrity Radar &amp; Immutable Audit Trail
                </h3>
                <p className="text-sm text-[#8A8B82] leading-relaxed">
                  asanHire monitors session integrity (such as tab switches, fullscreen status, and paste injections) without invasive screen capture or abrupt disconnects. Every signal is purely advisory for human recruiters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#1E201E] border border-[#2E312E] p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#8FD19E]">98%</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Trust Score</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">High integrity session</div>
                </div>

                <div className="bg-[#1E201E] border border-[#2E312E] p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#FCF8D8]">0</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Tab Switches</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">Continuous focus</div>
                </div>

                <div className="bg-[#1E201E] border border-[#2E312E] p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#8FD19E]">Passed</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Prompt Injection Shield</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">Clean candidate inputs</div>
                </div>

                <div className="bg-[#1E201E] border border-[#2E312E] p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#DD700B]">100%</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Audit Trail</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">Immutable record</div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-[#1E201E] border border-[#343834] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-[#DD700B] shrink-0" />
                  <p className="text-xs text-[#8A8B82]">
                    <strong className="text-[#D9DADF]">The Sovereignty Guarantee:</strong> Guardian signals never trigger automatic disqualification. They provide transparency so your human team can decide fairly.
                  </p>
                </div>
                <Link href="/login" className="shrink-0">
                  <NeuButton variant="secondary" size="sm" className="text-xs">
                    View Audit Logs
                  </NeuButton>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Human Recruiter & AI Robot Interview Orchestration (Replaces Simple 3-Step Section) */}
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <CollaborationIllustration />
        </section>

        {/* Clear Primary Call to Action */}
        <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
          <div className="bg-[#242724] p-8 sm:p-12 rounded-3xl border border-[#343834] flex flex-col items-center gap-5">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#D9DADF]">
              Ready to Accelerate Your Hiring?
            </h2>
            <p className="text-sm sm:text-base text-[#8A8B82] max-w-lg">
              Experience the clarity of autonomous candidate screening with guaranteed human decision control.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/login">
                <NeuButton
                  size="lg"
                  variant="primary"
                  className="px-7 py-3 text-sm font-semibold flex items-center gap-2"
                >
                  <span className="[word-spacing:0.25em] tracking-wide">Enter Recruiting Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </NeuButton>
              </Link>
              <Link href="/interview/demo-token">
                <NeuButton
                  size="lg"
                  variant="secondary"
                  className="px-6 py-3 text-sm border border-[#343834]"
                >
                  <Mic className="w-4 h-4 text-[#DD700B] mr-2" />
                  <span className="[word-spacing:0.25em] tracking-wide">Try Voice Screening</span>
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: Crisp Logo, Tagline, Simple Navigation */}
      <footer className="border-t border-[#D9DADF]/10 bg-[#1A1C1A] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Logo variant="full" size="sm" href="/" priority />
            <span className="text-xs text-[#8A8B82] sm:border-l sm:border-[#383A38] sm:pl-4">
              AI recommends, human decides &bull; Sovereign Recruitment Platform
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#8A8B82]">
            <Link href="/login" className="hover:text-[#DD700B] transition-colors">
              Recruiter Portal
            </Link>
            <Link href="/interview/demo-token" className="hover:text-[#DD700B] transition-colors">
              Candidate Screening
            </Link>
            <Link href="/hr/design-check" className="hover:text-[#DD700B] transition-colors">
              Design System
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-[#383A38]/50 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-[#8A8B82]">
          <p>&copy; {new Date().getFullYear()} asanHire Inc. All rights reserved.</p>
          <p className="font-mono text-[#8A8B82]">
            Palette: #1E201E &bull; #262826 &bull; #DD700B &bull; #FCF8D8 &bull; #D9DADF
          </p>
        </div>
      </footer>
    </div>
  );
}
