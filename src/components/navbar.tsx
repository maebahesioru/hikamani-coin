"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/auth/session").then(r => r.json()).then(s => {
        setValidSession(!!s?.user);
      }).catch(() => setValidSession(false));
    } else {
      setValidSession(false);
    }
  }, [status]);

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[var(--accent)]">
          HKM
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {validSession && session ? (
            <>
              <Link href="/dashboard" className="hover:text-[var(--accent)]">ダッシュボード</Link>
              <Link href="/shop" className="hover:text-[var(--accent)]">ショップ</Link>
              <Link href="/stocks" className="hover:text-[var(--accent)]">ヒカマーズ株</Link>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-[var(--text-dim)] hover:text-white">
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
