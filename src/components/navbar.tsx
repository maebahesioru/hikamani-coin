"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[var(--accent)]">
          HKM
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          {status === "loading" ? null : status === "authenticated" && session ? (
            <>
              <Link href="/dashboard" className="hover:text-[var(--accent)]">ダッシュボード</Link>
              <Link href="/shop" className="hover:text-[var(--accent)]">ショップ</Link>
              <Link href="/stocks" className="hover:text-[var(--accent)]">ヒカマーズ株</Link>
              <Link href="/ads" className="hover:text-[var(--accent)]">広告</Link>
              <button onClick={() => {
                if (window.confirm("ログアウトしますか？")) signOut({ callbackUrl: "/login" });
              }} className="text-[var(--text-dim)] hover:text-white">
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded bg-[var(--accent)] px-4 py-1.5 font-semibold text-black hover:bg-[var(--accent-dim)]"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
