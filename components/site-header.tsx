"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/#models", label: "Models" },
  { href: "/try", label: "Sample run" },
];

/** Site-wide header: logo, section links, primary CTA; a full-width menu on phones. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Second Hands home">
          <LogoMark className="size-6" />
          <span className="font-mono text-xs tracking-[0.22em] uppercase">Second Hands</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => {
            const active = n.href === pathname;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-[4px] px-3 py-2 text-sm transition-colors",
                  active ? "text-hud" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/start"
            className={cn(buttonVariants(), "glow-hud hidden h-9 px-4 font-display font-semibold sm:inline-flex")}
          >
            Start a task
            <ArrowRight data-icon="inline-end" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-[4px] border border-line text-foreground md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="border-t border-line bg-background/95 px-4 pt-2 pb-5 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col">
            {NAV.map((n, i) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-4 border-b border-line/60 py-4 text-lg"
                >
                  <span className="font-mono text-xs text-hud">0{i + 1}</span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/start"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants(), "glow-hud mt-5 h-12 w-full font-display text-base font-semibold")}
          >
            Start a task
            <ArrowRight data-icon="inline-end" />
          </Link>
        </nav>
      )}
    </header>
  );
}
