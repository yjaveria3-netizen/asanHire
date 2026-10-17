import React from "react";
import Image from "next/image";
import Link from "next/link";

export type LogoVariant = "mark" | "full" | "tile";
export type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  href?: string | null;
  className?: string;
  priority?: boolean;
}

const DIMENSIONS: Record<LogoVariant, Record<LogoSize, { width: number; height: number }>> = {
  full: {
    sm: { height: 32, width: 120 },
    md: { height: 44, width: 165 },
    lg: { height: 54, width: 203 },
    xl: { height: 68, width: 256 },
  },
  mark: {
    sm: { height: 32, width: 32 },
    md: { height: 44, width: 44 },
    lg: { height: 54, width: 54 },
    xl: { height: 68, width: 68 },
  },
  tile: {
    sm: { height: 32, width: 32 },
    md: { height: 44, width: 44 },
    lg: { height: 54, width: 54 },
    xl: { height: 68, width: 68 },
  },
};

const FILE_PATHS: Record<LogoVariant, string> = {
  full: "/logo-full.svg",
  mark: "/logo-mark.svg",
  tile: "/logo.svg",
};

export const Logo: React.FC<LogoProps> = ({
  variant = "full",
  size = "md",
  href = "/",
  className = "",
  priority = false,
}) => {
  const { width, height } = DIMENSIONS[variant][size];
  const src = FILE_PATHS[variant];

  const imageElement = (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ height, width }}
    >
      <Image
        src={src}
        alt="asanHire logo"
        width={width}
        height={height}
        priority={priority}
        className="w-full h-full object-contain"
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-[#DD700B] focus-visible:outline-none transition-transform hover:opacity-90 active:scale-95"
        aria-label="asanHire home"
      >
        {imageElement}
      </Link>
    );
  }

  return imageElement;
};

export default Logo;
