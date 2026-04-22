import { getAuthUser, unauthorized } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "2MB以下にしてください" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "画像ファイルのみ" }, { status: 400 });

  const ext = file.name.split(".").pop() || "png";
  const name = `${randomBytes(16).toString("hex")}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, name), bytes);

  const url = `/uploads/${name}`;
  return NextResponse.json({ url });
}
