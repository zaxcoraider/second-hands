"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Bike, Check, ChefHat, Cpu, ExternalLink, Hammer, Loader2, Lock, Scissors, Trash2, Wrench, type LucideIcon } from "lucide-react";
import { HudPanel } from "@/components/hud";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import type { Guide, TraceEntry } from "@/lib/schemas";
import { fmtMs } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

const ICONS: Record<CategoryId, LucideIcon> = {
  electronics: Cpu,
  cooking: ChefHat,
  furniture: Hammer,
  home: Wrench,
  bike: Bike,
  crafts: Scissors,
};

const LOADING = [
  { tag: "tavily", line: "Searching the web for repair guides" },
  { tag: "tavily", line: "Reading the best guide" },
  { tag: "nemotron", line: "Building camera-checkable steps" },
];

type GuideResponse = { guide: Guide; traces: TraceEntry[]; cached: boolean; mock: { ai: boolean; search: boolean } };

export function StartClient() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("electronics");
  const category = CATEGORIES.find((c) => c.id === categoryId)!;
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuideResponse | null>(null);
  const [steps, setSteps] = useState<Guide["steps"]>([]);
  const [starting, setStarting] = useState(false);

  // The guide call is one request, so the first two lines tick by time; the last one waits for the answer.
  useEffect(() => {
    if (!loading) return;
    const timers = [setTimeout(() => setProgress(1), 900), setTimeout(() => setProgress(2), 2_000)];
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const build = async (t: string) => {
    const clean = t.trim();
    if (clean.length < 3) return;
    setTask(clean);
    setLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: clean }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't build a guide.");
      setResult(body);
      setSteps(body.guide.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build a guide.");
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    if (!result || !steps.length) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          guide: { ...result.guide, steps: steps.map((s, i) => ({ ...s, id: `s${i + 1}` })) },
          guideTraces: result.traces,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't start the session.");
      router.push(`/bench/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the session.");
      setStarting(false);
    }
  };

  const rename = (i: number, title: string) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, title } : x)));
  const remove = (i: number) => setSteps((s) => s.filter((_, j) => j !== i));

  return (
    <div className="hud-grid flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">

        <section className="flex flex-col gap-5 py-10">
          <p className="hud-label">
            <span className="text-hud">01 </span>{"// "}Define the job
          </p>
          <label htmlFor="task" className="font-display text-[34px] leading-tight font-semibold tracking-tight sm:text-5xl">
            What are you working on?
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              build(task);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative w-full sm:flex-1">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-hud">&gt;</span>
              <input
                id="task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={`e.g. ${category.examples[0]}`}
                maxLength={160}
                autoFocus
                className="h-13 w-full rounded-md border bg-black/40 pr-4 pl-9 font-mono text-[15px] outline-none placeholder:text-muted-foreground/60 focus:border-hud focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--hud)_18%,transparent)]"
              />
            </div>
            <Button type="submit" disabled={loading || task.trim().length < 3} className="glow-hud h-13 px-6 font-display text-base font-semibold">
              {loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              Find the guide
            </Button>
          </form>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="tablist" aria-label="Category">
            {CATEGORIES.map((c) => {
              const Icon = ICONS[c.id];
              const on = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-[4px] border px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    on ? "glow-hud border-hud bg-hud/10 text-hud" : "bg-black/30 text-muted-foreground hover:border-hud/50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hud-label mr-1">Try</span>
            {category.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => build(ex)}
                disabled={loading}
                className="rounded-[4px] border bg-black/30 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-hud/60 hover:text-hud disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {loading && (
          <HudPanel index="02" label="Building guide">
            <ol className="flex flex-col gap-2.5 p-5 font-mono text-sm" aria-live="polite">
              {LOADING.map((l, i) => (
                <li key={l.line} className={cn("flex items-center gap-3", i > progress && "opacity-30")}>
                  {i < progress ? (
                    <Check className="size-4 text-ok" strokeWidth={2.5} />
                  ) : i === progress ? (
                    <Loader2 className="size-4 animate-spin text-hud" />
                  ) : (
                    <span className="size-4" />
                  )}
                  <span className="w-20 text-[11px] tracking-[0.14em] text-hud uppercase">[{l.tag}]</span>
                  {l.line}…
                </li>
              ))}
            </ol>
          </HudPanel>
        )}

        {error && (
          <p role="alert" className="glow-stop rounded-md border border-stop/50 bg-stop/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {result && !loading && (
          <section className="flex flex-col gap-6 pb-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="hud-label">
                  <span className="text-hud">02 </span>{"// "}Procedure · {steps.length} steps
                  {result.guide.device ? ` · ${result.guide.device}` : ""}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{result.guide.title}</h2>
              </div>
              <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                {result.cached ? "cached guide" : result.traces.map((t) => `${t.stage} ${fmtMs(t.ms)}`).join(" · ")}
                {(result.mock.ai || result.mock.search) && <span className="text-ask"> · mock</span>}
              </p>
            </div>

            <ol className="hud-panel divide-y">
              {steps.map((s, i) => (
                <li key={s.id} className="group flex gap-4 px-4 py-4">
                  <span className="mt-1 w-6 shrink-0 font-mono text-xs text-hud">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        value={s.title}
                        onChange={(e) => rename(i, e.target.value)}
                        aria-label={`Step ${i + 1} title`}
                        className="w-full rounded-[3px] bg-transparent py-0.5 font-display text-[17px] font-semibold tracking-tight outline-none focus:bg-white/5"
                      />
                      {s.safety && (
                        <span className="flex shrink-0 items-center gap-1 rounded-[3px] border border-ask/50 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ask">
                          <Lock className="size-3" />
                          SAFETY
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <span className="mr-1.5 font-mono text-[10px] tracking-[0.14em] text-hud uppercase">Camera checks</span>
                      {s.visualCheck}
                    </p>
                    {s.commonMistakes.length > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="mr-1.5 font-mono text-[10px] tracking-[0.14em] text-stop uppercase">Watches for</span>
                        {s.commonMistakes.map((m) => m.description.split(".")[0].toLowerCase()).join("; ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(i)}
                    disabled={steps.length <= 1}
                    aria-label={`Remove step ${i + 1}`}
                    className="mt-0.5 size-8 shrink-0 rounded-[4px] text-muted-foreground opacity-50 hover:bg-stop/10 hover:text-stop hover:opacity-100 disabled:hidden"
                  >
                    <Trash2 className="mx-auto size-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ol>

            {result.guide.sources.length > 0 && (
              <div>
                <p className="hud-label mb-2">Sources · found by Tavily</p>
                <ul className="flex flex-col gap-1">
                  {result.guide.sources.map((src) => (
                    <li key={src.url}>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-hud hover:underline"
                      >
                        {src.title}
                        <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                Guidance only · you are responsible · not for mains electrical work
              </p>
              <Button onClick={start} disabled={starting || !steps.length} className="glow-hud h-12 px-6 font-display text-base font-semibold">
                {starting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                Start session
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
