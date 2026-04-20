import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

export default function Home() {
  return (
    <SessionProvider>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="mb-4 text-5xl font-bold text-[var(--accent)]">ヒカマニコイン</h1>
        <p className="mb-2 text-lg text-[var(--text-dim)]">ヒカマニ界隈の公式サイト内ポイント</p>
        <p className="mb-8 text-sm text-[var(--text-dim)]">1円 = 100 HKM</p>

        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-3xl font-bold text-[var(--accent)]">500</p>
            <p className="text-sm text-[var(--text-dim)]">初回登録ボーナス</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-3xl font-bold text-[var(--accent)]">100</p>
            <p className="text-sm text-[var(--text-dim)]">デイリーログイン</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-3xl font-bold text-[var(--accent)]">LTC</p>
            <p className="text-sm text-[var(--text-dim)]">ライトコインで入金</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-[var(--accent)] px-8 py-3 font-semibold text-black hover:bg-[var(--accent-dim)]"
        >
          はじめる
        </Link>

        <section className="mt-16 text-left">
          <h2 className="mb-4 text-2xl font-bold">使いみち</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "24時間全サイト広告 (2,000 HKM)",
              "TwiGachaカードパック (500 HKM)",
              "ヒカマーズ株で賭け",
              "各種Proプラン契約",
              "ポータルサイトスポンサー掲載",
              "Discord VIPチャンネル解放",
            ].map((item) => (
              <div key={item} className="rounded border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 text-xs text-[var(--text-dim)]">
          <p>※ ヒカマニコインは前払式支払手段に該当しない自家型ポイントです。</p>
          <p>出金・換金はできません。</p>
        </footer>
      </main>
    </SessionProvider>
  );
}
