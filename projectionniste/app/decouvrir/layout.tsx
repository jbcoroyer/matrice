import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Découvrir", template: "%s · Le Projectionniste" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
