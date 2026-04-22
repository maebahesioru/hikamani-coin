import { prisma } from "@/lib/prisma";
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
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "画像ファイルのみ" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");
  const id = randomBytes(16).toString("hex");

  // Store in Ad table as a simple key-value (reuse description field won't work, use a dedicated approach)
  // Use Redis for simplicity
  const { redis } = await import("@/lib/redis");
  const key = `img:${id}`;
  try {
    await redis.setex(key, 30 * 24 * 3600, `data:${file.type};base64,${base64}`); // 30 days
  } catch {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  const url = `/api/upload/${id}`;
  return NextResponse.json({ url });
}
