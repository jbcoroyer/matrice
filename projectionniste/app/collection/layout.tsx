import type { Metadata } from "next";

export const metadata: Metadata = { title: "Collection" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
