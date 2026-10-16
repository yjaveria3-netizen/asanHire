"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Sparkles,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  UserCheck,
  Calendar,
} from "lucide-react";

// OWNER: M1 (frontend developer)
export default function LandingPage() {
  const agents = [
    {
      name: "Rubric Agent",
      model: "Gemini 1.5",
      icon: Sparkles,
      desc: "Synthesizes job descriptions into weighted, measurable evaluation criteria.",
    },
    {
      name: "Resume Matcher",
      model: "Gemini 1.5",
      icon: UserCheck,
      desc: "Scores resumes objectively with prompt injection detection and gap analysis.",
    },
    {
      name: "Auto Scheduler",
      model: "Rule-based Code",
      icon: Calendar,
      desc: "Auto-invites top N qualified candidates at deadline via transactional email.",
    },
    {
      name: "Interview Agent",
      model: "Groq Llama 3.3",
      icon: Clock,
      desc: "Conversational voice screening with ultra-low latency inference.",
    },
    {
      name: "Guardian Proctor",
      model: "Rule-based Code",
      icon: Shield,
      desc: "Monitors fullscreen, tab switches, and paste events to compute a Trust Score.",
    },
    {
      name: "Supervisor Agent",
      model: "Gemini 1.5",
      icon: CheckCircle2,
      desc: "Synthesizes complete dossier into an executive report with Hire/Reject recommendation.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#1E201E] flex flex-col justify-between selection:bg-[#DD700B] selection:text-[#1E201E]">
      {/* Header with large 'full' logo */}
      <header className="px-6 py-5 border-b border-[#D9DADF]/5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Logo variant="full" size="md" href="/" priority />

        <div className="flex items-center gap-3">
          <Link href="/hr/design-check">
            <NeuButton variant="ghost" size="sm">
              Design System
            </NeuButton>
          </Link>
          <Link href="/hr">
            <NeuButton variant="primary" size="sm">
              HR Portal <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </NeuButton>
          </Link>
        </div>
      </header>

      {/* Hero Section with big 'mark' logo */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1 flex flex-col items-center text-center justify-center">
        {/* Big Mark Logo in Hero */}
        <div className="mb-6 flex justify-center">
          <Logo variant="mark" size="xl" href={null} priority />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(252,248,216,0.12)] border border-[#FCF8D8]/30 text-[#FCF8D8] text-xs font-medium mb-6">
          <Lock className="w-3.5 h-3.5 text-[#DD700B]" />
          <span>Human Sovereignty in AI Hiring &bull; Reversible Decisions</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#D9DADF] max-w-4xl leading-tight">
          AI Recommends. <span className="text-[#DD700B]">Human Decides.</span>
        </h1>

        <p className="mt-5 text-base md:text-lg text-[#8A8B82] max-w-2xl leading-relaxed">
          asanHire orchestrates the entire recruitment funnel: from automated rubric synthesis and
          resume parsing to Groq-powered voice screening and Guardian integrity proctoring.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link href="/jobs/11111111-1111-1111-1111-111111111111">
            <NeuButton variant="primary" size="lg">
              View Demo Job & Apply
            </NeuButton>
          </Link>
          <Link href="/interview/demo-sample-token">
            <NeuButton variant="secondary" size="lg">
              Test Interview Room
            </NeuButton>
          </Link>
        </div>

        {/* 6 Agents Grid */}
        <div className="w-full mt-20 text-left">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8B82]">
              Specialized Multi-Agent Mesh
            </h2>
            <span className="text-xs text-[#DD700B] font-mono">6 Agents Cooperating</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent, i) => {
              const Icon = agent.icon;
              return (
                <NeuCard key={i} variant="raised" className="flex flex-col gap-3 group hover:border-[#DD700B]/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#242724] neu-inset flex items-center justify-center text-[#DD700B]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#242724] text-[#8A8B82]">
                      {agent.model}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#D9DADF] group-hover:text-[#DD700B] transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-[#8A8B82] mt-1 leading-relaxed">{agent.desc}</p>
                  </div>
                </NeuCard>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9DADF]/5 py-6 px-6 text-center text-xs text-[#8A8B82] max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo variant="mark" size="sm" href="/" />
          <span>&copy; 2026 asanHire &bull; Neumorphic Dark (Frozen Mist) Theme</span>
        </div>
        <div className="flex gap-4">
          <Link href="/hr" className="hover:text-[#D9DADF] transition-colors">HR Dashboard</Link>
          <Link href="/hr/design-check" className="hover:text-[#D9DADF] transition-colors">Design System</Link>
        </div>
      </footer>
    </div>
  );
}
