/**
 * A drawn, top-down "bench" animation used by /try until the real repair clip is recorded.
 * It plays through the Redmi Note 8 steps (including reaching for the display connector
 * before the battery) and is exposed as a MediaStream so the normal capture code can read it.
 */

const W = 768;
const H = 576;
const LOOP_S = 48;

type Pt = { x: number; y: number };

// Where the tool tip is during each part of the loop (seconds), with a caption.
const SCRIPT: { from: number; to: number; at: Pt; caption: string }[] = [
  { from: 0, to: 6, at: { x: 640, y: 120 }, caption: "Removing the SIM tray" },
  { from: 6, to: 12, at: { x: 250, y: 470 }, caption: "Prying the back cover" },
  { from: 12, to: 18, at: { x: 330, y: 170 }, caption: "Removing shield screws" },
  { from: 18, to: 22, at: { x: 445, y: 205 }, caption: "Tool at the display connector" },
  { from: 22, to: 26, at: { x: 330, y: 300 }, caption: "Lifting the battery connector" },
  { from: 26, to: 32, at: { x: 445, y: 205 }, caption: "Disconnecting the display flex" },
  { from: 32, to: 38, at: { x: 320, y: 400 }, caption: "Pulling battery adhesive tabs" },
  { from: 38, to: 44, at: { x: 400, y: 170 }, caption: "Refitting shield screws" },
  { from: 44, to: 48, at: { x: 330, y: 300 }, caption: "Reconnecting the battery" },
];

export function startPlaceholderStream(): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const started = performance.now();
  let tip: Pt = { x: 640, y: 120 };

  const draw = () => {
    const t = ((performance.now() - started) / 1000) % LOOP_S;
    const seg = SCRIPT.find((s) => t >= s.from && t < s.to) ?? SCRIPT[0];
    // Ease the tool toward its target, with a little hand tremor so frames differ.
    tip = {
      x: tip.x + (seg.at.x - tip.x) * 0.08 + Math.sin(t * 7) * 1.5,
      y: tip.y + (seg.at.y - tip.y) * 0.08 + Math.cos(t * 5) * 1.5,
    };

    // Mat
    ctx.fillStyle = "#2f3a34";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < W; x += 32) line(ctx, { x, y: 0 }, { x, y: H });
    for (let y = 0; y < H; y += 32) line(ctx, { x: 0, y }, { x: W, y });

    // Phone frame, board, battery
    rect(ctx, 200, 60, 300, 470, 26, "#16181b");
    rect(ctx, 215, 75, 270, 200, 10, "#1f5130");
    rect(ctx, 240, 290, 220, 220, 8, t > 34 && t < 38 ? "#3a3f45" : "#4b5560");
    label(ctx, "BATTERY", 300, 405, "#c9d1d9");

    // Connectors: battery (red if still seated while the tool is at the display), display
    const batteryOff = t >= 24 && t < 44;
    rect(ctx, 305, batteryOff ? 268 : 280, 50, 22, 3, batteryOff ? "#7a828a" : "#d0a640");
    label(ctx, "BATT", 312, batteryOff ? 283 : 295, "#111");
    rect(ctx, 420, 195, 50, 22, 3, t >= 28 && t < 46 ? "#7a828a" : "#d0a640");
    label(ctx, "LCD", 432, 210, "#111");
    // Shield screws
    for (const [x, y] of [[240, 100], [460, 100], [240, 250], [460, 250]] as const) {
      if (t < 15 || t > 40) {
        ctx.fillStyle = "#b8bcc2";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tool (plastic spudger) and hand
    ctx.strokeStyle = "#e6e2d8";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    line(ctx, tip, { x: tip.x + 150, y: tip.y + 160 });
    ctx.fillStyle = "#c79a7c";
    ctx.beginPath();
    ctx.ellipse(tip.x + 185, tip.y + 200, 60, 44, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Caption
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, H - 40, W, 40);
    label(ctx, `SIMULATED BENCH (placeholder) · ${seg.caption}`, 16, H - 15, "#e8e8e8", 16);
  };

  draw();
  const timer = setInterval(draw, 66);
  const stream = canvas.captureStream(15);
  return {
    stream,
    stop: () => {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 13) {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px ui-monospace, monospace`;
  ctx.fillText(text, x, y);
}
