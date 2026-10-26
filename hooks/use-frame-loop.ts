"use client";

import { useEffect, useRef, useState } from "react";
import { CAPTURE, ChangeDetector, grabFrame } from "@/lib/capture/frames";
import type { FrameResultBody } from "@/lib/client-types";

export type FrameLoopStats = { sent: number; inflight: boolean; lastMs: number | null; diff: number };

export type FrameLoop = FrameLoopStats & {
  /** Send the next frame right away, ignoring the change detector ("check me now"). */
  requestFrame: () => void;
};

/**
 * Sends a frame when the scene changes (or every few seconds), with at most one request in flight.
 * `onStop` fires for errors that mean "stop sending" (session finished, cap reached).
 */
export function useFrameLoop(args: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  sessionId: string;
  running: boolean;
  /** Also upload a small frame often for the dashboard's live view (phone camera only). */
  preview?: boolean;
  onResult: (r: FrameResultBody) => void;
  onError?: (message: string) => void;
  onStop?: (message: string) => void;
}): FrameLoop {
  const [stats, setStats] = useState<FrameLoopStats>({ sent: 0, inflight: false, lastMs: null, diff: 0 });
  const cb = useRef(args);
  cb.current = args;
  const force = useRef(false);

  useEffect(() => {
    if (!args.running) return;
    const detector = new ChangeDetector();
    const canvas = document.createElement("canvas");
    let inflight = false;
    let backoffUntil = 0;
    let stopped = false;

    const tick = async () => {
      const video = cb.current.videoRef.current;
      const now = Date.now();
      if (stopped || inflight || !video || now < backoffUntil) return;
      const forced = force.current;
      if (!forced && !detector.shouldSend(video, now)) {
        setStats((s) => ({ ...s, diff: detector.lastDiff }));
        return;
      }
      const image = grabFrame(video, canvas);
      if (!image) return;
      force.current = false;
      detector.markSent(video, now);
      inflight = true;
      setStats((s) => ({ ...s, inflight: true, diff: detector.lastDiff }));
      const started = performance.now();
      try {
        const res = await fetch("/api/frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: cb.current.sessionId, image }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          cb.current.onResult(body as FrameResultBody);
        } else if (res.status === 409 || res.status === 403 || res.status === 404) {
          stopped = true;
          cb.current.onStop?.(body.error ?? "Session ended.");
        } else {
          // Rate limited or a model hiccup: wait a bit, then carry on.
          backoffUntil = Date.now() + (res.status === 429 ? 5_000 : 1_500);
          cb.current.onError?.(body.error ?? "Something went wrong. Retrying.");
        }
      } catch {
        backoffUntil = Date.now() + 2_000;
        cb.current.onError?.("Connection lost. Retrying.");
      } finally {
        inflight = false;
        const ms = Math.round(performance.now() - started);
        setStats((s) => ({ ...s, inflight: false, sent: s.sent + 1, lastMs: ms }));
      }
    };

    // Live view: independent of the model loop, so the dashboard stays ~1 s behind instead of 2-7 s.
    const previewCanvas = document.createElement("canvas");
    let previewBusy = false;
    const sendPreview = async () => {
      const video = cb.current.videoRef.current;
      if (stopped || previewBusy || !video || Date.now() < backoffUntil) return;
      const image = grabFrame(video, previewCanvas, CAPTURE.previewEdge, CAPTURE.previewQuality);
      if (!image) return;
      previewBusy = true;
      try {
        await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: cb.current.sessionId, image }),
        });
      } catch {
        // A dropped preview is fine; the next one replaces it.
      } finally {
        previewBusy = false;
      }
    };

    const timer = setInterval(tick, 350);
    const previewTimer = args.preview ? setInterval(sendPreview, CAPTURE.previewMs) : undefined;
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(previewTimer);
    };
  }, [args.running, args.sessionId, args.preview]);

  return { ...stats, requestFrame: () => (force.current = true) };
}
