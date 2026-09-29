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
    <div className="view">
      <section className="section">
        <SecHead as="h1" kicker="Selon l'envie" title={<>Humeurs <i>du soir</i></>} aside="Chaque humeur interroge TMDB en direct, puis classe par ton indice" />
        <MoodTiles current={slug} />
      </section>
      <ProfileGate>
        <MoodResults slug={slug} />
      </ProfileGate>
    </div>
  );
}
