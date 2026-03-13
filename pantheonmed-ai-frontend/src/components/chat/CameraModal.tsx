"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, FlipHorizontal, X, ZoomIn } from "lucide-react";
import clsx from "clsx";

interface CameraModalProps {
  onCapture: (dataUrl: string, fileName: string) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [captured, setCaptured] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions in your browser.");
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    setCaptured(dataUrl);
  };

  const handleConfirm = () => {
    if (!captured) return;
    const fileName = `capture-${Date.now()}.jpg`;
    onCapture(captured, fileName);
    onClose();
  };

  const handleRetake = () => setCaptured(null);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-black rounded-3xl overflow-hidden shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Flip camera */}
        {!captured && (
          <button
            onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
            className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition"
          >
            <FlipHorizontal className="h-5 w-5" />
          </button>
        )}

        {/* Flash overlay */}
        {flash && <div className="absolute inset-0 bg-white z-20 animate-ping-once pointer-events-none" />}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 text-center pt-4">
          <p className="text-white/80 text-xs font-medium tracking-wide uppercase">
            {captured ? "Confirm Capture" : "Medical Document Scanner"}
          </p>
        </div>

        {/* Error state */}
        {error ? (
          <div className="aspect-[4/3] flex items-center justify-center bg-gray-900 p-8">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-300 text-sm">{error}</p>
            </div>
          </div>
        ) : captured ? (
          /* Captured preview */
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={captured} alt="Captured" className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-0 border-2 border-blue-400 m-4 rounded-xl pointer-events-none" />
          </div>
        ) : (
          /* Live camera */
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover"
            />
            {/* Corner guides */}
            <div className="absolute inset-4 pointer-events-none">
              {["top-0 left-0", "top-0 right-0 rotate-90", "bottom-0 right-0 rotate-180", "bottom-0 left-0 -rotate-90"].map((pos, i) => (
                <div key={i} className={clsx("absolute h-6 w-6 border-t-2 border-l-2 border-blue-400 rounded-tl", pos)} />
              ))}
            </div>
            <div className="absolute bottom-16 left-0 right-0 flex items-center justify-center">
              <ZoomIn className="h-4 w-4 text-white/60 mr-1" />
              <p className="text-white/60 text-xs">Position document within frame</p>
            </div>
          </div>
        )}

        {/* Canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="p-5 flex items-center justify-center gap-4 bg-black">
          {captured ? (
            <>
              <button
                onClick={handleRetake}
                className="px-6 py-2.5 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition"
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="px-8 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition shadow-lg"
              >
                Use Photo
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              disabled={!!error}
              className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
            >
              <div className="h-12 w-12 rounded-full bg-white border-4 border-gray-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
