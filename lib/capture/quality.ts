/** Quick on-device image checks before and during a session: is it bright and sharp enough to judge? */

export type Quality = {
  brightness: number; // mean luma, 0-255
  sharpness: number; // variance of a Laplacian filter; low = blurry or out of focus
  verdict: { light: "ok" | "dark" | "bright"; focus: "ok" | "blurry" };
};

const W = 96;
const H = 72;

export const QUALITY = {
  dark: 55,
  bright: 235,
  blurry: 25, // tuned on phone frames at 96×72; advisory only, never blocks
};

let canvas: HTMLCanvasElement | null = null;

export function measureQuality(video: HTMLVideoElement): Quality | null {
  if (video.readyState < 2 || !video.videoWidth) return null;
  canvas ??= document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;

  const gray = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    sum += gray[i];
  }
  const brightness = sum / gray.length;

  // Laplacian variance: edges in focus give large second derivatives.
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - W] - gray[i + W];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const mean = lapSum / n;
  const sharpness = lapSq / n - mean * mean;

  return {
    brightness,
    sharpness,
    verdict: {
      light: brightness < QUALITY.dark ? "dark" : brightness > QUALITY.bright ? "bright" : "ok",
      focus: sharpness < QUALITY.blurry ? "blurry" : "ok",
    },
  };
}

/** Phone flashlight, when the camera exposes it (Chrome on Android). */
export function torchSupported(stream: MediaStream | null): boolean {
  const track = stream?.getVideoTracks()[0];
  const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
  return !!caps?.torch;
}

export async function setTorch(stream: MediaStream | null, on: boolean): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}
