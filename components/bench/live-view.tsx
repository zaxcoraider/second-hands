import { VideoOff } from "lucide-react";
import { STATE, type AiState } from "@/lib/ui-state";
import { cn } from "@/lib/utils";

/** The latest frame inside a thin ring in the AI state color. `children` replaces the image (e.g. a video). */
export function LiveView({
  frame,
  state,
  stale,
  children,
}: {
  frame: string | null;
  state: AiState;
  stale?: boolean;
  children?: React.ReactNode;
}) {
  const meta = STATE[state];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border-[3px] bg-black transition-colors duration-200", meta.border)}>
      <div className="aspect-[4/3] w-full">
        {children ??
          (frame ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frame} alt="Latest frame from the phone camera" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-sm text-white/60">
              <VideoOff className="size-6" strokeWidth={1.5} />
              Waiting for the phone camera
            </div>
          ))}
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
        <meta.icon className={cn("size-3.5", meta.text)} strokeWidth={2} />
        {stale ? "Phone idle" : meta.label}
      </div>
    </div>
  );
}
