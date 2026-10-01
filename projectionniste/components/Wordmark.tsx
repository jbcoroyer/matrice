import { BRAND } from "@/lib/brand";

/** Le mot-marque en deux graisses (« **Film**able »). */
export function Wordmark() {
  return (
    <>
      {BRAND.strong}
      <span>{BRAND.light}</span>
    </>
  );
}
