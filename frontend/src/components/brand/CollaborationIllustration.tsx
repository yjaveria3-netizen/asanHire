import React from "react";

interface CollaborationIllustrationProps {
  className?: string;
}

export const CollaborationIllustration: React.FC<CollaborationIllustrationProps> = ({
  className = "",
}) => {
  return (
    <div className={`w-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* Container in Vibrant Warm Orange Gradient */}
      <div className="w-full max-w-3xl rounded-3xl p-6 sm:p-10 border border-[#DD700B]/60 bg-gradient-to-br from-[#DD700B] via-[#C45E00] to-[#803800] flex flex-col items-center shadow-lg">
        {/* Header Title & Subtitle */}
        <div className="text-center mb-6">
          <span className="text-xs font-mono uppercase tracking-widest text-[#1E201E] bg-[#FCF8D8] px-3 py-1 rounded-full font-bold">
            Human &bull; AI Partnership
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#FCF8D8] mt-3">
            Collaborative Interview Orchestration
          </h3>
          <p className="text-xs sm:text-sm text-[#FCF8D8]/90 mt-1.5 max-w-lg mx-auto leading-relaxed">
            Recruiter and autonomous AI agent sit side-by-side: AI conducts real-time objective scoring while the human retains full decision sovereignty.
          </p>
        </div>

        {/* SVG Collaboration Scene */}
        <div className="w-full max-w-2xl animate-robot-idle" aria-label="Illustration of human recruiter and AI robot interviewing a candidate together">
          <svg
            viewBox="0 0 640 280"
            className="w-full h-auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Floor / Base Line */}
            <line x1="40" y1="240" x2="600" y2="240" stroke="#FCF8D8" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />

            {/* Conference Table */}
            <rect x="120" y="160" width="400" height="12" rx="3" fill="#1E201E" stroke="#343834" strokeWidth="1" />
            <rect x="150" y="172" width="16" height="68" fill="#1E201E" stroke="#343834" strokeWidth="1" />
            <rect x="474" y="172" width="16" height="68" fill="#1E201E" stroke="#343834" strokeWidth="1" />

            {/* Candidate (Left side of table, facing right) */}
            <g transform="translate(60, 110)">
              {/* Candidate Chair */}
              <rect x="25" y="55" width="8" height="75" fill="#1E201E" />
              <rect x="25" y="70" width="35" height="8" rx="2" fill="#2A2D2A" />

              {/* Candidate Body */}
              <circle cx="50" cy="20" r="14" fill="#FCF8D8" stroke="#D9DADF" strokeWidth="1" />
              <path d="M 38 48 C 38 36 62 36 62 48 L 60 75 L 40 75 Z" fill="#242724" />
              {/* Candidate Hair */}
              <path d="M 38 18 C 38 8 62 8 62 18 C 58 12 42 12 38 18 Z" fill="#1E201E" />
              {/* Candidate Arm & Resume Document */}
              <path d="M 52 48 L 72 65" stroke="#FCF8D8" strokeWidth="4" strokeLinecap="round" />
              <rect x="70" y="58" width="14" height="18" rx="1" fill="#FCF8D8" stroke="#242724" strokeWidth="1" />
              <line x1="73" y1="63" x2="81" y2="63" stroke="#DD700B" strokeWidth="1" />
              <line x1="73" y1="67" x2="81" y2="67" stroke="#242724" strokeWidth="1" />
            </g>

            {/* Center Desktop Laptop */}
            <g transform="translate(265, 115)">
              {/* Laptop Screen (angled open) */}
              <rect x="15" y="10" width="80" height="52" rx="4" fill="#1E201E" stroke="#343834" strokeWidth="1.5" />
              <rect x="19" y="14" width="72" height="44" rx="2" fill="#242724" />
              
              {/* Animated Screen Waves / Speech Bars */}
              <g className="animate-screen-blink">
                <line x1="28" y1="36" x2="28" y2="42" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="36" y1="30" x2="36" y2="46" stroke="#FCF8D8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="44" y1="24" x2="44" y2="50" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="52" y1="32" x2="52" y2="44" stroke="#FCF8D8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="60" y1="26" x2="60" y2="48" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="68" y1="34" x2="68" y2="42" stroke="#FCF8D8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="76" y1="38" x2="76" y2="40" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Laptop Base */}
              <path d="M 5 62 L 105 62 L 95 70 L 15 70 Z" fill="#FCF8D8" stroke="#343834" strokeWidth="1" />
              <rect x="48" y="64" width="14" height="4" rx="1" fill="#1E201E" />
            </g>

            {/* Human Recruiter (Center-Right, sitting at table) */}
            <g transform="translate(370, 75)">
              {/* Chair Back */}
              <rect x="55" y="45" width="8" height="115" fill="#1E201E" />
              <rect x="25" y="105" width="38" height="8" rx="2" fill="#2A2D2A" />

              {/* Human Head */}
              <circle cx="45" cy="22" r="15" fill="#FCF8D8" stroke="#D9DADF" strokeWidth="1" />
              {/* Hair */}
              <path d="M 32 20 C 32 6 58 6 58 20 C 58 10 32 10 32 20 Z" fill="#1E201E" />
              {/* Torso / Crisp White Shirt */}
              <path d="M 30 42 C 30 38 60 38 60 42 L 58 105 L 32 105 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
              {/* Human Arm taking notes on desk */}
              <path d="M 34 50 L 10 85" stroke="#FCF8D8" strokeWidth="5" strokeLinecap="round" />
              {/* Notepad on desk */}
              <rect x="0" y="80" width="22" height="26" rx="2" fill="#FFFFFF" stroke="#1E201E" strokeWidth="1" />
              <line x1="4" y1="86" x2="18" y2="86" stroke="#DD700B" strokeWidth="1.5" />
              <line x1="4" y1="91" x2="18" y2="91" stroke="#8A8B82" strokeWidth="1.5" />
              <line x1="4" y1="96" x2="14" y2="96" stroke="#8A8B82" strokeWidth="1.5" />
            </g>

            {/* AI Robot Recruiter (Right side, sitting collaboratively) */}
            <g transform="translate(470, 70)">
              {/* Chair */}
              <rect x="58" y="50" width="8" height="120" fill="#1E201E" />

              {/* Antenna */}
              <path d="M 40 18 L 32 4" stroke="#FCF8D8" strokeWidth="3" strokeLinecap="round" />
              <circle cx="30" cy="3" r="5" fill="#1E201E" />
              <circle cx="29" cy="2" r="1.5" fill="#FCF8D8" />

              {/* Robot Head Helmet */}
              <rect x="20" y="16" width="44" height="38" rx="18" fill="#FCF8D8" stroke="#D9DADF" strokeWidth="1.5" />
              {/* Visor Screen */}
              <rect x="25" y="24" width="34" height="22" rx="10" fill="#1E201E" />
              {/* Smiling Eyes (^ ^) */}
              <path d="M 31 34 Q 35 28 39 34" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M 45 34 Q 49 28 53 34" stroke="#DD700B" strokeWidth="2.5" strokeLinecap="round" fill="none" />

              {/* Robot Torso with AH Monogram */}
              <rect x="26" y="54" width="32" height="48" rx="6" fill="#FFFFFF" stroke="#383A38" strokeWidth="1" />
              <rect x="33" y="60" width="18" height="14" rx="2" fill="#1E201E" />
              {/* Small AH on chest */}
              <g transform="translate(34, 61) scale(0.16)">
                <path d="M 34,90 L 74,39 L 74,64 L 84,64 L 84,29 L 91,17 L 91,90 L 84,90 L 84,72 L 74,72 L 74,90 L 47,90 L 53,83 L 66,83 L 66,64 L 64,64 L 44,90 Z" fill="#DD700B" />
              </g>

              {/* Robot Arm pointing to laptop findings */}
              <path d="M 30 62 L 0 85" stroke="#FCF8D8" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="0" cy="85" r="3.5" fill="#1E201E" />
            </g>

            {/* Cute Minion-Like Helper Bot (Floating nearby, holding checkmark badge) */}
            <g transform="translate(200, 75)" className="animate-drift-1">
              {/* Mini Antenna */}
              <line x1="16" y1="8" x2="16" y2="2" stroke="#1E201E" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="1" r="2.5" fill="#1E201E" />

              {/* Mini Bot Body */}
              <rect x="4" y="8" width="24" height="26" rx="10" fill="#FCF8D8" stroke="#D9DADF" strokeWidth="1" />
              <rect x="8" y="13" width="16" height="10" rx="4" fill="#1E201E" />
              <circle cx="13" cy="18" r="1.5" fill="#DD700B" />
              <circle cx="19" cy="18" r="1.5" fill="#DD700B" />

              {/* Mini Holding Score Pill */}
              <rect x="2" y="32" width="28" height="10" rx="4" fill="#1E201E" />
              <text x="7" y="40" font-family="'Paquito', Georgia, serif" font-size="7" font-weight="bold" fill="#8FD19E">
                98% FIT
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
