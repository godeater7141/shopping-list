import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "買い物リスト",
  description: "リアルタイムで共有できる買い物リスト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50">{children}</body>
    </html>
  );
}
