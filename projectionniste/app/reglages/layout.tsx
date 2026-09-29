import type { Metadata } from "next";

export const metadata: Metadata = { title: "Réglages" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
