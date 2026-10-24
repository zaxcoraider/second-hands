"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, X } from "lucide-react";
import { Corners } from "@/components/hud";
import { CAMERA_ERROR_TEXT, cameraErrorCode, openCamera } from "@/lib/capture/camera";
import { readQr, sessionCodeFrom } from "@/lib/capture/qr";

/** Full-screen camera that reads the laptop's pairing QR and returns the session code. */
export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let busy = false;
    (async () => {
      try {
        stream = await openCamera();
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});
        timer = setInterval(async () => {
          if (busy || done.current) return;
          busy = true;
          const text = await readQr(video);
          busy = false;
          if (!text) return;
          const code = sessionCodeFrom(text);
          if (!code) return setWrong(true);
          done.current = true;
          navigator.vibrate?.(60);
          onCode(code);
        }, 250);
      } catch (err) {
        setError(CAMERA_ERROR_TEXT[cameraErrorCode(err)]);
      }
    })();
    return () => {
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-label="Scan the pairing QR code">
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 size-full object-cover" />
      <div aria-hidden className="hud-lines absolute inset-0 opacity-50" />

      {/* Viewfinder: dim everything outside a square */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square w-[72vw] max-w-[320px] rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 text-hud">
            <Corners size={34} />
          </div>
          <div className="absolute inset-0 overflow-hidden rounded-md">
            <div className="hud-scan" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/85 to-transparent px-5 pt-5 pb-10">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-hud uppercase">
          <QrCode className="size-4" />
          Scan to connect
        </p>
        <button
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-md border border-line bg-black/60 text-white"
          aria-label="Close the scanner"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-6 pt-16 pb-10 text-center">
        {error ? (
          <p className="text-lg text-stop">{error}</p>
        ) : (
          <>
            <p className="font-display text-2xl font-semibold tracking-tight">Point at the QR on the laptop</p>
            <p className="mt-2 text-muted-foreground">
              {wrong ? "That QR isn't a Second Hands session. Try the one on the bench screen." : "It connects as soon as it reads the code."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
