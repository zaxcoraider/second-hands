import Link from "next/link";
import { ArrowRight, Eye, Play, Search, Volume2, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOW = [
  {
    icon: Search,
    title: "Finds the guide",
    body: "Tell it what you're fixing. It searches the web with Tavily and turns the real repair guide into steps a camera can check.",
    model: "Tavily + Nemotron Super 120B",
  },
  {
    icon: Eye,
    title: "Watches your hands",
    body: "A phone mounted above your bench sends a frame when the scene changes. The vision model checks it against the current step.",
    model: "Nemotron 3.5 Super VL",
  },
  {
    icon: Volume2,
    title: "Speaks up only when it matters",
    body: "A fast model decides whether to interrupt. Before it ever says “stop”, the largest model double-checks the evidence.",
    model: "Nemotron Nano 30B + Ultra 550B",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2 font-semibold">
          <Wrench className="size-4" strokeWidth={1.75} />
          Second Hands
        </div>
        <Link href="/start" className="text-sm text-muted-foreground hover:text-foreground">
          Start a repair
        </Link>
      </header>

      <section className="flex flex-col gap-6 py-16 sm:py-24">
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Physical AI · repair assistant</p>
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          An AI that watches your hands and stops you before you break something.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Mount your phone above the bench. Second Hands follows the repair guide step by step and speaks up the moment
          you reach for the wrong connector.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/try" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
            <Play data-icon="inline-start" />
            Try it now
          </Link>
          <Link href="/start" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>
            Start a repair
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">No sign-up. The sample run uses the real pipeline on a recorded repair.</p>
      </section>

      <section className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
        {HOW.map((h, i) => (
          <div key={h.title} className="flex flex-col gap-3 bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <h.icon className="size-4 text-primary" strokeWidth={1.75} />
            </div>
            <h2 className="font-semibold">{h.title}</h2>
            <p className="text-sm text-muted-foreground">{h.body}</p>
            <p className="mt-auto font-mono text-xs text-muted-foreground">{h.model}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto flex flex-col gap-1 border-t py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <span>Built on Nebius Token Factory with NVIDIA Nemotron.</span>
        <span>Guidance only. You are responsible for your repair. Not for mains electrical work.</span>
      </footer>
    </main>
  );
}
