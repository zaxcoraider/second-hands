import type { Metadata } from "next";
import { TryClient } from "./try-client";

export const metadata: Metadata = {
  title: "Sample run · Second Hands",
  description: "Watch Second Hands catch a repair mistake: the real pipeline on a recorded repair, no setup needed.",
};

export default function Page() {
  return <TryClient />;
}
