import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rayons et cycles" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
