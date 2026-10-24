import Link from "next/link";

export function PageStub({ title, phase }: { title: string; phase: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-3 px-4">
      <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{phase}</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        Back home
      </Link>
    </main>
  );
}
