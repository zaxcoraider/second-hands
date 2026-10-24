import { STATE, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/** Four L-shaped corner brackets around the parent (which must be `relative`). */
export function Corners({ className, size = 14, inset = 0 }: { className?: string; size?: number; inset?: number }) {
  const s = { width: size, height: size };
  const base = "pointer-events-none absolute border-current";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)} style={{ margin: inset }}>
      <span className={cn(base, "top-0 left-0 border-t-2 border-l-2")} style={s} />
      <span className={cn(base, "top-0 right-0 border-t-2 border-r-2")} style={s} />
      <span className={cn(base, "bottom-0 left-0 border-b-2 border-l-2")} style={s} />
      <span className={cn(base, "right-0 bottom-0 border-r-2 border-b-2")} style={s} />
    </span>
  );
}

/** A HUD panel with an indexed mono header: "01 // STEPS". */
export function HudPanel({
  index,
  label,
  right,
  children,
  className,
  bodyClassName,
}: {
  index?: string;
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("hud-panel overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <h2 className="hud-label">
          {index && <span className="text-hud">{index} </span>}
          {index && <span className="text-line">{"// "}</span>}
          {label}
        </h2>
        {right && <div className="hud-label tabular">{right}</div>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Segmented progress: one bar per step. */
export function Segments({ total, done, className }: { total: number; done: number; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} aria-label={`${done} of ${total} steps done`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-[1px] transition-colors duration-300",
            i < done ? "bg-ok shadow-[0_0_8px_-1px_var(--ok)]" : i === done ? "hud-pulse bg-hud" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

/** State chip: icon + label in the state color. Never color alone. */
export function StateTag({ state, label, className }: { state: AiState; label?: string; className?: string }) {
  const meta = STATE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border bg-black/60 px-2 py-1 font-mono text-[11px] font-medium tracking-[0.14em] uppercase backdrop-blur-sm",
        meta.text,
        meta.borderSoft,
        className,
      )}
    >
      <meta.icon className={cn("size-3.5", state === "idle" && "hud-pulse")} strokeWidth={2} />
      {label ?? meta.hud}
    </span>
  );
}
