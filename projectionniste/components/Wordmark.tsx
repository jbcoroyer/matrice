import { BRAND } from "@/lib/brand";

/** Le mot-marque en deux graisses (« **Fill**mography »). */
export function Wordmark() {
  return (
    <>
      {BRAND.strong}
      <span>{BRAND.light}</span>
    </>
  );
}
