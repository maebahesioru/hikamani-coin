"use client";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";

function ApiKeySection() {
  const [keys, setKeys] = useState<{ id: string; name: string; key: string; active: boolean; lastUsedAt: string | null }[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  useEffect(() => { fetch("/api/apikeys").then(r => r.json()).then(setKeys); }, []);

  const create = async () => {
    if (!name) return;
    setLoading(true);
    const res = await fetch("/api/apikeys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (res.ok) { setKeys(k => [data, ...k]); setName(""); setRevealed(data.key); }
    setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/apikeys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setKeys(k => k.filter(x => x.id !== id));
  };

  return (
    <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="mb-1 text-lg font-bold">APIキー</h2>
      <p className="mb-4 text-xs text-[var(--text-dim)]">外部サービスからHKMを操作するためのAPIキー</p>
      <div className="mb-4 flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="キー名（例: TwiGacha）"
          className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <button onClick={create} disabled={loading || !name}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">発行</button>
      </div>
      {revealed && (
        <div className="mb-4 rounded border border-yellow-400/30 bg-yellow-400/5 p-3">
          <p className="text-xs text-yellow-400 mb-1">⚠️ このキーは一度しか表示されません。今すぐコピーしてください。</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all text-xs">{revealed}</code>
            <button onClick={() => { navigator.clipboard.writeText(revealed); setRevealed(null); }}
              className="shrink-0 rounded bg-yellow-400 px-2 py-1 text-xs font-bold text-black">コピーして閉じる</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {keys.filter(k => k.active).map(k => (
          <div key={k.id} className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2">
            <div>
              <p className="text-sm font-semibold">{k.name}</p>
              <p className="text-xs text-[var(--text-dim)]">hkm_••••••••{k.key.slice(-8)} · 最終使用: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("ja-JP") : "未使用"}</p>
            </div>
            <button onClick={() => remove(k.id)} className="text-xs text-red-400 hover:text-red-300">削除</button>
          </div>
        ))}
        {keys.filter(k => k.active).length === 0 && <p className="text-xs text-[var(--text-dim)]">APIキーはまだありません</p>}
      </div>
    </div>
  );
}

interface UserData {
  balance: string;
  streak: number;
  referralCode: string;
  displayName: string;
  avatar: string | null;
  linkedAccounts: string[];
  dailyClaimed: boolean;
  loginHistory: { date: string; streak: number; amount: string }[];
  birthday: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  memo: string | null;
  createdAt: string;
  senderId: string | null;
  receiverId: string | null;
}

const PROVIDERS = [
  { id: "discord", name: "Discord", bonus: 300, color: "bg-[#5865F2]" },
  { id: "google", name: "Google", bonus: 200, color: "bg-white !text-gray-800 border border-gray-300" },
  { id: "twitter", name: "X (Twitter)", bonus: 200, color: "bg-black" },
];

function LoginCalendar({ history }: { history: { date: string; streak: number; amount: string }[] }) {
  const loginSet = new Set(history.map((h) => h.date));
  const loginMap = new Map(history.map((h) => [h.date, h]));

  // Build last 30 days
  const days: { date: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    days.push({ date: iso, label: `${d.getMonth() + 1}/${d.getDate()}` });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {days.map(({ date, label }) => {
          const logged = loginSet.has(date);
          const info = loginMap.get(date);
          const isToday = date === new Date().toISOString().split("T")[0];
          return (
            <div
              key={date}
              title={logged ? `${label} ログイン済み (+${info?.amount} HKM, ${info?.streak}日連続)` : `${label} 未ログイン`}
              className={`relative flex h-9 w-9 flex-col items-center justify-center rounded text-xs font-bold transition-all
                ${logged ? "bg-[var(--accent)] text-black" : "bg-[var(--border)] text-[var(--text-dim)]"}
                ${isToday ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--card)]" : ""}
              `}
            >
              <span className="text-[10px] leading-none opacity-70">{label}</span>
              {logged && <span className="text-[9px] leading-none">✓</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-[var(--text-dim)]">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[var(--accent)]" />ログイン済み</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[var(--border)]" />未ログイン</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded ring-2 ring-[var(--accent)]" />今日</span>
      </div>
    </div>
  );
}

function ReferralForm({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setCode(ref);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/bonus/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setMsg(data.message || data.error || "エラー");
    if (res.ok) { setCode(""); onSuccess(); }
  };
  return (
    <div>
      <p className="mb-3 text-xs text-[var(--text-dim)]">
        招待してくれた人の紹介コードを入力すると双方にボーナスが付与されます（一度きり・登録後7日間限定）
      </p>
      <form onSubmit={submit} className="flex gap-3">
        <input
          placeholder="紹介コードを入力"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          required
        />
        <button type="submit" className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
          適用
        </button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [transferMsg, setTransferMsg] = useState("");

  const fetchData = useCallback(async () => {
    const [meRes, walletRes] = await Promise.all([fetch("/api/me"), fetch("/api/wallet")]);
    if (!meRes.ok) return;
    const meData = await meRes.json();
    setUser(meData);
    setDailyClaimed(meData.dailyClaimed);
    if (walletRes.ok) {
      const w = await walletRes.json();
      setTxs(w.transactions);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
      return;
    }
    if (status === "authenticated") {
      fetchData();
      // Save signed token for ad.js cross-site use
      fetch("/api/me/token").then(r => r.json()).then(d => {
        if (d.token) localStorage.setItem("hkm_session", d.token);
      });
    }
  }, [status, fetchData]);

  const claimDaily = async () => {
    const res = await fetch("/api/bonus/daily", { method: "POST" });
    if (res.ok) {
      setDailyClaimed(true);
      fetchData();
    }
  };

  const transfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferMsg("");
    const res = await fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, amount, memo }),
    });
    const data = await res.json();
    if (res.ok) {
      setTransferMsg(`送金完了: ${data.amount} HKM (手数料: ${data.fee} HKM)`);
      setRecipientId("");
      setAmount("");
      setMemo("");
      fetchData();
    } else {
      setTransferMsg(data.error || "エラーが発生しました");
    }
  };

  if (!session || !user) return <div className="p-8 text-center text-[var(--text-dim)]">読み込み中...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">ダッシュボード</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--text-dim)]">残高</p>
          <p className="text-3xl font-bold text-[var(--accent)]">{Number(user.balance).toLocaleString()} <span className="text-base">HKM</span></p>
          <p className="mt-2 text-xs text-[var(--text-dim)]">ユーザーID</p>
          <div className="flex items-center gap-2">
            <p className="break-all font-mono text-xs select-all flex-1">{session?.user?.id}</p>
            <button
              onClick={() => navigator.clipboard.writeText(session?.user?.id || "")}
              className="shrink-0 rounded bg-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--accent)] hover:text-black"
            >
              コピー
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--text-dim)]">連続ログイン</p>
          <p className="text-3xl font-bold">{user.streak}<span className="text-base text-[var(--text-dim)]">日</span></p>
          <button
            onClick={claimDaily}
            disabled={dailyClaimed}
            className="mt-2 rounded bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
          >
            {dailyClaimed ? "受取済み" : "ログインボーナス受取"}
          </button>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--text-dim)]">紹介コード</p>
          <p className="mt-1 break-all font-mono text-sm select-all">{user.referralCode}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { const url = `${window.location.origin}/dashboard?ref=${user.referralCode}`; navigator.clipboard.writeText(url); }}
              className="rounded bg-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--accent)] hover:text-black"
            >
              URLコピー
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`ヒカマニコイン(HKM)に登録しよう！登録ボーナス500HKMもらえるよ🪙\n`)}&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard?ref=${user.referralCode}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-black px-3 py-1.5 text-xs text-white hover:bg-gray-800"
            >
              Xでシェア
            </a>
          </div>
        </div>
      </div>

      {/* Login Calendar */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">ログインカレンダー（過去30日）</h2>
        <LoginCalendar history={user.loginHistory} />
      </div>

      {/* Account linking */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">アカウント連携</h2>
        {PROVIDERS.filter((p) => user.linkedAccounts.includes(p.id.toUpperCase())).length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs text-[var(--text-dim)]">連携済み</p>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.filter((p) => user.linkedAccounts.includes(p.id.toUpperCase())).map((p) => (
                <span key={p.id} className="rounded bg-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-dim)]">
                  ✓ {p.name} (+{p.bonus} HKM 獲得済み)
                </span>
              ))}
            </div>
          </div>
        )}
        {PROVIDERS.filter((p) => !user.linkedAccounts.includes(p.id.toUpperCase())).length > 0 && (
          <div>
            <p className="mb-2 text-xs text-[var(--text-dim)]">未連携（連携してボーナスをもらおう！）</p>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.filter((p) => !user.linkedAccounts.includes(p.id.toUpperCase())).map((p) => (
                <button
                  key={p.id}
                  onClick={() => signIn(p.id, { callbackUrl: "/dashboard" })}
                  className={`rounded px-4 py-2 text-sm font-semibold ${p.color} hover:opacity-90`}
                  style={p.id === "google" ? { color: "#1f2937" } : { color: "white" }}
                >
                  {p.name} 連携で +{p.bonus} HKM
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">プロフィール編集</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const displayName = fd.get("displayName") as string;
          const avatar = fd.get("avatar") as string;
          const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: displayName || undefined, avatar: avatar || undefined }) });
          const data = await res.json();
          if (res.ok) { alert(data.message); fetchData(); } else alert(data.error);
        }} className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            {session?.user?.image && <img src={session.user.image} alt="" className="h-12 w-12 rounded-full" />}
            <div>
              <p className="font-semibold">{user.displayName || session?.user?.name}</p>
              <p className="text-xs text-[var(--text-dim)]">{session?.user?.email}</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-dim)]">表示名（1〜50文字）</label>
            <input name="displayName" defaultValue={user.displayName || ""} placeholder={session?.user?.name || ""}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-dim)]">アバター（空欄でOAuth画像を使用）</label>
            <div className="flex gap-2 items-center">
              <input name="avatar" defaultValue={user.avatar || ""} placeholder="https://..."
                className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" id="avatar-input" />
              <label className="cursor-pointer rounded bg-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--accent)] hover:text-black">
                アップロード
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const fd = new FormData(); fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  if (res.ok) {
                    const { url } = await res.json();
                    const input = document.getElementById("avatar-input") as HTMLInputElement;
                    if (input) input.value = window.location.origin + url;
                  }
                }} />
              </label>
            </div>
          </div>
          <button type="submit" className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">保存</button>
        </form>
      </div>

      {/* Birthday */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-1 text-lg font-bold">誕生日登録</h2>
        {user.birthday ? (
          <p className="text-sm text-[var(--text-dim)]">登録済み: {new Date(user.birthday).toLocaleDateString("ja-JP")} （毎年誕生日に 1,000 HKM 付与）</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-[var(--text-dim)]">一度設定したら変更できません。毎年誕生日に 1,000 HKM が付与されます。</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("birthday") as HTMLInputElement).value;
              if (!confirm(`誕生日を ${new Date(input).toLocaleDateString("ja-JP")} に設定しますか？\n※一度設定したら変更できません`)) return;
              const res = await fetch("/api/me/birthday", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthday: input }) });
              const data = await res.json();
              if (res.ok) { alert(data.message); fetchData(); }
              else alert(data.error);
            }} className="flex gap-2">
              <input type="date" name="birthday" required max={new Date().toISOString().slice(0,10)}
                className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              <button type="submit" className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">登録</button>
            </form>
          </>
        )}
      </div>

      {/* Transfer form */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">送金（贈与）</h2>
        <form onSubmit={transfer} className="grid gap-3 sm:grid-cols-4">
          <input
            placeholder="送金先ユーザーID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="金額 (HKM)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="メモ (任意)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
            送金
          </button>
        </form>
        {transferMsg && <p className="mt-2 text-sm">{transferMsg}</p>}
      </div>

      {/* Referral code input */}
      <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">紹介コードを使う</h2>
        <ReferralForm onSuccess={fetchData} />
      </div>

      {/* Transaction history */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">取引履歴</h2>
        <div className="space-y-2">
          {txs.map((tx) => {
            const isOut = tx.senderId === session?.user?.id && tx.type !== "FEE";
            const sign = isOut ? "-" : "+";
            const color = isOut ? "text-red-400" : "text-green-400";
            return (
              <div key={tx.id} className="flex items-center justify-between border-b border-[var(--border)] py-2 text-sm">
                <div>
                  <span className="mr-2 rounded bg-[var(--border)] px-2 py-0.5 text-xs">{tx.type}</span>
                  {tx.memo}
                </div>
                <span className={`font-mono font-bold ${color}`}>{sign}{Number(tx.amount).toLocaleString()} HKM</span>
              </div>
            );
          })}
          {txs.length === 0 && <p className="text-[var(--text-dim)]">取引履歴はありません</p>}
        </div>
      </div>

      {/* API Keys */}
      <ApiKeySection />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionProvider>
      <Navbar />
      <DashboardContent />
    </SessionProvider>
  );
}
