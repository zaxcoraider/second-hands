"use client";

import { useRef } from "react";
import { VideoOff } from "lucide-react";
import { FocusBox } from "@/components/focus-box";
import { Corners, StateTag } from "@/components/hud";
import type { Focus } from "@/lib/schemas";
import { STATE, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/**
 * The camera view: latest frame (or `children`, e.g. a <video>), HUD brackets in the AI state color,
 * scan line while watching, and the model's focus box.
 */
export function LiveView({
  frame,
  state,
  stale,
  children,
  mediaRef,
  focus,
  focusLabel,
  source = "Phone cam",
  telemetry,
}: {
  frame: string | null;
  state: AiState;
  stale?: boolean;
  children?: React.ReactNode;
  mediaRef?: React.RefObject<HTMLVideoElement | HTMLImageElement | null>;
  focus?: Focus | null;
  focusLabel?: string;
  source?: string;
  telemetry?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const meta = STATE[state];
  const alerting = state === "ask" || state === "stop";
  const hasMedia = !!children || !!frame;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border bg-black transition-shadow duration-300",
        alerting ? cn(meta.border, meta.glow) : "border-line",
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        {children ??
          (frame ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img ref={imgRef} src={frame} alt="Latest frame from the phone camera" className="size-full object-cover" />
          ) : (
            <div className="hud-grid flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <VideoOff className="size-6" strokeWidth={1.5} />
              <span className="hud-label">Waiting for camera</span>
            </div>
          ))}

        {hasMedia && (
          <>
            <div aria-hidden className="hud-lines absolute inset-0 opacity-50" />
            {!stale && state === "idle" && <div aria-hidden className="hud-scan" />}
            <FocusBox focus={focus} mediaRef={mediaRef ?? imgRef} state={state} label={focusLabel} />
          </>
        )}

        <div className={cn("pointer-events-none absolute inset-3 transition-colors duration-200", meta.text)}>
          <Corners size={22} className={cn(state === "idle" && "opacity-50")} />
        </div>

        <div className="absolute top-3 left-3 sm:top-5 sm:left-5">
          <StateTag state={state} label={stale ? "Camera idle" : undefined} />
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2 sm:top-5 sm:right-5 rounded-[3px] bg-black/60 px-2 py-1 font-mono text-[11px] tracking-[0.14em] text-white/75 uppercase backdrop-blur-sm">
          <span className={cn("size-1.5 rounded-full", stale ? "bg-idle" : "hud-blink bg-stop shadow-[0_0_6px_var(--stop)]")} />
          {source}
        </div>
        {telemetry && (
          <div className="absolute top-14 right-5 hidden rounded-[3px] bg-black/60 sm:block px-2 py-1 font-mono text-[11px] tracking-[0.12em] text-white/60 uppercase tabular">
            {telemetry}
          </div>
        )}
      </div>
    </div>
  );
}
