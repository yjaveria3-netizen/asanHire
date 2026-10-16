"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";

interface MicButtonProps {
  isRecording: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// OWNER: M1 (frontend developer)
export const MicButton: React.FC<MicButtonProps> = ({
  isRecording,
  onToggle,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[#DD700B] ${
          isRecording
            ? "bg-[#DD700B] text-[#1E201E] shadow-[0_0_24px_rgba(221,112,11,0.7)] animate-pulse"
            : "neu-raised text-[#D9DADF] hover:text-white active:scale-95"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        aria-label={isRecording ? "Mute microphone" : "Unmute and speak"}
      >
        {isRecording ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8 text-[#8A8B82]" />}
      </button>
      <span className="text-xs font-medium text-[#8A8B82]">
        {isRecording ? "Listening... Speak naturally" : "Click microphone to respond"}
      </span>
    </div>
  );
};
