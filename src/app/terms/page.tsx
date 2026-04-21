export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-[var(--accent)]">利用規約</h1>
      <p className="mb-4 text-sm text-[var(--text-dim)]">最終更新日: 2026年4月21日</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-bold">第1条（適用）</h2>
          <p>本規約は、ヒカマニコイン（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第2条（ヒカマニコインの性質）</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>ヒカマニコイン（HKM）は、前払式支払手段に該当しない自家型ポイントです。</li>
            <li>HKMは法定通貨、暗号資産、電子マネーのいずれにも該当しません。</li>
            <li>HKMの出金・換金・現金化はできません。</li>
            <li>HKMはサイト内サービスとの交換にのみ使用できます。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第3条（アカウント）</h2>
          <p>ユーザーはDiscord、Google、またはTwitter/Xアカウントを使用してログインします。1人につき1アカウントとし、複数アカウントの作成は禁止します。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第4条（HKMの取得）</h2>
          <p>HKMは以下の方法で取得できます：初回登録ボーナス、デイリーログイン、連続ログインボーナス、紹介コード、各種連携ボーナス、ライトコイン（LTC）による入金、その他運営が定める方法。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第5条（LTC入金）</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>LTCによる入金は、入金時点のLTC/JPY市場レートに基づきHKMに変換されます。</li>
            <li>1円 = 100 HKMのレートで計算されます。</li>
            <li>入金後のHKMからLTCへの逆変換・出金はできません。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第6条（送金）</h2>
          <p>ユーザー間のHKM移動は「贈与」として扱われます。送金時には手数料が発生し、運営に帰属します。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第7条（ヒカマーズ株）</h2>
          <p>ヒカマーズ株はサイト内のエンターテインメント機能であり、実際の有価証券ではありません。株取引には手数料が発生します。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第8条（禁止事項）</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>不正な手段によるHKMの取得</li>
            <li>複数アカウントの作成・利用</li>
            <li>バグの悪用（報告は歓迎します）</li>
            <li>HKMの外部での売買・換金</li>
            <li>その他、運営が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第9条（サービスの変更・終了）</h2>
          <p>運営は事前の通知なくサービス内容の変更、HKMの価値調整、サービスの一時停止・終了を行うことができます。サービス終了時、HKMの払い戻しは行いません。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第10条（免責事項）</h2>
          <p>本サービスは現状有姿で提供され、運営はHKMの価値保証、サービスの継続性について一切の保証をしません。</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">第11条（準拠法）</h2>
          <p>本規約は日本法に準拠し、解釈されるものとします。</p>
        </section>
      </div>
    </main>
  );
}
