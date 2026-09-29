import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Découvrir", template: "%s · Filmable" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
