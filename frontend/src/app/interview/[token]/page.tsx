"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { TranscriptMessage } from "@/lib/types";
import { Logo } from "@/components/brand/Logo";
import { FullscreenGate } from "@/components/interview/FullscreenGate";
import { QuestionPanel } from "@/components/interview/QuestionPanel";
import { MicButton } from "@/components/interview/MicButton";
import { GuardianSidebar } from "@/components/interview/GuardianSidebar";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import {
  Volume2,
  VolumeX,
  Send,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  RotateCcw,
} from "lucide-react";

export default function InterviewRoomPage() {
  const params = useParams();
  const token = (params?.token as string) || "demo-token";

  // Step States
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [fullscreenExited, setFullscreenExited] = useState(false);

  // Candidate & Job Info
  const [candidateName, setCandidateName] = useState("Candidate");
  const [jobTitle, setJobTitle] = useState("Open Position");

  // Interview Loop State
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [questionIndex, setQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Speech Recognition & Synthesis
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Guardian Proctoring State
  const [trustScore, setTrustScore] = useState(100);
  const [events, setEvents] = useState<Array<{ type: string; timestamp: string; penalty: number }>>([]);
  const lastEventTimesRef = useRef<Record<string, number>>({});

  // 1. Verify token on load
  useEffect(() => {
    let isMounted = true;
    api
      .verifyInterviewToken(token)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.valid !== false) {
          setSessionValid(true);
          if (res.candidate_name) setCandidateName(res.candidate_name);
          if (res.job_title) setJobTitle(res.job_title);
        } else {
          setSessionValid(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Mock fallback for testing tokens
        if (token.startsWith("demo") || token.length > 5) {
          setSessionValid(true);
        } else {
          setSessionValid(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Speech Synthesis helper
  const speakText = useCallback(
    (text: string) => {
      if (!autoSpeak || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis error:", err);
      }
    },
    [autoSpeak]
  );

  // 3. Initialize Web Speech Recognition (Chrome webkitSpeechRecognition)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcriptChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptChunk += event.results[i][0].transcript;
        }
        setCandidateAnswer((prev) => {
          const combined = (prev ? prev.trim() + " " : "") + transcriptChunk.trim();
          return combined.slice(0, 4000);
        });
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // 4. Handle "Enter Fullscreen and Start"
  const handleStartInterview = async () => {
    setHasEnteredFullscreen(true);
    try {
      const res = await api.startInterview(token);
      const qText = res.initial_question || res.spoken_text || "Please introduce yourself and your technical background.";
      setCurrentQuestion(qText);
      setSpokenText(res.spoken_text || qText);
      setQuestionIndex(res.question_index || 1);
      setTotalQuestions(res.total_questions || 5);
      setTranscript([{ speaker: "agent", message: qText }]);
      speakText(res.spoken_text || qText);
    } catch {
      const fallbackQ = "Please introduce yourself and describe your recent technical experience.";
      setCurrentQuestion(fallbackQ);
      setSpokenText(fallbackQ);
      speakText(fallbackQ);
    }
  };

  // 5. Guardian Telemetry with 2-second per-type debounce
  const recordGuardianEvent = useCallback(
    (type: string, penalty: number, detail?: string) => {
      if (!hasEnteredFullscreen || isCompleted) return;

      const now = Date.now();
      const lastSent = lastEventTimesRef.current[type] || 0;
      if (now - lastSent < 2000) {
        return; // Debounce 2 seconds per event type
      }
      lastEventTimesRef.current[type] = now;

      const newEvt = {
        type,
        timestamp: new Date().toLocaleTimeString(),
        penalty,
      };

      setEvents((prev) => [newEvt, ...prev.slice(0, 49)]);
      setTrustScore((prev) => Math.max(0, prev - penalty));

      // Dispatch to backend API
      api.sendGuardianEvent(token, {
        type,
        detail: detail || `Candidate infraction: ${type}`,
      }).then((res) => {
        if (res?.trust_score !== undefined) {
          setTrustScore(res.trust_score);
        }
      });
    },
    [hasEnteredFullscreen, isCompleted, token]
  );

  // 6. Guardian Event Listeners
  useEffect(() => {
    if (!hasEnteredFullscreen || isCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordGuardianEvent("tab_hidden", 8, "Candidate navigated away from interview tab");
      }
    };

    const handleBlur = () => {
      recordGuardianEvent("window_blur", 3, "Browser window lost focus");
    };

    const handlePaste = (e: ClipboardEvent) => {
      recordGuardianEvent("paste", 10, "Clipboard paste detected in interview workspace");
    };

    const handleCopy = (e: ClipboardEvent) => {
      recordGuardianEvent("copy", 3, "Clipboard copy detected in interview workspace");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExited(true);
        recordGuardianEvent("fullscreen_exit", 10, "Candidate exited full-screen mode");
      } else {
        setFullscreenExited(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [hasEnteredFullscreen, isCompleted, recordGuardianEvent]);

  // 7. Toggle Mic Speech-to-Text
  const handleToggleMic = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
        setIsRecording(false);
      }
    }
  };

  // 8. Submit Answer
  const handleSubmitAnswer = async () => {
    const trimmed = candidateAnswer.trim();
    if (!trimmed || isSubmitting) return;

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    }

    setIsSubmitting(true);
    const newTranscript = [...transcript, { speaker: "candidate" as const, message: trimmed }];
    setTranscript(newTranscript);

    try {
      const res = await api.sendInterviewAnswer(token, trimmed);
      setCandidateAnswer("");

      if (res.action === "end" || res.is_complete || questionIndex >= totalQuestions) {
        await api.finishInterview(token);
        setIsCompleted(true);
      } else {
        const nextQ = res.next_question || res.spoken_text || "Thank you. Let's move to the next question.";
        setCurrentQuestion(nextQ);
        setSpokenText(res.spoken_text || nextQ);
        setQuestionIndex(res.question_index || questionIndex + 1);
        if (res.total_questions) setTotalQuestions(res.total_questions);
        setTranscript([...newTranscript, { speaker: "agent" as const, message: nextQ }]);
        speakText(res.spoken_text || nextQ);
      }
    } catch (err) {
      console.warn("Error submitting turn:", err);
      // Fallback progression
      if (questionIndex >= totalQuestions) {
        await api.finishInterview(token);
        setIsCompleted(true);
      } else {
        const nextIdx = questionIndex + 1;
        setQuestionIndex(nextIdx);
        const fallbackQ = "Could you elaborate on how you test and monitor your applications in production?";
        setCurrentQuestion(fallbackQ);
        setCandidateAnswer("");
        setTranscript([...newTranscript, { speaker: "agent" as const, message: fallbackQ }]);
        speakText(fallbackQ);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Re-enter Fullscreen Helper
  const handleReenterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
    setFullscreenExited(false);
  };

  // =========================================================================
  // RENDER: Invalid / Expired Token State
  // =========================================================================
  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex items-center justify-center p-6">
        <div className="neu-raised max-w-md w-full rounded-2xl p-8 border border-[#D9DADF]/10 flex flex-col items-center text-center gap-4">
          <Logo variant="mark" size="xl" href="/" />
          <div className="w-12 h-12 rounded-full bg-[#E57373]/10 border border-[#E57373]/30 flex items-center justify-center text-[#E57373]">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#D9DADF]">Session Expired or Invalid</h2>
          <p className="text-xs text-[#8A8B82] leading-relaxed">
            This interview session link is invalid, expired, or has already concluded. If you believe this is in error, please contact your hiring team for a fresh invitation.
          </p>
          <div className="pt-2 w-full">
            <Link href="/">
              <NeuButton variant="primary" className="w-full">
                Return to Homepage
              </NeuButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Completion / Thank You Screen
  // =========================================================================
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] flex items-center justify-center p-6 selection:bg-[#DD700B] selection:text-[#1E201E]">
        <div className="neu-raised max-w-lg w-full rounded-2xl p-8 border border-[#8FD19E]/20 flex flex-col items-center text-center gap-6">
          <Logo variant="mark" size="xl" href="/" />
          <div className="w-16 h-16 rounded-full bg-[#8FD19E]/10 border border-[#8FD19E]/30 flex items-center justify-center text-[#8FD19E]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase text-[#8FD19E] bg-[#8FD19E]/10 px-3 py-1 rounded-full">
              Evaluation Submitted
            </span>
            <h2 className="text-2xl font-bold text-[#D9DADF] mt-3">Interview Completed!</h2>
            <p className="text-sm text-[#8A8B82] mt-2 leading-relaxed">
              Thank you, <strong className="text-[#D9DADF]">{candidateName}</strong>. Your technical screening for{" "}
              <strong className="text-[#DD700B]">{jobTitle}</strong> has been successfully captured and routed to the hiring committee.
            </p>
          </div>

          <div className="neu-inset p-4 rounded-xl bg-[#202320] text-xs text-[#8A8B82] text-left w-full border border-[#8A8B82]/10 flex flex-col gap-2">
            <p className="font-semibold text-[#D9DADF]">What happens next?</p>
            <p>&bull; The Supervisor Agent synthesizes your transcript with the job rubric.</p>
            <p>&bull; The hiring manager will review your submission and provide an update by email.</p>
          </div>

          <Link href="/" className="w-full">
            <NeuButton variant="primary" className="w-full">
              Close & Exit Session
            </NeuButton>
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Active Interview Room
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#1E201E] text-[#D9DADF] p-4 md:p-6 flex flex-col justify-between selection:bg-[#DD700B] selection:text-[#1E201E] relative">
      {/* Step 1 & 2 Gate: Consent, Rules & Fullscreen Start */}
      {!hasEnteredFullscreen && (
        <FullscreenGate
          candidateName={candidateName}
          jobTitle={jobTitle}
          onEnterFullscreen={handleStartInterview}
        />
      )}

      {/* Fullscreen Exit Advisory Overlay Modal */}
      {hasEnteredFullscreen && fullscreenExited && !isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E201E]/90 backdrop-blur-md">
          <div className="neu-raised max-w-md w-full rounded-2xl p-6 border border-[#DD700B]/30 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#DD700B]/10 border border-[#DD700B]/30 flex items-center justify-center text-[#DD700B]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#D9DADF]">Fullscreen Exited</h3>
            <p className="text-xs text-[#8A8B82] leading-relaxed">
              Your interview must remain in full-screen mode to ensure testing integrity. Please return to full-screen mode to proceed.
            </p>
            <NeuButton
              variant="primary"
              size="md"
              onClick={handleReenterFullscreen}
              className="w-full flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" /> Re-enter Fullscreen
            </NeuButton>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center justify-between pb-4 border-b border-[#D9DADF]/10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Logo variant="full" size="sm" href="/" priority />
          <div className="hidden sm:block pl-3 border-l border-[#8A8B82]/20">
            <h1 className="text-xs font-bold text-[#D9DADF] truncate max-w-xs">{jobTitle}</h1>
            <p className="text-[10px] text-[#8A8B82]">Candidate: {candidateName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio TTS toggle */}
          <button
            type="button"
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
              }
            }}
            className="p-2 rounded-lg bg-[#242724] border border-[#8A8B82]/20 text-[#8A8B82] hover:text-[#D9DADF] transition"
            title={autoSpeak ? "Mute automatic speech" : "Enable automatic speech"}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4 text-[#8FD19E]" /> : <VolumeX className="w-4 h-4 text-[#8A8B82]" />}
          </button>

          <span className="text-xs font-mono text-[#8FD19E] bg-[#8FD19E]/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-[#8FD19E]/20">
            <span className="w-2 h-2 rounded-full bg-[#8FD19E] animate-pulse" />
            Live Session
          </span>

          <NeuButton
            size="sm"
            variant="ghost"
            onClick={async () => {
              await api.finishInterview(token);
              setIsCompleted(true);
            }}
            className="text-xs text-[#E57373] hover:bg-[#E57373]/10"
          >
            End Interview
          </NeuButton>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 my-auto py-6 items-start">
        {/* Left Column: Question & Answer Workspace */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Question Panel */}
          <div className="neu-raised rounded-2xl p-6 border border-[#D9DADF]/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8B82] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#DD700B]" /> asanHire AI Interviewer
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakText(spokenText || currentQuestion)}
                  className="p-1.5 rounded-lg bg-[#202320] text-[#8A8B82] hover:text-[#DD700B] text-xs flex items-center gap-1 border border-[#8A8B82]/20 transition"
                  title="Re-read current question"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-read
                </button>
                <span className="font-mono text-xs text-[#DD700B] font-semibold bg-[#DD700B]/10 px-2.5 py-1 rounded-full border border-[#DD700B]/20">
                  Question {questionIndex} of {totalQuestions}
                </span>
              </div>
            </div>

            <div className="neu-inset p-5 rounded-xl bg-[#202320]">
              <p className="text-base md:text-lg font-medium text-[#D9DADF] leading-relaxed">
                &ldquo;{currentQuestion || "Initializing technical question..."}&rdquo;
              </p>
            </div>
          </div>

          {/* Answer Capture Workspace */}
          <NeuCard variant="raised" className="flex flex-col gap-4 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-[#8A8B82]/15">
              <div className="flex items-center gap-3">
                <MicButton
                  isRecording={isRecording}
                  onToggle={handleToggleMic}
                  disabled={!speechSupported || isSubmitting}
                />
                <div className="text-left">
                  <p className="text-xs font-semibold text-[#D9DADF]">
                    {isRecording ? "Listening... Speak your answer" : "Voice or Typed Response"}
                  </p>
                  <p className="text-[11px] text-[#8A8B82]">
                    {speechSupported
                      ? "Use your microphone or edit in the box below."
                      : "Voice capture unsupported on this browser; please type your response."}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-[#8A8B82]">
                {candidateAnswer.length} / 4000 characters
              </span>
            </div>

            {/* Editable Response Text Area */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-wider text-[#8A8B82] font-semibold">
                Your Answer (Editable Transcription & Typed Fallback)
              </label>
              <textarea
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value.slice(0, 4000))}
                placeholder="Your spoken words will appear here in real time. You may also edit, format, or type your answer directly before submitting..."
                rows={5}
                disabled={isSubmitting}
                className="neu-inset w-full p-4 rounded-xl text-sm text-[#D9DADF] bg-[#1E201E] border border-[#8A8B82]/20 focus:outline-none focus:ring-2 focus:ring-[#DD700B] placeholder-[#8A8B82]/40 resize-y leading-relaxed"
              />
            </div>

            {/* Submit Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#8A8B82] italic">
                * Note: Evaluated automatically by AI. No scores are visible to candidates.
              </span>
              <NeuButton
                variant="primary"
                size="md"
                onClick={handleSubmitAnswer}
                disabled={!candidateAnswer.trim() || isSubmitting}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Evaluating..." : questionIndex >= totalQuestions ? "Submit & Finish" : "Submit Answer"}
              </NeuButton>
            </div>
          </NeuCard>
        </div>

        {/* Right Column: Guardian Proctor Sidebar */}
        <div className="md:col-span-1">
          <GuardianSidebar trustScore={trustScore} recentEvents={events} />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 border-t border-[#D9DADF]/10 max-w-7xl mx-auto w-full text-[11px] text-[#8A8B82] flex items-center justify-between">
        <span>asanHire Autonomous Assessment Engine</span>
        <span>Candidate Privacy Secured &bull; In-Memory Evaluation</span>
      </footer>
    </div>
  );
}
