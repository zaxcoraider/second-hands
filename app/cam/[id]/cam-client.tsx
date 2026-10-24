"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Pause, Play, ThumbsUp, VolumeX } from "lucide-react";
import { useFrameLoop } from "@/hooks/use-frame-loop";
import { CAMERA_ERROR_TEXT, cameraErrorCode, keepAwake, openCamera } from "@/lib/capture/camera";
import { Voice } from "@/lib/capture/voice";
import type { FrameResultBody } from "@/lib/client-types";
import type { SessionEvent, SessionState } from "@/lib/schemas";
import { HOLD_MS, STATE, stateOfEvent, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

type Phase = "loading" | "intro" | "live" | "paused" | "done" | "error";
type Shown = { state: AiState; event: SessionEvent | null; until: number };

const IDLE: Shown = { state: "idle", event: null, until: 0 };

export function CamClient({ id }: { id: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<Shown>(IDLE);
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

  // Return the ring to "watching" when a state's hold time is over.
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

  return (
    <main className="dark fixed inset-0 overflow-hidden bg-black text-foreground select-none">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn("absolute inset-0 size-full object-cover", phase !== "live" && phase !== "paused" && "opacity-0")}
      />

      {/* Status ring */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 border-[10px] transition-colors duration-200",
          meta.border,
          phase !== "live" && phase !== "paused" && "hidden",
          shown.state === "idle" && phase === "live" && "sh-pulse",
        )}
      />

      {(phase === "live" || phase === "paused") && current && (
        <>
          <div className="absolute inset-x-0 top-0 p-5">
            <div className="rounded-xl bg-black/70 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm tracking-wider text-muted-foreground">
                  STEP {Math.min(step + 1, total)} / {total}
                </span>
                <span className={cn("flex items-center gap-1.5 text-sm font-medium", meta.text)}>
                  <meta.icon className="size-4" strokeWidth={1.75} />
                  {phase === "paused" ? "Paused" : meta.label}
                </span>
              </div>
              <p className="mt-1 text-[28px] leading-tight font-semibold">{current.title}</p>
            </div>
          </div>

          {alerting && shown.event && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 p-5" role="alert">
              <div className={cn("rounded-xl border-2 bg-black/80 p-5 backdrop-blur-sm", meta.border)}>
                <p className={cn("mb-2 flex items-center gap-2 font-mono text-sm tracking-wider uppercase", meta.text)}>
                  <meta.icon className="size-5" strokeWidth={2} />
                  {shown.state === "stop" ? "Stop" : "Check"}
                  {shown.event.verifiedBy === "ultra" && <span className="text-muted-foreground">· verified</span>}
                </p>
                <p className="text-[38px] leading-[1.1] font-semibold">{shown.event.message}</p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
            {notice && <p className="rounded-lg bg-black/70 px-3 py-2 text-center text-sm text-muted-foreground">{notice}</p>}
            {alerting && shown.event?.mistakeType ? (
              <button
                onClick={override}
                className="flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-white text-xl font-semibold text-black active:scale-[0.99]"
              >
                <ThumbsUp className="size-6" strokeWidth={2} />
                I&apos;m right
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/60 tabular">
                  {stats.sent} frames{stats.lastMs !== null && ` · ${stats.lastMs}ms`}
                  {state?.session.mock && " · mock"}
                </span>
                <button
                  onClick={() => setPhase(phase === "live" ? "paused" : "live")}
                  className="flex h-12 items-center gap-2 rounded-full bg-black/70 px-5 text-base font-medium"
                >
                  {phase === "live" ? <Pause className="size-5" /> : <Play className="size-5" />}
                  {phase === "live" ? "Pause" : "Resume"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {(phase === "loading" || phase === "intro") && (
        <div className="absolute inset-0 flex flex-col justify-center gap-8 p-6">
          <div>
            <p className="font-mono text-sm tracking-wider text-muted-foreground">SESSION {id.toUpperCase()}</p>
            <h1 className="mt-2 text-3xl leading-tight font-semibold">{guide?.title ?? "Loading…"}</h1>
            {total > 0 && <p className="mt-1 text-muted-foreground">{total} steps</p>}
          </div>
          <p className="text-lg text-muted-foreground">
            Mount the phone 15–20 cm above your work, camera facing down, with good light. Turn the volume up.
          </p>
          <button
            onClick={start}
            disabled={phase === "loading"}
            className="flex h-16 w-full items-center justify-center gap-3 rounded-xl bg-primary text-xl font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Camera className="size-6" strokeWidth={2} />
            Start
          </button>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <VolumeX className="size-4" />
            Starting turns on the camera and voice, and keeps the screen awake.
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="absolute inset-0 flex flex-col justify-center gap-4 bg-background p-6">
          <h1 className="text-3xl font-semibold">Session finished</h1>
          <p className="text-lg text-muted-foreground">{notice ?? "The report is ready on the laptop."}</p>
          <Link href={`/report/${id}`} className="text-lg text-primary underline underline-offset-4">
            Open the report
          </Link>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col justify-center gap-4 bg-background p-6">
          <h1 className="text-3xl font-semibold">Can&apos;t start</h1>
          <p className="text-lg text-muted-foreground">{error}</p>
          <Link href="/cam" className="text-lg text-primary underline underline-offset-4">
            Enter a different code
          </Link>
        </div>
      )}
    </main>
  );
}
