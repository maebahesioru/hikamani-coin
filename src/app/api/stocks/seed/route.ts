import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST() {
  const user = await getAuthUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) return unauthorized();
  const txt = readFileSync(join(process.cwd(), "public", "handle.txt"), "utf-8");
  const handles = txt.split("\n").map((l) => l.trim()).filter(Boolean);

  let created = 0;
  // Batch upsert in chunks of 50
  for (let i = 0; i < handles.length; i += 50) {
    const batch = handles.slice(i, i + 50);
    await Promise.all(
      batch.map((name) =>
        prisma.stock.upsert({
          where: { name },
          update: {},
          create: { name, currentPrice: 1000n },
        })
      )
    );
    created += batch.length;
  }

  return ok({ total: handles.length, created });
}
