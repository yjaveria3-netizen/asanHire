"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, CameraOff, Users, AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";

interface WebcamProctorProps {
  onEvent?: (type: string, penalty: number, detail?: string) => void;
  isInterviewActive?: boolean;
  className?: string;
}

export type ProctorStatus = "initializing" | "centered" | "unaligned" | "no_face" | "multiple_faces" | "permission_denied";

export const WebcamProctor: React.FC<WebcamProctorProps> = ({
  onEvent,
  isInterviewActive = true,
  className = "",
}) => {
  const [status, setStatus] = useState<ProctorStatus>("initializing");
  const [faceCount, setFaceCount] = useState<number>(0);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const checkIntervalRef = useRef<any>(null);
  const previousLuminanceRef = useRef<Uint8Array | null>(null);

  // Initialize Camera Stream
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setStatus("initializing");

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera streaming is not supported on this browser.");
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
      // Wait for analyzeFrame to actually verify face presence before setting centered
      setStatus("initializing");
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

  // Ensure video stream connects to video element on state change
  useEffect(() => {
    if (hasCameraAccess && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [hasCameraAccess]);

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

    // Check if video is actually active and emitting dimensions
    if (video.readyState < 2 || video.videoWidth === 0) {
      setStatus("initializing");
      return;
    }

    // Tier 1: Modern Browser Native FaceDetector API (Chromium / Chrome / Edge)
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(video);

        if (!faces || faces.length === 0) {
          setFaceCount(0);
          setStatus("no_face");
          if (isInterviewActive && onEvent) {
            onEvent("no_face", 5, "Candidate face not detected in frame");
          }
          return;
        }

        if (faces.length > 1) {
          setFaceCount(faces.length);
          setStatus("multiple_faces");
          if (isInterviewActive && onEvent) {
            onEvent("multiple_faces", 15, "Multiple people detected in camera feed");
          }
          return;
        }

        // Single face detected: Check alignment in center oval
        const box = faces[0].boundingBox;
        const normCenterX = (box.x + box.width / 2) / video.videoWidth;
        const normCenterY = (box.y + box.height / 2) / video.videoHeight;

        // Center oval reticle spans 30% to 70% horizontally and 20% to 80% vertically
        const isAligned =
          normCenterX >= 0.30 &&
          normCenterX <= 0.70 &&
          normCenterY >= 0.20 &&
          normCenterY <= 0.80;

        setFaceCount(1);
        if (isAligned) {
          setStatus("centered");
        } else {
          setStatus("unaligned");
        }
        return;
      } catch {
        // Fall back to pixel centroid analysis below
      }
    }

  // Tier 2: YCbCr Chrominance & Spatial Center-Concentration Analysis
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = 80;
    const height = 60;
    ctx.drawImage(video, 0, 0, width, height);
    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;

    // Center oval reticle bounds (center is x=40, y=30)
    const minX = 26;
    const maxX = 54;
    const minY = 12;
    const maxY = 48;
    const reticleArea = (maxX - minX) * (maxY - minY);

    let reticleSkinPixels = 0;
    let totalLuminance = 0;
    let totalSkinPixels = 0;
    let centerSkinPixels = 0;
    let sumX = 0;
    let sumY = 0;
    let leftSkin = 0;
    let rightSkin = 0;
    let motionPixelCount = 0;

    const currentLum = new Uint8Array(width * height);
    const prevLum = previousLuminanceRef.current;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pIdx = y * width + x;
        const idx = pIdx * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        currentLum[pIdx] = lum;
        totalLuminance += lum;

        // Motion analysis: compare with previous frame
        if (prevLum) {
          const delta = Math.abs(lum - prevLum[pIdx]);
          if (delta > 24) motionPixelCount++;
        }

        // Standard YCbCr Human Skin Chrominance Filter
        // Distinguishes genuine human skin from beige walls, wood, and fabrics
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin =
          cb >= 77 &&
          cb <= 127 &&
          cr >= 133 &&
          cr <= 173 &&
          r > g &&
          r - g >= 6 &&
          r > 42;

        if (isSkin) {
          totalSkinPixels++;
          sumX += x;
          sumY += y;
          if (x < minX) leftSkin++;
          if (x > maxX) rightSkin++;

          if (x >= minX && x <= maxX) {
            centerSkinPixels++;
            if (y >= minY && y <= maxY) {
              reticleSkinPixels++;
            }
          }
        }
      }
    }

    previousLuminanceRef.current = currentLum;

    const avgLuminance = totalLuminance / (width * height);
    const reticleSkinRatio = reticleSkinPixels / reticleArea;

    // 1. Check lighting and camera visibility
    if (avgLuminance < 20 || avgLuminance > 245 || totalSkinPixels < 35) {
      setFaceCount(0);
      setStatus("no_face");
      if (isInterviewActive && onEvent) {
        onEvent("no_face", 5, "Candidate camera feed dark or obscured");
      }
      return;
    }

    // 2. Multiple people in frame: distinct high skin clusters on far left AND far right
    if (leftSkin > 40 && rightSkin > 40 && centerSkinPixels < 20) {
      setFaceCount(2);
      setStatus("multiple_faces");
      if (isInterviewActive && onEvent) {
        onEvent("multiple_faces", 15, "Multiple people detected in camera feed");
      }
      return;
    }

    // 3. Movement / phone / foreign object disturbance check
    const motionRatio = motionPixelCount / (width * height);
    if (motionRatio > 0.30) {
      // Rapid motion / camera being shifted or phone placed in front
      setStatus("unaligned");
      return;
    }

    const centroidX = sumX / totalSkinPixels;
    const centroidY = sumY / totalSkinPixels;
    const centerConcentration = centerSkinPixels / totalSkinPixels;

    // 4. Strict Alignment Check:
    // Face must be physically centered:
    // - Centroid X must be in [30..50] (center is 40)
    // - Centroid Y must be in [16..44] (center is 30)
    // - At least 50% of the candidate's skin pixels must be located inside the center column!
    // - The reticle must have positive skin density
    const isHorizontallyCentered = centroidX >= 30 && centroidX <= 50;
    const isVerticallyCentered = centroidY >= 14 && centroidY <= 46;
    const isConcentratedInCenter = centerConcentration >= 0.50;
    const hasReticleDensity = reticleSkinRatio >= 0.12;

    if (isHorizontallyCentered && isVerticallyCentered && isConcentratedInCenter && hasReticleDensity) {
      setFaceCount(1);
      setStatus("centered");
    } else {
      // Face exists in frame but candidate is tilted or shifted off to the side (e.g. right/left)
      setFaceCount(1);
      setStatus("unaligned");
      if (isInterviewActive && onEvent) {
        onEvent("unaligned", 2, "Candidate face not aligned within center reticle");
      }
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
      checkIntervalRef.current = setInterval(analyzeFrame, 800);
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
      case "unaligned":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#DD700B]" />,
          text: "Align Face in Center Oval",
          className: "bg-[#DD700B]/20 text-[#DD700B] border-[#DD700B]/50 animate-pulse",
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
          icon: <Camera className="w-3.5 h-3.5 text-[#DD700B] animate-pulse" />,
          text: "Detecting Face...",
          className: "bg-[#242724] text-[#DD700B] border-[#DD700B]/30",
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
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium transition-colors ${badge.className}`}
        >
          {badge.icon}
          <span>{badge.text}</span>
        </span>
      </div>

      {/* Video Mirror Box */}
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#161716] border border-[#383A38] flex items-center justify-center">
        {/* Video is ALWAYS rendered so ref is never null when getUserMedia stream attaches */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            !hasCameraAccess ? "hidden" : ""
          } ${status === "no_face" ? "ring-2 ring-[#E57373]/60" : ""} ${
            status === "multiple_faces" ? "ring-2 ring-[#DD700B]" : ""
          }`}
        />

        {/* Reticle Guide Overlay */}
        {hasCameraAccess && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-24 h-32 rounded-full border-2 border-dashed transition-all duration-300 ${
                status === "centered"
                  ? "border-[#8FD19E] bg-[#8FD19E]/10"
                  : status === "unaligned"
                  ? "border-[#DD700B] bg-[#DD700B]/15 animate-pulse"
                  : status === "no_face"
                  ? "border-[#E57373]/80 bg-[#E57373]/10"
                  : "border-[#DD700B]/60 bg-[#DD700B]/5"
              }`}
            />
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {!hasCameraAccess && (
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
