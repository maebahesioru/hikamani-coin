"use client";
import { useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;
const listeners: ((t: Toast) => void)[] = [];

export function showToast(message: string, type: "success" | "error" = "success") {
  const toast = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(toast));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    listeners.push(fn);
    return () => { listeners.splice(listeners.indexOf(fn), 1); };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-sm font-semibold shadow-lg animate-in slide-in-from-right-4 ${
            t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {t.type === "success" ? "✅ " : "❌ "}{t.message}
        </div>
      ))}
    </div>
  );
}
