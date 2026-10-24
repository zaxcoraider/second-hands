"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Pause, Play, ShieldCheck, ThumbsUp } from "lucide-react";
import { FocusBox } from "@/components/focus-box";
import { Corners, Segments, StateTag } from "@/components/hud";
import { LogoMark } from "@/components/logo";
import { useFrameLoop } from "@/hooks/use-frame-loop";
import { CAMERA_ERROR_TEXT, cameraErrorCode, keepAwake, openCamera } from "@/lib/capture/camera";
import { Voice } from "@/lib/capture/voice";
import type { FrameResultBody } from "@/lib/client-types";
import { DEFAULT_SETUP } from "@/lib/categories";
import type { Focus, SessionEvent, SessionState } from "@/lib/schemas";
import { HOLD_MS, STATE, stateOfEvent, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

type Phase = "loading" | "intro" | "live" | "paused" | "done" | "error";
type Shown = { state: AiState; event: SessionEvent | null; until: number };

const IDLE: Shown = { state: "idle", event: null, until: 0 };
const pad = (n: number) => String(n).padStart(2, "0");

export function CamClient({ id }: { id: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<Shown>(IDLE);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const releaseWake = useRef<(() => void) | null>(null);
  const voice = useRef<Voice | null>(null);

  // Load the session (and keep an eye on it, so "finish" on the laptop ends the phone too).
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/session/${id}`, { cache: "no-store" }).catch(() => null);
      if (!alive) return;
      if (!res?.ok) {
        if (res?.status === 404) {
          setError("Session not found. Check the code on the laptop and try again.");
          setPhase("error");
        }
        return;
      }
      const s: SessionState = await res.json();
      setState(s);
      setStep((cur) => Math.max(cur, s.session.currentStep));
      if (s.session.status === "done") setPhase("done");
      else setPhase((p) => (p === "loading" ? "intro" : p));
    };
    load();
    const t = setInterval(load, 4_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  // Return to "scanning" when a state's hold time is over.
  useEffect(() => {
    if (shown.state === "idle") return;
    const t = setTimeout(() => setShown(IDLE), Math.max(0, shown.until - Date.now()));
    return () => clearTimeout(t);
  }, [shown]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      releaseWake.current?.();
      voice.current?.clear();
    },
    [],
  );

  const guide = state?.session.guide;
  const current = guide?.steps[step];
  const total = guide?.steps.length ?? 0;

  const start = async () => {
    voice.current ??= new Voice();
    voice.current.unlock(current ? `Watching. Step ${step + 1}: ${current.title}.` : "Watching.");
    try {
      if (!streamRef.current) {
        const stream = await openCamera();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      }
      releaseWake.current ??= await keepAwake();
      setPhase("live");
    } catch (err) {
      setError(CAMERA_ERROR_TEXT[cameraErrorCode(err)]);
      setPhase("error");
    }
  };

  const onResult = useCallback((r: FrameResultBody) => {
    setNotice(null);
    setStep(r.currentStep);
    if (r.observation) setFocus(r.observation.focus ?? null);
    for (const e of r.events) {
      voice.current?.say(e.message, { chime: e.kind === "stop" });
      const s = stateOfEvent(e.kind);
      setShown({ state: s, event: e, until: Date.now() + HOLD_MS[s] });
    }
  }, []);

  const stats = useFrameLoop({
    videoRef,
    sessionId: id,
    running: phase === "live",
    onResult,
    onError: setNotice,
    onStop: (msg) => {
      setNotice(msg);
      setPhase("done");
    },
  });

  const override = async () => {
    const e = shown.event;
    if (!e?.stepId || !e.mistakeType) return;
    voice.current?.clear();
    setShown(IDLE);
    const res = await fetch("/api/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, stepId: e.stepId, mistakeType: e.mistakeType }),
    }).catch(() => null);
    voice.current?.say(res?.ok ? "Got it, carry on." : "Couldn't save that. Carry on.");
  };

  const meta = STATE[shown.state];
  const alerting = shown.state === "ask" || shown.state === "stop";
  const watching = phase === "live" || phase === "paused";
  const doneSteps = Math.min(step, total);
  const focusLabel = alerting
    ? `${shown.event?.mistakeType?.replace(/_/g, " ") ?? "check"}`
    : current
      ? `S${pad(step + 1)} · tracking`
      : undefined;

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-foreground select-none">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn("absolute inset-0 size-full object-cover", !watching && "opacity-0")}
      />

      {watching && (
        <>
          <div aria-hidden className="hud-lines absolute inset-0 opacity-60" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65))]" />
          {phase === "live" && !alerting && <div aria-hidden className="hud-scan" />}
          <FocusBox focus={focus} mediaRef={videoRef} state={shown.state} label={focusLabel} />

          {/* Frame brackets in the state color */}
          <div className={cn("pointer-events-none absolute inset-3 transition-colors duration-200", meta.text)}>
            <Corners size={40} className={cn(shown.state === "idle" && "opacity-60")} />
          </div>
          {alerting && (
            <div
              aria-hidden
              className={cn("pointer-events-none absolute inset-0 border-[6px]", meta.border, meta.glow)}
            />
          )}
          {shown.state === "stop" && (
            <div key={shown.event?.id} aria-hidden className="hud-flash pointer-events-none absolute inset-0 bg-stop" />
          )}

          {/* Top HUD */}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-5 pt-5 pb-10">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-white/70 uppercase">
                <LogoMark className="size-4 text-white" />
                Second Hands
              </span>
              <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-white/70 uppercase tabular">
                {phase === "live" ? (
                  <>
                    <span className="hud-blink size-2 rounded-full bg-stop shadow-[0_0_8px_var(--stop)]" />
                    Live
                  </>
                ) : (
                  "Paused"
                )}
                {stats.lastMs !== null && <span className="text-white/45">· {stats.lastMs}ms</span>}
              </span>
            </div>
            {current && (
              <>
                <Segments total={total} done={doneSteps} className="mt-4" />
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-sm tracking-[0.16em] text-hud tabular">
                    STEP {pad(Math.min(step + 1, total))}
                    <span className="text-white/40">/{pad(total)}</span>
                  </span>
                  <StateTag state={shown.state} label={phase === "paused" ? "Paused" : undefined} />
                </div>
                <p className="mt-1.5 font-display text-[30px] leading-[1.08] font-semibold tracking-tight">{current.title}</p>
              </>
            )}
          </div>

          {/* Bottom HUD */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-5 pt-16 pb-6">
            {alerting && shown.event && (
              <div
                key={shown.event.id}
                role="alert"
                className={cn("hud-glitch relative rounded-md border-2 bg-black/85 p-5 backdrop-blur", meta.border, meta.glow)}
              >
                <p className={cn("flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.18em] uppercase", meta.text)}>
                  <meta.icon className="size-4" strokeWidth={2.25} />
                  {shown.state === "stop" ? "Stop" : "Check"}
                  {shown.event.verifiedBy === "ultra" && (
                    <span className="flex items-center gap-1 text-white/60">
                      <ShieldCheck className="size-3.5" />
                      Verified by Ultra
                    </span>
                  )}
                </p>
                <p className={cn("mt-2 font-display text-[36px] leading-[1.05] font-semibold tracking-tight text-white")}>
                  {shown.event.message}
                </p>
              </div>
            )}
            {notice && <p className="font-mono text-xs tracking-wide text-ask">{notice}</p>}
            {alerting && shown.event?.mistakeType ? (
              <button
                onClick={override}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-md bg-white font-display text-xl font-semibold text-black active:scale-[0.99]"
              >
                <ThumbsUp className="size-6" strokeWidth={2} />
                I&apos;m right
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-[0.12em] text-white/55 uppercase tabular">
                  FRM {String(stats.sent).padStart(3, "0")} · Δ {Math.round(stats.diff * 100)}%
                  {state?.session.mock && " · mock"}
                </span>
                <button
                  onClick={() => setPhase(phase === "live" ? "paused" : "live")}
                  className="flex h-12 items-center gap-2 rounded-md border border-hud/40 bg-black/60 px-5 font-mono text-sm tracking-[0.12em] text-hud uppercase backdrop-blur"
                >
                  {phase === "live" ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {phase === "live" ? "Pause" : "Resume"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {(phase === "loading" || phase === "intro") && (
        <div className="hud-grid absolute inset-0 flex flex-col justify-between p-6">
          <div className="flex items-center justify-between pt-2">
            <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              <LogoMark className="size-4" />
              Second Hands
            </span>
            <span className="font-mono text-[11px] tracking-[0.2em] text-hud uppercase">
              {id.toUpperCase().replace(/(.{4})/, "$1 ")}
            </span>
          </div>

          <div>
            <p className="hud-label">Session · {total ? `${total} steps` : "loading"}</p>
            <h1 className="mt-2 font-display text-[40px] leading-[1.02] font-semibold tracking-tight">
              {guide?.title ?? "Connecting…"}
            </h1>
            <MountDiagram />
            <p className="mt-3 text-base text-muted-foreground">
              {guide?.setup ?? DEFAULT_SETUP} Turn the volume up.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={start}
              disabled={phase === "loading"}
              className="glow-hud relative flex h-16 w-full items-center justify-center gap-3 rounded-md bg-hud font-display text-xl font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Camera className="size-6" strokeWidth={2} />
              Start watching
            </button>
            <p className="text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              Camera · voice · screen stays awake
            </p>
          </div>
        </div>
      )}

      {phase === "done" && (
        <Screen title="Session complete" body={notice ?? "The report is ready on the laptop."}>
          <Link href={`/report/${id}`} className="font-mono text-sm tracking-[0.12em] text-hud uppercase underline-offset-4 hover:underline">
            Open the report →
          </Link>
        </Screen>
      )}

      {phase === "error" && (
        <Screen title="Can't start" body={error ?? ""} tone="stop">
          <Link href="/cam" className="font-mono text-sm tracking-[0.12em] text-hud uppercase underline-offset-4 hover:underline">
            Enter a different code →
          </Link>
        </Screen>
      )}
    </main>
  );
}

function Screen({ title, body, tone, children }: { title: string; body: string; tone?: "stop"; children: React.ReactNode }) {
  return (
    <div className="hud-grid absolute inset-0 flex flex-col justify-center gap-4 bg-background p-6">
      <p className={cn("hud-label", tone === "stop" && "text-stop")}>{tone === "stop" ? "Error" : "Done"}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="text-lg text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

/** Small side-view sketch: phone above the work, camera down. */
function MountDiagram() {
  return (
    <svg viewBox="0 0 320 120" className="mt-6 w-full max-w-sm text-hud" aria-hidden>
      <rect x="110" y="8" width="100" height="14" rx="3" fill="currentColor" opacity="0.9" />
      <circle cx="160" cy="22" r="3" fill="#06080b" />
      <path d="M160 26 L120 96 M160 26 L200 96" stroke="currentColor" strokeOpacity="0.45" strokeDasharray="3 4" />
      <rect x="100" y="96" width="120" height="10" rx="2" fill="currentColor" opacity="0.25" />
      <rect x="40" y="106" width="240" height="4" fill="currentColor" opacity="0.5" />
      <path d="M250 15 V100" stroke="currentColor" strokeOpacity="0.7" />
      <path d="M245 15 H255 M245 100 H255" stroke="currentColor" strokeOpacity="0.7" />
      <text x="262" y="62" fill="currentColor" fontSize="12" fontFamily="ui-monospace, monospace">height</text>
    </svg>
  );
}
