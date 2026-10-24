import { fail } from "@/lib/api";
import { store } from "@/lib/store";

/** Serves an evidence thumbnail as a JPEG. */
export async function GET(_req: Request, { params }: { params: Promise<{ frameId: string }> }) {
  const { frameId } = await params;
  const dataUrl = await store.getThumb(frameId);
  if (!dataUrl) return fail(404, "Thumbnail expired.");
  const bytes = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
  return new Response(bytes, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, immutable" },
  });
}
