"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";

interface Stock {
  id: string;
  name: string;
  description: string | null;
  currentPrice: string;
  priceHistory: { price: string; createdAt: string }[];
  profile: { name: string; description: string; avatarUrl: string | null; followers: number; verified: boolean } | null;
}

interface BetMarket {
  id: string;
  question: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  stockName: string | null;
  stockPrice: string | null;
  profile: { name: string; avatarUrl: string | null; followers: number; verified: boolean; description: string } | null;
  endsAt: string;
  resolved: boolean;
  outcome: boolean | null;
  yesPool: string;
  noPool: string;
  yesOdds: number;
  noOdds: number;
  betCount: number;
}

function StocksContent() {
  const { status } = useSession();
  const [tab, setTab] = useState<"stocks" | "bets">("stocks");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const caching = useRef(false);
  const [markets, setMarkets] = useState<BetMarket[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [betSearch, setBetSearch] = useState("");
  const [betPage, setBetPage] = useState(1);
  const [betPages, setBetPages] = useState(1);

  const fetchBets = (p = betPage, q = betSearch) => {
    fetch(`/api/bets?page=${p}&q=${encodeURIComponent(q)}`).then(r => r.json()).then(d => {
      const list: BetMarket[] = d.markets ?? d;
      const active = list.filter(m => Number(m.yesPool) + Number(m.noPool) > 0);
      const zero = list.filter(m => Number(m.yesPool) + Number(m.noPool) === 0).sort(() => Math.random() - 0.5);
      setMarkets([...active, ...zero]);
      setBetPages(d.pages ?? 1);
      // Auto-cache missing profiles
      const uncached = list.filter(m => !m.profile && m.stockName).map(m => m.stockName!);
      if (uncached.length > 0) {
        fetch("/api/stocks/cache-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handles: uncached }) })
          .then(() => setTimeout(() => fetchBets(p, q), 3000)).catch(() => {});
      }
    });
  };
  const [priceFlash, setPriceFlash] = useState<Record<string, "up" | "down">>({});

  const fetchStocks = async (q = search, p = page) => {
    const res = await fetch(`/api/stocks?q=${encodeURIComponent(q)}&page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setStocks(data.stocks ?? []);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? 0);
      // Auto-cache profiles for displayed stocks
      const uncached = (data.stocks ?? []).filter((s: Stock) => !s.profile).map((s: Stock) => s.name);
      if (uncached.length > 0 && !caching.current) {
        caching.current = true;
        fetch("/api/stocks/cache-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handles: uncached }),
        }).then(r => r.json()).then(() => {
          setTimeout(() => { caching.current = false; fetchStocks(q, p); }, 3000);
        }).catch(() => { caching.current = false; });
      }
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
    fetchStocks();
    fetchBets();

    // SSE for real-time price updates
    const es = new EventSource("/api/stocks/stream");
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "update") {
        setStocks((prev) => prev.map((s) => {
          const updated = msg.stocks.find((u: { id: string; currentPrice: string }) => u.id === s.id);
          if (updated) {
            const dir = BigInt(updated.currentPrice) > BigInt(s.currentPrice) ? "up" : "down";
            setPriceFlash((f) => ({ ...f, [s.id]: dir }));
            setTimeout(() => setPriceFlash((f) => { const n = { ...f }; delete n[s.id]; return n; }), 1500);
            return { ...s, currentPrice: updated.currentPrice };
          }
          return s;
        }));
      }
    };
    return () => es.close();
  }, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStocks(search, 1);
  };

  const seedAll = async () => {
    setSeeding(true);
    const res = await fetch("/api/stocks/seed", { method: "POST" });
    const data = await res.json();
    setMsg(`${data.total}件の銘柄を登録しました`);
    setSeeding(false);
    fetchStocks("", 1);
  };

  const trade = async (stockId: string, action: string) => {
    setMsg("");
    const res = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockId, quantity: parseInt(qty[stockId] || "1"), action }),
    });
    const data = await res.json();
    setMsg(data.message || data.error || "エラー");
    fetch("/api/stocks").then((r) => r.json()).then((d) => setStocks(d.stocks ?? []));
  };

  const placeBet = async (marketId: string, side: boolean) => {
    setMsg("");
    const amount = betAmounts[marketId] || "100";
    const res = await fetch("/api/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, side, amount }),
    });
    const data = await res.json();
    setMsg(data.message || data.error || "エラー");
    fetchBets();
  };

  const yesPercent = (m: BetMarket) => {
    const total = Number(m.yesPool) + Number(m.noPool);
    return total > 0 ? Math.round((Number(m.yesPool) / total) * 100) : 50;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">ヒカマーズ株</h1>
      <p className="mb-2 text-sm text-[var(--text-dim)]">ツイートの勢い・名前変更・アイコン変更で株価が変動＆賭けができる</p>
      <div className="mb-6 rounded border border-[var(--border)] bg-[var(--card)] p-4 text-xs text-[var(--text-dim)] space-y-3">
        <div>
          <p className="font-bold text-[var(--text)] mb-1">📈 株取引</p>
          <p>HKMで株を買い、株価が上がったら売って差益を得る。手数料1%（手数料割引アイテムで0.5%）。空売りは10,000 HKMでアンロック。</p>
        </div>
        <div>
          <p className="font-bold text-[var(--text)] mb-1">⚡ 株価変動トリガー（5分ごとに自動更新）</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
            {[
              ["名前変更", "+8%"],["アイコン変更", "+5%"],["bio変更", "+2%"],
              ["フォロワー+1%以上", "+30%"],["フォロワー-1%以上", "-30%"],
              ["認証取得", "+20%"],["認証剥奪", "-15%"],
              ["凍結", "-50%"],["復活", "+30%"],["鍵垢", "-10%"],
              ["鍵解除", "+5%"],["URL追加", "+3%"],["ツイート急増", "+10%"],
            ].map(([k,v]) => (
              <span key={k} className={`${v.startsWith("+") ? "text-green-400" : "text-red-400"}`}>{v} {k}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-bold text-[var(--text)] mb-1">🎯 賭けマーケット（Polymarket方式）</p>
          <p>YES/NOに賭けてHKMを賭ける。締切後に管理者が結果を確定すると、勝った側が全プールを賭け額比率で山分け。最低10 HKMから参加可能。</p>
        </div>
        <div>
          <p className="font-bold text-[var(--text)] mb-1">📊 データソース</p>
          <p>Yahoo Realtime API（ツイート数・いいね・RT・フォロワー）＋ FXTwitter API（プロフィール変更検知）を5分ごとに取得。</p>
        </div>
      </div>

      {msg && <p className="mb-4 rounded bg-[var(--card)] border border-[var(--border)] p-3 text-sm">{msg}</p>}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("stocks")}
          className={`rounded px-4 py-2 text-sm font-semibold ${tab === "stocks" ? "bg-[var(--accent)] text-black" : "bg-[var(--card)] text-[var(--text-dim)]"}`}
        >
          株取引
        </button>
        <button
          onClick={() => setTab("bets")}
          className={`rounded px-4 py-2 text-sm font-semibold ${tab === "bets" ? "bg-[var(--accent)] text-black" : "bg-[var(--card)] text-[var(--text-dim)]"}`}
        >
          賭けマーケット
        </button>
      </div>

      {/* Stocks tab */}
      {tab === "stocks" && (
        <div>
          <div className="mb-4 flex gap-2">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ユーザー名で検索..."
                className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">検索</button>
            </form>
          </div>
          <p className="mb-3 text-xs text-[var(--text-dim)]">{total}件中 {stocks.length}件表示</p>
          <div className="grid gap-4">
          {stocks.map((stock) => (
            <div key={stock.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {stock.profile?.avatarUrl && (
                    <img src={stock.profile.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                  )}
                  <div>
                    <h3 className="font-bold">
                      {stock.profile?.name || stock.name}
                      {stock.profile?.verified && <span className="ml-1 text-[#1DA1F2] text-xs">✓</span>}
                    </h3>
                    <p className="text-xs text-[var(--text-dim)]">@{stock.name}{stock.profile?.followers != null ? ` · ${stock.profile.followers.toLocaleString()}フォロワー` : ""}</p>
                    {stock.profile?.description && (
                      <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-2 max-w-xs">{stock.profile.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold transition-colors duration-500 ${priceFlash[stock.id] === "up" ? "text-green-400" : priceFlash[stock.id] === "down" ? "text-red-400" : "text-[var(--accent)]"}`}>
                    {Number(stock.currentPrice).toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--text-dim)]">HKM / 株</p>
                </div>
              </div>
              {stock.priceHistory.length > 1 && (
                <div className="mb-4 flex h-16 items-end gap-0.5">
                  {stock.priceHistory.slice().reverse().map((p, i) => {
                    const prices = stock.priceHistory.map((h) => Number(h.price));
                    const max = Math.max(...prices);
                    const min = Math.min(...prices);
                    const range = max - min || 1;
                    const height = ((Number(p.price) - min) / range) * 100;
                    const isUp = i > 0 && Number(p.price) >= Number(stock.priceHistory.slice().reverse()[i - 1]?.price || 0);
                    return <div key={i} className={`flex-1 rounded-t ${isUp ? "bg-green-500" : "bg-red-500"}`} style={{ height: `${Math.max(height, 5)}%` }} />;
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
                <button onClick={() => trade(stock.id, "BUY")} className="rounded bg-green-600 px-4 py-1 text-sm font-semibold text-white">買い</button>
                <button onClick={() => trade(stock.id, "SELL")} className="rounded bg-red-600 px-4 py-1 text-sm font-semibold text-white">売り</button>
                <button onClick={() => trade(stock.id, "SHORT_SELL")} className="rounded border border-red-600 px-4 py-1 text-sm text-red-400">空売り</button>
              </div>
            </div>
          ))}
          {stocks.length === 0 && <p className="text-[var(--text-dim)]">銘柄はまだ登録されていません</p>}
          </div>
          {pages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => { const p = Math.max(1, page-1); setPage(p); fetchStocks(search, p); }} disabled={page === 1} className="rounded border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-30">←</button>
              <span className="px-3 py-1 text-sm">{page} / {pages}</span>
              <button onClick={() => { const p = Math.min(pages, page+1); setPage(p); fetchStocks(search, p); }} disabled={page === pages} className="rounded border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-30">→</button>
            </div>
          )}
        </div>
      )}

      {/* Bets tab - Polymarket style */}
      {tab === "bets" && (
        <div>
          <div className="mb-4 flex gap-2">
            <input value={betSearch} onChange={e => setBetSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setBetPage(1); fetchBets(1, betSearch); } }}
              placeholder="ユーザー名で検索..."
              className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            <button onClick={() => { setBetPage(1); fetchBets(1, betSearch); }}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">検索</button>
          </div>
          <div className="grid gap-4">
          {markets.map((m) => (
            <div key={m.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              {/* Header: profile + category */}
              <div className="mb-3 flex items-start gap-3">
                {m.profile?.avatarUrl && (
                  <img src={m.profile.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {m.profile?.name && (
                      <span className="font-bold text-sm">
                        {m.profile.name}
                        {m.profile.verified && <span className="ml-1 text-[#1DA1F2] text-xs">✓</span>}
                      </span>
                    )}
                    {m.stockName && <span className="text-xs text-[var(--text-dim)]">@{m.stockName}</span>}
                    {m.profile?.followers != null && (
                      <span className="text-xs text-[var(--text-dim)]">{m.profile.followers.toLocaleString()}フォロワー</span>
                    )}
                    <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-black">{m.categoryLabel}</span>
                    {m.stockPrice && (
                      <span className="text-xs text-[var(--text-dim)]">株価: {Number(m.stockPrice).toLocaleString()} HKM</span>
                    )}
                  </div>
                  {m.profile?.description && (
                    <p className="text-xs text-[var(--text-dim)] line-clamp-1">{m.profile.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[var(--text-dim)]">
                  {new Date(m.endsAt).toLocaleDateString("ja-JP")} まで
                </span>
              </div>

              <h3 className="mb-3 text-base font-bold">{m.profile?.name && m.stockName ? m.question.replace(m.stockName, m.profile.name) : m.question}</h3>
              {m.description && <p className="mb-3 text-xs text-[var(--text-dim)]">{m.description}</p>}

              {/* Odds bar */}
              <div className="mb-3 overflow-hidden rounded-full bg-[var(--border)] h-8 flex">
                <div
                  className="flex items-center justify-center bg-green-600 text-xs font-bold text-white transition-all"
                  style={{ width: `${yesPercent(m)}%` }}
                >
                  YES {yesPercent(m)}%
                </div>
                <div
                  className="flex items-center justify-center bg-red-600 text-xs font-bold text-white transition-all"
                  style={{ width: `${100 - yesPercent(m)}%` }}
                >
                  NO {100 - yesPercent(m)}%
                </div>
              </div>

              <div className="mb-3 flex gap-4 text-xs text-[var(--text-dim)]">
                <span>プール: {(Number(m.yesPool) + Number(m.noPool)).toLocaleString()} HKM</span>
                <span>参加者: {m.betCount}人</span>
                <span>YESオッズ: x{m.yesOdds.toFixed(2)}</span>
                <span>NOオッズ: x{m.noOdds.toFixed(2)}</span>
              </div>

              {!m.resolved ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="10"
                    placeholder="HKM"
                    value={betAmounts[m.id] || ""}
                    onChange={(e) => setBetAmounts({ ...betAmounts, [m.id]: e.target.value })}
                    className="w-24 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                  />
                  <button onClick={() => placeBet(m.id, true)} className="rounded bg-green-600 px-6 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                    YES
                  </button>
                  <button onClick={() => placeBet(m.id, false)} className="rounded bg-red-600 px-6 py-1.5 text-sm font-semibold text-white hover:bg-red-700">
                    NO
                  </button>
                </div>
              ) : (
                <div className={`rounded px-4 py-2 text-sm font-bold ${m.outcome ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                  結果: {m.outcome ? "YES" : "NO"} が勝利
                </div>
              )}
            </div>
          ))}
          {markets.length === 0 && <p className="text-[var(--text-dim)]">賭けマーケットはまだありません</p>}
          {betPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={betPage <= 1} onClick={() => { const p = betPage - 1; setBetPage(p); fetchBets(p); }}
                className="rounded bg-[var(--card)] px-3 py-1 text-sm disabled:opacity-30">← 前</button>
              <span className="text-sm text-[var(--text-dim)]">{betPage} / {betPages}</span>
              <button disabled={betPage >= betPages} onClick={() => { const p = betPage + 1; setBetPage(p); fetchBets(p); }}
                className="rounded bg-[var(--card)] px-3 py-1 text-sm disabled:opacity-30">次 →</button>
            </div>
          )}
          </div>
        </div>
      )}
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
