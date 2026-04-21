import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-16 py-8 text-center text-xs text-[var(--text-dim)]">
      <div className="flex flex-wrap justify-center gap-4 mb-3">
        <Link href="/terms" className="hover:text-[var(--accent)]">利用規約</Link>
        <Link href="/privacy" className="hover:text-[var(--accent)]">プライバシーポリシー</Link>
        <Link href="/api-docs" className="hover:text-[var(--accent)]">API</Link>
        <a href="https://hikakinmaniacoin.hikamer.f5.si/shop" className="hover:text-[var(--accent)]">ショップ</a>
        <a href="https://x.com/maebahesioru2" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">X (Twitter)</a>
        <a href="https://discord.gg/26U6r5xMBx" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)]">Discord</a>
      </div>
      <p>ヒカマニコイン（HKM）は前払式支払手段に該当しない自家型ポイントです。出金・換金はできません。</p>
      <p className="mt-1">© {new Date().getFullYear()} hikamer</p>
    </footer>
  );
}
