export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-[var(--accent)]">プライバシーポリシー</h1>
      <p className="mb-4 text-sm text-[var(--text-dim)]">最終更新日: 2026年4月21日</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-bold">1. 収集する情報</h2>
          <p>本サービスでは以下の情報を収集します：</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Discord、Google、Twitter/Xアカウントのユーザー名・表示名・アバター画像・メールアドレス</li>
            <li>HKMの取引履歴・残高情報</li>
            <li>ログイン日時・IPアドレス</li>
            <li>LTC入金に関する情報（入金アドレス・トランザクションハッシュ）</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">2. 情報の利用目的</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>本サービスの提供・運営</li>
            <li>ユーザー認証・アカウント管理</li>
            <li>HKMの残高管理・取引処理</li>
            <li>不正利用の防止</li>
            <li>サービスの改善</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">3. 情報の第三者提供</h2>
          <p>法令に基づく場合を除き、ユーザーの個人情報を第三者に提供することはありません。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">4. 外部サービスとの連携</h2>
          <p>本サービスはDiscord、Google、Twitter/XのOAuth認証を利用しています。各サービスのプライバシーポリシーもご確認ください。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">5. データの保管</h2>
          <p>ユーザーデータは運営が管理するサーバー（自宅サーバー）に保管されます。適切なセキュリティ対策を講じていますが、完全な安全性を保証するものではありません。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">6. データの削除</h2>
          <p>アカウント削除を希望する場合は、運営までご連絡ください。アカウント削除時、HKM残高は失われます。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">7. Cookieの使用</h2>
          <p>本サービスではセッション管理のためにCookieを使用します。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">8. ポリシーの変更</h2>
          <p>本ポリシーは予告なく変更される場合があります。変更後のポリシーは本ページに掲載した時点で効力を生じます。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">9. お問い合わせ</h2>
          <p>プライバシーに関するお問い合わせは、Discordサーバーまたは運営のTwitter/Xアカウントまでご連絡ください。</p>
        </section>
      </div>
    </main>
  );
}
