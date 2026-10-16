import React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Shield,
  Bot,
  Sparkles,
  ArrowRight,
  Mic,
  FileText,
  Lock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Activity,
  UserCheck,
  Workflow,
  Eye,
  Sliders,
  Terminal,
  Zap,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex flex-col selection:bg-[#DD700B] selection:text-[#1E201E] overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#DD700B]/5 blur-[140px]" />
        <div className="absolute top-[40%] right-[10%] w-[450px] h-[450px] rounded-full bg-[#FCF8D8]/3 blur-[160px]" />
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#1E201E]/80 border-b border-[#D9DADF]/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo variant="full" size="md" href="/" priority />
            <nav className="hidden md:flex items-center gap-6 text-sm text-[#8A8B82]">
              <a href="#features" className="hover:text-[#D9DADF] transition-colors">
                Agents
              </a>
              <a href="#preview" className="hover:text-[#D9DADF] transition-colors">
                Platform Preview
              </a>
              <a href="#workflow" className="hover:text-[#D9DADF] transition-colors">
                Workflow
              </a>
              <a href="#sovereignty" className="hover:text-[#D9DADF] transition-colors">
                Sovereignty
              </a>
              <Link href="/hr/design-check" className="hover:text-[#DD700B] transition-colors flex items-center gap-1">
                Design System <ExternalLink className="w-3 h-3" />
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/interview/demo-token">
              <NeuButton size="sm" variant="ghost" className="text-xs hidden sm:flex items-center gap-1.5 border border-[#D9DADF]/10 hover:border-[#DD700B]/40">
                <Mic className="w-3.5 h-3.5 text-[#DD700B]" />
                <span>Candidate Demo</span>
              </NeuButton>
            </Link>
            <Link href="/login">
              <NeuButton size="sm" variant="primary" className="text-xs shadow-[0_2px_12px_rgba(221,112,11,0.35)]">
                <span>Recruiter Portal</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </NeuButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
          {/* Top Announcement Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#2A2D2A] border border-[#DD700B]/30 shadow-inset mb-8">
            <span className="flex h-2 w-2 rounded-full bg-[#DD700B] animate-pulse" />
            <span className="text-xs font-medium text-[#D9DADF]">
              Autonomous Multi-Agent Recruitment &bull; Groq Llama 3 &bull; FastMCP Architecture
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#D9DADF] max-w-4xl leading-[1.1]">
            AI Recommends.{" "}
            <span className="bg-gradient-to-r from-[#DD700B] via-[#E88930] to-[#FCF8D8] bg-clip-text text-transparent">
              Human Decides.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-[#8A8B82] max-w-2xl leading-relaxed">
            Eliminate recruiter burnout with autonomous resume rubric synthesis, real-time voice screening, and Guardian anti-cheat telemetry — while maintaining 100% human sovereign decision veto.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <NeuButton size="lg" variant="primary" className="shadow-[0_4px_20px_rgba(221,112,11,0.4)] text-base px-7 py-3.5 flex items-center gap-2">
                <span>Enter Recruiter Portal</span>
                <ArrowRight className="w-4 h-4" />
              </NeuButton>
            </Link>

            <Link href="/interview/demo-token">
              <NeuButton size="lg" variant="secondary" className="text-base px-6 py-3.5 flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#DD700B]" />
                <span>Launch Voice Screening Room</span>
              </NeuButton>
            </Link>

            <Link href="/hr/design-check">
              <NeuButton size="lg" variant="ghost" className="text-base px-5 py-3.5 text-[#8A8B82] hover:text-[#D9DADF]">
                <span>Living Styleguide</span>
              </NeuButton>
            </Link>
          </div>

          {/* Stats / Trust Badges Strip */}
          <div className="mt-16 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="neu-inset p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#DD700B]">0%</div>
              <div className="text-xs text-[#8A8B82] mt-1">Autonomous Rejections</div>
              <div className="text-[10px] text-[#8FD19E] mt-0.5 font-mono">100% Human Veto</div>
            </div>

            <div className="neu-inset p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#FCF8D8]">&lt; 5s</div>
              <div className="text-xs text-[#8A8B82] mt-1">Voice Latency</div>
              <div className="text-[10px] text-[#8A8B82] mt-0.5 font-mono">Groq Llama 3 70B</div>
            </div>

            <div className="neu-inset p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#8FD19E]">100%</div>
              <div className="text-xs text-[#8A8B82] mt-1">Audit Trail Logging</div>
              <div className="text-[10px] text-[#8A8B82] mt-0.5 font-mono">Immutable Decision Trail</div>
            </div>

            <div className="neu-inset p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#D9DADF]">8 Tools</div>
              <div className="text-xs text-[#8A8B82] mt-1">FastMCP Server</div>
              <div className="text-[10px] text-[#DD700B] mt-0.5 font-mono">Zero PII Leakage</div>
            </div>
          </div>
        </section>

        {/* Live Platform Preview Card */}
        <section id="preview" className="py-12 px-6 max-w-6xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#DD700B] mb-2">
              Integrated Experience
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-[#D9DADF]">
              Next-Generation Sovereign Hiring Cockpit
            </p>
          </div>

          <div className="neu-raised rounded-2xl border border-[rgba(217,218,223,0.08)] overflow-hidden shadow-2xl">
            {/* Window titlebar */}
            <div className="bg-[#232623] px-5 py-3 border-b border-[#383A38] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#E57373]/80" />
                <div className="w-3 h-3 rounded-full bg-[#FCF8D8]/80" />
                <div className="w-3 h-3 rounded-full bg-[#8FD19E]/80" />
                <span className="text-xs font-mono text-[#8A8B82] ml-2">
                  asanHire &bull; candidate-dossier &bull; token: asan-interview-78a2
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#DD700B]/20 text-[#DD700B] border border-[#DD700B]/30">
                  Live Screening Active
                </span>
              </div>
            </div>

            {/* Dashboard Mockup Grid */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#1E201E]/70">
              {/* Left Column: Candidate & AI Rubric (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="neu-inset p-4 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#D9DADF]">Alex Chen</h4>
                      <p className="text-xs text-[#8A8B82]">Senior Full-Stack Engineer</p>
                    </div>
                    <span className="tag-cream text-[10px]">Shortlisted</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#383A38] flex items-center justify-between">
                    <span className="text-xs text-[#8A8B82]">AI Rubric Match</span>
                    <span className="text-base font-bold text-[#8FD19E]">92 / 100</span>
                  </div>

                  {/* Criteria breakdown */}
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-[#8A8B82] mb-1">
                        <span>Distributed Systems &amp; Concurrency</span>
                        <span className="text-[#D9DADF]">95%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1E201E] rounded-full overflow-hidden">
                        <div className="h-full bg-[#8FD19E] w-[95%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#8A8B82] mb-1">
                        <span>Python / FastAPI &amp; Next.js</span>
                        <span className="text-[#D9DADF]">90%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1E201E] rounded-full overflow-hidden">
                        <div className="h-full bg-[#DD700B] w-[90%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Injection Defense Pass */}
                <div className="p-3 rounded-xl bg-[#8FD19E]/10 border border-[#8FD19E]/20 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8FD19E] shrink-0" />
                  <div className="text-[11px] text-[#D9DADF]">
                    <span className="font-semibold text-[#8FD19E]">Prompt Injection Shield:</span> Clean. No adversarial jailbreak attempts detected.
                  </div>
                </div>
              </div>

              {/* Center Column: Live Voice Room Visualizer (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="neu-raised p-5 rounded-xl flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#DD700B] animate-pulse" />
                        <span className="text-xs font-semibold text-[#D9DADF]">AI Voice Interviewer</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8A8B82]">Question 2 of 4</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#232623] border border-[#383A38] text-xs text-[#D9DADF] leading-relaxed">
                      &quot;How do you guarantee idempotency and avoid race conditions in distributed payment webhooks?&quot;
                    </div>
                  </div>

                  <div className="my-4 flex items-center justify-center gap-1 h-8">
                    {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 75, 60, 40, 85].map((height, i) => (
                      <div
                        key={i}
                        className="w-1 bg-[#DD700B] rounded-full transition-all duration-300"
                        style={{ height: `${height}%`, opacity: 0.4 + (height / 100) * 0.6 }}
                      />
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-[#1E201E] border border-[#383A38]">
                    <span className="text-[10px] uppercase font-mono text-[#8A8B82] block mb-1">Live Candidate Transcription (STT)</span>
                    <p className="text-xs text-[#D9DADF] italic">
                      &quot;We implement Redis distributed locks with exponential backoff and verify unique transaction hashes before executing balance mutations...&quot;
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Guardian Proctor & Human Veto (3 cols) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="neu-inset p-4 rounded-xl flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-[#8FD19E]" />
                        <span className="text-xs font-bold text-[#D9DADF]">Guardian Radar</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#8FD19E]">98% Trust</span>
                    </div>

                    <div className="space-y-2 text-[11px] text-[#8A8B82]">
                      <div className="flex items-center justify-between">
                        <span>Fullscreen Integrity</span>
                        <span className="text-[#8FD19E]">Continuous</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tab Switches</span>
                        <span className="text-[#8FD19E]">0 events</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Paste Injections</span>
                        <span className="text-[#8FD19E]">None</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#383A38]">
                    <div className="text-[10px] font-mono uppercase text-[#DD700B] mb-2 font-semibold">
                      Sovereign Recruiter Action
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="py-1.5 px-2 text-center rounded bg-[#8FD19E]/20 text-[#8FD19E] border border-[#8FD19E]/30 text-xs font-semibold">
                        Hire
                      </div>
                      <div className="py-1.5 px-2 text-center rounded bg-[#FCF8D8]/20 text-[#FCF8D8] border border-[#FCF8D8]/30 text-xs font-semibold">
                        Hold
                      </div>
                      <div className="py-1.5 px-2 text-center rounded bg-[#E57373]/20 text-[#E57373] border border-[#E57373]/30 text-xs font-semibold">
                        Reject
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8A8B82] block text-center mt-2">
                      Requires human reason &amp; confirmation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid: The 4 Autonomous Engines */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#DD700B] mb-3">
              Architectural Foundations
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#D9DADF]">
              Four Specialized Engines. Zero Hallucinated Rejections.
            </p>
            <p className="mt-4 text-base text-[#8A8B82]">
              Every layer of asanHire is decoupled, mathematically constrained, and audited through standard FastMCP protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Objective Rubrics */}
            <NeuCard variant="raised" className="flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#DD700B]/10 border border-[#DD700B]/20 flex items-center justify-center text-[#DD700B] mb-5">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#D9DADF] mb-2">
                  Rubric Synthesizer
                </h3>
                <p className="text-xs text-[#8A8B82] leading-relaxed">
                  Converts messy job specs into mathematical rubrics with weighted criteria, must-have skills, and deterministic scoring penalties.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-[#383A38] space-y-2 text-[11px] text-[#D9DADF]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#DD700B]" />
                  <span>Prompt Injection Shield</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#DD700B]" />
                  <span>Strengths &amp; Gaps Extraction</span>
                </li>
              </ul>
            </NeuCard>

            {/* Card 2: Voice Screening Room */}
            <NeuCard variant="raised" className="flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#8FD19E]/10 border border-[#8FD19E]/20 flex items-center justify-center text-[#8FD19E] mb-5">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#D9DADF] mb-2">
                  Voice Screening Room
                </h3>
                <p className="text-xs text-[#8A8B82] leading-relaxed">
                  Real-time Web Speech TTS synthesis &amp; STT speech recognition powered by Groq Llama 3 70B with editable typed fallback.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-[#383A38] space-y-2 text-[11px] text-[#D9DADF]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD19E]" />
                  <span>4,000-character safety limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD19E]" />
                  <span>Zero score leak to candidate</span>
                </li>
              </ul>
            </NeuCard>

            {/* Card 3: Guardian Proctor */}
            <NeuCard variant="raised" className="flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FCF8D8]/10 border border-[#FCF8D8]/20 flex items-center justify-center text-[#FCF8D8] mb-5">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#D9DADF] mb-2">
                  Guardian Telemetry
                </h3>
                <p className="text-xs text-[#8A8B82] leading-relaxed">
                  Monitors tab switches, window blur, fullscreen exits, and paste events into a live advisory trust score without abrupt candidate kickouts.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-[#383A38] space-y-2 text-[11px] text-[#D9DADF]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FCF8D8]" />
                  <span>Debounced event dispatch</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FCF8D8]" />
                  <span>Advisory only &bull; No auto-fail</span>
                </li>
              </ul>
            </NeuCard>

            {/* Card 4: Sovereign Recruiter Desk */}
            <NeuCard variant="raised" className="flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#D9DADF]/10 border border-[#D9DADF]/20 flex items-center justify-center text-[#D9DADF] mb-5">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#D9DADF] mb-2">
                  Sovereign Decision Desk
                </h3>
                <p className="text-xs text-[#8A8B82] leading-relaxed">
                  Recruiters inspect resume signed URLs, per-answer ratings, proctor timelines, override scores, and preview decision emails before sending.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-[#383A38] space-y-2 text-[11px] text-[#D9DADF]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D9DADF]" />
                  <span>Live email preview &amp; override</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D9DADF]" />
                  <span>Full undo &amp; change capability</span>
                </li>
              </ul>
            </NeuCard>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-16 px-6 max-w-7xl mx-auto w-full border-t border-[#D9DADF]/10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#DD700B] mb-3">
              Autonomous Pipeline
            </h2>
            <p className="text-3xl font-bold text-[#D9DADF]">
              How asanHire Operates in 4 Steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="neu-inset p-6 rounded-xl flex flex-col gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#DD700B] text-[#1E201E] font-bold flex items-center justify-center text-sm">
                1
              </span>
              <h4 className="font-bold text-sm text-[#D9DADF]">Job &amp; Rubric Synthesis</h4>
              <p className="text-xs text-[#8A8B82] leading-relaxed">
                HR posts a role. The Rubric Agent extracts mathematical criteria, weighting, and disqualification rules.
              </p>
            </div>

            <div className="neu-inset p-6 rounded-xl flex flex-col gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#DD700B] text-[#1E201E] font-bold flex items-center justify-center text-sm">
                2
              </span>
              <h4 className="font-bold text-sm text-[#D9DADF]">Resume Match &amp; Invite</h4>
              <p className="text-xs text-[#8A8B82] leading-relaxed">
                Candidates upload resumes. AI scores without PII bias and automatically invites top matches to voice screen.
              </p>
            </div>

            <div className="neu-inset p-6 rounded-xl flex flex-col gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#DD700B] text-[#1E201E] font-bold flex items-center justify-center text-sm">
                3
              </span>
              <h4 className="font-bold text-sm text-[#D9DADF]">Voice Screening &amp; Guardian</h4>
              <p className="text-xs text-[#8A8B82] leading-relaxed">
                Candidate conducts a fullscreen voice interview. Guardian telemetry tracks integrity signals in real time.
              </p>
            </div>

            <div className="neu-inset p-6 rounded-xl flex flex-col gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#DD700B] text-[#1E201E] font-bold flex items-center justify-center text-sm">
                4
              </span>
              <h4 className="font-bold text-sm text-[#D9DADF]">Sovereign Human Decision</h4>
              <p className="text-xs text-[#8A8B82] leading-relaxed">
                HR reviews transcript, scores, and proctoring. HR makes final Hire/Reject call with customized email preview.
              </p>
            </div>
          </div>
        </section>

        {/* The Sovereignty Guarantee Manifesto */}
        <section id="sovereignty" className="py-16 px-6 max-w-5xl mx-auto w-full">
          <div className="neu-raised p-8 sm:p-12 rounded-2xl border border-[#DD700B]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DD700B]/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-[#DD700B] font-bold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>The Sovereign Recruiter Guarantee</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#D9DADF]">
                &quot;AI Recommends. Human Decides.&quot; Is Not Just A Slogan. It Is An Architectural Law.
              </h3>
              <p className="text-sm text-[#8A8B82] leading-relaxed">
                In asanHire, no artificial intelligence agent possesses the authorization to reject a candidate, hire an applicant, or send an adverse employment notification. Every action requires a verified HR administrator to review the dossier, validate the reason, preview the outbound email, and execute the final decision.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
                  <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                  <span>No automated black-box rejections</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
                  <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                  <span>Mandatory human rationale required for all decisions</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#D9DADF]">
                  <CheckCircle2 className="w-4 h-4 text-[#8FD19E]" />
                  <span>Immutable audit logging of every status alteration</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16 px-6 max-w-7xl mx-auto w-full text-center">
          <div className="neu-inset p-10 sm:p-14 rounded-2xl max-w-4xl mx-auto flex flex-col items-center gap-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#D9DADF]">
              Ready to Experience Sovereign AI Hiring?
            </h2>
            <p className="text-sm sm:text-base text-[#8A8B82] max-w-xl">
              Access the recruiter portal or take a live voice interview test drive now.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/login">
                <NeuButton size="lg" variant="primary" className="shadow-[0_4px_20px_rgba(221,112,11,0.4)]">
                  Recruiter Sign In <ArrowRight className="w-4 h-4 ml-1" />
                </NeuButton>
              </Link>
              <Link href="/interview/demo-token">
                <NeuButton size="lg" variant="secondary">
                  <Mic className="w-4 h-4 text-[#DD700B] mr-1" />
                  Try Candidate Interview
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9DADF]/10 bg-[#1A1C1A] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Logo variant="full" size="sm" href="/" priority />
            <span className="text-xs text-[#8A8B82] sm:border-l sm:border-[#383A38] sm:pl-4">
              Frozen Mist Neumorphic Architecture &bull; AI Recommends, Human Decides
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#8A8B82]">
            <Link href="/hr/design-check" className="hover:text-[#DD700B] transition-colors">
              Styleguide Audit
            </Link>
            <Link href="/login" className="hover:text-[#DD700B] transition-colors">
              Recruiter Login
            </Link>
            <Link href="/interview/demo-token" className="hover:text-[#DD700B] transition-colors">
              Candidate Portal
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-[#383A38]/50 flex justify-between items-center text-[11px] text-[#8A8B82]">
          <p>&copy; {new Date().getFullYear()} asanHire Inc. All rights reserved.</p>
          <p className="font-mono">FastMCP &bull; Groq Llama 3 70B &bull; Guardian Telemetry</p>
        </div>
      </footer>
    </div>
  );
}
