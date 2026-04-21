import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";

const BASE = "https://hikakinmaniacoin.hikamer.f5.si";

const endpoints = [
  {
    section: "認証",
    items: [
      {
        method: "GET",
        path: "/api/external",
        auth: "APIキー",
        desc: "ユーザーのHKM残高を取得",
        params: [
          { name: "discordId", type: "string", desc: "DiscordユーザーID" },
          { name: "userId", type: "string", desc: "HKMユーザーID（discordIdと排他）" },
        ],
        response: `{ "balance": "1500" }`,
      },
      {
        method: "POST",
        path: "/api/external",
        auth: "APIキー",
        desc: "HKMを付与または消費する",
        body: `{
  "discordId": "123456789",
  "amount": "100",
  "action": "grant" | "deduct",
  "memo": "任意のメモ"
}`,
        response: `{ "success": true }`,
      },
      {
        method: "GET",
        path: "/api/external/check-purchase",
        auth: "APIキー",
        desc: "ショップアイテムの購入状況を確認",
        params: [
          { name: "discordId", type: "string", desc: "DiscordユーザーID" },
          { name: "slug", type: "string", desc: "アイテムスラッグ（例: narikitter-pro）" },
        ],
        response: `{ "active": true }`,
      },
    ],
  },
  {
    section: "公開API（認証不要）",
    items: [
      {
        method: "GET",
        path: "/api/sponsors",
        auth: "不要",
        desc: "スポンサー一覧を取得",
        response: `[
  {
    "userId": "...",
    "displayName": "ユーザー名",
    "avatar": "https://...",
    "slug": "sponsor-forever",
    "big": false,
    "expiresAt": null
  }
]`,
      },
      {
        method: "GET",
        path: "/api/stocks",
        auth: "不要",
        desc: "ヒカマーズ株の一覧・株価・チャートを取得",
        params: [
          { name: "q", type: "string", desc: "検索クエリ（ユーザー名）" },
          { name: "page", type: "number", desc: "ページ番号（デフォルト: 1）" },
        ],
        response: `{
  "stocks": [{ "id": "...", "name": "handle", "currentPrice": "1000", "priceHistory": [...] }],
  "total": 1009,
  "pages": 51
}`,
      },
      {
        method: "GET",
        path: "/api/bets",
        auth: "不要",
        desc: "賭けマーケット一覧を取得",
        params: [
          { name: "active", type: "boolean", desc: "trueで進行中のみ（デフォルト: true）" },
        ],
        response: `[{ "id": "...", "question": "...", "yesPool": "500", "noPool": "300", ... }]`,
      },
      {
        method: "GET",
        path: "/ad.js",
        auth: "不要",
        desc: "HKM広告スクリプト（サイトに1行貼るだけ）",
        response: `// JavaScript`,
      },
    ],
  },
];

const slugs = [
  "narikitter-pro", "discord-booster", "discord-vip", "discord-namecolor",
  "mani-translate-pro", "illust-sagashitter-pro", "hikafuwa-box-pro",
  "hikamani-ai-pro", "takuya-voice-pro", "twigacha-5pack", "twigacha-ssr",
  "ad-hide-30d", "ad-hide-forever", "ad-all-24h", "ad-single-24h",
  "sponsor-30d", "sponsor-forever", "sponsor-big-forever",
  "stock-short-unlock", "stock-fee-discount",
];

export default function ApiDocsPage() {
  return (
    <SessionProvider>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-[var(--accent)]">API ドキュメント</h1>
        <p className="mb-8 text-sm text-[var(--text-dim)]">
          ヒカマニコイン（HKM）の外部API。Discord BotやWebサイトからHKMを操作できます。
        </p>

        {/* Auth */}
        <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-xl font-bold">認証</h2>
          <p className="mb-3 text-sm text-[var(--text-dim)]">APIキーが必要なエンドポイントは <code className="rounded bg-[var(--border)] px-1">x-api-key</code> ヘッダーにAPIキーを付与してください。</p>
          <pre className="rounded bg-[var(--bg)] p-3 text-xs overflow-x-auto">{`curl -H "x-api-key: YOUR_API_KEY" \\
  "${BASE}/api/external?discordId=123456789"`}</pre>
          <p className="mt-3 text-sm text-[var(--text-dim)]">APIキーは <a href="/dashboard" className="text-[var(--accent)] hover:underline">ダッシュボード</a> から発行できます（準備中）。</p>
        </section>

        {/* Endpoints */}
        {endpoints.map((section) => (
          <section key={section.section} className="mb-10">
            <h2 className="mb-4 text-xl font-bold">{section.section}</h2>
            <div className="space-y-4">
              {section.items.map((ep) => (
                <div key={ep.path} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${ep.method === "GET" ? "bg-green-700 text-white" : "bg-blue-700 text-white"}`}>{ep.method}</span>
                    <code className="font-mono text-sm text-[var(--accent)]">{BASE}{ep.path}</code>
                    <span className="ml-auto text-xs text-[var(--text-dim)]">認証: {ep.auth}</span>
                  </div>
                  <p className="mb-3 text-sm">{ep.desc}</p>
                  {"params" in ep && ep.params && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-semibold text-[var(--text-dim)]">クエリパラメータ</p>
                      <table className="w-full text-xs">
                        <tbody>
                          {ep.params.map((p) => (
                            <tr key={p.name} className="border-b border-[var(--border)]">
                              <td className="py-1 pr-3 font-mono text-[var(--accent)]">{p.name}</td>
                              <td className="py-1 pr-3 text-[var(--text-dim)]">{p.type}</td>
                              <td className="py-1">{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {"body" in ep && ep.body && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-semibold text-[var(--text-dim)]">リクエストボディ (JSON)</p>
                      <pre className="rounded bg-[var(--bg)] p-2 text-xs overflow-x-auto">{ep.body}</pre>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-semibold text-[var(--text-dim)]">レスポンス</p>
                    <pre className="rounded bg-[var(--bg)] p-2 text-xs overflow-x-auto">{ep.response}</pre>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Shop slugs */}
        <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-xl font-bold">ショップアイテム スラッグ一覧</h2>
          <p className="mb-3 text-sm text-[var(--text-dim)]"><code className="rounded bg-[var(--border)] px-1">check-purchase</code> APIで使用するスラッグ</p>
          <div className="flex flex-wrap gap-2">
            {slugs.map((s) => (
              <code key={s} className="rounded bg-[var(--border)] px-2 py-1 text-xs">{s}</code>
            ))}
          </div>
        </section>

        {/* Rate limit */}
        <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-xl font-bold">広告システム</h2>
          <p className="mb-3 text-sm text-[var(--text-dim)]">各サイトに1行貼るだけでHKM広告を表示できます。</p>
          <pre className="rounded bg-[var(--bg)] p-3 text-xs overflow-x-auto mb-3">{`<script src="https://hikakinmaniacoin.hikamer.f5.si/ad.js" async></script>`}</pre>
          <ul className="text-sm text-[var(--text-dim)] space-y-1 list-disc pl-4">
            <li>HKM広告主の広告を優先表示</li>
            <li>広告非表示購入者には表示しない</li>
            <li>HKM広告がない場合は何も表示しない（AdSenseと競合しない）</li>
            <li>広告管理: <a href="/ads" className="text-[var(--accent)] hover:underline">/ads</a></li>
          </ul>
        </section>

        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-xl font-bold">レート制限</h2>
          <p className="text-sm text-[var(--text-dim)]">現在レート制限は設けていませんが、過度なリクエストはブロックされる場合があります。</p>
        </section>
      </main>
    </SessionProvider>
  );
}
