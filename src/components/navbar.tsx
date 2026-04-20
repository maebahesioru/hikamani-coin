"use client";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[var(--accent)]">
          HKM
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-[var(--accent)]">ダッシュボード</Link>
              <Link href="/shop" className="hover:text-[var(--accent)]">ショップ</Link>
              <Link href="/stocks" className="hover:text-[var(--accent)]">ヒカマーズ株</Link>
              <button onClick={() => signOut()} className="text-[var(--text-dim)] hover:text-white">
                ログアウト
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("discord")}
              className="rounded bg-[#5865F2] px-4 py-1.5 text-white hover:bg-[#4752C4]"
            >
              Discordでログイン
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
