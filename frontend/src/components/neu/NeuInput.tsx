import React from "react";

interface NeuInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export const NeuInput: React.FC<NeuInputProps> = ({
  label,
  error,
  helperText,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#8A8B82] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`neu-inset text-[#D9DADF] placeholder-[#8A8B82]/60 px-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#DD700B] disabled:opacity-50 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#E57373] mt-0.5">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#8A8B82] mt-0.5">{helperText}</p>}
    </div>
  );
};
