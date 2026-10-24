/**
 * Spoken output. One line at a time, never talking over itself.
 * Mobile browsers block speech until a user gesture, so call unlock() from a tap.
 */
export class Voice {
  private queue: Promise<void> = Promise.resolve();
  private audio: AudioContext | null = null;
  muted = false;

  get supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /** Call from a click/tap handler. Speaks a short test line. */
  unlock(testLine = "Watching.") {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audio ??= new Ctx();
      void this.audio.resume();
    } catch {
      this.audio = null;
    }
    if (this.supported) {
      speechSynthesis.cancel();
      this.say(testLine);
    }
  }

  say(text: string, opts: { chime?: boolean } = {}) {
    this.queue = this.queue.then(async () => {
      if (this.muted) return;
      if (opts.chime) await this.chime();
      await this.speak(text);
    });
    return this.queue;
  }

  /** Drop anything queued (e.g. when the user overrides). */
  clear() {
    if (this.supported) speechSynthesis.cancel();
    this.queue = Promise.resolve();
  }

  private speak(text: string) {
    if (!this.supported) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 1.02;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
      // Some Android voices never fire onend; don't block the queue forever.
      setTimeout(resolve, 1500 + text.length * 90);
    });
  }

  /** Short two-tone chime before a "stop" line. */
  private chime() {
    const ctx = this.audio;
    if (!ctx) return Promise.resolve();
    const tone = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    };
    tone(880, 0, 0.16);
    tone(660, 0.18, 0.22);
    return new Promise<void>((r) => setTimeout(r, 450));
  }
}
