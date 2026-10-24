import { Check, Lock } from "lucide-react";
import type { Session } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function Checklist({ session }: { session: Session }) {
  return (
    <ol className="flex flex-col py-1">
      {session.guide.steps.map((step, i) => {
        const status = session.stepStatus[step.id] ?? "todo";
        const active = status === "active";
        const done = status === "done";
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              "relative flex gap-3 py-2.5 pr-3 pl-4 transition-colors duration-200",
              active && "bg-hud/[0.06]",
            )}
          >
            {active && <span aria-hidden className="absolute inset-y-1 left-0 w-[2px] bg-hud shadow-[0_0_10px_var(--hud)]" />}
            <span
              className={cn(
                "mt-px flex h-5 w-7 shrink-0 items-center font-mono text-xs tabular",
                done ? "text-ok" : active ? "text-hud" : "text-muted-foreground/60",
              )}
            >
              {done ? <Check className="size-4 drop-shadow-[0_0_6px_var(--ok)]" strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm leading-snug",
                  done && "text-muted-foreground line-through decoration-line",
                  active && "font-medium text-foreground",
                  !done && !active && "text-foreground/75",
                )}
              >
                {step.title}
                {step.safety && <Lock aria-label="Safety step" className="ml-1.5 inline size-3 -translate-y-px text-ask" />}
              </p>
              {active && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.visualCheck}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
