import Link from "next/link";
import { ArrowRight, Bike, ChefHat, Cpu, Eye, Hammer, Play, Scissors, Search, Volume2, Wrench } from "lucide-react";
import { HeroShowcase } from "@/components/hero-showcase";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOW = [
  {
    icon: Search,
    title: "Finds the real guide",
    body: "Name the job: a repair, a recipe, a build. Tavily searches the web at runtime and Nemotron turns the guide into steps a camera can verify.",
    tag: "Tavily · Super 120B",
  },
  {
    icon: Eye,
    title: "Watches your hands",
    body: "A phone above your work sends a frame whenever the scene changes. The vision model checks it against the step you're on.",
    tag: "Super VL",
  },
  {
    icon: Volume2,
    title: "Speaks up only when it matters",
    body: "A mistake must show in 2 of 3 frames. A fast model decides whether to interrupt; the largest model verifies before any “Stop”.",
    tag: "Nano 30B · Ultra 550B",
  },
];

const WORKS_FOR = [
  { icon: Cpu, label: "Phone & electronics repair" },
  { icon: ChefHat, label: "Cooking & knife skills" },
  { icon: Hammer, label: "Furniture & woodwork" },
  { icon: Wrench, label: "Home fixes" },
  { icon: Bike, label: "Bikes" },
  { icon: Scissors, label: "Crafts & soldering" },
];

const STACK = [
  { role: "Eyes", model: "Nemotron 3.5 Super VL", job: "Reads every frame against the manual step", tone: "text-hud" },
  { role: "Gatekeeper", model: "Nemotron 3 Nano 30B", job: "Decides warn, ask or stay silent; writes the line", tone: "text-ok" },
  { role: "Planner", model: "Nemotron 3 Super 120B", job: "Turns web guides into camera-checkable steps", tone: "text-ask" },
  { role: "Judge", model: "Nemotron 3 Ultra 550B", job: "Verifies the evidence before every Stop", tone: "text-stop" },
];

export default function Home() {
  return (
    <div className="hud-grid min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="font-mono text-xs tracking-[0.22em] uppercase">Second Hands</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/try" className="hidden text-muted-foreground hover:text-foreground sm:inline">
              Sample run
            </Link>
            <Link href="/start" className={cn(buttonVariants({ variant: "outline" }), "h-9 border-hud/40 text-hud hover:bg-hud/10")}>
              Start a task
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="flex flex-col gap-7">
            <p className="font-mono text-[11px] tracking-[0.22em] text-hud uppercase">
              Physical AI <span className="text-line">{"//"}</span> NVIDIA Nemotron × Nebius Token Factory
            </p>
            <h1 className="font-display text-5xl leading-[0.98] font-semibold tracking-tight sm:text-7xl">
              An AI that watches your hands and stops you before you{" "}
              <span className="text-glow text-stop">ruin</span> it.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Fixing a phone, dicing an onion, building a bookshelf: point your phone at the work. Second Hands finds the
              real guide, follows you step by step, and speaks up the moment your hands go wrong.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/try"
                className={cn(buttonVariants({ size: "lg" }), "glow-hud h-12 px-6 font-display text-base font-semibold")}
              >
                <Play data-icon="inline-start" className="fill-current" />
                Run the live sample
              </Link>
              <Link
                href="/start"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 font-display text-base")}
              >
                Start your own task
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              No sign-up · works with any phone · runs in the browser
            </p>
          </div>

          <HeroShowcase />
        </section>

        <section className="py-4">
          <p className="hud-label mb-3">
            <span className="text-hud">00 </span>
            {"// "}Works for any hands-on task with a guide
          </p>
          <div className="flex flex-wrap gap-2">
            {WORKS_FOR.map((w) => (
              <span key={w.label} className="flex items-center gap-2 rounded-[4px] border bg-black/30 px-3 py-2 text-sm text-foreground/85">
                <w.icon className="size-4 text-hud" strokeWidth={1.75} />
                {w.label}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {HOW.map((h, i) => (
            <div key={h.title} className="hud-panel flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-hud">0{i + 1}</span>
                <h.icon className="size-5 text-hud" strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight">{h.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{h.body}</p>
              <p className="mt-auto font-mono text-[11px] tracking-[0.14em] text-foreground/70 uppercase">{h.tag}</p>
            </div>
          ))}
        </section>

        <section className="py-12">
          <p className="hud-label mb-4">
            <span className="text-hud">04 </span>{"// "}Model stack · every call on Nebius Token Factory
          </p>
          <div className="hud-panel divide-y">
            {STACK.map((s) => (
              <div key={s.role} className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_260px_1fr] sm:items-center sm:gap-6">
                <span className={cn("font-mono text-xs tracking-[0.18em] uppercase", s.tone)}>{s.role}</span>
                <span className="font-display font-semibold">{s.model}</span>
                <span className="text-sm text-muted-foreground">{s.job}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-auto flex flex-col gap-2 border-t py-6 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase sm:flex-row sm:justify-between">
          <span>Built on Nebius Token Factory with NVIDIA Nemotron</span>
          <span>Guidance only · you are responsible for your work · no mains electrical or gas work</span>
        </footer>
      </div>
    </div>
  );
}
