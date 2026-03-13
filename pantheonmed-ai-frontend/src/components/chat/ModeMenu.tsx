"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";
import { CHAT_MODES } from "./modes";
import type { ChatMode, ChatModeId } from "./types";

interface ModeMenuProps {
  currentModeId: ChatModeId;
  onSelect: (mode: ChatMode) => void;
  onClose: () => void;
}

export default function ModeMenu({ currentModeId, onSelect, onClose }: ModeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const modes = Object.values(CHAT_MODES);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-3 w-[340px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-slide-up"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-800">Select Analysis Mode</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Each mode configures the AI with a specialized clinical prompt
        </p>
      </div>

      {/* Mode grid */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === currentModeId;
          return (
            <button
              key={mode.id}
              onClick={() => {
                onSelect(mode);
                onClose();
              }}
              className={clsx(
                "relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 text-left transition-all duration-150 hover:scale-[1.02] active:scale-100",
                isActive
                  ? `${mode.borderColor} bg-gradient-to-br from-white to-gray-50 shadow-sm`
                  : "border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50",
              )}
            >
              {/* Active check */}
              {isActive && (
                <CheckCircle2 className={clsx("absolute top-2.5 right-2.5 h-3.5 w-3.5", mode.textColor)} />
              )}

              {/* Icon bubble */}
              <div
                className={clsx(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  isActive ? mode.color : "bg-gray-100",
                )}
              >
                <Icon className={clsx("h-4 w-4", isActive ? "text-white" : "text-gray-500")} />
              </div>

              {/* Labels */}
              <div>
                <p className={clsx("text-xs font-semibold leading-tight", isActive ? mode.textColor : "text-gray-800")}>
                  {mode.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{mode.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-400 text-center">
          Mode can be changed at any point during the conversation
        </p>
      </div>
    </div>
  );
}
