import type { Metadata } from "next";
import { DiscoverTabs } from "@/components/DiscoverTabs";
import { EmptyInvite } from "@/components/ui";

export const metadata: Metadata = { title: "Découvrir" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmptyInvite />
      <DiscoverTabs />
      {children}
    </>
  );
}
