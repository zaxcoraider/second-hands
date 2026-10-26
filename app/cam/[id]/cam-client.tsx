"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flashlight,
  FlashlightOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ScanEye,
  ShieldCheck,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { FocusBox } from "@/components/focus-box";
import { Corners, Segments, StateTag } from "@/components/hud";
import { LogoMark } from "@/components/logo";
import { useFrameLoop } from "@/hooks/use-frame-loop";
import { CAMERA_ERROR_TEXT, cameraErrorCode, keepAwake, openCamera } from "@/lib/capture/camera";
import { commandsSupported, listenForCommands, type Command } from "@/lib/capture/commands";
import { measureQuality, setTorch, torchSupported, type Quality } from "@/lib/capture/quality";
import { Voice } from "@/lib/capture/voice";
import type { FrameResultBody } from "@/lib/client-types";
import { DEFAULT_SETUP } from "@/lib/categories";
import type { Focus, SessionEvent, SessionState } from "@/lib/schemas";
import { HOLD_MS, STATE, stateOfEvent, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

type Phase = "loading" | "intro" | "setup" | "live" | "paused" | "done" | "error";
type Shown = { state: AiState; event: SessionEvent | null; until: number };

const IDLE: Shown = { state: "idle", event: null, until: 0 };
const pad = (n: number) => String(n).padStart(2, "0");

const COMMAND_LABEL: Record<Command, string> = {
  next: "skip",
  back: "back",
  repeat: "repeat",
  check: "check",
  override: "I'm right",
  pause: "pause",
  resume: "resume",
};

export function CamClient({ id }: { id: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<Shown>(IDLE);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [lowLight, setLowLight] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  // Checked after mount: the server can't know whether the browser does speech recognition.
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const releaseWake = useRef<(() => void) | null>(null);
  const voice = useRef<Voice | null>(null);
  const lastLine = useRef<string>("");

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
      setStep(s.session.currentStep);
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

  // Light and focus: live during setup, every 2 s while watching (low light shows a hint).
  useEffect(() => {
    if (phase !== "setup" && phase !== "live") return;
    let darkStreak = 0;
    const measure = () => {
      const q = videoRef.current ? measureQuality(videoRef.current) : null;
      if (!q) return;
      setQuality(q);
      darkStreak = q.verdict.light === "dark" ? darkStreak + 1 : 0;
      setLowLight(darkStreak >= 2);
    };
    measure();
    const t = setInterval(measure, phase === "setup" ? 500 : 2_000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => setVoiceSupported(commandsSupported()), []);

  useEffect(() => {
    if (!heard) return;
    const t = setTimeout(() => setHeard(null), 2_000);
    return () => clearTimeout(t);
  }, [heard]);

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

  const say = useCallback((line: string, opts?: { chime?: boolean }) => {
    lastLine.current = line;
    voice.current?.say(line, opts);
  }, []);

  const start = async () => {
    voice.current ??= new Voice();
    voice.current.unlock("Camera on.");
    try {
      if (!streamRef.current) {
        const stream = await openCamera();
        streamRef.current = stream;
        setTorchAvailable(torchSupported(stream));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      }
      releaseWake.current ??= await keepAwake();
      setVoiceOn(commandsSupported());
      setPhase("setup");
    } catch (err) {
      setError(CAMERA_ERROR_TEXT[cameraErrorCode(err)]);
      setPhase("error");
    }
  };

  const beginWatching = () => {
    setPhase("live");
    say(current ? `Watching. Step ${step + 1}: ${current.title}.` : "Watching.");
  };

  const toggleTorch = async () => {
    const next = !torchOn;
    if (await setTorch(streamRef.current, next)) setTorchOn(next);
  };

  const onResult = useCallback(
    (r: FrameResultBody) => {
      setNotice(null);
      setStep(r.currentStep);
      if (r.observation) setFocus(r.observation.focus ?? null);
      for (const e of r.events) {
        say(e.message, { chime: e.kind === "stop" });
        const s = stateOfEvent(e.kind);
        setShown({ state: s, event: e, until: Date.now() + HOLD_MS[s] });
      }
    },
    [say],
  );

  const loop = useFrameLoop({
    videoRef,
    sessionId: id,
    running: phase === "live",
    preview: true,
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
    say(res?.ok ? "Got it, carry on." : "Couldn't save that. Carry on.");
  };

  /** Manual step control, for when the camera misses something. */
  const moveStep = async (action: "next" | "back") => {
    voice.current?.clear();
    const res = await fetch(`/api/session/${id}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    if (!res?.ok) return say("Couldn't change the step.");
    const body: { currentStep: number; event: SessionEvent | null } = await res.json();
    setStep(body.currentStep);
    setShown(IDLE);
    setFocus(null);
    say(body.event?.message ?? (action === "back" ? "Already at the first step." : "That was the last step."));
  };

  const checkNow = () => {
    loop.requestFrame();
    say("Checking.");
  };

  const togglePause = () => {
    if (phase === "live") {
      setPhase("paused");
      say("Paused.");
    } else if (phase === "paused") {
      setPhase("live");
      say("Resuming.");
    }
  };

  // Voice commands: the handler reads the latest state through a ref, so the recognizer never restarts.
  const onCommand = useRef<(cmd: Command) => void>(() => {});
  onCommand.current = (cmd) => {
    const alerting = shown.state === "ask" || shown.state === "stop";
    if (phase === "setup") {
      if (cmd === "resume" || cmd === "next" || cmd === "check") beginWatching();
      return;
    }
    if (phase !== "live" && phase !== "paused") return;
    if (cmd === "next") void moveStep("next");
    else if (cmd === "back") void moveStep("back");
    else if (cmd === "repeat") say(lastLine.current || (current ? `Step ${step + 1}: ${current.title}.` : "Watching."));
    else if (cmd === "check") checkNow();
    else if (cmd === "override") void (alerting ? override() : say("Nothing to override."));
    else if (cmd === "pause" && phase === "live") togglePause();
    else if (cmd === "resume" && phase === "paused") togglePause();
  };

  useEffect(() => {
    if (!voiceOn || (phase !== "setup" && phase !== "live" && phase !== "paused")) return;
    return listenForCommands({
      onCommand: (cmd) => {
        setHeard(COMMAND_LABEL[cmd]);
        onCommand.current(cmd);
      },
      onError: (msg) => {
        setVoiceOn(false);
        setNotice(msg);
      },
    });
  }, [voiceOn, phase === "setup" || phase === "live" || phase === "paused"]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = STATE[shown.state];
  const alerting = shown.state === "ask" || shown.state === "stop";
  const watching = phase === "live" || phase === "paused";
  const cameraOn = watching || phase === "setup";
  const doneSteps = Math.min(step, total);
  const focusLabel = alerting
    ? `${shown.event?.mistakeType?.replace(/_/g, " ") ?? "check"}`
    : current
      ? `S${pad(step + 1)} · tracking`
      : undefined;

  const iconButton =
    "flex size-10 items-center justify-center rounded-md border bg-black/60 backdrop-blur transition-colors";

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-foreground select-none">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn("absolute inset-0 size-full object-cover", !cameraOn && "opacity-0")}
      />

      {cameraOn && (
        <>
          <div aria-hidden className="hud-lines absolute inset-0 opacity-60" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65))]" />
          {phase === "live" && !alerting && <div aria-hidden className="hud-scan" />}
          {watching && <FocusBox focus={focus} mediaRef={videoRef} state={shown.state} label={focusLabel} />}

          {/* Frame brackets in the state color */}
          <div className={cn("pointer-events-none absolute inset-3 transition-colors duration-200", meta.text)}>
            <Corners size={40} className={cn(shown.state === "idle" && "opacity-60")} />
          </div>
          {alerting && (
            <div aria-hidden className={cn("pointer-events-none absolute inset-0 border-[6px]", meta.border, meta.glow)} />
          )}
          {shown.state === "stop" && (
            <div key={shown.event?.id} aria-hidden className="hud-flash pointer-events-none absolute inset-0 bg-stop" />
          )}

          {/* Top HUD */}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-5 pt-5 pb-10">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-white/70 uppercase tabular">
                <LogoMark className="size-4 text-white" />
                {phase === "live" ? (
                  <>
                    <span className="hud-blink size-2 rounded-full bg-stop shadow-[0_0_8px_var(--stop)]" />
                    Live
                  </>
                ) : phase === "setup" ? (
                  "Setup"
                ) : (
                  "Paused"
                )}
                {phase === "live" && loop.lastMs !== null && <span className="text-white/45">· {loop.lastMs}ms</span>}
              </span>
              <div className="flex items-center gap-2">
                {heard && (
                  <span className="hud-lock rounded-[3px] border border-hud/50 bg-black/70 px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-hud uppercase">
                    “{heard}”
                  </span>
                )}
                {voiceSupported && (
                  <button
                    onClick={() => setVoiceOn((v) => !v)}
                    className={cn(iconButton, voiceOn ? "border-hud/60 text-hud" : "border-line text-white/50")}
                    aria-pressed={voiceOn}
                    aria-label={voiceOn ? "Turn voice commands off" : "Turn voice commands on"}
                  >
                    {voiceOn ? <Mic className={cn("size-4", "hud-pulse")} /> : <MicOff className="size-4" />}
                  </button>
                )}
                {torchAvailable && (
                  <button
                    onClick={toggleTorch}
                    className={cn(iconButton, torchOn ? "border-ask/70 bg-ask/20 text-ask" : "border-line text-white/70")}
                    aria-pressed={torchOn}
                    aria-label={torchOn ? "Turn the flashlight off" : "Turn the flashlight on"}
                  >
                    {torchOn ? <Flashlight className="size-4" /> : <FlashlightOff className="size-4" />}
                  </button>
                )}
              </div>
            </div>
            {current && watching && (
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

          {/* Setup check: light and focus, before watching */}
          {phase === "setup" && (
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-5 pt-20 pb-6">
              <div className="hud-panel p-4">
                <p className="hud-label mb-3 flex items-center gap-2">
                  <ScanEye className="size-3.5 text-hud" />
                  Camera check
                </p>
                <ul className="flex flex-col gap-2.5 text-[15px]">
                  <CheckRow
                    ok={quality?.verdict.light === "ok"}
                    pending={!quality}
                    label="Light"
                    good="Bright enough to see small parts"
                    bad={quality?.verdict.light === "bright" ? "Too bright: move away from direct light" : "Too dark: turn on more light or the flashlight"}
                  />
                  <CheckRow
                    ok={quality?.verdict.focus === "ok"}
                    pending={!quality}
                    label="Focus"
                    good="Sharp image"
                    bad="Blurry: hold steady, move a bit higher, or wipe the lens"
                  />
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">{guide?.setup ?? DEFAULT_SETUP}</p>
              </div>
              <button
                onClick={beginWatching}
                className="glow-hud flex h-16 w-full items-center justify-center gap-3 rounded-md bg-hud font-display text-xl font-semibold text-primary-foreground"
              >
                <Play className="size-6 fill-current" />
                {quality?.verdict.light === "ok" && quality.verdict.focus === "ok" ? "Looks good · start" : "Start anyway"}
              </button>
              {voiceOn && (
                <p className="text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  Or say “start”
                </p>
              )}
            </div>
          )}

          {/* Bottom HUD while watching */}
          {watching && (
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
                  <p className="mt-2 font-display text-[36px] leading-[1.05] font-semibold tracking-tight text-white">
                    {shown.event.message}
                  </p>
                </div>
              )}
              {notice && <p className="font-mono text-xs tracking-wide text-ask">{notice}</p>}
              {lowLight && !alerting && (
                <button
                  onClick={torchAvailable && !torchOn ? toggleTorch : undefined}
                  className="flex items-center gap-2 self-start rounded-[3px] border border-ask/50 bg-black/70 px-2.5 py-1.5 font-mono text-[11px] tracking-[0.12em] text-ask uppercase"
                >
                  <TriangleAlert className="size-3.5" />
                  Low light{torchAvailable && !torchOn ? " · tap for flashlight" : ""}
                </button>
              )}
              {alerting && shown.event?.mistakeType ? (
                <button
                  onClick={override}
                  className="flex h-16 w-full items-center justify-center gap-3 rounded-md bg-white font-display text-xl font-semibold text-black active:scale-[0.99]"
                >
                  <ThumbsUp className="size-6" strokeWidth={2} />
                  I&apos;m right
                </button>
              ) : (
                <>
                  <span className="font-mono text-[11px] tracking-[0.12em] text-white/55 uppercase tabular">
                    FRM {String(loop.sent).padStart(3, "0")} · Δ {Math.round(loop.diff * 100)}%
                    {state?.session.mock && " · mock"}
                    {voiceOn && " · voice on"}
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <ControlButton onClick={() => moveStep("back")} label="Back" disabled={step === 0}>
                      <ChevronLeft className="size-5" />
                    </ControlButton>
                    <ControlButton onClick={checkNow} label="Check" disabled={phase !== "live"} accent>
                      <ScanEye className="size-5" />
                    </ControlButton>
                    <ControlButton onClick={() => moveStep("next")} label="Skip" disabled={step >= total}>
                      <ChevronRight className="size-5" />
                    </ControlButton>
                    <ControlButton onClick={togglePause} label={phase === "live" ? "Pause" : "Resume"}>
                      {phase === "live" ? <Pause className="size-5" /> : <Play className="size-5" />}
                    </ControlButton>
                  </div>
                </>
              )}
            </div>
          )}
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
            <p className="mt-3 text-base text-muted-foreground">{guide?.setup ?? DEFAULT_SETUP} Turn the volume up.</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={start}
              disabled={phase === "loading"}
              className="glow-hud relative flex h-16 w-full items-center justify-center gap-3 rounded-md bg-hud font-display text-xl font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Camera className="size-6" strokeWidth={2} />
              Turn on camera
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

function ControlButton({
  onClick,
  label,
  disabled,
  accent,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border bg-black/60 font-mono text-[10px] tracking-[0.12em] uppercase backdrop-blur active:scale-[0.97] disabled:opacity-30",
        accent ? "border-hud/60 text-hud" : "border-line text-white/85",
      )}
    >
      {children}
      {label}
    </button>
  );
}

function CheckRow({ ok, pending, label, good, bad }: { ok: boolean; pending: boolean; label: string; good: string; bad: string }) {
  return (
    <li className="flex items-start gap-3">
      {pending ? (
        <span className="mt-1 size-4 shrink-0 animate-pulse rounded-full bg-line" />
      ) : ok ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />
      ) : (
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-ask" />
      )}
      <span>
        <span className="mr-2 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
        <span className={pending ? "text-muted-foreground" : ok ? "text-foreground" : "text-ask"}>
          {pending ? "Checking…" : ok ? good : bad}
        </span>
      </span>
    </li>
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
