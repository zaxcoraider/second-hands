import type { Metadata } from "next";
import { BenchClient } from "./bench-client";

export const metadata: Metadata = { title: "Bench · Second Hands" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BenchClient id={id.toLowerCase()} />;
}
