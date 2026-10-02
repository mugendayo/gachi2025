import type { Metadata } from "next";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", alternates: { canonical: "/tokusho" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
