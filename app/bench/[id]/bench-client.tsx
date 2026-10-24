"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Flag, Loader2, QrCode, Wrench, X } from "lucide-react";
import { Checklist } from "@/components/bench/checklist";
import { EventsFeed } from "@/components/bench/events-feed";
import { EvidencePanel } from "@/components/bench/evidence-panel";
import { LiveView } from "@/components/bench/live-view";
import { QrPair } from "@/components/bench/qr-pair";
import { TracePanel } from "@/components/bench/trace-panel";
import { Button } from "@/components/ui/button";
import type { SessionState } from "@/lib/schemas";
import { currentState, fmtClock, fmtUsd } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

const CONNECTED_MS = 10_000;

export function BenchClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<SessionState | null>(null);
  const [missing, setMissing] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [, tick] = useState(0);
  const skew = useRef(0); // server clock minus local clock

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/session/${id}?frame=1`, { cache: "no-store" });
        if (res.status === 404) return alive && setMissing(true);
        if (res.ok) {
          const d: SessionState = await res.json();
          if (!alive) return;
          if (d.now) skew.current = d.now - Date.now();
          setData(d);
        }
      } catch {
        // Keep polling; a blip shouldn't break the dashboard.
      }
      if (alive) timer = setTimeout(poll, 1_000);
    };
    poll();
    // Re-render every second for the timer and state hold-times.
    const clock = setInterval(() => tick((n) => n + 1), 1_000);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [id]);

  const finish = async () => {
    setFinishing(true);
    await fetch(`/api/session/${id}/finish`, { method: "POST" }).catch(() => null);
    router.push(`/report/${id}`);
  };

  if (missing) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-muted-foreground">It may have expired. Start a new repair or try the sample run.</p>
        <div className="flex gap-4 text-sm">
          <Link href="/start" className="text-primary hover:underline">Start a repair</Link>
          <Link href="/try" className="text-primary hover:underline">Sample run</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </main>
    );
  }

  const { session, events, trace, costUsd, latestFrame } = data;
  const now = Date.now() + skew.current;
  const connected = !!session.lastFrameAt && now - session.lastFrameAt < CONNECTED_MS;
  const { state } = currentState(events, now);
  const evidence = events.find((e) => e.frameThumb) ?? null;
  const t0 = session.startedAt ?? session.createdAt;
  const elapsed = session.startedAt ? (session.finishedAt ?? now) - session.startedAt : 0;
  const doneCount = Object.values(session.stepStatus).filter((s) => s === "done").length;
  const waiting = session.frames === 0;

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
            <span className="flex items-center gap-1.5" title={connected ? "Phone connected" : "Phone not connected"}>
              <span className={cn("size-2 rounded-full", connected ? "bg-ok" : "bg-idle")} />
              <span className="text-muted-foreground">{connected ? "live" : "offline"}</span>
            </span>
            <span>{fmtClock(elapsed)}</span>
            <span>{fmtUsd(costUsd)}</span>
            {session.mock && <span className="rounded border px-1.5 text-xs text-muted-foreground">MOCK</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowQr((v) => !v)}>
              <QrCode data-icon="inline-start" />
              Connect phone
            </Button>
            <Button onClick={finish} disabled={finishing || session.status === "done"}>
              {finishing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Flag data-icon="inline-start" />}
              Finish
            </Button>
          </div>
        </div>
      </header>

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
          {waiting ? (
            <div className="flex flex-col items-center gap-6 rounded-xl border bg-card px-4 py-10">
              <QrPair id={id} connected={connected} />
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                Mount the phone 15–20 cm above your work, camera facing down, and tap Start on it.
              </p>
            </div>
          ) : (
            <LiveView frame={latestFrame} state={state} stale={!connected && session.status !== "done"} />
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

      {showQr && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowQr(false)}
          role="dialog"
          aria-label="Connect phone"
        >
          <div className="relative rounded-xl border bg-card p-8 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQr(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <QrPair id={id} connected={connected} />
          </div>
        </div>
      )}
    </div>
  );
}
