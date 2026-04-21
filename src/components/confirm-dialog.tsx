"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 w-80 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold">{title}</h3>
        <p className="mb-6 text-sm text-[var(--text-dim)]">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded border border-[var(--border)] py-2 text-sm text-[var(--text-dim)] hover:bg-[var(--border)]"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded bg-[var(--accent)] py-2 text-sm font-semibold text-black hover:bg-[var(--accent-dim)]"
          >
            購入する
          </button>
        </div>
      </div>
    </div>
  );
}
