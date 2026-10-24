"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionState } from "@/lib/schemas";

/** Polls GET /api/session/[id] every second. `now()` is the current time on the server's clock. */
export function useSessionState(id: string | null, opts: { frame?: boolean } = {}) {
  const [data, setData] = useState<SessionState | null>(null);
  const [missing, setMissing] = useState(false);
  const [, tick] = useState(0);
  const skew = useRef(0); // server clock minus local clock

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/session/${id}${opts.frame ? "?frame=1" : ""}`, { cache: "no-store" });
        if (res.status === 404) return alive && setMissing(true);
        if (res.ok) {
          const d: SessionState = await res.json();
          if (!alive) return;
          if (d.now) skew.current = d.now - Date.now();
          setData(d);
        }
      } catch {
        // Keep polling; a blip shouldn't break the dashboard.
      }
      if (alive) timer = setTimeout(poll, 1_000);
    };
    poll();
    // Re-render every second for timers and state hold-times.
    const clock = setInterval(() => tick((n) => n + 1), 1_000);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [id, opts.frame]);

  return { data, missing, now: () => Date.now() + skew.current };
}
