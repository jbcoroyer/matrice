import type { Metadata } from "next";
import { SearchResults } from "@/components/SearchResults";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Recherche « ${q} »` : "Recherche", robots: { index: false } };
}

export default async function Page({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  return (
    <div className="view">
      <SearchResults key={q} q={q.trim()} />
    </div>
  );
}
