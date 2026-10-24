import Link from "next/link";
import { Wrench } from "lucide-react";
import { Checklist } from "@/components/bench/checklist";
import { EventsFeed } from "@/components/bench/events-feed";
import { EvidencePanel } from "@/components/bench/evidence-panel";
import { LiveView } from "@/components/bench/live-view";
import { TracePanel } from "@/components/bench/trace-panel";
import type { SessionState } from "@/lib/schemas";
import { currentState, fmtClock, fmtUsd } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

const CONNECTED_MS = 10_000;

/**
 * The 3-column dashboard shared by /bench (phone camera) and /try (sample video).
 * `live` replaces the latest-frame image (e.g. with a <video>); `pairing` shows instead of the live view.
 */
export function BenchLayout({
  data,
  now,
  actions,
  banner,
  live,
  pairing,
  badge,
}: {
  data: SessionState;
  now: number;
  actions?: React.ReactNode;
  banner?: React.ReactNode;
  live?: React.ReactNode;
  pairing?: React.ReactNode;
  badge?: string;
}) {
  const { session, events, trace, costUsd, latestFrame } = data;
  const connected = !!session.lastFrameAt && now - session.lastFrameAt < CONNECTED_MS;
  const { state } = currentState(events, now);
  const evidence = events.find((e) => e.frameThumb) ?? null;
  const t0 = session.startedAt ?? session.createdAt;
  const elapsed = session.startedAt ? (session.finishedAt ?? now) - session.startedAt : 0;
  const doneCount = Object.values(session.stepStatus).filter((s) => s === "done").length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="size-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Second Hands</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-medium">{session.guide.title}</h1>
          <div className="flex items-center gap-5 font-mono text-sm tabular">
            <span className="flex items-center gap-1.5" title={connected ? "Camera connected" : "Camera not connected"}>
              <span className={cn("size-2 rounded-full", connected ? "bg-ok" : "bg-idle")} />
              <span className="text-muted-foreground">{connected ? "live" : "offline"}</span>
            </span>
            <span>{fmtClock(elapsed)}</span>
            <span>{fmtUsd(costUsd)}</span>
            {(badge || session.mock) && (
              <span className="rounded border px-1.5 text-xs text-muted-foreground">{badge ?? "MOCK"}</span>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </header>

      {banner}

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border bg-card lg:self-start">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Steps</h2>
            <span className="font-mono text-xs text-muted-foreground tabular">
              {doneCount}/{session.guide.steps.length}
            </span>
          </div>
          <Checklist session={session} />
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          {pairing ?? (
            <LiveView frame={latestFrame} state={state} stale={!live && !connected && session.status !== "done"}>
              {live}
            </LiveView>
          )}
          <EvidencePanel event={evidence} />
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            <h2 className="border-b px-4 py-2.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Events</h2>
            <div className="max-h-[340px] overflow-y-auto">
              <EventsFeed events={events} t0={t0} />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <h2 className="border-b px-4 py-2.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              Agent trace
            </h2>
            <TracePanel trace={trace} totalUsd={costUsd} />
          </div>
        </section>
      </main>
    </div>
  );
}
