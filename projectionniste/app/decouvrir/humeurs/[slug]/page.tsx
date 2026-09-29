import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoodResults, MoodTiles } from "@/components/MoodView";
import { ProfileGate, SecHead } from "@/components/ui";
import { moodBySlug, MOODS } from "@/lib/moods";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MOODS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = moodBySlug(slug);
  return m ? { title: m.t, description: m.s } : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!moodBySlug(slug)) notFound();
  return (
    <div>
      <section className="section">
        <SecHead title="Humeurs" aside="Choisis une ambiance : la recherche se fait en direct sur TMDB" />
        <MoodTiles current={slug} />
      </section>
      <ProfileGate>
        <MoodResults slug={slug} />
      </ProfileGate>
    </div>
  );
}
