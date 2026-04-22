import { getAuthUser, unauthorized } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST: 画像アップロード → DBにBase64保存
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "2MB以下にしてください" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Validate by magic bytes (not client-provided MIME)
  const magic = bytes.slice(0, 4);
  const isJpeg = magic[0] === 0xFF && magic[1] === 0xD8;
  const isPng = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4E && magic[3] === 0x47;
  const isGif = magic[0] === 0x47 && magic[1] === 0x49 && magic[2] === 0x46;
  const isWebp = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46;
  if (!isJpeg && !isPng && !isGif && !isWebp) {
    return NextResponse.json({ error: "JPEG/PNG/GIF/WebPのみ対応しています" }, { status: 400 });
  }
  const mime = isJpeg ? "image/jpeg" : isPng ? "image/png" : isGif ? "image/gif" : "image/webp";
  const base64 = Buffer.from(bytes).toString("base64");
  const id = randomBytes(16).toString("hex");

  // Store in Ad table as a simple key-value (reuse description field won't work, use a dedicated approach)
  // Use Redis for simplicity
  const { redis } = await import("@/lib/redis");
  const key = `img:${id}`;
  try {
    await redis.setex(key, 30 * 24 * 3600, `data:${mime};base64,${base64}`); // 30 days
  } catch {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  const url = `/api/upload/${id}`;
  return NextResponse.json({ url });
}
