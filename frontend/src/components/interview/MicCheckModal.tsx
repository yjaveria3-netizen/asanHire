"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  RefreshCw,
  Activity,
} from "lucide-react";
import { NeuButton } from "@/components/neu/NeuButton";

interface MicCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export const MicCheckModal: React.FC<MicCheckModalProps> = ({
  isOpen,
  onClose,
  onVerified,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [hasDetectedAudio, setHasDetectedAudio] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Stop all mic test hardware & streams
  const stopTest = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.stop();
      } catch {}
    }

    setIsTesting(false);
    setAudioLevel(0);
  }, []);

  // Start real-time microphone test
  const startTest = useCallback(async () => {
    setErrorMessage(null);
    setTranscript("");
    setHasDetectedAudio(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Web Audio API volume analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setIsTesting(true);

      const updateVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize roughly to 0-100 range
        const level = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(level);

        if (level > 12) {
          setHasDetectedAudio(true);
        }

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();

      // Web Speech STT Test (if supported in Chrome/Edge)
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (e: any) => {
            let combined = "";
            for (let i = 0; i < e.results.length; i++) {
              combined += e.results[i][0].transcript + " ";
            }
            if (combined.trim()) {
              setTranscript(combined.trim());
              setHasDetectedAudio(true);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn("Speech recognition test error:", e?.error);
          };

          recognition.onend = () => {
            // Auto-restart while user is still in test mode
            if (recognitionRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (recErr) {
          console.warn("Failed to initialize SpeechRecognition:", recErr);
        }
      }
    } catch (err: any) {
      console.warn("Mic test error:", err);
      setErrorMessage(
        err?.message || "Could not access microphone. Please ensure microphone permissions are granted."
      );
      stopTest();
    }
  }, [stopTest]);

  // Auto-start when modal opens, stop when modal closes
  useEffect(() => {
    if (isOpen) {
      startTest();
    } else {
      stopTest();
    }

    return () => {
      stopTest();
    };
  }, [isOpen, startTest, stopTest]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="neu-raised max-w-lg w-full rounded-2xl p-6 sm:p-8 border border-[#D9DADF]/15 flex flex-col gap-6 text-center relative shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopTest();
            onClose();
          }}
          className="absolute right-4 top-4 p-2 text-[#8A8B82] hover:text-[#D9DADF] rounded-lg transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-[#DD700B]/10 border border-[#DD700B]/30 flex items-center justify-center text-[#DD700B]">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-[#D9DADF]">Microphone Audio Check</h3>
          <p className="text-xs text-[#8A8B82] max-w-sm">
            Speak into your microphone to verify that you are audible and that speech recognition is capturing your voice.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage ? (
          <div className="p-4 rounded-xl bg-[#E57373]/15 border border-[#E57373]/30 text-xs text-[#E57373] text-left flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Microphone Access Error</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : (
          /* Live Visualizer Area */
          <div className="neu-inset p-5 rounded-xl bg-[#202320] flex flex-col gap-4 border border-[#383A38]">
            {/* Audibility Status Pill */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8A8B82] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#DD700B]" /> Audio Level:
              </span>
              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  hasDetectedAudio
                    ? "bg-[#8FD19E]/20 text-[#8FD19E] border border-[#8FD19E]/30"
                    : "bg-[#FCF8D8]/20 text-[#FCF8D8] border border-[#FCF8D8]/30"
                }`}
              >
                {hasDetectedAudio ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Audible &amp; Clear
                  </>
                ) : (
                  <>Waiting for voice...</>
                )}
              </span>
            </div>

            {/* Dynamic Volume Bars */}
            <div className="flex items-center justify-center gap-1.5 h-16 py-2 px-4 bg-[#1E201E] rounded-lg border border-[#383A38]">
              {[...Array(20)].map((_, i) => {
                const threshold = (i / 20) * 100;
                const isActive = audioLevel >= threshold;
                const heightPct = Math.max(15, Math.min(100, (audioLevel / 100) * 100 * (1 - Math.abs(i - 10) / 15)));

                return (
                  <div
                    key={i}
                    className="w-2 rounded-full transition-all duration-75"
                    style={{
                      height: isActive ? `${heightPct}%` : "15%",
                      backgroundColor: isActive
                        ? i > 15
                          ? "#E57373"
                          : i > 11
                          ? "#DD700B"
                          : "#8FD19E"
                        : "#2A2D2A",
                    }}
                  />
                );
              })}
            </div>

            {/* Live Speech Recognition Transcription Box */}
            <div className="flex flex-col text-left gap-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A8B82]">
                Live Speech Recognition Preview:
              </span>
              <div className="p-3 rounded-lg bg-[#1E201E] border border-[#383A38] min-h-[50px] text-xs text-[#D9DADF] italic flex items-center">
                {transcript ? (
                  <span className="text-[#8FD19E] font-medium not-italic">&ldquo;{transcript}&rdquo;</span>
                ) : audioLevel > 15 ? (
                  <span className="text-[#DD700B] flex items-center gap-1.5 animate-pulse not-italic">
                    <Activity className="w-3.5 h-3.5" /> Detecting speech...
                  </span>
                ) : isTesting ? (
                  <span className="text-[#8A8B82]/60">Say something (e.g. &ldquo;Testing one two three&rdquo;)...</span>
                ) : (
                  <span className="text-[#8A8B82]/60">Microphone paused.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2">
          {isTesting ? (
            <NeuButton
              size="md"
              variant="secondary"
              onClick={stopTest}
              className="w-full sm:w-auto text-xs"
            >
              <MicOff className="w-3.5 h-3.5 mr-1 text-[#E57373]" /> Pause Test
            </NeuButton>
          ) : (
            <NeuButton
              size="md"
              variant="secondary"
              onClick={startTest}
              className="w-full sm:w-auto text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#DD700B]" /> Retest Microphone
            </NeuButton>
          )}

          <NeuButton
            size="md"
            variant="primary"
            onClick={() => {
              stopTest();
              if (onVerified) onVerified();
              onClose();
            }}
            className="w-full sm:w-auto text-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-1 text-[#1E201E]" />
            {hasDetectedAudio ? "Microphone Verified ✓ Continue" : "Done"}
          </NeuButton>
        </div>
      </div>
    </div>
  );
};
