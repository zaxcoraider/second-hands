import { cn } from "@/lib/utils";

/** The Second Hands mark: the red status ring with a clock's second hand. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="96 96 320 320" aria-hidden className={cn("size-5", className)}>
      <path d="M271.7 106.8 A150 150 0 1 1 240.3 106.8" fill="none" stroke="var(--stop)" strokeWidth="44" />
      <line
        x1="256"
        y1="256"
        x2="256"
        y2="132"
        stroke="currentColor"
        strokeWidth="30"
        strokeLinecap="round"
        transform="rotate(48 256 256)"
      />
      <circle cx="256" cy="256" r="28" fill="currentColor" />
    </svg>
  );
}
