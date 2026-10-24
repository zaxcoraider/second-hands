import type { SessionEvent } from "@/lib/schemas";
import { EVENT_META, fmtClock } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/** Console-style event log, newest first. */
export function EventsFeed({ events, t0 }: { events: SessionEvent[]; t0: number }) {
  if (!events.length) {
    return (
      <p className="px-4 py-6 text-center font-mono text-xs tracking-wide text-muted-foreground">
        <span className="hud-blink text-hud">▌</span> awaiting events
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {events.map((e, i) => {
        const meta = EVENT_META[e.kind];
        return (
          <li key={e.id} className={cn("flex gap-3 border-b border-line/60 px-4 py-2.5 last:border-0", i === 0 && "bg-white/[0.02]")}>
            <span className="w-9 shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground tabular">{fmtClock(e.at - t0)}</span>
            <div className="min-w-0 text-sm">
              <p className="flex items-center gap-1.5">
                <meta.icon className={cn("size-3.5 shrink-0", meta.text)} strokeWidth={2} />
                <span className={cn("font-mono text-[11px] font-semibold tracking-[0.14em] uppercase", meta.text)}>{meta.label}</span>
                {e.verifiedBy === "ultra" && (
                  <span className="rounded-[2px] border border-line px-1 font-mono text-[10px] tracking-wider text-muted-foreground">
                    ULTRA ✓
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-foreground/90">&ldquo;{e.message}&rdquo;</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
