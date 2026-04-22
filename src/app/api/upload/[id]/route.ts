import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

// GET /api/upload/[id] - Redisから画像を返す
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await redis.get(`img:${id}`);
    if (!data) return new NextResponse("Not found", { status: 404 });

    const [header, base64] = data.split(",");
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] || "image/png";
    const buffer = Buffer.from(base64, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
