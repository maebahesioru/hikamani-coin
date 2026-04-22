import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

const USES = [
  { icon: "📢", label: "広告掲載", desc: "全サイトに24時間広告", price: "2,000 HKM" },
  { icon: "🎴", label: "TwiGacha", desc: "カードパック購入", price: "500 HKM" },
  { icon: "📈", label: "ヒカマーズ株", desc: "株取引・賭けマーケット", price: "自由" },
  { icon: "⭐", label: "Proプラン", desc: "各サービスのPro機能", price: "各種" },
  { icon: "🏆", label: "スポンサー", desc: "ポータルサイト掲載", price: "5,000 HKM" },
  { icon: "👑", label: "Discord VIP", desc: "VIPチャンネル解放", price: "3,000 HKM" },
];

export default function Home() {
  return (
    <SessionProvider>
      <Navbar />
      <main className="relative overflow-hidden">
        {/* Hero */}
        <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[500px] w-[500px] rounded-full bg-yellow-400/5 blur-[120px]" />
          </div>

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-4 py-1.5 text-xs text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
              ヒカマニ界隈公式ポイント
            </div>

            <h1 className="mb-4 text-6xl font-black tracking-tight sm:text-7xl">
              <span className="text-yellow-400">HKM</span>
            </h1>
            <p className="mb-2 text-2xl font-bold text-white sm:text-3xl">ヒカマニコイン</p>
            <p className="mb-8 text-sm text-gray-400">1円 = 100 HKM のステーブルポイント</p>

            <div className="mb-10 flex flex-wrap justify-center gap-3">
              {[
                { label: "登録ボーナス", value: "500 HKM", icon: "🎁" },
                { label: "デイリーログイン", value: "100 HKM", icon: "📅" },
                { label: "LTC入金対応", value: "即時反映", icon: "⚡" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                  <span className="text-lg">{s.icon}</span>
                  <div className="text-left">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-sm font-bold text-yellow-400">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard"
                className="rounded-xl bg-yellow-400 px-8 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 hover:scale-105">
                はじめる →
              </Link>
              <Link href="/shop"
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                ショップを見る
              </Link>
            </div>
          </div>
        </section>

        {/* Uses */}
        <section className="mx-auto max-w-4xl px-4 pb-20">
          <h2 className="mb-2 text-center text-2xl font-bold">使いみち</h2>
          <p className="mb-8 text-center text-sm text-gray-400">HKMで様々なサービスを利用できます</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {USES.map((u) => (
              <div key={u.label} className="group rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-yellow-400/30 hover:bg-yellow-400/5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{u.icon}</span>
                  <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-semibold text-yellow-400">{u.price}</span>
                </div>
                <p className="font-bold text-white">{u.label}</p>
                <p className="mt-0.5 text-xs text-gray-400">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legal */}
        <div className="border-t border-white/5 py-6 text-center text-xs text-gray-600">
          ※ ヒカマニコインは前払式支払手段に該当しない自家型ポイントです。出金・換金はできません。
        </div>
      </main>
    </SessionProvider>
  );
}
