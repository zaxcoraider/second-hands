import type { Metadata } from "next";
import { CamClient } from "./cam-client";

export const metadata: Metadata = { title: "Camera · Second Hands" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CamClient id={id.toLowerCase()} />;
}
