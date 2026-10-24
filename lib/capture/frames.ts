/** Client-side frame capture, shared by /cam (live camera) and /try (sample video). */

export type FrameSource = HTMLVideoElement;

export const CAPTURE = {
  longEdge: 768,
  quality: 0.7,
  diffSize: 32,
  pixelDelta: 24, // a 32×32 pixel "changed" if its grayscale moved by more than this (0-255); above sensor noise
  changedShare: 0.03, // send when at least this share of pixels changed (a hand moving over a small area)
  heartbeatMs: 6_000, // send a frame at least this often, even if nothing changed
};

function ready(v: FrameSource) {
  return v.readyState >= 2 && v.videoWidth > 0;
}

/** Downscaled JPEG data URL of the current video frame, or null if the video isn't ready. */
export function grabFrame(video: FrameSource, canvas: HTMLCanvasElement): string | null {
  if (!ready(video)) return null;
  const scale = Math.min(1, CAPTURE.longEdge / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", CAPTURE.quality);
}

/** Compares a 32×32 grayscale thumbnail against the last frame that was sent. */
export class ChangeDetector {
  private canvas: HTMLCanvasElement;
  private last: Uint8Array | null = null;
  private lastSentAt = 0;
  lastDiff = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = CAPTURE.diffSize;
  }

  private sample(video: FrameSource): Uint8Array | null {
    if (!ready(video)) return null;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, CAPTURE.diffSize, CAPTURE.diffSize);
    const px = ctx.getImageData(0, 0, CAPTURE.diffSize, CAPTURE.diffSize).data;
    const gray = new Uint8Array(CAPTURE.diffSize * CAPTURE.diffSize);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000;
    }
    return gray;
  }

  /** True if this frame is worth sending (scene changed, or the heartbeat is due). */
  shouldSend(video: FrameSource, now = Date.now()): boolean {
    const cur = this.sample(video);
    if (!cur) return false;
    if (!this.last) return true;
    let changed = 0;
    for (let i = 0; i < cur.length; i++) if (Math.abs(cur[i] - this.last[i]) > CAPTURE.pixelDelta) changed++;
    this.lastDiff = changed / cur.length;
    return this.lastDiff >= CAPTURE.changedShare || now - this.lastSentAt >= CAPTURE.heartbeatMs;
  }

  markSent(video: FrameSource, now = Date.now()) {
    this.last = this.sample(video);
    this.lastSentAt = now;
  }
}
