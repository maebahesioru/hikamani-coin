"use client";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { SessionProvider } from "@/components/session-provider";

interface Item {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  recurring: boolean;
}

function CheckoutContent() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const itemSlug = params.get("item") || "";
  const callbackUrl = params.get("callback") || "";

  const [item, setItem] = useState<Item | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/shop").then(r => r.json()).then((items: Item[]) => {
      const found = items.find(i => i.slug === itemSlug);
      setItem(found || null);
    });
    if (status === "authenticated") {
      fetch("/api/wallet").then(r => r.json()).then(w => setBalance(Number(w.balance)));
    }
  }, [itemSlug, status]);

  const pay = async () => {
    if (!item || !callbackUrl) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemSlug: item.slug, callbackUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "決済に失敗しました");
      setLoading(false);
      return;
    }
    // Redirect back with token
    const url = new URL(callbackUrl);
    url.searchParams.set("hkm_token", data.token);
    url.searchParams.set("item", item.slug);
    router.push(url.toString());
  };

  if (!item) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-400">アイテムが見つかりません</p>
    </div>
  );

  const price = Number(item.price);
  const insufficient = balance !== null && balance < price;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0a0f" }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-yellow-400">HKM</span>
            <span className="text-gray-500">×</span>
            <span className="text-lg font-semibold text-white">{new URL(callbackUrl || "https://example.com").hostname}</span>
          </div>
          <p className="text-xs text-gray-500">ヒカマニコイン 決済</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {/* Item info */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{new URL(callbackUrl || "https://example.com").hostname}</p>
                <h2 className="text-lg font-bold text-white">{item.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                {item.recurring && <span className="text-xs text-yellow-400 mt-1 inline-block">月額</span>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">{price.toLocaleString()}</p>
                <p className="text-xs text-gray-400">HKM</p>
                <p className="text-xs text-gray-500 mt-0.5">≈ {(price / 100).toLocaleString()}円</p>
              </div>
            </div>
          </div>

          {/* Auth / Balance */}
          <div className="p-6">
            {status === "unauthenticated" ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">決済にはログインが必要です</p>
                <button
                  onClick={() => signIn("discord", { callbackUrl: window.location.href })}
                  className="w-full rounded-lg bg-[#5865F2] py-3 font-semibold text-white hover:bg-[#4752C4]"
                >
                  Discordでログイン
                </button>
              </div>
            ) : (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
                  {session?.user?.image && <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-400">残高: {balance !== null ? `${balance.toLocaleString()} HKM` : "読み込み中..."}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>{item.name}</span>
                    <span>{price.toLocaleString()} HKM</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2">
                    <span>合計</span>
                    <span>{price.toLocaleString()} HKM</span>
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
                    <p className="text-sm text-red-400 mb-3">残高が不足しています</p>
                    <a href="/dashboard" className="text-sm text-yellow-400 hover:underline">HKMを入手する →</a>
                  </div>
                ) : (
                  <button
                    onClick={pay}
                    disabled={loading || balance === null}
                    className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "処理中..." : `${price.toLocaleString()} HKM を支払う`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          ヒカマニコインは前払式支払手段に該当しない自家型ポイントです
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <SessionProvider>
      <Suspense>
        <CheckoutContent />
      </Suspense>
    </SessionProvider>
  );
}
