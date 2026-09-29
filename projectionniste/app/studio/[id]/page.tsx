import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { StudioFilms } from "@/components/StudioFilms";
import { truncate } from "@/lib/format";
import { img } from "@/lib/tmdb";
import { tmdbFetch, TmdbError } from "@/lib/tmdb-server";

type Props = { params: Promise<{ id: string }> };
type Company = { id: number; name: string; logo_path: string | null; headquarters?: string; origin_country?: string; description?: string; parent_company?: { id: number; name: string } | null };

const getCompany = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  try {
    return await tmdbFetch<Company>(`company/${id}`);
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getCompany(id).catch(() => null);
  if (!c) return { title: "Studio introuvable" };
  return { title: c.name, description: c.description ? truncate(c.description, 200) : `Les films de ${c.name}.` };
}

const COUNTRY: Record<string, string> = { US: "États-Unis", FR: "France", GB: "Royaume-Uni", DE: "Allemagne", IT: "Italie", ES: "Espagne", JP: "Japon", KR: "Corée du Sud", CA: "Canada", BE: "Belgique", CN: "Chine", IN: "Inde", AU: "Australie", DK: "Danemark", SE: "Suède", NO: "Norvège", MX: "Mexique", BR: "Brésil", HK: "Hong Kong", IE: "Irlande", NZ: "Nouvelle-Zélande", CH: "Suisse", AT: "Autriche", NL: "Pays-Bas" };

export default async function StudioPage({ params }: Props) {
  const { id } = await params;
  const c = await getCompany(id);
  if (!c) notFound();
  const where = [c.headquarters, c.origin_country ? COUNTRY[c.origin_country] ?? c.origin_country : ""].filter(Boolean).join(" · ");
  return (
    <div>
      <section className="studio-head">
        {c.logo_path ? (
          <div className="studio-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(c.logo_path, "w500")} alt={`Logo de ${c.name}`} />
          </div>
        ) : null}
        <div>
          <p className="kicker">Studio</p>
          <h1>{c.name}</h1>
          {where ? <p className="facts">{where}</p> : null}
          {c.description ? <p className="bio clamp">{c.description}</p> : null}
        </div>
      </section>
      <StudioFilms id={c.id} name={c.name} />
    </div>
  );
}
