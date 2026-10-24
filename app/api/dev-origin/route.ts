import { NextResponse } from "next/server";
import { networkInterfaces } from "node:os";

/** Dev only: the LAN address the phone should open, since "localhost" in a QR code is useless. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ origin: null });
  const ip = Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === "IPv4" && !n.internal)?.address;
  const url = new URL(req.url);
  return NextResponse.json({ origin: ip ? `${url.protocol}//${ip}:${url.port || "3000"}` : null });
}
