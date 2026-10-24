"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Focus } from "@/lib/schemas";
import { STATE, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

type Rect = { left: number; top: number; width: number; height: number };

/**
 * Draws the model's focus box over a video/img shown with `object-fit: cover`, accounting for the crop.
 * Place it inside the same positioned container as the media.
 */
export function FocusBox({
  focus,
  mediaRef,
  state,
  label,
}: {
  focus: Focus | null | undefined;
  mediaRef: React.RefObject<HTMLVideoElement | HTMLImageElement | null>;
  state: AiState;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    const media = mediaRef.current;
    if (!container) return;
    const compute = () => {
      const m = mediaRef.current;
      const mw = m instanceof HTMLVideoElement ? m.videoWidth : (m?.naturalWidth ?? 0);
      const mh = m instanceof HTMLVideoElement ? m.videoHeight : (m?.naturalHeight ?? 0);
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (!focus || !mw || !mh || !cw || !ch) return setRect(null);
      const scale = Math.max(cw / mw, ch / mh);
      const dw = mw * scale;
      const dh = mh * scale;
      const ox = (cw - dw) / 2;
      const oy = (ch - dh) / 2;
      setRect({ left: ox + focus.x * dw, top: oy + focus.y * dh, width: focus.w * dw, height: focus.h * dh });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    media?.addEventListener("loadedmetadata", compute);
    media?.addEventListener("load", compute);
    return () => {
      ro.disconnect();
      media?.removeEventListener("loadedmetadata", compute);
      media?.removeEventListener("load", compute);
    };
  }, [focus, mediaRef]);

  const meta = STATE[state];
  const tone = state === "idle" ? "text-hud" : meta.text;

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {rect && (
        <div
          key={state}
          className={cn("hud-lock absolute transition-[left,top,width,height] duration-500 ease-out", tone)}
          style={rect}
        >
          <span className="absolute inset-0 border border-current opacity-40" />
          {/* corner ticks */}
          <span className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-current" />
          <span className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-current" />
          <span className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-current" />
          <span className="absolute -right-px -bottom-px size-3 border-r-2 border-b-2 border-current" />
          <span className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-current" />
          {label && (
            <span className="absolute -top-6 left-0 rounded-[2px] bg-current px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase">
              <span className="text-black">{label}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
