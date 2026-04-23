import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST() {
  const user = await getAuthUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) return unauthorized();

  // handle.txtを読み込み
  let handles: string[] = [];
  try {
    const txt = readFileSync(join(process.cwd(), "public", "handle.txt"), "utf-8");
    handles = txt.split("\n").map(l => l.trim()).filter(Boolean);
  } catch {
    return ok({ error: "handle.txt not found" });
  }

  let created = 0;
  for (const name of handles) {
    await prisma.stock.upsert({
      where: { name },
      update: {},
      create: { name, currentPrice: 1000n },
    });
    created++;
  }

  return ok({ seeded: created });
}
