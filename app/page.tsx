import Link from "next/link";
import { ArrowRight, Eye, OctagonX, Play, Search, ShieldCheck, Volume2 } from "lucide-react";
import { Corners } from "@/components/hud";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOW = [
  {
    icon: Search,
    title: "Finds the real guide",
    body: "Name the device and the job. Tavily searches the web at runtime and Nemotron turns the guide into steps a camera can verify.",
    tag: "Tavily · Super 120B",
  },
  {
    icon: Eye,
    title: "Watches your hands",
    body: "A phone above the bench sends a frame whenever the scene changes. The vision model checks it against the step you're on.",
    tag: "Super VL",
  },
  {
    icon: Volume2,
    title: "Speaks up only when it matters",
    body: "A mistake must show in 2 of 3 frames. A fast model decides whether to interrupt; the largest model verifies before any “Stop”.",
    tag: "Nano 30B · Ultra 550B",
  },
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
              Start a repair
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
              <span className="text-glow text-stop">break</span> something.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Mount your phone above the bench. Second Hands follows the real repair guide step by step and speaks up the
              moment you reach for the wrong connector.
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
                Start a repair
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              No sign-up · works with any phone · runs in the browser
            </p>
          </div>

          <HeroPhone />
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
          <span>Guidance only · you are responsible for your repair · not for mains electrical work</span>
        </footer>
      </div>
    </div>
  );
}

/** A phone above a board, mid-catch: what the product looks like in one glance. */
function HeroPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-label="The phone screen when Second Hands catches a mistake">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-stop/10 blur-3xl" />
      <div className="glow-stop relative rounded-[36px] border-[6px] border-stop bg-[#0b0d10] p-3">
        <div className="relative aspect-[9/17] overflow-hidden rounded-[26px] bg-[#16231c]">
          {/* the board under the camera */}
          <div className="absolute inset-x-[12%] top-[16%] h-[32%] rounded-md bg-[#1f5130]" />
          <div className="absolute inset-x-[16%] top-[52%] h-[30%] rounded-md bg-[#47515c]" />
          <div className="absolute top-[47%] left-[42%] h-[4%] w-[16%] rounded-sm bg-[#d0a640]" />
          <div className="absolute top-[24%] left-[62%] h-[4%] w-[16%] rounded-sm bg-[#d0a640]" />
          <div className="absolute top-[26%] left-[70%] h-[3%] w-[45%] origin-left rotate-[38deg] rounded-full bg-[#e6e2d8]" />
          <div aria-hidden className="hud-lines absolute inset-0 opacity-70" />

          {/* focus box on the display connector */}
          <div className="absolute top-[19%] left-[56%] h-[14%] w-[28%] text-stop">
            <Corners size={10} />
            <span className="absolute -top-5 left-0 rounded-[2px] bg-stop px-1 font-mono text-[9px] font-semibold tracking-wider whitespace-nowrap text-black uppercase">
              flex before battery
            </span>
          </div>

          {/* HUD chrome */}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 to-transparent p-4 pb-8">
            <div className="flex gap-0.5">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-[1px]", i < 3 ? "bg-ok" : i === 3 ? "bg-hud" : "bg-white/15")} />
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-hud">
              STEP 04<span className="text-white/40">/08</span>
            </p>
            <p className="font-display text-lg leading-tight font-semibold text-white">Disconnect the battery</p>
          </div>

          <div className="absolute inset-x-3 bottom-3">
            <div className="glow-stop rounded-md border-2 border-stop bg-black/85 p-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.16em] text-stop uppercase">
                <OctagonX className="size-3" />
                Stop
                <span className="flex items-center gap-1 text-white/55">
                  <ShieldCheck className="size-3" />
                  Ultra
                </span>
              </p>
              <p className="mt-1 font-display text-xl leading-[1.05] font-semibold text-white">
                Disconnect the battery connector first.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
