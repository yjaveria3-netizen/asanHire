import React from "react";

interface NeuToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const NeuToggle: React.FC<NeuToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all duration-200 relative p-0.5 ${
          checked ? "bg-[#DD700B] shadow-[0_0_10px_rgba(221,112,11,0.5)]" : "neu-inset bg-[#202220]"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-[#D9DADF] shadow-md transition-transform duration-200 ${
            checked ? "translate-x-5 bg-[#1E201E]" : "translate-x-0"
          }`}
        />
      </div>
      {label && <span className="text-sm font-medium text-[#D9DADF]">{label}</span>}
    </label>
  );
};
