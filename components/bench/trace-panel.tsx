import { shortName } from "@/lib/ai/models";
import type { TraceEntry } from "@/lib/schemas";
import { fmtMs, fmtUsd } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

// One tint per model role, so the trace reads at a glance.
function modelTone(model: string) {
  if (model === "tavily") return "text-foreground/70";
  if (/VL/i.test(model)) return "text-hud";
  if (/nano|lightning/i.test(model)) return "text-ok";
  if (/ultra/i.test(model)) return "text-stop";
  return "text-ask";
}

/** Every model and search call: stage, model, latency (with a bar), tokens, cost. Newest first. */
export function TracePanel({ trace, totalUsd, limit = 14 }: { trace: TraceEntry[]; totalUsd: number; limit?: number }) {
  const rows = trace.slice(0, limit);
  const calls = trace.filter((t) => t.model !== "tavily").length;
  const maxMs = Math.max(1, ...rows.map((t) => t.ms));
  return (
    <div className="font-mono text-xs">
      <table className="w-full tabular">
        <thead className="text-left text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <tr className="border-b">
            <th className="py-2 pl-4 font-normal">Stage</th>
            <th className="py-2 font-normal">Model</th>
            <th className="py-2 pr-2 text-right font-normal">Latency</th>
            <th className="hidden py-2 text-right font-normal sm:table-cell">Tok</th>
            <th className="py-2 pr-4 text-right font-normal">$</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={`${t.at}-${i}`} className={cn("border-b border-line/50 last:border-0", !t.ok && "text-stop")}>
              <td className="py-1.5 pl-4 text-foreground/80">{t.stage}</td>
              <td className={cn("py-1.5", modelTone(t.model))}>{t.model === "tavily" ? "Tavily" : shortName(t.model)}</td>
              <td className="py-1.5 pr-2">
                <div className="flex items-center justify-end gap-2">
                  <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-line sm:block">
                    <span className={cn("block h-full rounded-full bg-current", modelTone(t.model))} style={{ width: `${(t.ms / maxMs) * 100}%` }} />
                  </span>
                  <span className="w-11 text-right">{fmtMs(t.ms)}</span>
                </div>
              </td>
              <td className="hidden py-1.5 text-right text-muted-foreground sm:table-cell">
                {t.model === "tavily" ? "–" : t.inTokens + t.outTokens}
              </td>
              <td className="py-1.5 pr-4 text-right text-foreground/80">{t.model === "tavily" ? "–" : fmtUsd(t.costUsd)}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center tracking-wide text-muted-foreground">
                <span className="hud-blink text-hud">▌</span> no calls yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t bg-white/[0.02] px-4 py-2.5 text-[11px] tracking-[0.1em] uppercase">
        <span className="text-muted-foreground">{calls} model calls · Token Factory</span>
        <span className="text-glow text-sm text-hud">{fmtUsd(totalUsd)}</span>
      </div>
    </div>
  );
}
