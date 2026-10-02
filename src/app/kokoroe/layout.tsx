import type { Metadata } from "next";

export const metadata: Metadata = { title: "生徒心得", alternates: { canonical: "/kokoroe" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
