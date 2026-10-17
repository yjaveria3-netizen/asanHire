"use client";

import React, { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in ms
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const targetValue = Number(value);
    if (isNaN(targetValue) || targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    const isSmallInt = decimals === 0 && targetValue > 0 && targetValue <= 100;

    // For integer values <= 100, step consecutively: 0, 1, 2, 3, 4... targetValue
    if (isSmallInt) {
      let current = 0;
      setDisplayValue(0);
      const stepTime = Math.max(15, Math.min(80, Math.floor(duration / targetValue)));
      const timer = setInterval(() => {
        current += 1;
        setDisplayValue(current);
        if (current >= targetValue) {
          clearInterval(timer);
        }
      }, stepTime);

      return () => clearInterval(timer);
    }

    // For larger numbers or decimals, use high-frequency ticker (40-60 frames)
    // with smooth linear/quadratic progression so numbers 0, 1, 2, 3... are visibly seen ticking
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth cubic-out easing (avoids harsh exponential jumps, preserves visible count-up)
      const easeProgress = 1 - Math.pow(1 - progress, 2.5);
      const current = targetValue * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration, decimals]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toString();

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
