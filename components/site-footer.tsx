import Link from "next/link";
import { LogoMark } from "@/components/logo";

const REPO = "https://github.com/zaxcoraider/second-hands";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Start a task", href: "/start" },
      { label: "Sample run", href: "/try" },
      { label: "Connect a phone", href: "/cam" },
      { label: "How it works", href: "/#how" },
    ],
  },
  {
    title: "Built with",
    links: [
      { label: "NVIDIA Nemotron", href: "/#models" },
      { label: "Nebius Token Factory", href: "/#models" },
      { label: "Tavily", href: "/#how" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Source on GitHub", href: REPO, external: true },
      { label: "Report an issue", href: `${REPO}/issues`, external: true },
      { label: "MIT License", href: `${REPO}/blob/main/LICENSE`, external: true },
    ],
  },
];

/** Site-wide footer: brand, link columns, and the safety line. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-black/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="font-mono text-xs tracking-[0.22em] uppercase">Second Hands</span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            An AI that watches your hands while you repair, build or cook, and stops you before you ruin it.
          </p>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            <span className="hud-blink size-1.5 rounded-full bg-ok shadow-[0_0_6px_var(--ok)]" />
            Live demo · no sign-up
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="hud-label mb-4">{col.title}</h2>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-foreground/80 hover:text-hud">
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-foreground/80 hover:text-hud">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 Second Hands · Nebius × NVIDIA Global AI Hackathon</span>
          <span>Guidance only · you are responsible for your work · no mains or gas work</span>
        </div>
      </div>
    </footer>
  );
}
