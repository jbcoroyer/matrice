export const fmt = (n: number | null | undefined, d = 2) => {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
};

export const eur = (n: number) => `${fmt(n)} €`;
export const eurInt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
