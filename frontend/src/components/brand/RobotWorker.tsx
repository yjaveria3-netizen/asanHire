import React from "react";

interface RobotWorkerProps {
  className?: string;
}

export const RobotWorker: React.FC<RobotWorkerProps> = ({ className = "" }) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Expanded Ambient Orange Gradient Glow Aura (Expanded limit with smooth wide falloff) */}
      <div
        className="absolute -inset-14 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#DD700B]/35 via-[#DD700B]/12 to-transparent blur-3xl rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Softly drifting decorative dots (subtle movement in site palette) */}
      <span
        className="absolute -top-3 -left-4 w-2 h-2 rounded-full bg-[#DD700B] animate-drift-1 pointer-events-none"
        aria-hidden="true"
      />
      <span
        className="absolute top-1/2 -right-5 w-2.5 h-2.5 rounded-full bg-[#FCF8D8] animate-drift-2 pointer-events-none"
        aria-hidden="true"
      />
      <span
        className="absolute -bottom-2 left-6 w-1.5 h-1.5 rounded-full bg-[#D9DADF] animate-drift-3 pointer-events-none"
        aria-hidden="true"
      />

      {/* Robot Mascot Working on Laptop with AH on Shirt */}
      <div className="animate-robot-idle" aria-label="Friendly AI assistant with AH shirt analyzing candidates">
        <svg
          viewBox="0 0 200 160"
          width="190"
          height="152"
          className="w-full h-auto drop-shadow-[0_8px_24px_rgba(221,112,11,0.2)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Expanded Ambient Warm Orange Glow Filter & Gradient */}
            <radialGradient id="robot-expanded-orange-glow" cx="44%" cy="46%" r="68%">
              <stop offset="0%" stopColor="#DD700B" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#DD700B" stopOpacity="0.25" />
              <stop offset="65%" stopColor="#DD700B" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#DD700B" stopOpacity="0" />
            </radialGradient>
            <filter id="worker-screen-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Expanded Orange Radial Aura behind the entire robot & laptop */}
          <circle cx="92" cy="74" r="92" fill="url(#robot-expanded-orange-glow)" pointerEvents="none" />

          {/* Desk / Platform Surface */}
          <line
            x1="12"
            y1="142"
            x2="188"
            y2="142"
            stroke="#383A38"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Robot Mascot Body */}
          <g transform="translate(16, 12)">
            {/* Antenna */}
            <path d="M 52 32 L 38 14" stroke="#D9DADF" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="35" cy="11" r="6.5" fill="#DD700B" />
            <circle cx="33" cy="9" r="2" fill="#FCF8D8" />

            {/* Left Ear */}
            <rect x="16" y="40" width="9" height="26" rx="4.5" fill="#1E201E" stroke="#DD700B" strokeWidth="2" />
            {/* Right Ear */}
            <rect x="85" y="40" width="9" height="26" rx="4.5" fill="#1E201E" stroke="#DD700B" strokeWidth="2" />

            {/* Helmet Shell */}
            <rect
              x="22"
              y="24"
              width="66"
              height="58"
              rx="29"
              fill="#FCF8D8"
              stroke="#D9DADF"
              strokeWidth="2"
            />
            {/* Helmet Highlight */}
            <path
              d="M 32 34 Q 55 28 78 34"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />

            {/* Dark Face Visor */}
            <rect x="30" y="36" width="50" height="36" rx="16" fill="#1E201E" />

            {/* Happy Smiling Eyes (^ ^) */}
            <path
              d="M 39 52 Q 45 42 51 52"
              stroke="#DD700B"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 59 52 Q 65 42 71 52"
              stroke="#DD700B"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Robot Neck & Torso */}
            <rect x="44" y="80" width="22" height="6" rx="3" fill="#DD700B" />
            <path
              d="M 32 86 C 32 86 36 122 38 126 C 48 128 62 128 72 126 C 74 122 78 86 78 86 Z"
              fill="#D9DADF"
            />

            {/* Chest Emblem with exact Geometric AH Monogram on Shirt */}
            <rect x="43" y="90" width="26" height="17" rx="3.5" fill="#1E201E" stroke="#262826" strokeWidth="1" />
            <g transform="translate(45, 91.5) scale(0.24)">
              <path
                d="M 34,90 L 74,39 L 74,64 L 84,64 L 84,29 L 91,17 L 91,90 L 84,90 L 84,72 L 74,72 L 74,90 L 47,90 L 53,83 L 66,83 L 66,64 L 64,64 L 44,90 Z"
                fill="#DD700B"
              />
            </g>

            {/* Hands typing on laptop keyboard */}
            <path
              d="M 76 112 C 84 112 94 114 104 118"
              stroke="#FCF8D8"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="106" cy="119" r="4.5" fill="#FCF8D8" />
          </g>

          {/* Laptop (Screen facing toward the robot) */}
          <g transform="translate(108, 70)">
            {/* Laptop Base */}
            <path
              d="M 12 56 L 62 56 L 56 64 L 6 64 Z"
              fill="#D9DADF"
              stroke="#262826"
              strokeWidth="1"
            />
            {/* Trackpad */}
            <rect x="26" y="59" width="14" height="4" rx="1" fill="#1E201E" opacity="0.6" />

            {/* Laptop Screen (angled open) */}
            <path
              d="M 16 10 L 52 14 L 46 56 L 10 54 Z"
              fill="#262826"
              stroke="#D9DADF"
              strokeWidth="2"
            />
            {/* Laptop Display Glowing Content */}
            <g className="animate-screen-blink">
              <path
                d="M 18 15 L 48 18 L 43 51 L 13 49 Z"
                fill="#1E201E"
                filter="url(#worker-screen-glow)"
              />
              {/* Lines of code / Rubric on screen */}
              <line x1="17" y1="22" x2="36" y2="24" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="28" x2="42" y2="30" stroke="#FCF8D8" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="34" x2="33" y2="36" stroke="#DD700B" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="40" x2="38" y2="42" stroke="#FCF8D8" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};
