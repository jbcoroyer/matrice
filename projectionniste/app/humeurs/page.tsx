import type { Metadata } from "next";
import { MoodTiles } from "@/components/MoodView";
import { SecHead } from "@/components/ui";

export const metadata: Metadata = { title: "Humeurs" };

export default function Page() {
  return (
    <div className="view">
      <section className="section">
        <SecHead as="h1" kicker="Selon l'envie" title={<>Humeurs <i>du soir</i></>} aside="Chaque humeur interroge TMDB en direct, puis classe par ton indice" />
        <MoodTiles />
      </section>
    </div>
  );
}
