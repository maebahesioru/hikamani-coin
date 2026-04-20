"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";

interface Stock {
  id: string;
  name: string;
  description: string | null;
  currentPrice: string;
  priceHistory: { price: string; createdAt: string }[];
}

function StocksContent() {
  const { status } = useSession();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
    fetch("/api/stocks").then((r) => r.json()).then(setStocks);
  }, [status]);

  const trade = async (stockId: string, action: string) => {
    setMsg("");
    const res = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockId, quantity: parseInt(qty[stockId] || "1"), action }),
    });
    const data = await res.json();
    setMsg(data.message || data.error || "エラー");
    fetch("/api/stocks").then((r) => r.json()).then(setStocks);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">ヒカマーズ株</h1>
      <p className="mb-4 text-sm text-[var(--text-dim)]">
        ツイートの勢い、名前・プロフ・アイコン変更などで株価が変動します
      </p>
      {msg && <p className="mb-4 rounded bg-[var(--card)] p-3 text-sm">{msg}</p>}
      <div className="grid gap-4">
        {stocks.map((stock) => (
          <div key={stock.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{stock.name}</h3>
                {stock.description && <p className="text-xs text-[var(--text-dim)]">{stock.description}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--accent)]">{Number(stock.currentPrice).toLocaleString()}</p>
                <p className="text-xs text-[var(--text-dim)]">HKM / 株</p>
              </div>
            </div>
            {/* Mini price chart */}
            {stock.priceHistory.length > 1 && (
              <div className="mb-4 flex h-12 items-end gap-0.5">
                {stock.priceHistory.slice().reverse().map((p, i) => {
                  const prices = stock.priceHistory.map((h) => Number(h.price));
                  const max = Math.max(...prices);
                  const min = Math.min(...prices);
                  const range = max - min || 1;
                  const height = ((Number(p.price) - min) / range) * 100;
                  return <div key={i} className="flex-1 rounded-t bg-[var(--accent)]" style={{ height: `${Math.max(height, 5)}%` }} />;
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={qty[stock.id] || "1"}
                onChange={(e) => setQty({ ...qty, [stock.id]: e.target.value })}
                className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
              />
              <button onClick={() => trade(stock.id, "BUY")} className="rounded bg-green-600 px-4 py-1 text-sm font-semibold text-white">
                買い
              </button>
              <button onClick={() => trade(stock.id, "SELL")} className="rounded bg-red-600 px-4 py-1 text-sm font-semibold text-white">
                売り
              </button>
              <button onClick={() => trade(stock.id, "SHORT_SELL")} className="rounded border border-red-600 px-4 py-1 text-sm text-red-400">
                空売り
              </button>
            </div>
          </div>
        ))}
        {stocks.length === 0 && <p className="text-[var(--text-dim)]">銘柄はまだ登録されていません</p>}
      </div>
    </div>
  );
}

export default function StocksPage() {
  return (
    <SessionProvider>
      <Navbar />
      <StocksContent />
    </SessionProvider>
  );
}
