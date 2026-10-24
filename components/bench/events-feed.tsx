import type { SessionEvent } from "@/lib/schemas";
import { EVENT_META, fmtClock } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

export function EventsFeed({ events, t0 }: { events: SessionEvent[]; t0: number }) {
  if (!events.length) {
    return <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing yet. Events appear as you work.</p>;
  }
  return (
    <ul className="flex flex-col divide-y">
      {events.map((e) => {
        const meta = EVENT_META[e.kind];
        return (
          <li key={e.id} className="flex gap-3 px-4 py-2.5">
            <span className="w-9 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular">{fmtClock(e.at - t0)}</span>
            <meta.icon className={cn("mt-0.5 size-4 shrink-0", meta.text)} strokeWidth={1.75} />
            <div className="min-w-0 text-sm">
              <span className={cn("font-medium", meta.text)}>{meta.label}</span>
              {e.verifiedBy === "ultra" && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">ULTRA</span>}
              <p className="text-foreground">&ldquo;{e.message}&rdquo;</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
