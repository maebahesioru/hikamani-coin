import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ヒカマニコイン (HKM)",
  description: "ヒカマニ界隈の公式サイト内ポイントシステム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
