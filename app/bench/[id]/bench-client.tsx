"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flag, Loader2, QrCode, X } from "lucide-react";
import { BenchLayout } from "@/components/bench/bench-layout";
import { QrPair } from "@/components/bench/qr-pair";
import { Button } from "@/components/ui/button";
import { useSessionState } from "@/hooks/use-session-state";

export function BenchClient({ id }: { id: string }) {
  const router = useRouter();
  const { data, missing, now } = useSessionState(id, { frame: true });
  const [showQr, setShowQr] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    setFinishing(true);
    await fetch(`/api/session/${id}/finish`, { method: "POST" }).catch(() => null);
    router.push(`/report/${id}`);
  };

  if (missing) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-muted-foreground">It may have expired. Start a new repair or try the sample run.</p>
        <div className="flex gap-4 text-sm">
          <Link href="/start" className="text-primary hover:underline">Start a repair</Link>
          <Link href="/try" className="text-primary hover:underline">Sample run</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </main>
    );
  }

  const t = now();
  const connected = !!data.session.lastFrameAt && t - data.session.lastFrameAt < 10_000;

  return (
    <>
      <BenchLayout
        data={data}
        now={t}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowQr((v) => !v)}>
              <QrCode data-icon="inline-start" />
              Connect phone
            </Button>
            <Button onClick={finish} disabled={finishing || data.session.status === "done"}>
              {finishing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Flag data-icon="inline-start" />}
              Finish
            </Button>
          </>
        }
        pairing={
          data.session.frames === 0 ? (
            <div className="hud-panel flex flex-col items-center gap-6 px-4 py-10">
              <p className="hud-label">
                <span className="text-hud">02 </span>{"// "}Pair a camera
              </p>
              <QrPair id={id} connected={connected} />
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                Mount the phone 15–20 cm above your work, camera facing down, and tap Start on it.
              </p>
            </div>
          ) : undefined
        }
      />

      {showQr && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowQr(false)}
          role="dialog"
          aria-label="Connect phone"
        >
          <div className="hud-panel glow-hud relative p-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQr(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <QrPair id={id} connected={connected} />
          </div>
        </div>
      )}
    </>
  );
}
