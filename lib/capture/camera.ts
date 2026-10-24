/** Rear camera with fallbacks, plus the screen Wake Lock. */

export type CameraError = "insecure" | "unsupported" | "denied" | "not_found" | "unknown";

export async function openCamera(): Promise<MediaStream> {
  if (typeof window !== "undefined" && !window.isSecureContext) throw cameraError("insecure");
  if (!navigator.mediaDevices?.getUserMedia) throw cameraError("unsupported");
  const tries: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
    { video: true, audio: false },
  ];
  let last: unknown;
  for (const c of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (err) {
      last = err;
      if (err instanceof DOMException && err.name === "NotAllowedError") throw cameraError("denied");
    }
  }
  if (last instanceof DOMException && last.name === "NotFoundError") throw cameraError("not_found");
  throw cameraError("unknown");
}

function cameraError(code: CameraError) {
  return Object.assign(new Error(code), { code });
}

export function cameraErrorCode(err: unknown): CameraError {
  return (err as { code?: CameraError })?.code ?? "unknown";
}

export const CAMERA_ERROR_TEXT: Record<CameraError, string> = {
  insecure: "The camera needs a secure (HTTPS) connection. Open this page over https://.",
  unsupported: "This browser can't open the camera. Use Chrome on Android or a desktop browser.",
  denied: "Camera access was blocked. Allow the camera for this site in your browser settings, then reload.",
  not_found: "No camera was found on this device.",
  unknown: "The camera couldn't start. Close other apps using it and reload.",
};

type WakeLockSentinelLike = { release(): Promise<void> };

/** Keeps the screen on while watching. Best-effort: silently does nothing if unsupported. */
export async function keepAwake(): Promise<() => void> {
  let lock: WakeLockSentinelLike | null = null;
  const nav = navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> } };
  const acquire = async () => {
    try {
      lock = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      lock = null;
    }
  };
  // The lock drops when the tab is hidden; take it again when it comes back.
  const onVisible = () => document.visibilityState === "visible" && acquire();
  await acquire();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    lock?.release().catch(() => {});
  };
}
