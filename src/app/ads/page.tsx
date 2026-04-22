"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { AdScriptTag } from "@/app/api-docs/ad-script-tag";
import { showToast } from "@/components/toaster";
import { redirect } from "next/navigation";

interface Ad {
  id: string;
  type: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  expiresAt: string;
  active: boolean;
}

function AdsContent() {
  const { status } = useSession();
  const [ads, setAds] = useState<Ad[]>([]);
  const [type, setType] = useState<string>("ALL_SITES");
  const [targetSite, setTargetSite] = useState("");
  const [sites, setSites] = useState<string[]>([]);

  const AD_TYPES = [
    { value: "ALL_SITES",           label: "インフィード 全サイト",    price: 2000 },
    { value: "SINGLE_SITE",         label: "インフィード 1サイト",     price: 500 },
    { value: "POPUP",               label: "ポップアップ 全サイト",    price: 3000 },
    { value: "POPUP_SINGLE",        label: "ポップアップ 1サイト",     price: 800 },
    { value: "FIXED_BANNER",        label: "右下固定バナー 全サイト",  price: 1500 },
    { value: "FIXED_BANNER_SINGLE", label: "右下固定バナー 1サイト",   price: 400 },
    { value: "FULLSCREEN",          label: "フルスクリーン 全サイト",  price: 5000 },
    { value: "FULLSCREEN_SINGLE",   label: "フルスクリーン 1サイト",   price: 1500 },
  ] as const;

  const isSingle = type.endsWith("_SINGLE") || type === "SINGLE_SITE";
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [days, setDays] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);

  const basePrice = AD_TYPES.find(t => t.value === type)?.price ?? 2000;
  const totalPrice = basePrice * days;

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
    fetch("/api/ads").then(r => r.json()).then(setAds);
    fetch("/api/sites").then(r => r.json()).then(setSites);
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, imageUrl: imageUrl || undefined, linkUrl: linkUrl || undefined, targetSite: isSingle ? targetSite : undefined, days, startsAt: startDate || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("広告を掲載しました！");
      setContent(""); setImageUrl(""); setLinkUrl("");
      fetch("/api/ads").then(r => r.json()).then(setAds);
    } else {
      showToast(data.error || "エラーが発生しました", "error");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">広告管理</h1>
      <p className="mb-6 text-sm text-[var(--text-dim)]">
        HKMで広告を掲載できます。広告は<code className="rounded bg-[var(--border)] px-1">ad.js</code>を導入した全サイトに表示されます。
      </p>

      {/* 新規広告 */}
      <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">広告を掲載する</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">種別</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AD_TYPES.map(t => (
                <label key={t.value} className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm ${type === t.value ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)]"}`}>
                  <input type="radio" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="hidden" />
                  <span>{t.label}</span>
                  <span className="ml-auto text-xs text-[var(--text-dim)]">{t.price.toLocaleString()} HKM</span>
                </label>
              ))}
            </div>
          </div>
          {isSingle && (
            <div>
              <label className="mb-1 block text-sm font-semibold">対象サイト</label>
              <select value={targetSite} onChange={e => setTargetSite(e.target.value)} required
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
                <option value="">サイトを選択...</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold">広告テキスト *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required
              placeholder="広告の本文を入力してください"
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm h-20 resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">画像・GIF（任意・2MB以下）</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  if (res.ok) {
                    const { url } = await res.json();
                    setImageUrl(window.location.origin + url);
                  }
                }}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-[var(--accent)] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-black"
              />
            </div>
            {imageUrl && <img src={imageUrl} alt="プレビュー" className="mt-2 max-h-32 rounded border border-[var(--border)]" />}
            {imageUrl && <img src={imageUrl} alt="" className="mt-2 max-h-20 rounded" />}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">リンクURL（任意）</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">掲載期間</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-[var(--text-dim)] mb-1">開始日時（空欄=即時）</p>
                <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)}
                  min={new Date().toISOString().slice(0,16)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-dim)] mb-1">日数</p>
                <input type="number" min={1} max={30} value={days} onChange={e => setDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {startDate ? `${new Date(startDate).toLocaleString("ja-JP")} から ` : "即時から "}
              {days}日間 → 合計 <span className="font-bold text-[var(--accent)]">{totalPrice.toLocaleString()} HKM</span>
            </p>
          </div>
          <button type="submit" disabled={loading || !content}
            className="rounded bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {loading ? "処理中..." : `掲載する (${totalPrice.toLocaleString()} HKM)`}
          </button>
        </form>
      </div>

      {/* 掲載中の広告 */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-bold">掲載中の広告</h2>
        {ads.length === 0 ? (
          <p className="text-[var(--text-dim)] text-sm">掲載中の広告はありません</p>
        ) : (
          <div className="space-y-3">
            {ads.map(ad => (
              <div key={ad.id} className="rounded border border-[var(--border)] p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded px-2 py-0.5 text-xs ${ad.type === "ALL_SITES" ? "bg-blue-700" : "bg-green-700"} text-white`}>
                    {ad.type === "ALL_SITES" ? "全サイト" : "1サイト"}
                  </span>
                  <span className="text-[var(--text-dim)] text-xs">{new Date(ad.expiresAt).toLocaleString("ja-JP")} まで</span>
                </div>
                <p>{ad.content}</p>
                {ad.linkUrl && <a href={ad.linkUrl} className="text-xs text-[var(--accent)]">{ad.linkUrl}</a>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 広告非表示について */}
      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-3 text-lg font-bold">サイトに広告を設置して収益を得る</h2>
        <p className="text-sm text-[var(--text-dim)] mb-3">
          自分のサイトにHKM広告を設置すると、広告が表示されるたびに<strong className="text-[var(--accent)]">1 HKM</strong>が付与されます。
        </p>
        <div className="mb-3"><AdScriptTag /></div>
        <ul className="text-xs text-[var(--text-dim)] space-y-1 list-disc pl-4 mb-3">
          <li>HKM広告主の広告を優先表示</li>
          <li>広告非表示購入者には表示しない</li>
          <li>HKM広告がない場合は何も表示しない（AdSenseと競合しない）</li>
          <li>広告が表示されるたびに1 HKMが付与されます</li>
        </ul>
        <a href="/api-docs" className="text-sm text-[var(--accent)] hover:underline">APIドキュメントを見る →</a>
      </div>

      {/* 広告非表示について */}
      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-3 text-lg font-bold">広告を非表示にする</h2>
        <p className="text-sm text-[var(--text-dim)] mb-3">
          ショップで「各サイト広告30日非表示(1,500 HKM)」または「永久非表示(15,000 HKM)」を購入すると、
          HKM広告が表示されなくなります。
        </p>
        <a href="/shop" className="text-sm text-[var(--accent)] hover:underline">ショップで購入する →</a>
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <SessionProvider>
      <Navbar />
      <AdsContent />
    </SessionProvider>
  );
}
