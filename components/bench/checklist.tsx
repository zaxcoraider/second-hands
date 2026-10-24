import { Check, Lock } from "lucide-react";
import type { Session } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function Checklist({ session }: { session: Session }) {
  return (
    <ol className="flex flex-col">
      {session.guide.steps.map((step, i) => {
        const status = session.stepStatus[step.id] ?? "todo";
        const active = status === "active";
        const done = status === "done";
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              "relative flex gap-3 py-2.5 pr-2 pl-3 transition-colors duration-150",
              active && "bg-surface-2",
            )}
          >
            {active && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] rounded-full bg-primary" />}
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                done && "border-ok bg-ok text-background",
                active && "border-primary text-primary",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm leading-snug", done && "text-muted-foreground", active && "font-medium")}>
                {step.title}
                {step.safety && (
                  <Lock aria-label="Safety step" className="ml-1.5 inline size-3 -translate-y-px text-muted-foreground" />
                )}
              </p>
              {active && <p className="mt-1 text-xs text-muted-foreground">{step.visualCheck}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
