import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Wrench } from "lucide-react";
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
        <h1 className="text-2xl font-semibold">Report not found</h1>
        <p className="text-muted-foreground">This session doesn&apos;t exist or has expired.</p>
      </Shell>
    );
  }

  if (session.status !== "done") {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">Session still running</h1>
        <p className="text-muted-foreground">The report appears once you press Finish on the bench.</p>
        <Link href={`/bench/${id}`} className="text-primary hover:underline">
          Back to the bench
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
    { label: "Steps done", value: `${stepsDone}/${session.guide.steps.length}` },
    { label: "Mistakes caught", value: String(caught), tone: caught ? "text-stop" : undefined },
    { label: "False alarms", value: String(overrides.length) },
    { label: "Duration", value: fmtClock(duration) },
    { label: "Model cost", value: fmtUsd(costUsd) },
  ];

  return (
    <Shell wide>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
            Session report · {new Date(t0).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {session.mock && " · mock"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{session.guide.title}</h1>
        </div>
        <ShareButton />
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-4">
            <dt className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">{s.label}</dt>
            <dd className={cn("mt-1 font-mono text-2xl tabular", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {session.summary && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Summary</h2>
          <p className="leading-relaxed">{session.summary}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Timeline</h2>
        {events.length ? (
          <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {events.map((e) => {
              const meta = EVENT_META[e.kind];
              const wasOverridden = ALERTS.includes(e.kind) && overridden.has(`${e.stepId}:${e.mistakeType}`);
              return (
                <li key={e.id} className="flex gap-4 p-4">
                  <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular">{fmtClock(e.at - t0)}</span>
                  <meta.icon className={cn("mt-0.5 size-4 shrink-0", meta.text)} strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className={cn("font-medium", meta.text)}>{meta.label}</span>
                      {stepTitle(e.stepId) && <span className="text-muted-foreground">{stepTitle(e.stepId)}</span>}
                      {e.verifiedBy === "ultra" && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <ShieldCheck className="size-3" />
                          ULTRA
                        </span>
                      )}
                      {wasOverridden && <span className="font-mono text-[11px] text-muted-foreground">OVERRIDDEN</span>}
                    </p>
                    <p className="mt-0.5">&ldquo;{e.message}&rdquo;</p>
                    {e.reason && <p className="mt-1 text-sm text-muted-foreground">{e.reason}</p>}
                  </div>
                  {e.frameThumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/thumb/${e.frameThumb}`}
                      alt="Frame the warning was based on"
                      className="hidden aspect-[4/3] w-32 shrink-0 rounded-md bg-black object-cover sm:block"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No events were recorded.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Models used</h2>
        <ModelsTable trace={trace} />
      </section>
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
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full font-mono text-sm tabular">
        <thead className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
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
            <tr key={model} className="border-b last:border-0">
              <td className="px-4 py-2.5 whitespace-nowrap">{model === "tavily" ? "Tavily" : shortName(model)}</td>
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
    <main className={cn("mx-auto flex min-h-dvh flex-col px-4 sm:px-6", wide ? "max-w-4xl" : "max-w-md")}>
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wrench className="size-4" strokeWidth={1.75} />
          Second Hands
        </Link>
        <Link href="/start" className="text-sm text-muted-foreground hover:text-foreground">
          Start a repair
        </Link>
      </header>
      <div className={cn("flex flex-col gap-6 pb-16", wide ? "pt-6" : "flex-1 justify-center gap-3 pb-32")}>{children}</div>
    </main>
  );
}
