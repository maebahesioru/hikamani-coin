"use client";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { SessionProvider } from "@/components/session-provider";
import { showToast } from "@/components/toaster";

const SITES = [
  "全サイト",
];

function AdHideContent() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const itemSlug = params.get("item") || "ad-hide-30d";

  const [balance, setBalance] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState("全サイト");
  const [sites, setSites] = useState<string[]>(["全サイト"]);
  const [loading, setLoading] = useState(false);

  const is30d = itemSlug === "ad-hide-30d";
  const price = is30d ? 1500 : 15000;
  const label = is30d ? "広告30日非表示" : "広告永久非表示";

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/wallet").then(r => r.json()).then(w => setBalance(Number(w.balance)));
    }
    fetch("/api/sites").then(r => r.json()).then((data: { name: string; url: string }[]) => {
      setSites(["全サイト", ...data.map(s => s.url)]);
    });
  }, [status]);

  const buy = async () => {
    setLoading(true);
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemSlug }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`${label}を購入しました！（${selectedSite}）`);
      setTimeout(() => window.location.href = "/dashboard", 2000);
    } else {
      showToast(data.error || "購入に失敗しました", "error");
    }
    setLoading(false);
  };

  const insufficient = balance !== null && balance < price;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0a0f" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-yellow-400">🚫 {label}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">{label}</h2>
                <p className="text-sm text-gray-400">{is30d ? "30日間" : "永久に"}HKM広告を非表示</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">{price.toLocaleString()}</p>
                <p className="text-xs text-gray-400">HKM</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {status === "unauthenticated" ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">ログインが必要です</p>
                <button onClick={() => signIn("discord", { callbackUrl: window.location.href })}
                  className="w-full rounded-lg bg-[#5865F2] py-3 font-semibold text-white">Discordでログイン</button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-white mb-2 block">非表示にするサイト</label>
                  <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
                    {sites.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
                  {session?.user?.image && <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" />}
                  <div>
                    <p className="text-sm font-semibold text-white">{session?.user?.name}</p>
                    <p className="text-xs text-gray-400">残高: {balance !== null ? `${balance.toLocaleString()} HKM` : "..."}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4 text-sm border-t border-white/10 pt-3">
                  <div className="flex justify-between text-gray-400"><span>対象</span><span>{selectedSite}</span></div>
                  <div className="flex justify-between font-bold text-white"><span>合計</span><span>{price.toLocaleString()} HKM</span></div>
                </div>
                {insufficient ? (
                  <div className="text-center">
                    <p className="text-sm text-red-400 mb-2">残高が不足しています</p>
                    <a href="/dashboard" className="text-sm text-yellow-400 hover:underline">HKMを入手する →</a>
                  </div>
                ) : (
                  <button onClick={buy} disabled={loading || balance === null}
                    className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-50">
                    {loading ? "処理中..." : `${price.toLocaleString()} HKM を支払う`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdHidePage() {
  return (
    <SessionProvider>
      <Suspense>
        <AdHideContent />
      </Suspense>
    </SessionProvider>
  );
}
