import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { birthday } = await req.json() as { birthday: string };
  if (!birthday) return badRequest("誕生日を入力してください");

  const date = new Date(birthday);
  if (isNaN(date.getTime())) return badRequest("無効な日付です");

  // Check if already set
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { birthday: true } });
  if (existing?.birthday) return badRequest("誕生日は一度設定したら変更できません");

  await prisma.user.update({ where: { id: user.id }, data: { birthday: date } });
  return ok({ message: "誕生日を登録しました。毎年誕生日に1,000 HKMが付与されます！" });
}
