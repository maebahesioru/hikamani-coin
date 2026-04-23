import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { AdScriptTag } from "./ad-script-tag";

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
  {
    section: "ユーザー（要ログイン）",
    items: [
      {
        method: "GET",
        path: "/api/me",
        auth: "セッション",
        desc: "ログイン中のユーザー情報・残高・ログイン履歴を取得",
        response: `{ "displayName": "...", "balance": "1500", "streak": 7, "dailyClaimed": false, "birthday": null, ... }`,
      },
      {
        method: "POST",
        path: "/api/me/birthday",
        auth: "セッション",
        desc: "誕生日を登録（一度だけ・変更不可）",
        body: `{ "birthday": "2000-01-15" }`,
        response: `{ "message": "誕生日を登録しました" }`,
      },
      {
        method: "GET",
        path: "/api/me/token",
        auth: "セッション",
        desc: "HMAC署名付きトークンを取得（ad.js用）",
        response: `{ "token": "userId.signature" }`,
      },
      {
        method: "GET",
        path: "/api/wallet",
        auth: "セッション",
        desc: "残高と取引履歴を取得",
        response: `{ "balance": "1500", "transactions": [...] }`,
      },
      {
        method: "POST",
        path: "/api/wallet/transfer",
        auth: "セッション",
        desc: "他ユーザーにHKMを送金（贈与）。手数料1%",
        body: `{ "recipientId": "userId", "amount": "100", "memo": "任意" }`,
        response: `{ "id": "...", "amount": "100", "fee": "1" }`,
      },
      {
        method: "POST",
        path: "/api/bonus/daily",
        auth: "セッション",
        desc: "デイリーログインボーナスを受け取る（1日1回）",
        response: `{ "streak": 7, "reward": "100" }`,
      },
      {
        method: "POST",
        path: "/api/bonus/referral",
        auth: "セッション",
        desc: "紹介コードを使用（登録後7日間限定）",
        body: `{ "code": "紹介コード" }`,
        response: `{ "message": "紹介ボーナスを付与しました" }`,
      },
      {
        method: "POST",
        path: "/api/submit",
        auth: "セッション",
        desc: "バグ報告・動画投稿・アンケート申請（1日3回まで）",
        body: `{ "type": "BUG_REPORT" | "VIDEO_SUBMISSION" | "SURVEY", "content": "内容", "url": "任意" }`,
        response: `{ "claimId": "...", "message": "申請を受け付けました" }`,
      },
    ],
  },
  {
    section: "ショップ・決済",
    items: [
      {
        method: "GET",
        path: "/api/shop",
        auth: "不要",
        desc: "ショップアイテム一覧",
        response: `[{ "slug": "ad-hide-30d", "name": "...", "price": "1500", ... }]`,
      },
      {
        method: "POST",
        path: "/api/shop",
        auth: "セッション",
        desc: "ショップアイテムを購入",
        body: `{ "itemSlug": "ad-hide-30d" }`,
        response: `{ "purchaseId": "..." }`,
      },
      {
        method: "POST",
        path: "/api/checkout",
        auth: "セッション",
        desc: "外部サイト向け決済トークン発行",
        body: `{ "itemSlug": "narikitter-pro", "callbackUrl": "https://..." }`,
        response: `{ "token": "..." }`,
      },
      {
        method: "GET",
        path: "/api/checkout",
        auth: "不要",
        desc: "決済トークン検証+課金実行（1回限り）",
        params: [{ name: "token", type: "string", desc: "決済トークン" }],
        response: `{ "valid": true, "purchaseId": "...", "itemSlug": "...", "userId": "..." }`,
      },
    ],
  },
  {
    section: "広告",
    items: [
      {
        method: "GET",
        path: "/api/ads",
        auth: "セッション",
        desc: "自分の広告一覧",
        response: `[{ "id": "...", "type": "ALL_SITES", "content": "...", ... }]`,
      },
      {
        method: "POST",
        path: "/api/ads",
        auth: "セッション",
        desc: "広告を掲載",
        body: `{ "type": "ALL_SITES", "content": "テキスト", "imageUrl": "...", "linkUrl": "...", "days": 3, "startsAt": "2026-04-25T00:00" }`,
        response: `{ "adId": "...", "expiresAt": "..." }`,
      },
      {
        method: "POST",
        path: "/api/upload",
        auth: "セッション",
        desc: "画像アップロード（2MB以下、JPEG/PNG/GIF/WebP）",
        response: `{ "url": "/api/upload/abc123" }`,
      },
      {
        method: "GET",
        path: "/api/sites",
        auth: "不要",
        desc: "ad.jsを導入しているサイト一覧",
        response: `["example.com", "test.com"]`,
      },
    ],
  },
  {
    section: "APIキー管理",
    items: [
      {
        method: "GET",
        path: "/api/apikeys",
        auth: "セッション",
        desc: "自分のAPIキー一覧",
        response: `[{ "id": "...", "name": "TwiGacha", "key": "hkm_...", "active": true }]`,
      },
      {
        method: "POST",
        path: "/api/apikeys",
        auth: "セッション",
        desc: "APIキーを発行",
        body: `{ "name": "キー名" }`,
        response: `{ "id": "...", "name": "...", "key": "hkm_..." }`,
      },
      {
        method: "DELETE",
        path: "/api/apikeys",
        auth: "セッション",
        desc: "APIキーを削除",
        body: `{ "id": "キーID" }`,
        response: `{ "message": "削除しました" }`,
      },
    ],
  },
  {
    section: "その他",
    items: [
      {
        method: "GET",
        path: "/api/ranking",
        auth: "不要",
        desc: "ランキング（残高・株時価総額・賭け獲得TOP20）",
        response: `{ "balance": [...], "stock": [...], "bet": [...] }`,
      },
      {
        method: "POST",
        path: "/api/external/system-grant",
        auth: "APIキー",
        desc: "システム報酬付与（VC滞在ボーナス等、上限100 HKM/回）",
        body: `{ "discordId": "123456789", "amount": "10", "memo": "VC滞在ボーナス" }`,
        response: `{ "success": true }`,
      },
      {
        method: "POST",
        path: "/api/ltc",
        auth: "セッション",
        desc: "LTC入金アドレス生成・入金確認",
        response: `{ "address": "ltc1...", "status": "PENDING" }`,
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
          <p className="mt-3 text-sm text-[var(--text-dim)]">APIキーは <a href="/dashboard" className="text-[var(--accent)] hover:underline">ダッシュボード</a> から発行できます。</p>
        </section>

        {/* Endpoints */}
        {endpoints.map((section) => (
          <section key={section.section} className="mb-10">
            <h2 className="mb-4 text-xl font-bold">{section.section}</h2>
            <div className="space-y-4">
              {section.items.map((ep) => (
                <div key={`${ep.method}-${ep.path}`} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
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
          <div className="mb-3"><AdScriptTag /></div>
          <ul className="text-sm text-[var(--text-dim)] space-y-1 list-disc pl-4 mb-4">
            <li>HKM広告主の広告を優先表示</li>
            <li>広告非表示購入者には表示しない</li>
            <li>HKM広告がない場合は何も表示しない（AdSenseと競合しない）</li>
            <li>広告管理: <a href="/ads" className="text-[var(--accent)] hover:underline">/ads</a></li>
          </ul>
          <h3 className="mb-2 text-sm font-bold">収益を受け取る</h3>
          <p className="mb-4 text-sm text-[var(--text-dim)]">広告が表示されるたびに1 HKMが付与されます。上のタグにユーザーIDが自動で入っています。</p>
          <h3 className="mb-2 text-sm font-bold">カスタマイズ（data属性）</h3>
          <table className="w-full text-xs mb-3">
            <thead><tr className="border-b border-[var(--border)]"><th className="text-left py-1">属性</th><th className="text-left py-1">説明</th><th className="text-left py-1">デフォルト</th></tr></thead>
            <tbody>
              {[
                ["data-max", "最大広告表示数（インフィードのみ）", "1"],
                ["data-types", "許可する広告種別（カンマ区切り）", "infeed,popup,fixed,fullscreen"],
              ].map(([attr, desc, def]) => (
                <tr key={attr} className="border-b border-[var(--border)]">
                  <td className="py-1 font-mono text-[var(--accent)]">{attr}</td>
                  <td className="py-1 pr-3">{desc}</td>
                  <td className="py-1 text-[var(--text-dim)]">{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mb-1 text-xs font-semibold text-[var(--text-dim)]">使用例</p>
          <pre className="rounded bg-[var(--bg)] p-3 text-xs overflow-x-auto">{`<!-- インフィードのみ最大2個 -->
<script src=".../ad.js" data-max="2" data-types="infeed" async></script>

<!-- ポップアップと固定バナーのみ -->
<script src=".../ad.js" data-types="popup,fixed" async></script>

<!-- フルスクリーン禁止 -->
<script src=".../ad.js" data-types="infeed,popup,fixed" async></script>`}</pre>
          <p className="mt-3 text-xs text-[var(--text-dim)]">広告種別: <code className="rounded bg-[var(--border)] px-1">infeed</code>（コンテンツ内）/ <code className="rounded bg-[var(--border)] px-1">popup</code>（ポップアップ）/ <code className="rounded bg-[var(--border)] px-1">fixed</code>（右下固定）/ <code className="rounded bg-[var(--border)] px-1">fullscreen</code>（全画面）</p>
        </section>

        <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-3 text-xl font-bold">レート制限</h2>
          <div className="text-sm text-[var(--text-dim)] space-y-2">
            <p>全APIエンドポイントにIPアドレスまたはAPIキー単位でレート制限が設けられています。</p>
            <table className="w-full text-xs mt-2">
              <thead><tr className="border-b border-[var(--border)]"><th className="text-left py-1">エンドポイント</th><th className="text-left py-1">制限</th></tr></thead>
              <tbody>
                {[
                  ["/api/external (GET)", "60回/分"],
                  ["/api/external (POST)", "30回/分"],
                  ["/api/wallet/transfer", "10回/分"],
                  ["/api/checkout", "10回/分"],
                  ["/api/stocks", "30回/分"],
                  ["/api/bets", "30回/分"],
                  ["その他", "100回/分"],
                ].map(([ep, limit]) => (
                  <tr key={ep} className="border-b border-[var(--border)]">
                    <td className="py-1 font-mono">{ep}</td>
                    <td className="py-1">{limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2">制限超過時は <code className="rounded bg-[var(--border)] px-1">429 Too Many Requests</code> が返されます。<code className="rounded bg-[var(--border)] px-1">Retry-After</code> ヘッダーで待機時間を確認してください。</p>
          </div>
        </section>
      </main>
    </SessionProvider>
  );
}
