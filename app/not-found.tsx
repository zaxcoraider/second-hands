import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="hud-grid flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-24 sm:px-6">
        <p className="hud-label text-stop">Error 404</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Nothing in frame.</h1>
        <p className="text-muted-foreground">This page doesn&apos;t exist, or the session it pointed to has expired.</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link href="/start" className={cn(buttonVariants(), "glow-hud h-11 px-5 font-display font-semibold")}>
            Start a task
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link href="/try" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}>
            Run the sample
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
