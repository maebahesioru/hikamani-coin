import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, ok } from "@/lib/api-utils";
import { NextRequest } from "next/server";

// POST: 各種申請（バグ報告・動画投稿・アンケート）
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { type, content, url } = await req.json() as {
    type: "BUG_REPORT" | "VIDEO_SUBMISSION" | "SURVEY";
    content: string;
    url?: string;
  };

  if (!content) return badRequest("内容を入力してください");

  // Save as a pending bonus claim (amount=0 until admin approves)
  const claim = await prisma.bonusClaim.create({
    data: {
      userId: user.id,
      type,
      amount: 0n, // pending
    },
  });

  // Notify admin via Discord webhook if configured
  const webhookUrl = process.env.DISCORD_ADMIN_WEBHOOK;
  if (webhookUrl) {
    const labels: Record<string, string> = {
      BUG_REPORT: "🐛 バグ報告",
      VIDEO_SUBMISSION: "🎬 動画投稿申請",
      SURVEY: "📋 アンケート回答",
    };
    const ranges: Record<string, string> = {
      BUG_REPORT: "500〜3,000 HKM",
      VIDEO_SUBMISSION: "200〜1,000 HKM",
      SURVEY: "50〜200 HKM",
    };
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: labels[type] || type,
          description: content,
          fields: [
            { name: "ユーザーID", value: user.id, inline: true },
            { name: "報酬目安", value: ranges[type] || "未定", inline: true },
            { name: "申請ID", value: claim.id, inline: true },
            ...(url ? [{ name: "URL", value: url, inline: false }] : []),
          ],
          color: 0xF59E0B,
          footer: { text: `承認: POST /api/admin/approve-claim { claimId: "${claim.id}", amount: 500 }` },
        }],
      }),
    }).catch(() => {});
  }

  return ok({ claimId: claim.id, message: "申請を受け付けました。審査後にHKMが付与されます。" });
}
