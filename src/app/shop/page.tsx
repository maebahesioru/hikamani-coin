"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { showToast } from "@/components/toaster";
import { redirect } from "next/navigation";

interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  category: string;
  recurring: boolean;
}

function ShopContent() {
  const { status } = useSession();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [confirm, setConfirm] = useState<{ slug: string; name: string; price: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
    fetch("/api/shop").then((r) => r.json()).then(setItems);
  }, [status]);

  const buy = async (slug: string) => {
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemSlug: slug }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("購入完了！");
    } else {
      showToast(data.error || "購入に失敗しました", "error");
    }
    setConfirm(null);
  };

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ConfirmDialog
        open={!!confirm}
        title={`${confirm?.name}`}
        message={`${Number(confirm?.price).toLocaleString()} HKM を消費して購入しますか？`}
        onConfirm={() => confirm && buy(confirm.slug)}
        onCancel={() => setConfirm(null)}
      />
      <h1 className="mb-6 text-2xl font-bold">ショップ</h1>
      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-[var(--accent)]">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {items
              .filter((i) => i.category === cat)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-[var(--text-dim)]">{item.description}</p>
                      {item.recurring && <span className="text-xs text-[var(--accent)]">月額</span>}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[var(--accent)]">{Number(item.price).toLocaleString()}</p>
                      <p className="text-xs text-[var(--text-dim)]">HKM</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirm({ slug: item.slug, name: item.name, price: item.price })}
                    className="mt-3 w-full rounded bg-[var(--accent)] py-1.5 text-sm font-semibold text-black hover:bg-[var(--accent-dim)]"
                  >
                    購入
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-[var(--text-dim)]">ショップアイテムはまだありません</p>}
    </div>
  );
}

export default function ShopPage() {
  return (
    <SessionProvider>
      <Navbar />
      <ShopContent />
    </SessionProvider>
  );
}
