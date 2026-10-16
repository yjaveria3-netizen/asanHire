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
    sm: { height: 24, width: 89 },
    md: { height: 32, width: 118 },
    lg: { height: 48, width: 177 },
    xl: { height: 72, width: 266 },
  },
  mark: {
    sm: { height: 24, width: 28 },
    md: { height: 32, width: 37 },
    lg: { height: 48, width: 55 },
    xl: { height: 72, width: 82 },
  },
  tile: {
    sm: { height: 24, width: 24 },
    md: { height: 32, width: 32 },
    lg: { height: 48, width: 48 },
    xl: { height: 72, width: 72 },
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
