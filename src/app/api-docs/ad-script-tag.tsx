"use client";
import { useSession } from "next-auth/react";

const BASE = "https://hikakinmaniacoin.hikamer.f5.si";

export function AdScriptTag() {
  const { data: session } = useSession();
  const tag = session?.user?.id
    ? `<script src="${BASE}/ad.js" data-user-id="${session.user.id}" async></script>`
    : `<script src="${BASE}/ad.js" async></script>`;

  return (
    <div className="relative">
      <pre className="rounded bg-[var(--bg)] p-3 text-xs overflow-x-auto pr-16">{tag}</pre>
      <button
        onClick={() => navigator.clipboard.writeText(tag)}
        className="absolute right-2 top-2 rounded bg-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--accent)] hover:text-black"
      >
        コピー
      </button>
      {!session?.user?.id && (
        <p className="mt-1 text-xs text-yellow-400">※ログインするとユーザーID入りのタグが自動生成されます</p>
      )}
    </div>
  );
}
