import { splitTitle } from "@/lib/format";

/** Titre de film en deux graisses (partie forte, partie légère). */
export function TitleDuo({ title }: { title: string }) {
  const [a, b] = splitTitle(title);
  return b ? (
    <>
      {a} <span>{b}</span>
    </>
  ) : (
    <>{a}</>
  );
}
