import { shortName } from "@/lib/ai/models";
import type { TraceEntry } from "@/lib/schemas";
import { fmtMs, fmtUsd } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/** Every model and search call: stage, model, latency, tokens, cost. Newest first. */
export function TracePanel({ trace, totalUsd, limit = 14 }: { trace: TraceEntry[]; totalUsd: number; limit?: number }) {
  const rows = trace.slice(0, limit);
  const calls = trace.filter((t) => t.model !== "tavily").length;
  return (
    <div className="font-mono text-xs">
      <table className="w-full tabular">
        <thead className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
          <tr className="border-b">
            <th className="py-2 pl-4 font-normal">Stage</th>
            <th className="py-2 font-normal">Model</th>
            <th className="py-2 text-right font-normal">ms</th>
            <th className="hidden py-2 text-right font-normal sm:table-cell">tok</th>
            <th className="py-2 pr-4 text-right font-normal">$</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={`${t.at}-${i}`} className={cn("border-b border-border/60 last:border-0", !t.ok && "text-stop")}>
              <td className="py-1.5 pl-4">{t.stage}</td>
              <td className="py-1.5">{t.model === "tavily" ? "Tavily" : shortName(t.model)}</td>
              <td className="py-1.5 text-right">{fmtMs(t.ms)}</td>
              <td className="hidden py-1.5 text-right text-muted-foreground sm:table-cell">
                {t.model === "tavily" ? "–" : t.inTokens + t.outTokens}
              </td>
              <td className="py-1.5 pr-4 text-right">{t.model === "tavily" ? "–" : fmtUsd(t.costUsd)}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center font-sans text-sm text-muted-foreground">
                Model calls appear here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex justify-between border-t px-4 py-2 text-muted-foreground">
        <span>{calls} model calls</span>
        <span className="text-foreground">total {fmtUsd(totalUsd)}</span>
      </div>
    </div>
  );
}
