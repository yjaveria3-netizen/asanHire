"use client";

import React, { useState } from "react";
import { Maximize2, Mic } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NeuButton } from "@/components/neu/NeuButton";

interface FullscreenGateProps {
  onEnterFullscreen: () => void;
  candidateName: string;
  jobTitle: string;
}

// OWNER: M1 (frontend developer)
export const FullscreenGate: React.FC<FullscreenGateProps> = ({
  onEnterFullscreen,
  candidateName,
  jobTitle,
}) => {
  const [micGranted, setMicGranted] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);

  const requestPermissionsAndEnter = async () => {
    setRequesting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      onEnterFullscreen();
    } catch {
      onEnterFullscreen();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E201E]">
      <div className="neu-raised max-w-lg w-full rounded-2xl p-8 border border-[#D9DADF]/10 flex flex-col gap-6 text-center">
        {/* Centered Mark Logo */}
        <div className="flex justify-center">
          <Logo variant="mark" size="xl" href={null} priority />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#D9DADF]">Interview Verification Gate</h2>
          <p className="text-sm text-[#8A8B82] mt-1">
            Welcome, <strong className="text-[#D9DADF]">{candidateName}</strong>. You are preparing for the{" "}
            <strong className="text-[#DD700B]">{jobTitle}</strong> technical screening.
          </p>
        </div>

        <div className="neu-inset rounded-xl p-4 bg-[#202320] text-left text-xs text-[#8A8B82] flex flex-col gap-2.5">
          <p className="font-semibold text-[#D9DADF] text-xs">Guardian Proctoring Standards:</p>
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-[#DD700B] shrink-0" />
            <span>Interview must be completed in full-screen mode.</span>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#DD700B] shrink-0" />
            <span>Microphone access required for real-time conversational responses.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E57373] shrink-0" />
            <span>Tab switches, window blur, and clipboard paste events are logged.</span>
          </div>
        </div>

        <NeuButton
          size="lg"
          variant="primary"
          onClick={requestPermissionsAndEnter}
          disabled={requesting}
          className="w-full"
        >
          <Maximize2 className="w-4 h-4 mr-2" />
          {requesting ? "Activating Sensors..." : "Enter Fullscreen & Begin"}
        </NeuButton>
      </div>
    </div>
  );
};
