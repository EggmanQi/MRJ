import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "山河跳 · 抽卡问卦",
  description: "诚实的动物成语抽卡问卦——镜子，不是天机。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-paper-deep font-sans antialiased">
        <main className="mx-auto min-h-screen max-w-lg px-4 py-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
