"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { NeuButton } from "@/components/neu/NeuButton";

interface CameraCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export const CameraCheckModal: React.FC<CameraCheckModalProps> = ({
  isOpen,
  onClose,
  onVerified,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const checkIntervalRef = useRef<any>(null);

  // Stop camera stream & analysis
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

    setIsCameraActive(false);
  }, []);

  // Frame check to verify presence in center reticle pre-check
  const checkFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2 || video.videoWidth === 0) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      const W = 80;
      const H = 60;
      ctx.drawImage(video, 0, 0, W, H);
      const frame = ctx.getImageData(0, 0, W, H);
      const data = frame.data;

      // Define center reticle region: x: [26..54], y: [12..48]
      const minX = 26;
      const maxX = 54;
      const minY = 12;
      const maxY = 48;
      const reticleArea = (maxX - minX) * (maxY - minY);

      let centerSkinPixels = 0;
      let totalSkinPixels = 0;
      let sumX = 0;
      let sumY = 0;
      let totalLuminance = 0;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;

          // YCbCr Human Skin Filter
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
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
              centerSkinPixels++;
            }
          }
        }
      }

      const reticleSkinRatio = centerSkinPixels / reticleArea;
      const avgLuminance = totalLuminance / (W * H);
      const centerConcentration = totalSkinPixels > 0 ? centerSkinPixels / totalSkinPixels : 0;
      const centroidX = totalSkinPixels > 0 ? sumX / totalSkinPixels : 0;
      const centroidY = totalSkinPixels > 0 ? sumY / totalSkinPixels : 0;

      // Face is considered centered only if centroid is in the center column, at least 50% skin in center, and reticle density >= 12%
      const isCenteredAndClear =
        totalSkinPixels >= 35 &&
        centroidX >= 30 &&
        centroidX <= 50 &&
        centroidY >= 14 &&
        centroidY <= 46 &&
        centerConcentration >= 0.50 &&
        reticleSkinRatio >= 0.12 &&
        avgLuminance > 22 &&
        avgLuminance < 240;

      setIsFaceDetected(isCenteredAndClear);
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setIsFaceDetected(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera streaming is not supported on this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      checkIntervalRef.current = setInterval(checkFrame, 800);
    } catch (err: any) {
      console.warn("Camera check modal error:", err);
      setIsCameraActive(false);
      setErrorMessage(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera permissions in your browser to proceed."
          : "Webcam not detected. Please ensure your camera is connected."
      );
    }
  }, [checkFrame]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="neu-raised max-w-lg w-full rounded-2xl p-6 sm:p-8 border border-[#D9DADF]/15 flex flex-col gap-5 text-center relative shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute right-4 top-4 p-2 text-[#8A8B82] hover:text-[#D9DADF] rounded-lg transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-xl bg-[#DD700B]/10 border border-[#DD700B]/30 flex items-center justify-center text-[#DD700B]">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-[#D9DADF]">Camera &amp; Vision Check</h3>
          <p className="text-xs text-[#8A8B82] max-w-sm">
            Position yourself in the center of the frame with good front lighting.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage ? (
          <div className="p-4 rounded-xl bg-[#E57373]/15 border border-[#E57373]/30 text-xs text-[#E57373] text-left flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Camera Permission Required</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : (
          /* Live Camera Preview Container */
          <div className="neu-inset p-3.5 rounded-xl bg-[#202320] flex flex-col gap-3 border border-[#383A38]">
            {/* Status Pill */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A8B82] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#DD700B]" /> Framing Check:
              </span>
              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  isFaceDetected
                    ? "bg-[#8FD19E]/20 text-[#8FD19E] border border-[#8FD19E]/30"
                    : "bg-[#FCF8D8]/20 text-[#FCF8D8] border border-[#FCF8D8]/30"
                }`}
              >
                {isFaceDetected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Subject Centered &amp; Clear
                  </>
                ) : (
                  <>Please align face within frame</>
                )}
              </span>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#161716] border border-[#383A38] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Centering Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`w-36 h-48 rounded-full border-2 border-dashed transition-all duration-300 ${
                    isFaceDetected
                      ? "border-[#8FD19E]/60 bg-[#8FD19E]/5"
                      : "border-[#DD700B]/60 bg-[#DD700B]/5"
                  }`}
                />
              </div>

              <canvas ref={canvasRef} width="80" height="60" className="hidden" />
            </div>

            {/* Privacy Assurance Bar */}
            <div className="p-2 rounded-lg bg-[#1E201E] border border-[#383A38] flex items-center justify-between text-[11px] text-[#8FD19E]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Strict Client-Side Edge Detection</span>
              </span>
              <span className="text-[#8A8B82] font-mono text-[10px]">Zero Video Saved</span>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-1">
          {errorMessage ? (
            <NeuButton
              size="md"
              variant="secondary"
              onClick={startCamera}
              className="w-full sm:w-auto text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#DD700B]" /> Retry Camera Access
            </NeuButton>
          ) : (
            <NeuButton
              size="md"
              variant="secondary"
              onClick={startCamera}
              className="w-full sm:w-auto text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#8A8B82]" /> Refresh Feed
            </NeuButton>
          )}

          <NeuButton
            size="md"
            variant="primary"
            onClick={() => {
              stopCamera();
              if (onVerified) onVerified();
              onClose();
            }}
            className="w-full sm:w-auto text-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-1 text-[#1E201E]" />
            Camera Verified &bull; Continue
          </NeuButton>
        </div>
      </div>
    </div>
  );
};
