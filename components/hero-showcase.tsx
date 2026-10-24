"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Eye, HelpCircle, OctagonX, Search, ShieldCheck } from "lucide-react";
import { Corners } from "@/components/hud";
import { cn } from "@/lib/utils";

/**
 * The landing hero: a phone running Second Hands, cycling through what it can do.
 * Scenes are drawn as vector art so they stay sharp and on-brand.
 */

type Tone = "stop" | "ask" | "ok" | "hud";

type Scene = {
  id: string;
  label: string;
  tone: Tone;
  step: string;
  done: number;
  title: string;
  box?: { top: string; left: string; width: string; height: string; tag: string };
  plate: { kicker: string; text: string; verified?: boolean };
  callouts: { text: string; side: "left" | "right"; top: string }[];
  Art: () => React.ReactElement;
};

const DURATION_MS = 4_200;

const TONE = {
  stop: { text: "text-stop", border: "border-stop", glow: "glow-stop", bg: "bg-stop", halo: "bg-stop/15", icon: OctagonX },
  ask: { text: "text-ask", border: "border-ask", glow: "glow-ask", bg: "bg-ask", halo: "bg-ask/15", icon: HelpCircle },
  ok: { text: "text-ok", border: "border-ok", glow: "glow-ok", bg: "bg-ok", halo: "bg-ok/15", icon: CircleCheck },
  hud: { text: "text-hud", border: "border-hud", glow: "glow-hud", bg: "bg-hud", halo: "bg-hud/15", icon: Search },
} satisfies Record<Tone, { text: string; border: string; glow: string; bg: string; halo: string; icon: typeof Eye }>;

const SCENES: Scene[] = [
  {
    id: "electronics",
    label: "Electronics",
    tone: "stop",
    step: "04",
    done: 3,
    title: "Disconnect the battery",
    box: { top: "21%", left: "50%", width: "30%", height: "15%", tag: "flex before battery" },
    plate: { kicker: "Stop", text: "Disconnect the battery connector first.", verified: true },
    callouts: [
      { text: "Super VL · 2 of 3 frames", side: "right", top: "24%" },
      { text: "Ultra 550B · verified", side: "left", top: "62%" },
    ],
    Art: PhoneBoardArt,
  },
  {
    id: "cooking",
    label: "Cooking",
    tone: "stop",
    step: "04",
    done: 3,
    title: "Vertical cuts, claw grip",
    box: { top: "36%", left: "18%", width: "34%", height: "17%", tag: "flat fingers" },
    plate: { kicker: "Stop", text: "Curl your fingertips into a claw.", verified: true },
    callouts: [
      { text: "Knife safety", side: "left", top: "30%" },
      { text: "Spoken out loud", side: "right", top: "64%" },
    ],
    Art: OnionArt,
  },
  {
    id: "furniture",
    label: "Furniture",
    tone: "ask",
    step: "03",
    done: 2,
    title: "Join the sides to the base",
    box: { top: "27%", left: "56%", width: "26%", height: "34%", tag: "panel backwards?" },
    plate: { kicker: "Check", text: "Is the finished edge facing the front?" },
    callouts: [
      { text: "Unsure → it asks", side: "right", top: "30%" },
      { text: "“I'm right” override", side: "left", top: "62%" },
    ],
    Art: ShelfArt,
  },
  {
    id: "bike",
    label: "Bikes",
    tone: "ok",
    step: "05",
    done: 5,
    title: "Seat the tyre bead",
    box: { top: "28%", left: "20%", width: "60%", height: "34%", tag: "bead seated" },
    plate: { kicker: "Step done", text: "Tyre seated. Next: inflate to 60 psi." },
    callouts: [
      { text: "Auto step tracking", side: "left", top: "28%" },
      { text: "Nano 30B · quiet when fine", side: "right", top: "60%" },
    ],
    Art: BikeArt,
  },
  {
    id: "guide",
    label: "Any task",
    tone: "hud",
    step: "00",
    done: 0,
    title: "Building your guide",
    plate: { kicker: "Tavily + Super 120B", text: "Found the guide. 7 camera-checkable steps." },
    callouts: [
      { text: "Tavily · search + extract", side: "right", top: "26%" },
      { text: "Super 120B · steps", side: "left", top: "56%" },
    ],
    Art: GuideArt,
  },
];

export function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scene = SCENES[index];
  const tone = TONE[scene.tone];

  useEffect(() => {
    if (paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), DURATION_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  return (
    <div
      className="relative mx-auto w-full max-w-[460px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto w-full max-w-[330px]">
        <div aria-hidden className={cn("pointer-events-none absolute -inset-16 rounded-full blur-3xl transition-colors duration-700", tone.halo)} />

        {/* Floating HUD callouts (desktop) */}
        {scene.callouts.map((c) => (
          <div
            key={`${scene.id}-${c.text}`}
            className={cn(
              "hud-lock absolute z-10 hidden items-center gap-2 lg:flex",
              c.side === "right" ? "left-[calc(100%-28px)] flex-row" : "right-[calc(100%-28px)] flex-row-reverse",
            )}
            style={{ top: c.top }}
          >
            <span className={cn("h-px w-6", tone.bg, "opacity-70")} />
            <span
              className={cn(
                "rounded-[3px] border bg-black/80 px-2 py-1 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase backdrop-blur",
                tone.text,
                tone.border,
              )}
            >
              {c.text}
            </span>
          </div>
        ))}

        <div
          className={cn(
            "relative rounded-[38px] border-[6px] bg-[#0b0d10] p-3 transition-[border-color,box-shadow] duration-500",
            tone.border,
            tone.glow,
          )}
          aria-label={`Second Hands on a phone: ${scene.label}. ${scene.plate.text}`}
          role="img"
        >
          <div className="relative aspect-[9/17] overflow-hidden rounded-[28px] bg-[#0f1512]">
            {/* scene art, crossfaded */}
            {SCENES.map((s, i) => (
              <div key={s.id} className={cn("absolute inset-0 transition-opacity duration-500", i === index ? "opacity-100" : "opacity-0")}>
                <s.Art />
              </div>
            ))}
            <div aria-hidden className="hud-lines absolute inset-0 opacity-70" />
            {scene.tone === "hud" && <div aria-hidden className="hud-scan" />}

            {/* focus box */}
            {scene.box && (
              <div
                key={`box-${scene.id}`}
                className={cn("hud-lock absolute", tone.text)}
                style={{ top: scene.box.top, left: scene.box.left, width: scene.box.width, height: scene.box.height }}
              >
                <Corners size={11} />
                <span className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-current" />
                <span
                  className={cn(
                    "absolute -top-5 left-0 rounded-[2px] px-1 font-mono text-[9px] font-semibold tracking-wider whitespace-nowrap text-black uppercase",
                    tone.bg,
                  )}
                >
                  {scene.box.tag}
                </span>
              </div>
            )}

            {/* top HUD */}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 pb-10">
              <div className="flex gap-0.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-[1px] transition-colors duration-500",
                      i < scene.done ? "bg-ok" : i === scene.done && scene.tone !== "hud" ? "bg-hud" : "bg-white/15",
                    )}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.16em] text-hud">
                  STEP {scene.step}
                  <span className="text-white/40">/08</span>
                </p>
                <p className="flex items-center gap-1 font-mono text-[9px] tracking-[0.14em] text-white/60">
                  <span className="hud-blink size-1.5 rounded-full bg-stop" />
                  LIVE
                </p>
              </div>
              <p className="font-display text-lg leading-tight font-semibold text-white">{scene.title}</p>
            </div>

            {/* bottom plate */}
            <div className="absolute inset-x-3 bottom-3">
              <div key={`plate-${scene.id}`} className={cn("hud-glitch rounded-md border-2 bg-black/85 p-3", tone.border, tone.glow)}>
                <p className={cn("flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.16em] uppercase", tone.text)}>
                  <tone.icon className="size-3" />
                  {scene.plate.kicker}
                  {scene.plate.verified && (
                    <span className="flex items-center gap-1 text-white/55">
                      <ShieldCheck className="size-3" />
                      Ultra
                    </span>
                  )}
                </p>
                <p className="mt-1 font-display text-[19px] leading-[1.08] font-semibold text-white">{scene.plate.text}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* scene selector */}
      <div className="mx-auto mt-8 grid max-w-[440px] grid-cols-5 gap-3" role="tablist" aria-label="What Second Hands can do">
        {SCENES.map((s, i) => {
          const on = i === index;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={on}
              onClick={() => setIndex(i)}
              className="group flex flex-col gap-2 text-left"
            >
              <span className="relative block h-1 w-full overflow-hidden rounded-full bg-line">
                {on && (
                  <span
                    key={`${s.id}-${paused}`}
                    className={cn("absolute inset-y-0 left-0 block rounded-full", TONE[s.tone].bg)}
                    style={{ animation: paused ? "none" : `hero-fill ${DURATION_MS}ms linear forwards`, width: paused ? "100%" : undefined }}
                  />
                )}
              </span>
              <span
                className={cn(
                  "truncate font-mono text-[10px] tracking-[0.04em] uppercase transition-colors",
                  on ? TONE[s.tone].text : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Scene art (viewBox 0 0 90 170, drawn from above) ---------- */

function Svg({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <svg viewBox="0 0 90 170" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <rect width="90" height="170" fill={bg} />
      {children}
    </svg>
  );
}

function PhoneBoardArt() {
  return (
    <Svg bg="#16231c">
      <rect x="10" y="30" width="70" height="46" rx="3" fill="#1f5130" />
      {[18, 34, 50, 66].map((x) => (
        <circle key={x} cx={x} cy="38" r="1.6" fill="#b8bcc2" opacity="0.7" />
      ))}
      <rect x="54" y="40" width="14" height="5" rx="1" fill="#d0a640" />
      <rect x="34" y="80" width="14" height="5" rx="1" fill="#d0a640" />
      <rect x="14" y="88" width="62" height="50" rx="3" fill="#47515c" />
      <text x="45" y="116" textAnchor="middle" fontSize="4" fill="#c9d1d9" fontFamily="ui-monospace,monospace">BATTERY</text>
      <line x1="62" y1="44" x2="96" y2="68" stroke="#e6e2d8" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function OnionArt() {
  return (
    <Svg bg="#2a1f17">
      {/* cutting board */}
      <rect x="6" y="34" width="78" height="100" rx="6" fill="#a8743f" />
      <rect x="6" y="34" width="78" height="100" rx="6" fill="url(#grain)" opacity="0.35" />
      <defs>
        <pattern id="grain" width="6" height="90" patternUnits="userSpaceOnUse">
          <path d="M3 0 V90" stroke="#7a4f27" strokeWidth="0.6" />
        </pattern>
      </defs>
      {/* onion half with slices */}
      <ellipse cx="44" cy="82" rx="20" ry="16" fill="#efe3c8" />
      {[-12, -8, -4, 0, 4, 8, 12].map((d) => (
        <line key={d} x1={44 + d} y1="68" x2={44 + d} y2="96" stroke="#d6c3a0" strokeWidth="0.7" />
      ))}
      <ellipse cx="44" cy="82" rx="20" ry="16" fill="none" stroke="#c9a86b" strokeWidth="1" />
      {/* hand with flat, extended fingers */}
      <ellipse cx="24" cy="98" rx="11" ry="9" fill="#d9a88a" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={20 + i * 5} y="70" width="4" height="22" rx="2" fill="#d9a88a" />
      ))}
      {/* knife */}
      <rect x="40" y="58" width="4" height="46" rx="1" fill="#cfd5db" />
      <rect x="40" y="104" width="5" height="26" rx="2" fill="#1d1f22" />
    </Svg>
  );
}

function ShelfArt() {
  return (
    <Svg bg="#3a2c22">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="0" y={i * 30} width="90" height="29" fill={i % 2 ? "#433226" : "#3d2d22"} />
      ))}
      {/* base panel */}
      <rect x="12" y="118" width="66" height="10" rx="1" fill="#e8e1d4" />
      {/* left side panel (finished edge) */}
      <rect x="14" y="44" width="12" height="74" rx="1" fill="#efe9de" />
      {/* right side panel, raw edge showing holes */}
      <rect x="56" y="44" width="12" height="74" rx="1" fill="#cbb79a" />
      {[52, 64, 80, 96, 108].map((y) => (
        <circle key={y} cx="62" cy={y} r="1.3" fill="#6b5640" />
      ))}
      {/* cam locks and dowels on the floor */}
      {[30, 38, 46].map((x) => (
        <circle key={x} cx={x} cy="140" r="2.4" fill="#9aa3ad" />
      ))}
      <ellipse cx="78" cy="96" rx="9" ry="7" fill="#d9a88a" />
    </Svg>
  );
}

function BikeArt() {
  return (
    <Svg bg="#1b2026">
      <circle cx="45" cy="88" r="34" fill="none" stroke="#1d1f22" strokeWidth="8" />
      <circle cx="45" cy="88" r="34" fill="none" stroke="#3a3f45" strokeWidth="1" />
      <circle cx="45" cy="88" r="28" fill="none" stroke="#9aa3ad" strokeWidth="1.5" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        // Rounded so server and client render identical attribute strings.
        const x2 = Math.round((45 + Math.cos(a) * 28) * 100) / 100;
        const y2 = Math.round((88 + Math.sin(a) * 28) * 100) / 100;
        return <line key={i} x1="45" y1="88" x2={x2} y2={y2} stroke="#b8bcc2" strokeWidth="0.5" />;
      })}
      <circle cx="45" cy="88" r="4" fill="#9aa3ad" />
      {/* tyre lever + hand */}
      <rect x="66" y="54" width="4" height="22" rx="1.5" fill="#2ee6ff" transform="rotate(35 68 65)" />
      <ellipse cx="76" cy="50" rx="9" ry="7" fill="#d9a88a" />
    </Svg>
  );
}

function GuideArt() {
  const rows = ["Power off, remove SIM tray", "Open the back cover", "Remove shield screws", "Disconnect the battery", "Swap the battery", "Refit the screws", "Reconnect, battery last"];
  return (
    <Svg bg="#0b1117">
      <text x="8" y="40" fontSize="3.6" fill="#2ee6ff" fontFamily="ui-monospace,monospace">[TAVILY] search ✓  extract ✓</text>
      <text x="8" y="46" fontSize="3.6" fill="#ffb224" fontFamily="ui-monospace,monospace">[NEMOTRON] building steps…</text>
      {rows.map((r, i) => (
        <g key={r}>
          <rect x="8" y={54 + i * 11} width="74" height="9" rx="1.2" fill="#121820" stroke="#1c2631" strokeWidth="0.4" />
          <text x="11" y={60 + i * 11} fontSize="3.3" fill="#2ee6ff" fontFamily="ui-monospace,monospace">{String(i + 1).padStart(2, "0")}</text>
          <text x="18" y={60 + i * 11} fontSize="3.4" fill="#e8eef4" fontFamily="Inter,sans-serif">{r}</text>
        </g>
      ))}
    </Svg>
  );
}
