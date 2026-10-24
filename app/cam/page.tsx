"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Typed-code fallback for pairing, when scanning the QR code isn't possible. */
export default function CamCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    <main className="hud-grid flex min-h-dvh flex-col justify-center gap-6 bg-background p-6 text-foreground">
      <div>
        <p className="hud-label mb-2">
          <span className="text-hud">Pair </span>{"// "}camera
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Connect this phone</h1>
        <p className="mt-2 text-lg text-muted-foreground">Type the 8-character code shown on the laptop.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (clean.length >= 6) router.push(`/cam/${clean}`);
        }}
        className="flex flex-col gap-4"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          placeholder="ABCD 2345"
          aria-label="Session code"
          className="h-16 rounded-md border bg-black/40 px-4 text-center font-mono text-3xl tracking-[0.3em] text-hud uppercase outline-none focus:border-hud focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--hud)_18%,transparent)]"
        />
        <button
          type="submit"
          disabled={clean.length < 6}
          className="glow-hud h-16 rounded-md bg-hud font-display text-xl font-semibold text-primary-foreground disabled:opacity-40 disabled:shadow-none"
        >
          Connect
        </button>
      </form>
    </main>
  );
}
