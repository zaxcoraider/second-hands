"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FileText, Loader2, Play, RotateCcw } from "lucide-react";
import { BenchLayout } from "@/components/bench/bench-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFrameLoop } from "@/hooks/use-frame-loop";
import { useSessionState } from "@/hooks/use-session-state";
import { grabFrame } from "@/lib/capture/frames";
import { startPlaceholderStream } from "@/lib/capture/placeholder";
import { Voice } from "@/lib/capture/voice";
import type { FrameResultBody } from "@/lib/client-types";
import { REDMI_NOTE_8_BATTERY } from "@/lib/mock/guides";
import { recordingLength, replayAt } from "@/lib/replay";
import type { SessionEvent, SessionState } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const SAMPLE_VIDEO = "/samples/repair-demo.mp4";
const REPLAY_FILE = "/samples/repair-demo.trace.json";

type Mode = "intro" | "starting" | "live" | "replay";

export function TryClient() {
  const [mode, setMode] = useState<Mode>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finished, setFinished] = useState<string | null>(null); // report id once done
  const videoRef = useRef<HTMLVideoElement>(null);
  const voice = useRef<Voice | null>(null);

  // Sample clip if it's been recorded, otherwise the drawn placeholder bench.
  useEffect(() => {
    let stop: (() => void) | undefined;
    (async () => {
      const video = videoRef.current;
      if (!video) return;
      const hasClip = await fetch(SAMPLE_VIDEO, { method: "HEAD" }).then((r) => r.ok).catch(() => false);
      if (hasClip) {
        video.src = SAMPLE_VIDEO;
      } else {
        const p = startPlaceholderStream();
        stop = p.stop;
        video.srcObject = p.stream;
      }
      await video.play().catch(() => {});
    })();
    return () => stop?.();
  }, []);

  useEffect(() => () => voice.current?.clear(), []);

  const say = useCallback((events: SessionEvent[]) => {
    for (const e of events) voice.current?.say(e.message, { chime: e.kind === "stop" });
  }, []);

  // ---- Live run: the real pipeline on the clip ----
  const { data: live, now } = useSessionState(mode === "live" ? sessionId : null);
  const allDone = !!live && live.session.currentStep >= live.session.guide.steps.length;

  const onResult = useCallback(
    (r: FrameResultBody) => {
      setNotice(null);
      say(r.events);
    },
    [say],
  );

  useFrameLoop({
    videoRef,
    sessionId: sessionId ?? "",
    running: mode === "live" && !!sessionId && !allDone && !finished,
    onResult,
    onError: setNotice,
    onStop: (msg) => setNotice(msg),
  });

  // Finish automatically a moment after the last step, so the report is ready.
  useEffect(() => {
    if (mode !== "live" || !allDone || finished || !sessionId) return;
    const t = setTimeout(async () => {
      await fetch(`/api/session/${sessionId}/finish`, { method: "POST" }).catch(() => null);
      setFinished(sessionId);
    }, 2_500);
    return () => clearTimeout(t);
  }, [mode, allDone, finished, sessionId]);

  // ---- Replay: a recorded run, re-timed to now ----
  const [recording, setRecording] = useState<SessionState | null>(null);
  const [replayStart, setReplayStart] = useState(0);
  const [, tick] = useState(0);
  const thumbs = useRef(new Map<string, string>());
  const spoken = useRef(new Set<string>());

  useEffect(() => {
    if (mode !== "replay") return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [mode]);

  const replay = useMemo(() => {
    if (mode !== "replay" || !recording) return null;
    const state = replayAt(recording, replayStart, Date.now() - replayStart);
    // Evidence comes from the clip as it plays, so the frame matches what's on screen.
    state.events = state.events.map((e) => {
      if (!e.frameThumb) return e;
      if (!thumbs.current.has(e.id) && videoRef.current) {
        const frame = grabFrame(videoRef.current, document.createElement("canvas"));
        if (frame) thumbs.current.set(e.id, frame);
      }
      const thumb = thumbs.current.get(e.id);
      return thumb ? { ...e, frameThumb: thumb } : { ...e, frameThumb: undefined };
    });
    return state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recording, replayStart, Date.now() >> 9]);

  useEffect(() => {
    if (!replay) return;
    const fresh = replay.events.filter((e) => !spoken.current.has(e.id)).reverse();
    fresh.forEach((e) => spoken.current.add(e.id));
    say(fresh);
  }, [replay, say]);

  const startReplay = async (why: string) => {
    const rec: SessionState | null = await fetch(REPLAY_FILE).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!rec) {
      setReason("The live demo is busy right now. Please try again in a minute.");
      setMode("intro");
      return;
    }
    thumbs.current.clear();
    spoken.current.clear();
    setRecording(rec);
    setReason(why);
    setReplayStart(Date.now());
    setMode("replay");
  };

  const start = async () => {
    voice.current ??= new Voice();
    voice.current.unlock("Watching. Step 1: power off and remove the SIM tray.");
    setMode("starting");
    setFinished(null);
    setNotice(null);
    try {
      const res = await fetch("/api/try", { method: "POST" });
      const body = await res.json();
      if (res.ok && body.id) {
        setSessionId(body.id);
        setMode("live");
      } else {
        await startReplay(body.reason ?? "This is a recorded run of the same pipeline.");
      }
    } catch {
      await startReplay("This is a recorded run of the same pipeline.");
    }
  };

  // Before starting, show the demo guide so the layout (and the video) never jump.
  const intro = useMemo<SessionState>(
    () => ({
      session: {
        id: "sample",
        createdAt: 0,
        status: "ready",
        task: REDMI_NOTE_8_BATTERY.title,
        guide: REDMI_NOTE_8_BATTERY,
        currentStep: 0,
        stepStatus: Object.fromEntries(REDMI_NOTE_8_BATTERY.steps.map((s, i) => [s.id, i === 0 ? "active" : "todo"])),
        mode: "try",
        mock: false,
        frames: 0,
      },
      events: [],
      trace: [],
      overrides: [],
      costUsd: 0,
      latestFrame: null,
    }),
    [],
  );

  const data = mode === "replay" ? replay : mode === "live" ? live : null;
  const replayDone = mode === "replay" && recording && Date.now() - replayStart >= recordingLength(recording);
  const reportId = finished ?? (replayDone ? recording?.session.id : null);

  const actions =
    mode === "intro" || mode === "starting" ? (
      <Button onClick={start} disabled={mode === "starting"}>
        {mode === "starting" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Play data-icon="inline-start" />}
        <span className="sm:hidden">Run</span>
        <span className="hidden sm:inline">Run the sample</span>
      </Button>
    ) : reportId ? (
      <>
        <Button variant="outline" onClick={start}>
          <RotateCcw data-icon="inline-start" />
          <span className="hidden sm:inline">Run again</span>
        </Button>
        <Link href={`/report/${reportId}`} className={buttonVariants()}>
          <FileText data-icon="inline-start" />
          Report
        </Link>
      </>
    ) : null;

  const banner = (
    <div className="border-b border-hud/20 bg-hud/[0.05]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 text-sm">
        <p>
          <span className="mr-2 font-mono text-[11px] tracking-[0.16em] text-hud uppercase">Sample run</span>
          <span className="text-muted-foreground">
            {mode === "replay"
              ? reason
              : "The real pipeline on a recorded repair: every frame goes through the same models as a live session."}
          </span>
          {notice && <span className="ml-2 text-ask">{notice}</span>}
        </p>
        <Link href="/start" className="inline-flex items-center gap-1 text-primary hover:underline">
          Try your own with a phone or webcam
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <BenchLayout
      data={data ?? intro}
      now={mode === "live" ? now() : Date.now()}
      actions={actions}
      banner={banner}
      badge={mode === "replay" ? "Replay" : undefined}
      mediaRef={videoRef}
      source="Sample clip"
      live={
        <div className="relative size-full">
          <video ref={videoRef} muted playsInline autoPlay loop className="size-full object-cover" />
          {(mode === "intro" || mode === "starting") && (
            <button
              onClick={start}
              disabled={mode === "starting"}
              className={cn(
                "group absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/60 text-white transition-colors hover:bg-black/50",
              )}
            >
              <span className="glow-hud flex size-16 items-center sm:size-20 justify-center rounded-full border-2 border-hud bg-hud/15 text-hud transition-transform group-hover:scale-105">
                {mode === "starting" ? <Loader2 className="size-8 animate-spin" /> : <Play className="size-8 translate-x-0.5 fill-current" />}
              </span>
              <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Run the sample</span>
              <span className="font-mono text-[11px] tracking-[0.16em] text-white/65 uppercase">~1 min · sound on · no setup</span>
            </button>
          )}
        </div>
      }
    />
  );
}
