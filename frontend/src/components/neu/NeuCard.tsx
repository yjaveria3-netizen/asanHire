import React from "react";

interface NeuCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "raised" | "inset" | "flat";
  children: React.ReactNode;
  className?: string;
}

export const NeuCard: React.FC<NeuCardProps> = ({
  variant = "raised",
  children,
  className = "",
  ...props
}) => {
  const variantStyles = {
    raised: "neu-raised rounded-xl p-6",
    inset: "neu-inset rounded-xl p-6",
    flat: "bg-[#2A2D2A] border border-[rgba(217,218,223,0.08)] rounded-xl p-6",
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
