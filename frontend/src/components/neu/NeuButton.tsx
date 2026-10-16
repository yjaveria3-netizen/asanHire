import React from "react";

interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export const NeuButton: React.FC<NeuButtonProps> = ({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-md",
    md: "px-4 py-2.5 text-sm rounded-lg",
    lg: "px-6 py-3.5 text-base rounded-xl font-medium",
  };

  const variantStyles = {
    primary: "btn-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "neu-raised text-[#D9DADF] hover:text-white active:shadow-inset transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
    ghost:
      "bg-transparent text-[#8A8B82] hover:text-[#D9DADF] hover:bg-[#2A2D2A]/50 transition-colors disabled:opacity-40",
    danger:
      "bg-[rgba(90,42,42,0.4)] border border-[#9E4A4A] text-[#E57373] hover:bg-[rgba(90,42,42,0.6)] transition-colors active:scale-[0.98]",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#DD700B] focus-visible:outline-none select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
