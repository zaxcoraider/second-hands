/** Reading the pairing QR code from a camera frame, and pulling the session code out of what it says. */

/** The laptop's QR encodes `https://<host>/cam/<id>`; a bare code also works. */
export function sessionCodeFrom(text: string): string | null {
  const fromUrl = text.match(/\/cam\/([a-z0-9]{6,12})\b/i);
  if (fromUrl) return fromUrl[1].toLowerCase();
  const bare = text.trim().replace(/\s+/g, "");
  return /^[a-z0-9]{6,12}$/i.test(bare) ? bare.toLowerCase() : null;
}

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

let native: Detector | null | undefined;

/** Chrome on Android has a built-in QR reader; elsewhere we fall back to jsQR. */
async function nativeDetector(): Promise<Detector | null> {
  if (native !== undefined) return native;
  const BD = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } })
    .BarcodeDetector;
  try {
    const formats = (await BD?.getSupportedFormats?.()) ?? [];
    native = BD && formats.includes("qr_code") ? new BD({ formats: ["qr_code"] }) : null;
  } catch {
    native = null;
  }
  return native;
}

let canvas: HTMLCanvasElement | null = null;

/** Returns the QR text in the current video frame, or null. */
export async function readQr(video: HTMLVideoElement): Promise<string | null> {
  if (video.readyState < 2 || !video.videoWidth) return null;
  const detector = await nativeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(video);
      return codes[0]?.rawValue ?? null;
    } catch {
      return null;
    }
  }
  // jsQR works on pixels; a ~640px frame is plenty for a QR on a laptop screen.
  const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
  canvas ??= document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { default: jsQR } = await import("jsqr");
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
}
