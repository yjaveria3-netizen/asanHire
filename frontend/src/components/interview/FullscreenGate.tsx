"use client";

import React, { useState } from "react";
import { Maximize2, Mic, ShieldCheck, Eye, Copy, AlertCircle, Lock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";

interface FullscreenGateProps {
  onEnterFullscreen: () => void;
  candidateName: string;
  jobTitle: string;
}

export const FullscreenGate: React.FC<FullscreenGateProps> = ({
  onEnterFullscreen,
  candidateName,
  jobTitle,
}) => {
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);

  const requestPermissionsAndEnter = async () => {
    if (!consentChecked) return;
    setRequesting(true);
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
          // Graceful fallback if mic permission is denied or non-essential
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E201E]/95 backdrop-blur-md">
      <div className="neu-raised max-w-xl w-full rounded-2xl p-8 border border-[#D9DADF]/15 flex flex-col gap-6 text-center">
        {/* Centered Logo */}
        <div className="flex justify-center">
          <Logo variant="mark" size="xl" href={null} priority />
        </div>

        <div>
          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-full bg-[#DD700B]/10 text-[#DD700B] border border-[#DD700B]/20">
            Step 1 of 2: Candidate Consent & Protocol
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-[#D9DADF] mt-2">
            AI Voice Screening Room
          </h2>
          <p className="text-sm text-[#8A8B82] mt-1">
            Welcome, <strong className="text-[#D9DADF]">{candidateName}</strong>. You are preparing for the{" "}
            <strong className="text-[#DD700B]">{jobTitle}</strong> technical interview.
          </p>
        </div>

        {/* Monitored Protocol Box */}
        <div className="neu-inset rounded-xl p-5 bg-[#202320] text-left text-xs flex flex-col gap-3 border border-[#8A8B82]/10">
          <div className="flex items-center justify-between pb-2 border-b border-[#8A8B82]/20">
            <span className="font-semibold text-[#D9DADF] flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#DD700B]" /> Guardian Integrity Protocol:
            </span>
            <span className="text-[11px] text-[#8FD19E] font-mono">Real-time Telemetry</span>
          </div>

          <div className="flex items-start gap-2.5 text-[#D9DADF]/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1.5 shrink-0" />
            <span><strong>Fullscreen Enforcement:</strong> The interview must be conducted in full-screen mode to prevent background distraction.</span>
          </div>

          <div className="flex items-start gap-2.5 text-[#D9DADF]/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1.5 shrink-0" />
            <span><strong>Focus Monitoring:</strong> Tab switches, window minimization, and window blurs are automatically logged.</span>
          </div>

          <div className="flex items-start gap-2.5 text-[#D9DADF]/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DD700B] mt-1.5 shrink-0" />
            <span><strong>Clipboard Activity:</strong> Paste and copy operations on the interview interface are recorded.</span>
          </div>

          {/* Privacy & Security Reassurance */}
          <div className="mt-2 p-3 rounded-lg bg-[rgba(62,90,68,0.2)] border border-[#8FD19E]/30 flex items-start gap-2.5 text-[#8FD19E]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Privacy Assurance:</strong> No video or audio recordings are permanently stored on our servers. Your voice responses are processed in-memory for evaluation.
            </p>
          </div>
        </div>

        {/* Consent Checkbox */}
        <label className="flex items-center gap-3 text-left cursor-pointer select-none text-xs text-[#D9DADF] p-2 rounded-lg hover:bg-[#2A2D2A]/40 transition">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="w-4 h-4 rounded border-[#8A8B82] accent-[#DD700B] cursor-pointer"
          />
          <span>
            I understand and consent to the integrity monitoring protocol described above.
          </span>
        </label>

        {/* Step 2 CTA */}
        <div className="flex flex-col gap-2">
          <NeuButton
            size="lg"
            variant="primary"
            onClick={requestPermissionsAndEnter}
            disabled={!consentChecked || requesting}
            className="w-full flex items-center justify-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            {requesting ? "Entering Room..." : "Enter Fullscreen and Start"}
          </NeuButton>
          {!consentChecked && (
            <p className="text-[11px] text-[#8A8B82] italic">
              Please check the consent box above to proceed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
