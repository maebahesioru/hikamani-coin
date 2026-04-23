import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE = process.env.MAINTENANCE_MODE === "true";
const ADMIN_IPS = (process.env.MAINTENANCE_ALLOW_IPS || "").split(",").map(s => s.trim()).filter(Boolean);

export function middleware(req: NextRequest) {
  if (!MAINTENANCE) return NextResponse.next();

  // APIとad.jsは通す
  if (req.nextUrl.pathname.startsWith("/api/") || req.nextUrl.pathname === "/ad.js") return NextResponse.next();

  // 許可IPは通す
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  if (ADMIN_IPS.length > 0 && ADMIN_IPS.some(allowed => ip.includes(allowed))) return NextResponse.next();

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>メンテナンス中 - ヒカマニコイン</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#fff;font-family:sans-serif}
.c{text-align:center;padding:2rem}.t{font-size:3rem;margin-bottom:.5rem}.s{color:#94a3b8;font-size:.9rem}</style></head>
<body><div class="c"><div class="t">🔧</div><h1>メンテナンス中</h1><p class="s">現在メンテナンス中です。しばらくお待ちください。</p></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "3600" } }
  );
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
