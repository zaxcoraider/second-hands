import Link from "next/link";
import { Checklist } from "@/components/bench/checklist";
import { EventsFeed } from "@/components/bench/events-feed";
import { EvidencePanel } from "@/components/bench/evidence-panel";
import { LiveView } from "@/components/bench/live-view";
import { TracePanel } from "@/components/bench/trace-panel";
import { HudPanel, Segments } from "@/components/hud";
import { LogoMark } from "@/components/logo";
import type { SessionState } from "@/lib/schemas";
import { currentState, fmtClock, fmtUsd } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

const CONNECTED_MS = 10_000;

/**
 * The HUD dashboard shared by /bench (phone camera) and /try (sample video).
 * `live` replaces the latest-frame image (e.g. a <video>, with `mediaRef` for the focus box);
 * `pairing` shows instead of the live view.
 */
export function BenchLayout({
  data,
  now,
  actions,
  banner,
  live,
  mediaRef,
  source,
  pairing,
  badge,
}: {
  data: SessionState;
  now: number;
  actions?: React.ReactNode;
  banner?: React.ReactNode;
  live?: React.ReactNode;
  mediaRef?: React.RefObject<HTMLVideoElement | null>;
  source?: string;
  pairing?: React.ReactNode;
  badge?: string;
}) {
  const { session, events, trace, costUsd, latestFrame, lastObservation } = data;
  const connected = !!session.lastFrameAt && now - session.lastFrameAt < CONNECTED_MS;
  const { state, event: activeEvent } = currentState(events, now);
  const evidence = events.find((e) => e.frameThumb) ?? null;
  const t0 = session.startedAt ?? session.createdAt;
  const elapsed = session.startedAt ? (session.finishedAt ?? now) - session.startedAt : 0;
  const total = session.guide.steps.length;
  const doneCount = Object.values(session.stepStatus).filter((s) => s === "done").length;
  const stepNo = String(Math.min(session.currentStep + 1, total)).padStart(2, "0");

  // While alerting, box what the warning was about; otherwise follow the latest observation.
  const focus = activeEvent?.focus ?? lastObservation?.focus ?? null;
  const focusLabel =
    activeEvent?.mistakeType?.replace(/_/g, " ") ?? (session.status === "live" ? `S${stepNo} · tracking` : undefined);

  return (
    <div className="hud-grid flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-5" />
            <span className="hidden font-mono text-xs tracking-[0.2em] uppercase sm:inline">Second Hands</span>
          </Link>
          <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
          <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-tight sm:text-lg">{session.guide.title}</h1>
          <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-6">
          <dl className="flex items-center gap-3 font-mono text-[11px] tracking-[0.1em] uppercase tabular sm:gap-5 sm:text-xs">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", connected ? "hud-blink bg-ok shadow-[0_0_8px_var(--ok)]" : "bg-idle")} />
              <dd className={connected ? "text-ok" : "text-muted-foreground"}>{connected ? "Live" : "Offline"}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">T</dt>
              <dd>{fmtClock(elapsed)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="text-hud">{fmtUsd(costUsd)}</dd>
            </div>
            {(badge || session.mock) && (
              <dd className="rounded-[3px] border border-ask/50 px-1.5 py-0.5 text-[10px] text-ask">{badge ?? "Mock"}</dd>
            )}
          </dl>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
          </div>
        </div>
      </header>

      {banner}

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-4 p-4 lg:grid-cols-[290px_minmax(0,1fr)_380px]">
        <HudPanel
          index="01"
          label="Procedure"
          right={`${doneCount}/${total}`}
          className="lg:self-start"
        >
          <div className="px-4 pt-3 pb-1">
            <Segments total={total} done={doneCount} />
          </div>
          <Checklist session={session} />
        </HudPanel>

        {/* On phones the camera view comes first; on desktop it's the middle column. */}
        <div className="order-first flex min-w-0 flex-col gap-4 lg:order-none">
          {pairing ?? (
            <LiveView
              frame={latestFrame}
              state={state}
              stale={!live && !connected && session.status !== "done"}
              mediaRef={mediaRef}
              focus={focus}
              focusLabel={focusLabel}
              source={source}
              telemetry={`STEP ${stepNo}/${String(total).padStart(2, "0")} · FRM ${String(session.frames).padStart(3, "0")}`}
            >
              {live}
            </LiveView>
          )}
          <EvidencePanel event={evidence} index="03" />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <HudPanel index="04" label="Event log" right={`${events.length}`} bodyClassName="max-h-[320px] overflow-y-auto">
            <EventsFeed events={events} t0={t0} />
          </HudPanel>
          <HudPanel index="05" label="Agent trace" right="Token Factory">
            <TracePanel trace={trace} totalUsd={costUsd} />
          </HudPanel>
        </div>
      </main>
    </div>
  );
}
