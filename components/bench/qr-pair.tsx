"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";

/** QR code that opens /cam/[id] on the phone, plus the typed-code fallback. */
export function QrPair({ id, connected }: { id: string; connected: boolean }) {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    const here = window.location.origin;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    if (!local) return setOrigin(here);
    // On localhost, ask the dev server for its LAN address so the phone can reach it.
    fetch("/api/dev-origin")
      .then((r) => r.json())
      .then((d: { origin: string | null }) => setOrigin(d.origin ?? here))
      .catch(() => setOrigin(here));
  }, []);

  const url = origin ? `${origin}/cam/${id}` : "";
  const code = id.toUpperCase().replace(/(.{4})/, "$1 ");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-lg bg-white p-3">
        {url ? <QRCodeSVG value={url} size={176} marginSize={0} /> : <div className="size-[176px]" />}
      </div>
      <div className="flex flex-col gap-1">
        <p className="flex items-center justify-center gap-2 font-medium">
          <Smartphone className="size-4" strokeWidth={1.75} />
          {connected ? "Phone connected" : "Scan with the phone above your bench"}
        </p>
        <p className="text-sm text-muted-foreground">
          Or open <span className="font-mono">{origin ? new URL(origin).host : "…"}/cam</span> and type
        </p>
        <p className="font-mono text-2xl tracking-[0.2em]">{code}</p>
      </div>
    </div>
  );
}
