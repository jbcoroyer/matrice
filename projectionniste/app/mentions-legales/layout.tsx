import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
