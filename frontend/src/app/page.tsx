"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { RobotWorker } from "@/components/brand/RobotWorker";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Shield,
  Mic,
  FileCheck2,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  ChevronRight,
  BarChart3,
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

  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex flex-col selection:bg-[#DD700B] selection:text-[#1E201E] overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-8%] left-[15%] w-[480px] h-[480px] rounded-full bg-[#DD700B]/5 blur-[140px]" />
        <div className="absolute top-[35%] right-[10%] w-[420px] h-[420px] rounded-full bg-[#FCF8D8]/4 blur-[160px]" />
      </div>

      {/* Top Navigation Bar: 4 tabs on the LEFT, Logo on the RIGHT (No clickable buttons) */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#1E201E]/90 border-b border-[#D9DADF]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Left Side: 4 Core Recruiting Tabs */}
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DD700B] ${
                    isActive
                      ? "bg-[#2A2D2A] text-[#FCF8D8] border border-[#DD700B]/50 shadow-[0_2px_12px_rgba(221,112,11,0.2)]"
                      : "text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#232623]/70 border border-transparent"
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] shadow-[0_0_6px_#DD700B]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side: asanHire Logo only (No clickable buttons) */}
          <div className="shrink-0 pl-2">
            <Logo variant="full" size="md" href="/" priority />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero Section: Left = Tagline, Right = Action Buttons + Friendly Robot Mascot */}
        <section className="pt-12 sm:pt-16 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Tagline & Plain-Language Copy */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#262826] border border-[#DD700B]/30 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#DD700B] animate-pulse" />
                <span className="text-xs font-medium text-[#D9DADF]">
                  100% Human Final Decision Control &bull; Fair AI Scoring
                </span>
              </div>

              {/* Tagline with Load Animations */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#D9DADF] leading-[1.15]">
                <span className="inline-block animate-slide-left text-[#D9DADF]">
                  AI recommends.
                </span>{" "}
                <span className="inline-block animate-slide-right bg-gradient-to-r from-[#DD700B] via-[#E88930] to-[#FCF8D8] bg-clip-text text-transparent">
                  Human decides.
                </span>
              </h1>

              {/* Plain-Language Subtitle */}
              <p className="mt-5 text-base sm:text-lg text-[#8A8B82] max-w-xl leading-relaxed">
                Empower your hiring team with autonomous resume screening, objective rubrics, and real-time voice interviews — while every hire or rejection remains 100% under human recruiter control.
              </p>

              {/* Quick Key Guarantees */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[#D9DADF]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#DD700B]" />
                  <span>No automated rejections</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#DD700B]" />
                  <span>Objective blind scoring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#DD700B]" />
                  <span>Advisory anti-cheat proctoring</span>
                </div>
              </div>
            </div>

            {/* Right Column: Action Buttons & Friendly Robot Worker on Laptop */}
            <div className="lg:col-span-5 flex flex-col items-start sm:items-center lg:items-end gap-6">
              {/* Action Buttons Box */}
              <div className="w-full max-w-md neu-raised p-6 rounded-2xl border border-[rgba(217,218,223,0.08)] flex flex-col gap-3.5">
                <div className="text-xs font-mono uppercase tracking-wider text-[#8A8B82] mb-1">
                  Start In Seconds
                </div>

                {/* Primary Action Button: Enter Recruiting Portal */}
                <Link href="/login" className="w-full">
                  <NeuButton
                    variant="primary"
                    size="lg"
                    className="w-full text-sm font-semibold shadow-[0_4px_16px_rgba(221,112,11,0.35)] flex items-center justify-center gap-2"
                  >
                    <span>Enter Recruiting Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </NeuButton>
                </Link>

                {/* Secondary Action Button: Launch Screening */}
                <Link href="/interview/demo-token" className="w-full">
                  <NeuButton
                    variant="secondary"
                    size="lg"
                    className="w-full text-sm flex items-center justify-center gap-2 border border-[#383A38] hover:border-[#DD700B]/40"
                  >
                    <Mic className="w-4 h-4 text-[#DD700B]" />
                    <span>Launch Voice Screening</span>
                  </NeuButton>
                </Link>

                <p className="text-[11px] text-[#8A8B82] text-center mt-1">
                  No credit card required &bull; Ready-to-test candidate room included
                </p>
              </div>

              {/* Decorative Element: Small Friendly Robot Mascot on Laptop with Soft Drifting Dots */}
              <div className="w-full max-w-md flex items-center justify-center pt-2">
                <RobotWorker />
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Tabbed Content Section (Switches on click of the 4 sub-tabs) */}
        <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto w-full">
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

            {/* Quick Switcher Indicators */}
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  aria-label={`Switch to ${t.label}`}
                  className={`h-2 rounded-full transition-all ${
                    activeTab === t.id ? "w-6 bg-[#DD700B]" : "w-2 bg-[#383A38] hover:bg-[#8A8B82]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tab 1: Hiring Cockpit */}
          {activeTab === "cockpit" && (
            <div className="neu-raised rounded-2xl border border-[rgba(217,218,223,0.08)] overflow-hidden shadow-2xl animate-fade-in">
              <div className="bg-[#232623] px-6 py-3.5 border-b border-[#383A38] flex items-center justify-between">
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
                  <div className="neu-inset p-4 rounded-xl border-l-4 border-l-[#DD700B] flex flex-col gap-3">
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
                      <div className="p-2 rounded bg-[#2A2D2A]">
                        <span className="text-[10px] text-[#8A8B82] block">Technical Rubric</span>
                        <span className="font-semibold text-[#D9DADF]">95 / 100</span>
                      </div>
                      <div className="p-2 rounded bg-[#2A2D2A]">
                        <span className="text-[10px] text-[#8A8B82] block">Voice Screening</span>
                        <span className="font-semibold text-[#D9DADF]">Completed (4/4)</span>
                      </div>
                      <div className="p-2 rounded bg-[#2A2D2A]">
                        <span className="text-[10px] text-[#8A8B82] block">Integrity Signals</span>
                        <span className="font-semibold text-[#8FD19E]">Clean &bull; 0 Flags</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate 2 */}
                  <div className="neu-raised p-3.5 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
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
                  <div className="neu-raised p-3.5 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
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
                <div className="lg:col-span-5 flex flex-col justify-between neu-raised p-5 rounded-xl border border-[#383A38]">
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
            <div className="neu-raised rounded-2xl border border-[rgba(217,218,223,0.08)] p-6 sm:p-8 animate-fade-in">
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
                <div className="neu-inset p-5 rounded-xl flex flex-col justify-between">
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
                <div className="neu-inset p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#FCF8D8] uppercase font-mono">Weight: 35%</span>
                      <span className="w-2 h-2 rounded-full bg-[#FCF8D8]" />
                    </div>
                    <h4 className="font-bold text-sm text-[#D9DADF] mb-1.5">Modern Full-Stack Architecture</h4>
                    <p className="text-xs text-[#8A8B82] leading-relaxed">
                      Measures proficiency with Next.js App Router, clean API contracts, state management, and responsive neumorphic design.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#383A38] text-[11px] text-[#FCF8D8]">
                    Must-Have: TypeScript, Next.js, Python FastAPI
                  </div>
                </div>

                {/* Rubric Dimension 3 */}
                <div className="neu-inset p-5 rounded-xl flex flex-col justify-between">
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
            <div className="neu-raised rounded-2xl border border-[rgba(217,218,223,0.08)] p-6 sm:p-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Voice Visualizer Demo (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="neu-inset p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#DD700B] animate-pulse" />
                        <span className="text-xs font-semibold text-[#D9DADF]">AI Interviewer Speaking</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8A8B82]">Question 2 of 4</span>
                    </div>

                    <div className="p-4 rounded-lg bg-[#2A2D2A] border border-[#383A38] text-sm text-[#FCF8D8] leading-relaxed">
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
                    <div className="p-3.5 rounded-lg bg-[#1E201E] border border-[#383A38]">
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
            <div className="neu-raised rounded-2xl border border-[rgba(217,218,223,0.08)] p-6 sm:p-8 animate-fade-in">
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
                <div className="neu-inset p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#8FD19E]">98%</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Trust Score</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">High integrity session</div>
                </div>

                <div className="neu-inset p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#FCF8D8]">0</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Tab Switches</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">Continuous focus</div>
                </div>

                <div className="neu-inset p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#8FD19E]">Passed</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Prompt Injection Shield</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">Clean candidate inputs</div>
                </div>

                <div className="neu-inset p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#DD700B]">100%</div>
                  <div className="text-xs text-[#D9DADF] font-semibold mt-1">Audit Trail</div>
                  <div className="text-[10px] text-[#8A8B82] mt-0.5">Immutable record</div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-xl bg-[#232623] border border-[#383A38] flex flex-col sm:flex-row items-center justify-between gap-4">
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

        {/* Simplified 3-Step Workflow: Plain-Language & Spacious */}
        <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#DD700B] mb-2 font-bold">
              Simple 3-Step Hiring
            </h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#D9DADF]">
              How asanHire Simplifies Your Recruitment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="neu-inset p-6 rounded-2xl flex flex-col gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#DD700B] text-[#1E201E] font-extrabold flex items-center justify-center text-sm shadow-[0_2px_8px_rgba(221,112,11,0.3)]">
                1
              </span>
              <h4 className="font-bold text-base text-[#D9DADF]">Define Criteria</h4>
              <p className="text-xs sm:text-sm text-[#8A8B82] leading-relaxed">
                Post your job description. The platform synthesizes an objective scoring rubric with weighted skills.
              </p>
            </div>

            {/* Step 2 */}
            <div className="neu-inset p-6 rounded-2xl flex flex-col gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#DD700B] text-[#1E201E] font-extrabold flex items-center justify-center text-sm shadow-[0_2px_8px_rgba(221,112,11,0.3)]">
                2
              </span>
              <h4 className="font-bold text-base text-[#D9DADF]">Autonomous Screening</h4>
              <p className="text-xs sm:text-sm text-[#8A8B82] leading-relaxed">
                Candidates complete a browser-based voice interview with anti-cheat monitoring on their own schedule.
              </p>
            </div>

            {/* Step 3 */}
            <div className="neu-inset p-6 rounded-2xl flex flex-col gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#DD700B] text-[#1E201E] font-extrabold flex items-center justify-center text-sm shadow-[0_2px_8px_rgba(221,112,11,0.3)]">
                3
              </span>
              <h4 className="font-bold text-base text-[#D9DADF]">Human Decides</h4>
              <p className="text-xs sm:text-sm text-[#8A8B82] leading-relaxed">
                Recruiters review AI rankings, listen to interview snippets, and execute final hiring decisions with one click.
              </p>
            </div>
          </div>
        </section>

        {/* Clear Primary Call to Action */}
        <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
          <div className="neu-raised p-8 sm:p-12 rounded-3xl border border-[#DD700B]/30 flex flex-col items-center gap-5">
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
                  className="shadow-[0_4px_20px_rgba(221,112,11,0.4)] px-7 py-3 text-sm font-semibold flex items-center gap-2"
                >
                  <span>Enter Recruiting Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </NeuButton>
              </Link>
              <Link href="/interview/demo-token">
                <NeuButton
                  size="lg"
                  variant="secondary"
                  className="px-6 py-3 text-sm border border-[#383A38]"
                >
                  <Mic className="w-4 h-4 text-[#DD700B] mr-2" />
                  Try Voice Screening
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
