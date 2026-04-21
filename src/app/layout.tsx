import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/toaster";

export const metadata: Metadata = {
  title: "ヒカマニコイン (HKM)",
  description: "ヒカマニ界隈の公式サイト内ポイントシステム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
