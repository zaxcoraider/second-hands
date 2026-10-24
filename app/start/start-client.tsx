"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ExternalLink, Loader2, Lock, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Guide, TraceEntry } from "@/lib/schemas";
import { fmtMs } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

const EXAMPLES = ["Redmi Note 8 battery replacement", "LED circuit on a breadboard"];

const LOADING = ["Searching the web", "Reading the guide", "Building your steps"];

type GuideResponse = { guide: Guide; traces: TraceEntry[]; cached: boolean; mock: { ai: boolean; search: boolean } };

export function StartClient() {
  const router = useRouter();
  const [task, setTask] = useState("");
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
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wrench className="size-4" strokeWidth={1.75} />
          Second Hands
        </Link>
        <Link href="/try" className="text-sm text-muted-foreground hover:text-foreground">
          Sample run
        </Link>
      </header>

      <section className="flex flex-col gap-4 py-10">
        <label htmlFor="task" className="text-3xl font-semibold tracking-tight">
          What are you fixing?
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            build(task);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Device and job, e.g. Redmi Note 8 battery replacement"
            maxLength={160}
            autoFocus
            className="h-12 w-full rounded-lg border bg-card px-4 sm:flex-1 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/20"
          />
          <Button type="submit" disabled={loading || task.trim().length < 3} className="h-12 px-5 text-base">
            {loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            Find the guide
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => build(ex)}
              disabled={loading}
              className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <ol className="flex flex-col gap-2.5 rounded-xl border bg-card p-5" aria-live="polite">
          {LOADING.map((line, i) => (
            <li key={line} className={cn("flex items-center gap-3 text-sm", i > progress && "text-muted-foreground/50")}>
              {i < progress ? (
                <Check className="size-4 text-ok" strokeWidth={2.5} />
              ) : i === progress ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <span className="size-4" />
              )}
              {line}…
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-stop/40 bg-stop/5 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {result && !loading && (
        <section className="flex flex-col gap-6 pb-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
                {steps.length} steps{result.guide.device ? ` · ${result.guide.device}` : ""}
              </p>
              <h2 className="text-xl font-semibold">{result.guide.title}</h2>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {result.cached
                ? "cached guide"
                : result.traces.map((t) => `${t.stage} ${fmtMs(t.ms)}`).join(" · ")}
              {(result.mock.ai || result.mock.search) && " · mock"}
            </p>
          </div>

          <ol className="divide-y overflow-hidden rounded-xl border bg-card">
            {steps.map((s, i) => (
              <li key={s.id} className="group flex gap-3 px-4 py-3">
                <span className="mt-1.5 w-5 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={s.title}
                      onChange={(e) => rename(i, e.target.value)}
                      aria-label={`Step ${i + 1} title`}
                      className="w-full rounded bg-transparent py-0.5 font-medium outline-none focus:bg-surface-2"
                    />
                    {s.safety && (
                      <span className="flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        <Lock className="size-3" />
                        SAFETY
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    <span className="text-foreground/80">Camera checks: </span>
                    {s.visualCheck}
                  </p>
                  {s.commonMistakes.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="text-foreground/80">Watches for: </span>
                      {s.commonMistakes.map((m) => m.description.split(".")[0].toLowerCase()).join("; ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(i)}
                  disabled={steps.length <= 1}
                  aria-label={`Remove step ${i + 1}`}
                  className="mt-1 size-8 shrink-0 rounded-md text-muted-foreground opacity-60 hover:bg-surface-2 hover:text-foreground hover:opacity-100 disabled:hidden"
                >
                  <Trash2 className="mx-auto size-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ol>

          {result.guide.sources.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Sources</h3>
              <ul className="flex flex-col gap-1">
                {result.guide.sources.map((src) => (
                  <li key={src.url}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      {src.title}
                      <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Guidance only. You are responsible for your repair. Not for mains electrical work.
            </p>
            <Button onClick={start} disabled={starting || !steps.length} className="h-11 px-5 text-base">
              {starting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              Start session
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
