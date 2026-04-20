"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[var(--accent)]">ヒカマニコイン</h1>
        <p className="mb-6 text-sm text-[var(--text-dim)]">Discordアカウントでログイン</p>
        <button
          onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
          className="rounded bg-[#5865F2] px-6 py-2 font-semibold text-white hover:bg-[#4752C4]"
        >
          Discordでログイン
        </button>
      </div>
    </main>
  );
}
