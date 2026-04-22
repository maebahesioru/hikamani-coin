import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

// GET: 自分のAPIキー一覧
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, key: true, active: true, createdAt: true, lastUsedAt: true, allowedOrigins: true },
  });
  return ok(keys);
}

// POST: APIキー発行
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { name, allowedOrigins } = await req.json() as { name: string; allowedOrigins?: string[] };
  if (!name) return badRequest("名前が必要です");

  const key = `hkm_${randomBytes(24).toString("hex")}`;
  const apiKey = await prisma.apiKey.create({
    data: { userId: user.id, name, key, allowedOrigins: allowedOrigins || [] },
  });
  return ok({ id: apiKey.id, name: apiKey.name, key: apiKey.key });
}

// DELETE: APIキー削除
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await req.json() as { id: string };
  const apiKey = await prisma.apiKey.findUnique({ where: { id } });
  if (!apiKey || apiKey.userId !== user.id) return badRequest("APIキーが見つかりません");

  await prisma.apiKey.update({ where: { id }, data: { active: false } });
  return ok({ message: "削除しました" });
}
