"use client";
import { useEffect, useState } from "react";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";

type Entry = { rank: number; name: string; avatar: string | null; amount: string };
type Data = { balance: Entry[]; stock: Entry[]; bet: Entry[] };

const TABS = [
  { key: "balance", label: "💰 HKM残高", unit: "HKM" },
  { key: "stock", label: "📈 株時価総額", unit: "HKM" },
  { key: "bet", label: "🎯 賭け獲得", unit: "HKM" },
] as const;

function RankingContent() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"balance" | "stock" | "bet">("balance");

  useEffect(() => { fetch("/api/ranking").then(r => r.json()).then(setData); }, []);

  const list = data?.[tab] ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">ランキング</h1>
      <div className="mb-6 flex gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t.key ? "bg-[var(--accent)] text-black" : "bg-[var(--card)] text-[var(--text-dim)] hover:bg-[var(--border)]"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {list.length === 0 ? (
          <p className="p-6 text-center text-[var(--text-dim)]">{data ? "データがありません" : "読み込み中..."}</p>
        ) : list.map((e, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
            <span className={`w-8 text-center text-lg font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-[var(--text-dim)]"}`}>
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : e.rank}
            </span>
            {e.avatar ? <img src={e.avatar} alt="" className="h-8 w-8 rounded-full" /> : <div className="h-8 w-8 rounded-full bg-[var(--border)]" />}
            <span className="flex-1 font-semibold truncate">{e.name}</span>
            <span className="font-mono text-sm text-[var(--accent)]">{Number(e.amount).toLocaleString()} {TABS.find(t => t.key === tab)?.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RankingPage() {
  return (
    <SessionProvider>
      <Navbar />
      <RankingContent />
    </SessionProvider>
  );
}
