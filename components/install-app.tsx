"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install app" on Chrome/Android (native prompt); a short hint on iOS Safari; nothing once installed. */
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (prompt) {
    return (
      <button
        onClick={async () => {
          await prompt.prompt();
          setPrompt(null);
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-md border border-hud/40 font-mono text-sm tracking-[0.12em] text-hud uppercase"
      >
        <Download className="size-4" />
        Install the app
      </button>
    );
  }

  if (ios) {
    return (
      <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        Install: tap <Share className="inline size-4" /> then &ldquo;Add to Home Screen&rdquo;.
      </p>
    );
  }

  return null;
}
