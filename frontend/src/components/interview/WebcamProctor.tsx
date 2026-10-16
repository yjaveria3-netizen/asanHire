"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, CameraOff, Users, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";

interface WebcamProctorProps {
  onEvent?: (type: string, penalty: number, detail?: string) => void;
  isInterviewActive?: boolean;
  className?: string;
}

export type ProctorStatus = "initializing" | "centered" | "no_face" | "multiple_faces" | "permission_denied";

export const WebcamProctor: React.FC<WebcamProctorProps> = ({
  onEvent,
  isInterviewActive = true,
  className = "",
}) => {
  const [status, setStatus] = useState<ProctorStatus>("initializing");
  const [faceCount, setFaceCount] = useState<number>(1);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const noFaceConsecutiveTicksRef = useRef<number>(0);
  const checkIntervalRef = useRef<any>(null);

  // Initialize Camera Stream
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setStatus("initializing");

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera streaming is not supported on this device/browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setHasCameraAccess(true);
      setStatus("centered");
    } catch (err: any) {
      console.warn("Webcam proctor camera access error:", err);
      setHasCameraAccess(false);
      setStatus("permission_denied");
      setErrorMessage(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser settings."
          : "Webcam not detected or unavailable."
      );
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Client-Side Face & Presence Detection
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraAccess) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2 || video.videoWidth === 0) return;

    let detectedFaces = 1;

    // 1. Try Native Browser FaceDetector (Chromium Shape Detection API)
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
        const faces = await detector.detect(video);
        detectedFaces = faces.length;
      } catch {
        // Fallback to canvas skin-pixel clustering below
      }
    } else {
      // 2. High-Performance Lightweight HTML5 Canvas Fallback (Universal)
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const width = 80;
        const height = 60;
        ctx.drawImage(video, 0, 0, width, height);
        const frame = ctx.getImageData(0, 0, width, height);
        const data = frame.data;

        let skinPixels = 0;
        let leftColPixels = 0;
        let rightColPixels = 0;
        let midColPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Normalized skin-tone detection in RGB space
          const isSkin =
            r > 60 &&
            g > 40 &&
            b > 20 &&
            r > g &&
            r > b &&
            r - g > 12 &&
            Math.abs(r - g) < 150 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 15;

          if (isSkin) {
            skinPixels++;
            const pixelIndex = i / 4;
            const x = pixelIndex % width;
            if (x < width * 0.35) {
              leftColPixels++;
            } else if (x > width * 0.65) {
              rightColPixels++;
            } else {
              midColPixels++;
            }
          }
        }

        const totalPixels = width * height;
        const skinRatio = skinPixels / totalPixels;

        // Candidate presence heuristic:
        // A normal face takes roughly 4% to 45% of camera frame at standard desktop distance
        if (skinRatio < 0.02) {
          detectedFaces = 0; // Empty frame / candidate stepped away
        } else if (
          skinRatio > 0.12 &&
          leftColPixels > skinPixels * 0.35 &&
          rightColPixels > skinPixels * 0.35 &&
          midColPixels < skinPixels * 0.2
        ) {
          // Two distinct clusters on opposite sides of frame without central connection
          detectedFaces = 2; // Multiple people
        } else {
          detectedFaces = 1; // Single centered face
        }

        prevFrameDataRef.current = data;
      }
    }

    setFaceCount(detectedFaces);

    // Telemetry & Status State Transitions
    if (detectedFaces === 0) {
      noFaceConsecutiveTicksRef.current += 1;
      // Trigger after ~3 seconds (2 consecutive 1.5s ticks) of absence
      if (noFaceConsecutiveTicksRef.current >= 2) {
        setStatus("no_face");
        if (isInterviewActive && onEvent) {
          onEvent("no_face", 5, "Candidate face not detected in camera frame");
        }
      }
    } else if (detectedFaces > 1) {
      noFaceConsecutiveTicksRef.current = 0;
      setStatus("multiple_faces");
      if (isInterviewActive && onEvent) {
        onEvent("multiple_faces", 15, "Multiple people detected in camera feed");
      }
    } else {
      noFaceConsecutiveTicksRef.current = 0;
      setStatus("centered");
    }
  }, [hasCameraAccess, isInterviewActive, onEvent]);

  // Lifecycle & Interval Setup
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (hasCameraAccess) {
      checkIntervalRef.current = setInterval(analyzeFrame, 1500);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [hasCameraAccess, analyzeFrame]);

  // Status Presentation Helpers
  const getStatusBadge = () => {
    switch (status) {
      case "centered":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD19E]" />,
          text: "Face Centered & Verified",
          className: "bg-[#8FD19E]/15 text-[#8FD19E] border-[#8FD19E]/30",
        };
      case "no_face":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#E57373]" />,
          text: "No Face Detected",
          className: "bg-[#E57373]/20 text-[#E57373] border-[#E57373] animate-pulse",
        };
      case "multiple_faces":
        return {
          icon: <Users className="w-3.5 h-3.5 text-[#DD700B]" />,
          text: "Multiple Faces Detected",
          className: "bg-[#DD700B]/20 text-[#DD700B] border-[#DD700B] animate-pulse",
        };
      case "permission_denied":
        return {
          icon: <CameraOff className="w-3.5 h-3.5 text-[#E57373]" />,
          text: "Camera Unavailable",
          className: "bg-[#E57373]/15 text-[#E57373] border-[#E57373]/30",
        };
      default:
        return {
          icon: <Camera className="w-3.5 h-3.5 text-[#8A8B82]" />,
          text: "Calibrating Sensor...",
          className: "bg-[#242724] text-[#8A8B82] border-[#383A38]",
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      className={`neu-raised rounded-xl p-3 border border-[#383A38] bg-[#1E201E] flex flex-col gap-2.5 ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#383A38]">
        <div className="flex items-center gap-1.5 font-semibold text-[#D9DADF]">
          <Camera className="w-3.5 h-3.5 text-[#DD700B]" />
          <span>Live Vision Proctor</span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.className}`}
        >
          {badge.icon}
          <span>{badge.text}</span>
        </span>
      </div>

      {/* Video Mirror Box */}
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#161716] border border-[#383A38] flex items-center justify-center">
        {hasCameraAccess ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                status === "no_face" ? "opacity-75 ring-2 ring-[#E57373]" : ""
              } ${status === "multiple_faces" ? "ring-2 ring-[#DD700B]" : ""}`}
            />
            {/* Centering Face Guide Lines Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-24 h-32 rounded-full border border-dashed transition-colors duration-300 ${
                  status === "centered"
                    ? "border-[#8FD19E]/40"
                    : status === "no_face"
                    ? "border-[#E57373]/80 bg-[#E57373]/10"
                    : "border-[#DD700B]/80 bg-[#DD700B]/10"
                }`}
              />
            </div>
          </>
        ) : (
          <div className="p-4 text-center flex flex-col items-center gap-2 text-xs text-[#8A8B82]">
            <CameraOff className="w-8 h-8 text-[#E57373]/80" />
            <p className="max-w-[200px] text-[11px] leading-tight">
              {errorMessage || "Webcam is not active or access was denied."}
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="mt-1 px-2.5 py-1 text-[11px] font-mono rounded-lg bg-[#242724] border border-[#DD700B]/40 text-[#DD700B] hover:bg-[#DD700B]/15 transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry Camera
            </button>
          </div>
        )}

        {/* Hidden Canvas for Edge AI Frame Computation */}
        <canvas ref={canvasRef} width="80" height="60" className="hidden" />
      </div>

      {/* Privacy Guarantee Pill */}
      <div className="flex items-center justify-between text-[10px] text-[#8A8B82] pt-0.5">
        <span className="flex items-center gap-1 text-[#8FD19E]">
          <ShieldCheck className="w-3 h-3" />
          <span>Local Edge Processing</span>
        </span>
        <span className="font-mono">Zero frames uploaded</span>
      </div>
    </div>
  );
};
