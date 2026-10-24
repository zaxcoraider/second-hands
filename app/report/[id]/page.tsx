import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { HudPanel } from "@/components/hud";
import { LogoMark } from "@/components/logo";
import { shortName } from "@/lib/ai/models";
import type { SessionEvent, TraceEntry } from "@/lib/schemas";
import { store } from "@/lib/store";
import { EVENT_META, fmtClock, fmtMs, fmtUsd } from "@/lib/ui-state";
import { cn } from "@/lib/utils";
import { ShareButton } from "./share-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await store.getSession((await params).id.toLowerCase());
  return {
    title: session ? `Report: ${session.guide.title} · Second Hands` : "Report · Second Hands",
    description: session?.summary?.slice(0, 160),
  };
}

const ALERTS: SessionEvent["kind"][] = ["stop", "warn", "ask"];

export default async function ReportPage({ params }: Props) {
  const id = (await params).id.toLowerCase();
  const session = await store.getSession(id);

  if (!session) {
    return (
      <Shell>
        <p className="hud-label text-stop">Not found</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Report not found</h1>
        <p className="text-muted-foreground">This session doesn&apos;t exist or has expired.</p>
      </Shell>
    );
  }

  if (session.status !== "done") {
    return (
      <Shell>
        <p className="hud-label text-ask">In progress</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Session still running</h1>
        <p className="text-muted-foreground">The report appears once you press Finish on the bench.</p>
        <Link href={`/bench/${id}`} className="font-mono text-sm tracking-[0.12em] text-hud uppercase hover:underline">
          Back to the bench →
        </Link>
      </Shell>
    );
  }

  const [eventsDesc, trace, overrides, costUsd] = await Promise.all([
    store.getEvents(id, 200),
    store.getTrace(id, 500),
    store.getOverrides(id),
    store.getSessionCost(id),
  ]);
  const events = eventsDesc.slice().reverse();
  const t0 = session.startedAt ?? session.createdAt;
  const duration = (session.finishedAt ?? Date.now()) - t0;
  const overridden = new Set(overrides.map((o) => `${o.stepId}:${o.mistakeType}`));
  const alerts = events.filter((e) => ALERTS.includes(e.kind));
  const caught = alerts.filter((e) => !overridden.has(`${e.stepId}:${e.mistakeType}`)).length;
  const stepsDone = Object.values(session.stepStatus).filter((s) => s === "done").length;
  const stepTitle = (stepId?: string) => session.guide.steps.find((s) => s.id === stepId)?.title;

  const stats = [
    { label: "Steps done", value: `${stepsDone}/${session.guide.steps.length}`, tone: "text-ok" },
    { label: "Mistakes caught", value: String(caught), tone: caught ? "text-stop" : "text-foreground" },
    { label: "False alarms", value: String(overrides.length), tone: overrides.length ? "text-ask" : "text-foreground" },
    { label: "Duration", value: fmtClock(duration), tone: "text-foreground" },
    { label: "Model cost", value: fmtUsd(costUsd), tone: "text-hud" },
  ];

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud-label">
            <span className="text-hud">Session report</span> {"//"} {id.toUpperCase()} {"//"}{" "}
            {new Date(t0).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {session.mock && <span className="text-ask"> {"// mock"}</span>}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{session.guide.title}</h1>
        </div>
        <ShareButton />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="hud-panel p-4">
            <dt className="hud-label">{s.label}</dt>
            <dd className={cn("text-glow mt-2 font-mono text-3xl tabular", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {session.summary && (
        <HudPanel index="01" label="Summary · Nemotron Super 120B">
          <p className="p-5 text-[15px] leading-relaxed text-foreground/90">{session.summary}</p>
        </HudPanel>
      )}

      <HudPanel index="02" label="Timeline" right={`${events.length} events`}>
        {events.length ? (
          <ol className="flex flex-col">
            {events.map((e) => {
              const meta = EVENT_META[e.kind];
              const wasOverridden = ALERTS.includes(e.kind) && overridden.has(`${e.stepId}:${e.mistakeType}`);
              return (
                <li key={e.id} className="flex gap-4 border-b border-line/60 p-4 last:border-0">
                  <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular">{fmtClock(e.at - t0)}</span>
                  <meta.icon className={cn("mt-0.5 size-4 shrink-0", meta.text)} strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("font-mono text-[11px] font-semibold tracking-[0.14em] uppercase", meta.text)}>{meta.label}</span>
                      {stepTitle(e.stepId) && <span className="text-sm text-muted-foreground">{stepTitle(e.stepId)}</span>}
                      {e.verifiedBy === "ultra" && (
                        <span className="flex items-center gap-1 rounded-[2px] border border-ok/40 px-1 font-mono text-[10px] tracking-wider text-ok">
                          <ShieldCheck className="size-3" />
                          ULTRA
                        </span>
                      )}
                      {wasOverridden && (
                        <span className="rounded-[2px] border border-ask/40 px-1 font-mono text-[10px] tracking-wider text-ask">OVERRIDDEN</span>
                      )}
                    </p>
                    <p className="mt-1">&ldquo;{e.message}&rdquo;</p>
                    {e.reason && <p className="mt-1 text-sm text-muted-foreground">{e.reason}</p>}
                  </div>
                  {e.frameThumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/thumb/${e.frameThumb}`}
                      alt="Frame the warning was based on"
                      className={cn("hidden aspect-[4/3] w-36 shrink-0 rounded-[4px] border bg-black object-cover sm:block", meta.text, "border-current")}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">No events were recorded.</p>
        )}
      </HudPanel>

      <HudPanel index="03" label="Models used · Nebius Token Factory">
        <ModelsTable trace={trace} />
      </HudPanel>
    </Shell>
  );
}

function ModelsTable({ trace }: { trace: TraceEntry[] }) {
  const rows = new Map<string, { calls: number; ms: number; cost: number; stages: Set<string> }>();
  for (const t of trace) {
    const r = rows.get(t.model) ?? { calls: 0, ms: 0, cost: 0, stages: new Set() };
    r.calls += 1;
    r.ms += t.ms;
    r.cost += t.costUsd;
    r.stages.add(t.stage);
    rows.set(t.model, r);
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-sm tabular">
        <thead className="text-left text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <tr className="border-b">
            <th className="px-4 py-2.5 font-normal">Model</th>
            <th className="py-2.5 font-normal">Job</th>
            <th className="py-2.5 text-right font-normal">Calls</th>
            <th className="py-2.5 text-right font-normal">Avg</th>
            <th className="px-4 py-2.5 text-right font-normal">Cost</th>
          </tr>
        </thead>
        <tbody>
          {[...rows].map(([model, r]) => (
            <tr key={model} className="border-b border-line/60 last:border-0">
              <td className="px-4 py-2.5 whitespace-nowrap text-hud">{model === "tavily" ? "Tavily" : shortName(model)}</td>
              <td className="py-2.5 text-muted-foreground">{[...r.stages].join(", ")}</td>
              <td className="py-2.5 text-right">{r.calls}</td>
              <td className="py-2.5 text-right">{fmtMs(r.ms / r.calls)}</td>
              <td className="px-4 py-2.5 text-right">{model === "tavily" ? "–" : fmtUsd(r.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="hud-grid min-h-dvh">
      <main className={cn("mx-auto flex min-h-dvh flex-col px-4 sm:px-6", wide ? "max-w-5xl" : "max-w-md")}>
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-5" />
            <span className="font-mono text-xs tracking-[0.22em] uppercase">Second Hands</span>
          </Link>
          <Link href="/start" className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase hover:text-hud">
            Start a task →
          </Link>
        </header>
        <div className={cn("flex flex-col gap-5 pb-16", wide ? "pt-6" : "flex-1 justify-center gap-3 pb-32")}>{children}</div>
      </main>
    </div>
  );
}
