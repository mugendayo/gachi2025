import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー", alternates: { canonical: "/privacy" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
