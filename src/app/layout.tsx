import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/data/site"; // 👈 さっき作った src/data/site.ts を参照
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${site.title}｜奈良・下市集学校`,
  description: "一生文化祭前夜。孤独にならない仕組みの本気の文化祭体験。",
  openGraph: {
    title: site.title,
    description: "一生文化祭前夜。孤独にならない仕組みの本気の文化祭体験。",
    url: "https://your-vercel-url.vercel.app", // ← デプロイ後に自分のURLへ
    siteName: site.title,
    images: [
      {
        url: site.ogImage, // public/og.jpg を用意
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
         <Footer />
      </body>
    </html>
  );
}
