import React from "react";

interface NeuProgressProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
}

export const NeuProgress: React.FC<NeuProgressProps> = ({
  value,
  max = 100,
  label,
  showPercent = true,
  className = "",
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs text-[#8A8B82]">
          {label && <span className="font-medium text-[#D9DADF]">{label}</span>}
          {showPercent && <span className="font-mono text-[#DD700B] font-semibold">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className="neu-inset h-3 w-full rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full bg-[#DD700B] transition-all duration-500 ease-out shadow-[0_0_8px_rgba(221,112,11,0.6)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
