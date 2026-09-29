import type { Metadata } from "next";
import { MoodTiles } from "@/components/MoodView";
import { SecHead } from "@/components/ui";

export const metadata: Metadata = { title: "Humeurs" };

export default function Page() {
  return (
    <div>
      <section className="section">
        <SecHead as="h1" title="Humeurs" aside="Choisis une ambiance : la recherche se fait en direct sur TMDB" />
        <MoodTiles />
      </section>
    </div>
  );
}
