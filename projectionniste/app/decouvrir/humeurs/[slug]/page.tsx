import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoodChips } from "@/components/MoodChips";
import { MoodResults } from "@/components/MoodView";
import { BackLink } from "@/components/Rail";
import { ProfileGate } from "@/components/ui";
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
    <>
      <BackLink />
      <MoodChips current={slug} />
      <ProfileGate>
        <MoodResults slug={slug} />
      </ProfileGate>
    </>
  );
}
