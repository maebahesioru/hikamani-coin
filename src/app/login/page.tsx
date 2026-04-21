"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center w-80">
        <h1 className="mb-2 text-2xl font-bold text-[var(--accent)]">ヒカマニコイン</h1>
        <p className="mb-6 text-sm text-[var(--text-dim)]">ログインしてはじめる</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
            className="rounded bg-[#5865F2] px-6 py-2 font-semibold text-white hover:bg-[#4752C4]"
          >
            Discordでログイン
          </button>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="rounded bg-white px-6 py-2 font-semibold text-gray-800 hover:bg-gray-100 border border-gray-300"
          >
            Googleでログイン
          </button>
          <button
            onClick={() => signIn("twitter", { callbackUrl: "/dashboard" })}
            className="rounded bg-black px-6 py-2 font-semibold text-white hover:bg-gray-900"
          >
            X (Twitter)でログイン
          </button>
        </div>
        <Link href="/" className="mt-4 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--accent)]">
          ← トップに戻る
        </Link>
      </div>
    </main>
  );
}
