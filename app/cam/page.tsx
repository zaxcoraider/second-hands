"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { QrCode } from "lucide-react";
import { InstallApp } from "@/components/install-app";
import { QrScanner } from "@/components/qr-scanner";
import { SiteHeader } from "@/components/site-header";
import { sessionCodeFrom } from "@/lib/capture/qr";

/** Pair this phone with a session: scan the laptop's QR, or type the code. Also the installed app's start page. */
export default function CamCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const clean = sessionCodeFrom(code);

  const connect = useCallback(
    (id: string) => {
      setScanning(false);
      router.push(`/cam/${id}`);
    },
    [router],
  );

  return (
    <div className="hud-grid flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6 text-foreground">
        <div>
          <p className="hud-label mb-2">
            <span className="text-hud">Pair </span>
            {"// "}camera
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Connect this phone</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Start a task on the laptop, then scan the QR code it shows.
          </p>
        </div>

        <button
          onClick={() => setScanning(true)}
          className="glow-hud flex h-16 items-center justify-center gap-3 rounded-md bg-hud font-display text-xl font-semibold text-primary-foreground"
        >
          <QrCode className="size-6" />
          Scan QR code
        </button>

        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="hud-label">or enter the code</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (clean) connect(clean);
          }}
          className="flex gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            placeholder="ABCD 2345"
            aria-label="Session code"
            className="h-14 min-w-0 flex-1 rounded-md border bg-black/40 px-4 text-center font-mono text-2xl tracking-[0.25em] text-hud uppercase outline-none focus:border-hud focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--hud)_18%,transparent)]"
          />
          <button
            type="submit"
            disabled={!clean}
            className="h-14 rounded-md border border-hud/60 px-5 font-display text-lg font-semibold text-hud disabled:border-line disabled:text-muted-foreground"
          >
            Connect
          </button>
        </form>

        <InstallApp />
      </main>

      {scanning && <QrScanner onCode={connect} onClose={() => setScanning(false)} />}
    </div>
  );
}
