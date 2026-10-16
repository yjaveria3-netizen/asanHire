"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { TranscriptMessage } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { FullscreenGate } from "@/components/interview/FullscreenGate";
import { QuestionPanel } from "@/components/interview/QuestionPanel";
import { MicButton } from "@/components/interview/MicButton";
import { GuardianSidebar } from "@/components/interview/GuardianSidebar";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";

// OWNER: M1 (frontend developer) & M2 (backend engineer)
// TODO M1: Wire Web Speech API / Groq WebSocket streaming audio connection
// TODO M2: Ensure Guardian proctoring events map to backend database deductions
export default function InterviewRoomPage() {
  const params = useParams();
  const token = (params?.token as string) || "demo-token";

  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
  const [candidateName, setCandidateName] = useState("Amina Malik");
  const [jobTitle, setJobTitle] = useState("Senior AI / Full-Stack Engineer");
  const [trustScore, setTrustScore] = useState(100);
  const [events, setEvents] = useState<Array<{ type: string; timestamp: string; penalty: number }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState(
    "Hello! Welcome to your technical interview for the Senior AI / Full-Stack Engineer position. Could you introduce yourself and describe your recent experience with Next.js App Router and LLMs?"
  );
  const [questionIndex, setQuestionIndex] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    {
      speaker: "agent",
      message:
        "Hello! Welcome to your technical interview for the Senior AI / Full-Stack Engineer position. Could you introduce yourself and describe your recent experience with Next.js App Router and LLMs?",
    },
  ]);

  // Verify interview token on initial load
  useEffect(() => {
    api.verifyInterviewToken(token).then((res) => {
      if (res?.candidate_name) setCandidateName(res.candidate_name);
      if (res?.job_title) setJobTitle(res.job_title);
    });
  }, [token]);

  // Guardian Event Listeners (Tab change, Window blur, Paste, Fullscreen exit)
  useEffect(() => {
    if (!hasEnteredFullscreen || isCompleted) return;

    const recordEvent = (type: string, penalty: number) => {
      const newEvt = { type, timestamp: new Date().toLocaleTimeString(), penalty };
      setEvents((prev) => [newEvt, ...prev]);
      setTrustScore((prev) => Math.max(0, prev - penalty));
      api.sendGuardianEvent(token, type, { penalty });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) recordEvent("tab_hidden", 8);
    };

    const handleBlur = () => {
      recordEvent("window_blur", 3);
    };

    const handlePaste = (e: ClipboardEvent) => {
      recordEvent("paste", 10);
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordEvent("fullscreen_exit", 10);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("paste", handlePaste);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("paste", handlePaste);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [hasEnteredFullscreen, isCompleted, token]);

  const handleToggleMic = async () => {
    if (isRecording) {
      setIsRecording(false);
      const sampleAnswer =
        "In my recent project, I architected an App Router Next.js 14 client communicating over WebSockets to a FastAPI gateway. We integrated Groq Llama 3.3 for conversational voice streaming with sub-second response times.";
      
      const newTranscript = [...transcript, { speaker: "candidate" as const, message: sampleAnswer }];
      setTranscript(newTranscript);

      if (questionIndex >= 5) {
        setIsCompleted(true);
        api.completeInterview(token);
      } else {
        const nextIdx = questionIndex + 1;
        setQuestionIndex(nextIdx);
        const res = await api.sendInterviewTurn(token, sampleAnswer);
        setCurrentQuestion(res.next_question);
        setTranscript([...newTranscript, { speaker: "agent" as const, message: res.next_question }]);
      }
    } else {
      setIsRecording(true);
    }
  };

  const handleFinishEarly = () => {
    setIsCompleted(true);
    api.completeInterview(token);
  };

  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] p-4 md:p-6 flex flex-col justify-between selection:bg-[#DD700B] selection:text-[#1E201E]">
      {!hasEnteredFullscreen && (
        <FullscreenGate
          candidateName={candidateName}
          jobTitle={jobTitle}
          onEnterFullscreen={() => setHasEnteredFullscreen(true)}
        />
      )}

      {/* Top Header with small 'full' logo at the top left */}
      <header className="flex items-center justify-between pb-4 border-b border-[#D9DADF]/10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Logo variant="full" size="sm" href="/" priority />
          <div className="hidden sm:block pl-3 border-l border-[#8A8B82]/20">
            <h1 className="text-xs font-bold text-[#D9DADF] truncate max-w-xs">{jobTitle}</h1>
            <p className="text-[10px] text-[#8A8B82]">Candidate: {candidateName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#8FD19E] bg-[#8FD19E]/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8FD19E] animate-pulse" />
            Live Voice Room
          </span>
          <NeuButton size="sm" variant="danger" onClick={handleFinishEarly}>
            Complete Interview
          </NeuButton>
        </div>
      </header>

      {/* Main Interview Workspace */}
      <main className="max-w-7xl mx-auto w-full flex-1 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Conversational Agent Panel & Mic */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <QuestionPanel
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={5}
          />

          {/* Interactive Mic Response Station */}
          <NeuCard variant="raised" className="p-8 flex flex-col items-center justify-center text-center">
            <MicButton isRecording={isRecording} onToggle={handleToggleMic} disabled={isCompleted} />
            <p className="text-xs text-[#8A8B82] mt-4 max-w-md">
              Speak clearly into your microphone. Tap again when finished to submit your response to the AI interviewer.
            </p>
          </NeuCard>

          {/* Transcript History */}
          <NeuCard variant="raised" className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82] mb-3">
              Live Session Transcript
            </h3>
            <div className="neu-inset p-4 rounded-xl max-h-60 overflow-y-auto flex flex-col gap-3">
              {transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col text-xs leading-relaxed ${
                    msg.speaker === "agent" ? "text-[#DD700B]" : "text-[#D9DADF] pl-4 border-l border-[#8A8B82]/30"
                  }`}
                >
                  <span className="font-semibold uppercase text-[10px] text-[#8A8B82]">
                    {msg.speaker === "agent" ? "Interviewer Agent" : candidateName}
                  </span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
          </NeuCard>
        </div>

        {/* Right Column: Guardian Proctoring Sidebar */}
        <div className="flex flex-col gap-6">
          <GuardianSidebar trustScore={trustScore} recentEvents={events} />
        </div>
      </main>

      {/* Completion Modal with Centered Mark Logo */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <NeuCard variant="raised" className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
            <Logo variant="mark" size="lg" href={null} priority />
            <h2 className="text-xl font-bold text-[#D9DADF]">Screening Completed</h2>
            <p className="text-xs text-[#8A8B82] leading-relaxed">
              Thank you, {candidateName}! Your interview responses and integrity telemetry have been recorded.
              The Evaluation Supervisor Agent is synthesizing your comprehensive report for the hiring team.
            </p>
            <div className="pt-2 w-full">
              <NeuButton variant="primary" size="md" className="w-full" onClick={() => (window.location.href = "/")}>
                Return to Home
              </NeuButton>
            </div>
          </NeuCard>
        </div>
      )}
    </div>
  );
}
