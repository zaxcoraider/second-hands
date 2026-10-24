import type { Metadata } from "next";
import { StartClient } from "./start-client";

export const metadata: Metadata = { title: "Start a repair · Second Hands" };

export default function Page() {
  return <StartClient />;
}
