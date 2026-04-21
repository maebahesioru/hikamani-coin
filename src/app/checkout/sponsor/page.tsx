"use client";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { SessionProvider } from "@/components/session-provider";
import { showToast } from "@/components/toaster";

interface Item {
  id: string; slug: string; name: string; description: string; price: string; recurring: boolean;
}

const SPONSOR_SLUGS = ["sponsor-30d", "sponsor-forever", "sponsor-big-forever"];

function SponsorCheckoutContent() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const itemSlug = params.get("item") || "sponsor-30d";

  const [item, setItem] = useState<Item | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [step, setStep] = useState<"pay" | "profile">("pay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    fetch("/api/shop").then(r => r.json()).then((items: Item[]) => {
      setItem(items.find(i => i.slug === itemSlug) || null);
    });
    if (status === "authenticated") {
      fetch("/api/wallet").then(r => r.json()).then(w => setBalance(Number(w.balance)));
      fetch("/api/me").then(r => r.json()).then(u => {
        if (u.displayName) setDisplayName(u.displayName);
        if (u.avatar) setAvatarUrl(u.avatar);
      });
    }
  }, [itemSlug, status]);

  const pay = async () => {
    if (!item) return;
    setLoading(true); setError("");
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemSlug: item.slug }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "決済に失敗しました"); setLoading(false); return; }
    setStep("profile");
    setLoading(false);
  };

  const saveProfile = async () => {
    setLoading(true);
    const res = await fetch("/api/sponsors/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, avatarUrl, linkUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("スポンサー情報を保存しました！ポータルに反映されます。");
      setTimeout(() => window.location.href = "/dashboard", 2000);
    } else {
      setError(data.error || "保存に失敗しました");
    }
    setLoading(false);
  };

  if (!item || !SPONSOR_SLUGS.includes(itemSlug)) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-400">アイテムが見つかりません</p>
    </div>
  );

  const price = Number(item.price);
  const insufficient = balance !== null && balance < price;
  const isBig = itemSlug === "sponsor-big-forever";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0a0f" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-yellow-400">🏆 スポンサー申込</span>
          <p className="text-xs text-gray-500 mt-1">ヒカマニコイン × ポータルサイト</p>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 overflow-hidden">
          {step === "pay" ? (
            <>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{item.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    {isBig && <p className="text-xs text-yellow-400 mt-1">⭐ 大きく目立つ表示</p>}
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
                    <p className="text-sm text-gray-400 mb-4">決済にはログインが必要です</p>
                    <button onClick={() => signIn("discord", { callbackUrl: window.location.href })}
                      className="w-full rounded-lg bg-[#5865F2] py-3 font-semibold text-white">
                      Discordでログイン
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
                      {session?.user?.image && <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" />}
                      <div>
                        <p className="text-sm font-semibold text-white">{session?.user?.name}</p>
                        <p className="text-xs text-gray-400">残高: {balance !== null ? `${balance.toLocaleString()} HKM` : "..."}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4 text-sm border-t border-white/10 pt-3">
                      <div className="flex justify-between font-bold text-white">
                        <span>合計</span><span>{price.toLocaleString()} HKM</span>
                      </div>
                      {balance !== null && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>決済後残高</span>
                          <span className={insufficient ? "text-red-400" : ""}>{(balance - price).toLocaleString()} HKM</span>
                        </div>
                      )}
                    </div>
                    {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
                    {insufficient ? (
                      <div className="text-center">
                        <p className="text-sm text-red-400 mb-2">残高が不足しています</p>
                        <a href="/dashboard" className="text-sm text-yellow-400 hover:underline">HKMを入手する →</a>
                      </div>
                    ) : (
                      <button onClick={pay} disabled={loading || balance === null}
                        className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-50">
                        {loading ? "処理中..." : `${price.toLocaleString()} HKM を支払う`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-1">✅ 決済完了！</h3>
              <p className="text-sm text-gray-400 mb-5">ポータルに表示するスポンサー情報を入力してください</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">表示名 *</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="ポータルに表示される名前"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">アイコンURL（任意）</label>
                  <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
                  {avatarUrl && <img src={avatarUrl} alt="" className="mt-2 h-12 w-12 rounded-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">リンクURL（任意）</label>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button onClick={saveProfile} disabled={loading || !displayName}
                  className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-50">
                  {loading ? "保存中..." : "スポンサー情報を保存する"}
                </button>
                <button onClick={() => window.location.href = "/dashboard"}
                  className="w-full text-xs text-gray-500 hover:text-gray-300">
                  後で設定する
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SponsorCheckoutPage() {
  return (
    <SessionProvider>
      <Suspense>
        <SponsorCheckoutContent />
      </Suspense>
    </SessionProvider>
  );
}
