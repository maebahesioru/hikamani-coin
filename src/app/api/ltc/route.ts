import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, ok } from "@/lib/api-utils";
import { getLtcJpyRate, ltcToHkm } from "@/lib/ltc";
import { NextRequest } from "next/server";

// GET: 入金アドレス生成 & レート取得
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const rate = await getLtcJpyRate();

  // Electrum-LTC RPC で新しいアドレスを取得
  let address = "ltc_address_placeholder";
  try {
    const rpcRes = await fetch(process.env.ELECTRUM_RPC_URL || "http://localhost:7777", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "createnewaddress", params: {} }),
    });
    const rpcData = await rpcRes.json();
    if (rpcData.result) address = rpcData.result;
  } catch {
    // Electrum not available - use placeholder
  }

  return ok({ address, ltcJpyRate: rate, hkmPerJpy: 100 });
}

// POST: 入金確認 (Electrum webhook - CRON_SECRET認証)
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json();
  const { txHash, address, ltcAmount } = body as {
    txHash: string;
    address: string;
    ltcAmount: string;
  };

  const existing = await prisma.ltcDeposit.findUnique({ where: { txHash } });
  if (existing) return ok({ status: "already_processed" });

  const deposit = await prisma.ltcDeposit.findFirst({
    where: { address, status: "PENDING" },
    include: { user: true },
  });
  if (!deposit) return ok({ status: "no_pending_deposit" });

  const rate = await getLtcJpyRate();
  const hkm = ltcToHkm(parseFloat(ltcAmount), rate);

  await prisma.$transaction(async (tx) => {
    await tx.ltcDeposit.update({
      where: { id: deposit.id },
      data: { txHash, ltcAmount, jpyRate: rate, hkmAmount: hkm, status: "CONFIRMED", confirmedAt: new Date() },
    });
    await tx.wallet.update({ where: { userId: deposit.userId }, data: { balance: { increment: hkm } } });
    await tx.transaction.create({
      data: { type: "LTC_DEPOSIT", amount: hkm, receiverId: deposit.userId, memo: `LTC入金 ${ltcAmount} LTC` },
    });
  });

  return ok({ status: "confirmed", hkmAmount: hkm.toString() });
}
