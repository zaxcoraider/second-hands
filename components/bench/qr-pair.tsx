"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";
import { Corners } from "@/components/hud";

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
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative p-4 text-hud">
        <Corners size={18} />
        <div className="glow-hud rounded-[4px] bg-white p-3">
          {url ? <QRCodeSVG value={url} size={168} marginSize={0} /> : <div className="size-[168px]" />}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center justify-center gap-2 font-medium">
          <Smartphone className="size-4 text-hud" strokeWidth={1.75} />
          {connected ? "Phone connected" : "Scan with the phone above your bench"}
        </p>
        <p className="text-sm text-muted-foreground">
          or open <span className="font-mono text-foreground/80">{origin ? new URL(origin).host : "…"}/cam</span> and enter
        </p>
        <p className="text-glow font-mono text-3xl tracking-[0.25em] text-hud">{code}</p>
      </div>
    </div>
  );
}
