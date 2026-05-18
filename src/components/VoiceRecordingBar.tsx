"use client";

import { useEffect, useState } from "react";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Each bar: max height (px) and animation delay (ms)
const BARS = [
  { maxH: 8,  delay: 0   },
  { maxH: 18, delay: 100 },
  { maxH: 26, delay: 220 },
  { maxH: 32, delay: 60  },
  { maxH: 20, delay: 180 },
  { maxH: 28, delay: 280 },
  { maxH: 14, delay: 40  },
  { maxH: 30, delay: 160 },
  { maxH: 22, delay: 240 },
  { maxH: 10, delay: 120 },
  { maxH: 26, delay: 20  },
  { maxH: 18, delay: 200 },
  { maxH: 32, delay: 80  },
  { maxH: 24, delay: 140 },
  { maxH: 12, delay: 300 },
  { maxH: 28, delay: 50  },
  { maxH: 20, delay: 260 },
];

interface VoiceRecordingBarProps {
  onStop: () => void;
  /** sm = widget, md = full page */
  size?: "sm" | "md";
  className?: string;
}

export function VoiceRecordingBar({ onStop, size = "md", className }: VoiceRecordingBarProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const scale = size === "sm" ? 0.65 : 1;
  const btnSize = size === "sm" ? "size-9" : "size-11";

  return (
    <div className={cn("flex items-center gap-3 w-full", className)}>
      {/* Pulsing red dot */}
      <span className="relative flex shrink-0 size-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
      </span>

      {/* Timer */}
      <span className="text-sm font-mono tabular-nums text-red-500 shrink-0 w-10">
        {mm}:{ss}
      </span>

      {/* Waveform bars */}
      <div
        className="flex-1 flex items-center gap-[2.5px]"
        style={{ height: `${Math.round(32 * scale)}px` }}
      >
        {BARS.map(({ maxH, delay }, i) => (
          <span
            key={i}
            className="rounded-full bg-red-400"
            style={{
              width: "3px",
              height: `${Math.round(maxH * scale)}px`,
              transformOrigin: "center",
              animation: "voice-bar 0.65s ease-in-out infinite",
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>

      {/* Stop button */}
      <Button
        onClick={onStop}
        size="icon"
        variant="ghost"
        className={cn(
          "shrink-0 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600",
          btnSize
        )}
        title="Parar gravação"
      >
        <Square className={cn("fill-current", size === "sm" ? "size-3.5" : "size-4")} />
      </Button>
    </div>
  );
}
