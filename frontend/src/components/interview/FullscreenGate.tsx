"use client";

import React, { useState } from "react";
import { Maximize2, Mic, Camera, ShieldCheck, Eye, Copy, AlertCircle, Lock, CheckCircle2, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";
import { MicCheckModal } from "@/components/interview/MicCheckModal";
import { CameraCheckModal } from "@/components/interview/CameraCheckModal";

interface FullscreenGateProps {
  onEnterFullscreen: () => void;
  candidateName: string;
  jobTitle: string;
  onClose?: () => void;
}

export const FullscreenGate: React.FC<FullscreenGateProps> = ({
  onEnterFullscreen,
  candidateName,
  jobTitle,
  onClose,
}) => {
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [isMicCheckOpen, setIsMicCheckOpen] = useState<boolean>(false);
  const [micVerified, setMicVerified] = useState<boolean>(false);
  const [isCameraCheckOpen, setIsCameraCheckOpen] = useState<boolean>(false);
  const [cameraVerified, setCameraVerified] = useState<boolean>(false);

  const requestPermissionsAndEnter = async () => {
    if (!consentChecked) return;
    setRequesting(true);
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: { width: 320, height: 240 } })
          .catch(() => {
            // Graceful fallback if user previously granted or device is constrained
          });
      }
      
      if (document?.documentElement?.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      onEnterFullscreen();
    } catch {
      onEnterFullscreen();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 bg-[#1E201E]/95 backdrop-blur-md">
      <div className="relative neu-raised max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6 border border-[#D9DADF]/15 flex flex-col gap-3 sm:gap-4 text-center my-auto shadow-2xl">
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={onClose || (() => window.history.back())}
          className="absolute right-3 top-3 p-2 text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#2A2D2A]/60 rounded-lg transition-colors z-10"
          title="Close and exit interview gate"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Logo - Compact */}
        <div className="flex justify-center pt-1">
          <Logo variant="mark" size="md" href={null} priority />
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#DD700B]/10 text-[#DD700B] border border-[#DD700B]/20">
            Step 1 of 2: Candidate Consent & Protocol
          </span>
          <h2 className="text-lg md:text-xl font-bold text-[#D9DADF] mt-1.5">
            AI Voice Screening Room
          </h2>
          <p className="text-xs text-[#8A8B82] mt-0.5">
            Welcome, <strong className="text-[#D9DADF]">{candidateName}</strong>. Preparing for{" "}
            <strong className="text-[#DD700B]">{jobTitle}</strong>.
          </p>
        </div>

        {/* Monitored Protocol Box - Tighter Margins & Padding */}
        <div className="neu-inset rounded-xl p-3 sm:p-4 bg-[#202320] text-left text-xs flex flex-col gap-2 border border-[#8A8B82]/10">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#8A8B82]/20">
            <span className="font-semibold text-[#D9DADF] flex items-center gap-1.5 text-xs">
              <Eye className="w-3.5 h-3.5 text-[#DD700B]" /> Guardian Integrity Protocol:
            </span>
            <span className="text-[10px] text-[#8FD19E] font-mono">Real-time Telemetry</span>
          </div>

          <div className="flex items-start gap-2 text-[#D9DADF]/90 text-[11px] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1 shrink-0" />
            <span><strong>Fullscreen Enforcement:</strong> Conducted in full-screen to minimize distraction.</span>
          </div>

          <div className="flex items-start gap-2 text-[#D9DADF]/90 text-[11px] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1 shrink-0" />
            <span><strong>Focus Monitoring:</strong> Tab switches and window blurs are automatically logged.</span>
          </div>

          <div className="flex items-start gap-2 text-[#D9DADF]/90 text-[11px] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1 shrink-0" />
            <span><strong>Camera Presence Verification:</strong> In-browser edge AI checks face centering. Zero video is saved.</span>
          </div>

          <div className="flex items-start gap-2 text-[#D9DADF]/90 text-[11px] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1 shrink-0" />
            <span><strong>Clipboard Activity:</strong> Paste and copy operations are logged.</span>
          </div>

          {/* Privacy & Security Reassurance */}
          <div className="mt-1 p-2 rounded-lg bg-[rgba(62,90,68,0.2)] border border-[#8FD19E]/30 flex items-start gap-2 text-[#8FD19E]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed">
              <strong>Privacy Assurance:</strong> Zero recordings stored. Processing occurs locally in-memory.
            </p>
          </div>
        </div>

        {/* Hardware Pre-Checks: Microphone & Camera */}
        <div className="flex flex-col gap-2">
          {/* Microphone Pre-Check Row */}
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#202320] border border-[#383A38] text-left">
            <div className="flex items-center gap-2.5 text-xs">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                micVerified
                  ? "bg-[#8FD19E]/15 border border-[#8FD19E]/30 text-[#8FD19E]"
                  : "bg-[#DD700B]/15 border border-[#DD700B]/30 text-[#DD700B]"
              }`}>
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-[#D9DADF] text-xs">Microphone Audio Check</p>
                <p className="text-[10px] text-[#8A8B82]">
                  {micVerified
                    ? "Audio verified! You are audible ✓"
                    : "Verify your microphone is audible"}
                </p>
              </div>
            </div>

            <NeuButton
              type="button"
              size="sm"
              variant={micVerified ? "secondary" : "ghost"}
              onClick={() => setIsMicCheckOpen(true)}
              className={`text-xs py-1 px-2.5 shrink-0 flex items-center gap-1.5 ${
                micVerified
                  ? "border border-[#8FD19E]/40 text-[#8FD19E]"
                  : "border border-[#DD700B]/40 text-[#DD700B] hover:bg-[#DD700B]/10"
              }`}
            >
              {micVerified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD19E]" /> Verified
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#DD700B]" /> Check Mic
                </>
              )}
            </NeuButton>
          </div>

          {/* Camera Pre-Check Row */}
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#202320] border border-[#383A38] text-left">
            <div className="flex items-center gap-2.5 text-xs">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                cameraVerified
                  ? "bg-[#8FD19E]/15 border border-[#8FD19E]/30 text-[#8FD19E]"
                  : "bg-[#DD700B]/15 border border-[#DD700B]/30 text-[#DD700B]"
              }`}>
                <Camera className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-[#D9DADF] text-xs">Camera &amp; Vision Check</p>
                <p className="text-[10px] text-[#8A8B82]">
                  {cameraVerified
                    ? "Camera verified! Centered and clear ✓"
                    : "Verify your camera feed framing"}
                </p>
              </div>
            </div>

            <NeuButton
              type="button"
              size="sm"
              variant={cameraVerified ? "secondary" : "ghost"}
              onClick={() => setIsCameraCheckOpen(true)}
              className={`text-xs py-1 px-2.5 shrink-0 flex items-center gap-1.5 ${
                cameraVerified
                  ? "border border-[#8FD19E]/40 text-[#8FD19E]"
                  : "border border-[#DD700B]/40 text-[#DD700B] hover:bg-[#DD700B]/10"
              }`}
            >
              {cameraVerified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD19E]" /> Verified
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#DD700B]" /> Check Camera
                </>
              )}
            </NeuButton>
          </div>
        </div>

        {/* Consent Checkbox */}
        <label className="flex items-center gap-2.5 text-left cursor-pointer select-none text-xs text-[#D9DADF] p-1.5 rounded-lg hover:bg-[#2A2D2A]/40 transition">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="w-4 h-4 rounded border-[#8A8B82] accent-[#DD700B] cursor-pointer"
          />
          <span className="text-[11px] sm:text-xs">
            I understand and consent to the integrity monitoring protocol described above.
          </span>
        </label>

        {/* Step 2 CTA */}
        <div className="flex flex-col gap-1.5">
          <NeuButton
            size="md"
            variant="primary"
            onClick={requestPermissionsAndEnter}
            disabled={!consentChecked || requesting}
            className="w-full flex items-center justify-center gap-2 text-xs sm:text-sm py-2.5"
          >
            <Maximize2 className="w-4 h-4" />
            {requesting ? "Entering Room..." : "Enter Fullscreen and Start"}
          </NeuButton>
          {!consentChecked && (
            <p className="text-[10px] text-[#8A8B82] italic">
              Please check the consent box above to proceed.
            </p>
          )}
        </div>

        {/* Interactive Mic Check Modal */}
        <MicCheckModal
          isOpen={isMicCheckOpen}
          onClose={() => setIsMicCheckOpen(false)}
          onVerified={() => setMicVerified(true)}
        />

        {/* Interactive Camera Check Modal */}
        <CameraCheckModal
          isOpen={isCameraCheckOpen}
          onClose={() => setIsCameraCheckOpen(false)}
          onVerified={() => setCameraVerified(true)}
        />
      </div>
    </div>
  );
};
