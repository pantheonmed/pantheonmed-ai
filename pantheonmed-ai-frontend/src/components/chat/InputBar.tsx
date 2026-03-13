"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Camera,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Send,
  X,
} from "lucide-react";
import ModeMenu from "./ModeMenu";
import type { Attachment, ChatMode, ChatModeId } from "./types";
import { CHAT_MODES } from "./modes";

// ---------------------------------------------------------------------------
// Voice input hook
// ---------------------------------------------------------------------------

function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setIsSupported(!!SR);
    if (!SR) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript as string)
        .join(" ");
      onTranscript(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [onTranscript]);

  const toggle = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    if (isListening) {
      r.stop();
      setIsListening(false);
    } else {
      r.start();
      setIsListening(true);
    }
  }, [isListening]);

  return { isListening, isSupported, toggle };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InputBarProps {
  currentModeId: ChatModeId;
  onModeChange: (mode: ChatMode) => void;
  onSend: (text: string, attachments: Attachment[]) => void;
  onCameraOpen: () => void;
  disabled?: boolean;
  pendingAttachments: Attachment[];
  onAddAttachment: (att: Attachment) => void;
  onRemoveAttachment: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InputBar({
  currentModeId,
  onModeChange,
  onSend,
  onCameraOpen,
  disabled = false,
  pendingAttachments,
  onAddAttachment,
  onRemoveAttachment,
}: InputBarProps) {
  const [text, setText] = useState("");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentMode = CHAT_MODES[currentModeId];

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

  const handleVoiceTranscript = useCallback(
    (transcript: string) => setText((t) => (t ? t + " " + transcript : transcript)),
    [],
  );
  const { isListening, isSupported, toggle: toggleVoice } = useVoiceInput(handleVoiceTranscript);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    onSend(trimmed, pendingAttachments);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.onload = (ev) => {
        onAddAttachment({
          id: `${Date.now()}-${file.name}`,
          type: isImage ? "image" : "pdf",
          name: file.name,
          preview: isImage ? (ev.target?.result as string) : undefined,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const canSend = (text.trim().length > 0 || pendingAttachments.length > 0) && !disabled;

  return (
    <div className="relative">
      {/* Mode selector */}
      {showModeMenu && (
        <ModeMenu
          currentModeId={currentModeId}
          onSelect={onModeChange}
          onClose={() => setShowModeMenu(false)}
        />
      )}

      {/* Attachment preview strip */}
      {pendingAttachments.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm"
            >
              {att.type === "image" || att.type === "capture" ? (
                att.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.preview} alt={att.name} className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">IMG</div>
                )
              ) : (
                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-violet-700">PDF</span>
                </div>
              )}
              <div className="max-w-[120px]">
                <p className="text-xs font-medium text-gray-700 truncate">{att.name}</p>
                {att.size && (
                  <p className="text-[10px] text-gray-400">
                    {(att.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemoveAttachment(att.id)}
                className="ml-1 h-5 w-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input container */}
      <div
        className={clsx(
          "flex items-end gap-2 bg-white rounded-2xl border shadow-md transition-shadow",
          disabled ? "border-gray-100 opacity-60" : "border-gray-200 hover:shadow-lg focus-within:shadow-lg focus-within:border-blue-200",
        )}
      >
        {/* Left action buttons */}
        <div className="flex items-center gap-1 pl-3 pb-3">
          {/* + Mode button */}
          <button
            onClick={() => setShowModeMenu((v) => !v)}
            className={clsx(
              "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
              showModeMenu
                ? `${currentMode.color} text-white shadow-sm`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
            title="Select mode"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Mic */}
          {isSupported && (
            <button
              onClick={toggleVoice}
              className={clsx(
                "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                isListening
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
              title={isListening ? "Stop recording" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
            </button>
          )}

          {/* Camera */}
          <button
            onClick={onCameraOpen}
            className="h-9 w-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-all"
            title="Capture medical document"
          >
            <Camera className="h-4.5 w-4.5" />
          </button>

          {/* File upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-all"
            title="Upload file"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Text area */}
        <div className="flex-1 py-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              isListening ? "🎙 Listening..." : currentMode.placeholder
            }
            className="w-full resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none leading-relaxed max-h-[140px]"
          />
        </div>

        {/* Send button */}
        <div className="pr-3 pb-3">
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={clsx(
              "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
              canSend
                ? `${currentMode.color} text-white shadow-sm hover:opacity-90 active:scale-95`
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode badge + hint */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-1.5">
          {React.createElement(currentMode.icon, { className: clsx("h-3 w-3", currentMode.textColor) })}
          <span className={clsx("text-xs font-semibold", currentMode.textColor)}>{currentMode.label}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{currentMode.description}</span>
        </div>
        <span className="text-[10px] text-gray-300">Enter ↵ to send · Shift+Enter for newline</span>
      </div>
    </div>
  );
}
