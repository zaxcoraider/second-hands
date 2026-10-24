import { BookOpen, ShieldCheck } from "lucide-react";
import type { SessionEvent } from "@/lib/schemas";
import { EVENT_META } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/** What the AI saw, next to what the manual says. */
export function EvidencePanel({ event }: { event: SessionEvent | null }) {
  if (!event || !event.frameThumb) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        When Second Hands raises a warning, the frame it saw appears here next to the manual step it checked.
      </div>
    );
  }
  const meta = EVENT_META[event.kind];
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className={cn("flex items-center gap-2 text-sm font-medium", meta.text)}>
          <meta.icon className="size-4" strokeWidth={1.75} />
          {meta.label}: &ldquo;{event.message}&rdquo;
        </p>
        {event.verifiedBy === "ultra" && (
          <span className="flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" />
            Verified by Ultra
          </span>
        )}
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <figure className="bg-card p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/thumb/${event.frameThumb}`}
            alt="Frame the warning was based on"
            className="aspect-[4/3] w-full rounded-md bg-black object-cover"
          />
          <figcaption className="mt-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">What it saw</figcaption>
        </figure>
        <div className="flex flex-col gap-2 bg-card p-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            <BookOpen className="size-3" />
            What the manual says
          </p>
          <p className="text-sm whitespace-pre-line">{event.manualRef}</p>
        </div>
      </div>
      {event.reason && (
        <p className="border-t px-4 py-2.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Why: </span>
          {event.reason}
        </p>
      )}
    </div>
  );
}
