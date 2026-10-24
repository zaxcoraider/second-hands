"use client";

import { useRef } from "react";
import { BookOpen, ScanEye, ShieldCheck } from "lucide-react";
import { FocusBox } from "@/components/focus-box";
import { HudPanel } from "@/components/hud";
import type { SessionEvent } from "@/lib/schemas";
import { EVENT_META, stateOfEvent } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/** What the AI saw, next to what the manual says. */
export function EvidencePanel({ event, index = "03" }: { event: SessionEvent | null; index?: string }) {
  const imgRef = useRef<HTMLImageElement>(null);

  if (!event || !event.frameThumb) {
    return (
      <HudPanel index={index} label="Evidence">
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <ScanEye className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="max-w-sm text-sm text-muted-foreground">
            When Second Hands raises a warning, the frame it saw appears here next to the manual step it checked.
          </p>
        </div>
      </HudPanel>
    );
  }

  const meta = EVENT_META[event.kind];
  // Live sessions store a frame id; replays carry the captured frame itself.
  const src = event.frameThumb.startsWith("data:") ? event.frameThumb : `/api/thumb/${event.frameThumb}`;

  return (
    <HudPanel
      index={index}
      label="Evidence"
      right={
        event.verifiedBy === "ultra" ? (
          <span className="flex items-center gap-1 text-ok">
            <ShieldCheck className="size-3.5" />
            Verified by Ultra
          </span>
        ) : undefined
      }
    >
      <p className={cn("flex items-center gap-2 border-b px-4 py-3 font-display text-lg font-semibold tracking-tight", meta.text)}>
        <meta.icon className="size-5 shrink-0" strokeWidth={2} />
        {event.message}
      </p>
      <div className="grid sm:grid-cols-2">
        <figure className="border-b p-4 sm:border-r sm:border-b-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="Frame the warning was based on" className="size-full object-cover" />
            <FocusBox focus={event.focus} mediaRef={imgRef} state={stateOfEvent(event.kind)} />
          </div>
          <figcaption className="hud-label mt-2">What it saw</figcaption>
        </figure>
        <div className="flex flex-col gap-2 p-4">
          <p className="hud-label flex items-center gap-1.5">
            <BookOpen className="size-3" />
            What the manual says
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{event.manualRef}</p>
        </div>
      </div>
      {event.reason && (
        <p className="border-t bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
          <span className="hud-label mr-2 text-foreground">Why</span>
          {event.reason}
        </p>
      )}
    </HudPanel>
  );
}
