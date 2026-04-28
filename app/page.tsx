"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  Package,
  Rocket,
  RotateCcw,
  Save,
  Tag,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, KpiCard, NumberField, PercentField, StatRow, TabButton } from "@/components/ui/primitives";
import {
  DEFAULTS,
  DEFAULT_CHANNELS,
  Params,
  RealPackage,
  WatchInPackage,
  ChannelKey,
  SourcingMode,
  computeFixedCosts,
  computeMaxBuyJpy,
  computeMinSellPrice,
  computeMonthlyDashboard,
  computeNetMargin,
  computePlanningLanded,
  computeWatchLandedReal,
  simulateRoadmap,
  aggregatePackages,
} from "@/lib/rentabilite/domain";
import { eur, eurInt, pct } from "@/lib/rentabilite/format";
import { getStoredParams, setStoredParams } from "@/lib/storage";

type Tab = "direct" | "enchere" | "colis" | "dashboard" | "roadmap";

const CHANNEL_KEYS: ChannelKey[] = ["vinted", "leboncoin", "chrono24"];
const CARRIERS = ["EMS", "ECMS_EXPRESS", "AVIA_SMALL", "DHL", "Autre"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function jpy(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} ¥`;
}

// ─── Watch row inside a package ────────────────────────────────────────────

function WatchRow({
  watch,
  pkg,
  params,
  onChange,
  onDelete,
}: {
  watch: WatchInPackage;
  pkg: RealPackage;
  params: Params;
  onChange: (w: WatchInPackage) => void;
  onDelete: () => void;
}) {
  const landed = useMemo(() => computeWatchLandedReal(pkg, watch), [pkg, watch]);
  const upd = <K extends keyof WatchInPackage>(k: K, v: WatchInPackage[K]) =>
    onChange({ ...watch, [k]: v });

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 }}>
      <div className="pkg-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <label className="field">
          <span className="field-label">Référence</span>
          <input
            className="text-input"
            value={watch.reference}
            onChange={(e) => upd("reference", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Mode</span>
          <select
            className="select"
            value={watch.sourcingMode}
            onChange={(e) => {
              const mode = e.target.value as SourcingMode;
              const fee = mode === "direct" ? params.zenmarketDirectJpy : params.zenmarketAuctionJpy;
              onChange({ ...watch, sourcingMode: mode, zenmarketFeeJpy: fee });
            }}
          >
            <option value="direct">Achat direct</option>
            <option value="auction">Enchère</option>
          </select>
        </label>
        <NumberField
          label="Prix achat (¥)"
          value={watch.priceJpy}
          onChange={(v) => upd("priceJpy", v)}
        />
        <NumberField
          label="Frais ZenMarket (¥)"
          value={watch.zenmarketFeeJpy}
          onChange={(v) => upd("zenmarketFeeJpy", v)}
        />
        <NumberField
          label="Intervention (€)"
          value={watch.interventionEur}
          onChange={(v) => upd("interventionEur", v)}
          suffix="€"
        />
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}>
            Landed cost réel :{" "}
            <strong style={{ color: "var(--text)" }}>{eur(landed.total)}</strong>
            <span style={{ marginLeft: 12, opacity: 0.7 }}>
              (prix {eur(landed.priceEur)} · zen {eur(landed.zenFeeEur)} · envoi{" "}
              {eur(landed.shippingShareEur)} · TVA {eur(landed.vatShareEur)} · Wise{" "}
              {eur(landed.wiseShareEur)} · interv. {eur(landed.interventionEur)})
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {CHANNEL_KEYS.map((ch) => {
              const min = computeMinSellPrice(params, ch, landed.total);
              return (
                <span key={ch} style={{ fontSize: "0.82rem" }}>
                  <strong>{params.channels[ch].label}</strong> min{" "}
                  <span style={{ color: "var(--accent)" }}>{min ? eur(min) : "—"}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <label className="field" style={{ marginBottom: 0, minWidth: 100 }}>
            <span className="field-label">Vendu sur</span>
            <select
              className="select"
              value={watch.soldChannel ?? ""}
              onChange={(e) =>
                upd("soldChannel", e.target.value ? (e.target.value as ChannelKey) : null)
              }
            >
              <option value="">Non vendu</option>
              {CHANNEL_KEYS.map((ch) => (
                <option key={ch} value={ch}>
                  {params.channels[ch].label}
                </option>
              ))}
            </select>
          </label>
          {watch.soldChannel && (
            <NumberField
              label="Prix vente (€)"
              value={watch.soldPriceEur ?? 0}
              onChange={(v) => upd("soldPriceEur", v)}
              suffix="€"
            />
          )}
          {watch.soldChannel && watch.soldPriceEur && watch.soldPriceEur > 0 && (() => {
            const m = computeNetMargin(params, watch.soldChannel, watch.soldPriceEur, landed.total);
            const color = m.marginNet >= params.targetMarginNet ? "#2d7d46" : "#b94a4a";
            return (
              <div style={{ fontSize: "0.82rem", alignSelf: "flex-end", paddingBottom: 4 }}>
                Profit{" "}
                <strong style={{ color }}>{eur(m.profit)}</strong>{" "}
                <span style={{ color }}>{pct(m.marginNet)}</span>
              </div>
            );
          })()}
          <button className="btn-link btn-danger" onClick={onDelete} style={{ alignSelf: "flex-end", paddingBottom: 4 }}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single package card ────────────────────────────────────────────────────

function PackageCard({
  pkg,
  params,
  onChange,
  onDelete,
}: {
  pkg: RealPackage;
  params: Params;
  onChange: (p: RealPackage) => void;
  onDelete: () => void;
}) {
  const upd = <K extends keyof RealPackage>(k: K, v: RealPackage[K]) =>
    onChange({ ...pkg, [k]: v });

  const updWatch = (idx: number, w: WatchInPackage) => {
    const watches = [...pkg.watches];
    watches[idx] = w;
    onChange({ ...pkg, watches });
  };

  const removeWatch = (idx: number) => {
    const watches = pkg.watches.filter((_, i) => i !== idx);
    onChange({ ...pkg, watches });
  };

  const addWatch = () => {
    const newWatch: WatchInPackage = {
      id: uid(),
      reference: "",
      sourcingMode: "direct",
      priceJpy: 0,
      zenmarketFeeJpy: params.zenmarketDirectJpy,
      interventionEur: params.defaultInterventionEur,
      soldChannel: null,
      soldPriceEur: null,
    };
    onChange({ ...pkg, watches: [...pkg.watches, newWatch] });
  };

  const totalLanded = pkg.watches.reduce(
    (s, w) => s + computeWatchLandedReal(pkg, w).total,
    0
  );

  return (
    <div className="pkg-card">
      <div className="pkg-head">
        <div>
          <h3>{pkg.reference || "Nouveau colis"}</h3>
          <span className="meta">
            {pkg.carrier} · {pkg.shippedAt} · {pkg.watches.length} montre(s)
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            Landed total :{" "}
            <strong style={{ color: "var(--text)" }}>{eur(totalLanded)}</strong>
          </span>
          <button className="btn-link btn-danger" onClick={onDelete}>
            Supprimer colis
          </button>
        </div>
      </div>

      <div className="pkg-grid">
        <label className="field">
          <span className="field-label">Référence colis</span>
          <input
            className="text-input"
            value={pkg.reference}
            onChange={(e) => upd("reference", e.target.value)}
            placeholder="ECZEN…"
          />
        </label>
        <label className="field">
          <span className="field-label">Transporteur</span>
          <select
            className="select"
            value={pkg.carrier}
            onChange={(e) => upd("carrier", e.target.value)}
          >
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Date envoi</span>
          <input
            className="text-input"
            type="date"
            value={pkg.shippedAt}
            onChange={(e) => upd("shippedAt", e.target.value)}
          />
        </label>
        <NumberField
          label="Taux JPY/EUR"
          value={pkg.jpyEur}
          onChange={(v) => upd("jpyEur", v)}
          step={0.0001}
        />
        <NumberField
          label="Envoi (¥)"
          value={pkg.shippingJpy}
          onChange={(v) => upd("shippingJpy", v)}
        />
        <NumberField
          label="TVA payée (¥)"
          value={pkg.vatJpy}
          onChange={(v) => upd("vatJpy", v)}
        />
        <NumberField
          label="Frais Wise (€)"
          value={pkg.wiseFeeEur}
          onChange={(v) => upd("wiseFeeEur", v)}
          suffix="€"
        />
      </div>

      {pkg.watches.map((w, i) => (
        <WatchRow
          key={w.id}
          watch={w}
          pkg={pkg}
          params={params}
          onChange={(updated) => updWatch(i, updated)}
          onDelete={() => removeWatch(i)}
        />
      ))}

      <button className="btn" style={{ marginTop: 14 }} onClick={addWatch}>
        + Ajouter une montre
      </button>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function Page() {
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [packages, setPackages] = useState<RealPackage[]>([]);
  const [tab, setTab] = useState<Tab>("direct");
  const [saved, setSaved] = useState(false);

  const upd = <K extends keyof Params>(k: K, v: Params[K]) =>
    setParams((prev) => ({ ...prev, [k]: v }));

  const updChannel = (ch: ChannelKey, field: string, value: number) =>
    setParams((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [ch]: { ...prev.channels[ch], [field]: value },
      },
    }));

  useEffect(() => {
    (async () => {
      const savedParams = await getStoredParams<Partial<Params>>("matrix-v5-params");
      if (savedParams) setParams((prev) => ({ ...prev, ...savedParams }));
      const savedPkgs = await getStoredParams<RealPackage[]>("matrix-v5-packages");
      if (savedPkgs) setPackages(savedPkgs);
    })();
  }, []);

  const save = async () => {
    await Promise.all([
      setStoredParams("matrix-v5-params", params),
      setStoredParams("matrix-v5-packages", packages),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const reset = () => {
    if (window.confirm("Réinitialiser les paramètres par défaut ?")) {
      setParams(DEFAULTS);
    }
  };

  const addPackage = useCallback(() => {
    const newPkg: RealPackage = {
      id: uid(),
      reference: "",
      carrier: "EMS",
      shippedAt: new Date().toISOString().slice(0, 10),
      shippingJpy: 3000,
      vatJpy: 0,
      jpyEur: params.jpyEur,
      wiseFeeEur: 0,
      watches: [],
    };
    setPackages((prev) => [newPkg, ...prev]);
  }, [params.jpyEur]);

  const updatePackage = useCallback((id: string, updated: RealPackage) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const deletePackage = useCallback((id: string) => {
    if (window.confirm("Supprimer ce colis ?")) {
      setPackages((prev) => prev.filter((p) => p.id !== id));
    }
  }, []);

  // ── Planning computations ──
  const fixedCosts = useMemo(() => computeFixedCosts(params), [params]);
  const dashboard = useMemo(() => computeMonthlyDashboard(params, fixedCosts), [params, fixedCosts]);
  const roadmap = useMemo(() => simulateRoadmap(params, fixedCosts), [params, fixedCosts]);
  const pkgStats = useMemo(() => aggregatePackages(packages, params), [packages, params]);

  // Pre-purchase rows for direct / auction
  const prepurchaseRows = (mode: SourcingMode) =>
    CHANNEL_KEYS.map((ch) => {
      const targetSell =
        ch === "vinted"
          ? params.targetSellPriceVinted
          : ch === "leboncoin"
          ? params.targetSellPriceLeboncoin
          : params.targetSellPriceChrono24;
      const maxBuy = computeMaxBuyJpy(params, ch, targetSell, mode, params.defaultInterventionEur);
      const landedAtMax = computePlanningLanded(params, maxBuy, mode, params.defaultInterventionEur);
      const margin = computeNetMargin(params, ch, targetSell, landedAtMax.total);
      return { ch, targetSell, maxBuy, landedAtMax, margin };
    });

  const directRows = useMemo(() => prepurchaseRows("direct"), [params]);
  const auctionRows = useMemo(() => prepurchaseRows("auction"), [params]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>Matrice Rentabilité Horlogère</h1>
          <p>Sourcing Japon · IOSS · Colis réels · Distribution multi-canal</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={save}>
            {saved ? <Check size={14} /> : <Save size={14} />}{" "}
            {saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
          <button className="btn" onClick={reset}>
            <RotateCcw size={14} /> Reset params
          </button>
        </div>
      </header>

      <nav className="tabs">
        <TabButton active={tab === "direct"} onClick={() => setTab("direct")} icon={ArrowRightLeft} label="Achat direct" />
        <TabButton active={tab === "enchere"} onClick={() => setTab("enchere")} icon={Tag} label="Enchère" />
        <TabButton active={tab === "colis"} onClick={() => setTab("colis")} icon={Package} label={`Colis (${packages.length})`} />
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={TrendingUp} label="Dashboard" />
        <TabButton active={tab === "roadmap"} onClick={() => setTab("roadmap")} icon={Rocket} label="Roadmap 24 mois" />
      </nav>

      {/* ── ACHAT DIRECT ── */}
      {(tab === "direct" || tab === "enchere") && (() => {
        const mode: SourcingMode = tab === "direct" ? "direct" : "auction";
        const rows = tab === "direct" ? directRows : auctionRows;
        const zenFee = mode === "direct" ? params.zenmarketDirectJpy : params.zenmarketAuctionJpy;
        const zenKey = mode === "direct" ? "zenmarketDirectJpy" : "zenmarketAuctionJpy";
        return (
          <>
            <section className="kpi-grid">
              <KpiCard
                label="Taux JPY/EUR"
                value={`1 ¥ = ${params.jpyEur.toFixed(4)} €`}
              />
              <KpiCard
                label="Frais ZenMarket"
                value={jpy(zenFee)}
                highlight
              />
              <KpiCard
                label="Landed estimé (ticket moyen)"
                value={eur(computePlanningLanded(params, params.avgWatchPriceJpy, mode, params.defaultInterventionEur).total)}
              />
            </section>

            <section className="main-grid">
              <div className="stack">
                <Card title="Hypothèses planning" subtitle="Partagées entre direct et enchère">
                  <NumberField label="Taux JPY/EUR" value={params.jpyEur} onChange={(v) => upd("jpyEur", v)} step={0.0001} />
                  <PercentField label="Frais Wise (taux estimé)" value={params.wiseFeeRate} onChange={(v) => upd("wiseFeeRate", v)} />
                  <NumberField label={`Frais ZenMarket ${mode === "direct" ? "direct" : "enchère"} (¥)`} value={zenFee} onChange={(v) => upd(zenKey as keyof Params, v as Params[keyof Params])} />
                  <NumberField label="Colis : nbre moyen montres" value={params.expectedPkgWatches} onChange={(v) => upd("expectedPkgWatches", v)} />
                  <NumberField label="Colis : envoi moyen (¥)" value={params.expectedPkgShippingJpy} onChange={(v) => upd("expectedPkgShippingJpy", v)} />
                  <NumberField label="Intervention défaut (€)" value={params.defaultInterventionEur} onChange={(v) => upd("defaultInterventionEur", v)} suffix="€" />
                  <NumberField label="Emballage sortant (€)" value={params.packaging} onChange={(v) => upd("packaging", v)} suffix="€" />
                  <PercentField label="Marge nette cible" value={params.targetMarginNet} onChange={(v) => upd("targetMarginNet", v)} />
                  <PercentField label="Provision échec vente" value={params.failureProvision} onChange={(v) => upd("failureProvision", v)} />
                </Card>

                <Card title="Prix de vente cibles (par canal)">
                  {CHANNEL_KEYS.map((ch) => {
                    const targetKey =
                      ch === "vinted" ? "targetSellPriceVinted"
                      : ch === "leboncoin" ? "targetSellPriceLeboncoin"
                      : "targetSellPriceChrono24";
                    const val =
                      ch === "vinted" ? params.targetSellPriceVinted
                      : ch === "leboncoin" ? params.targetSellPriceLeboncoin
                      : params.targetSellPriceChrono24;
                    return (
                      <NumberField
                        key={ch}
                        label={`${params.channels[ch].label} — prix vente cible (€)`}
                        value={val}
                        onChange={(v) => upd(targetKey as keyof Params, v as Params[keyof Params])}
                        suffix="€"
                      />
                    );
                  })}
                </Card>
              </div>

              <div className="stack">
                <Card title={`Enchère max par canal — mode ${mode === "direct" ? "Achat direct (800 ¥)" : "Enchère (500 ¥)"}`}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Canal</th>
                        <th>Vente cible</th>
                        <th>Achat max (¥)</th>
                        <th>Achat max (€)</th>
                        <th>Landed estimé</th>
                        <th>Marge nette</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ ch, targetSell, maxBuy, landedAtMax, margin }) => (
                        <tr key={ch}>
                          <td><strong>{params.channels[ch].label}</strong></td>
                          <td>{eur(targetSell)}</td>
                          <td style={{ color: "var(--accent)", fontWeight: 700 }}>{jpy(maxBuy)}</td>
                          <td>{eur(maxBuy * params.jpyEur)}</td>
                          <td>{eur(landedAtMax.total)}</td>
                          <td style={{ color: margin.marginNet >= params.targetMarginNet ? "#2d7d46" : "#b94a4a" }}>
                            {pct(margin.marginNet)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card title="Commissions canaux">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Canal</th>
                        <th>Commission %</th>
                        <th>Frais fixes (€)</th>
                        <th>Expédition sortante (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHANNEL_KEYS.map((ch) => (
                        <tr key={ch}>
                          <td><strong>{params.channels[ch].label}</strong></td>
                          <td>
                            <input
                              type="number"
                              className="input"
                              style={{ width: 70 }}
                              value={(params.channels[ch].commission * 100).toFixed(1)}
                              step={0.5}
                              onChange={(e) => updChannel(ch, "commission", parseFloat(e.target.value) / 100 || 0)}
                            />
                            <span style={{ marginLeft: 4, color: "var(--muted)" }}>%</span>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input"
                              style={{ width: 70 }}
                              value={params.channels[ch].flat}
                              onChange={(e) => updChannel(ch, "flat", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input"
                              style={{ width: 70 }}
                              value={params.channels[ch].shippingOutbound}
                              onChange={(e) => updChannel(ch, "shippingOutbound", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </section>
          </>
        );
      })()}

      {/* ── COLIS ── */}
      {tab === "colis" && (
        <>
          <section className="kpi-grid">
            <KpiCard label="Montres totales" value={`${pkgStats.watches}`} />
            <KpiCard label="Vendues" value={`${pkgStats.watches - pkgStats.unsold}`} />
            <KpiCard label="Profit réel" value={eur(pkgStats.totalProfit)} highlight />
            <KpiCard label="Marge nette moy." value={pct(pkgStats.avgMarginNet)} />
          </section>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
              {packages.length === 0 ? "Aucun colis" : `${packages.length} colis`}
            </h2>
            <button className="btn primary" onClick={addPackage}>
              + Nouveau colis
            </button>
          </div>

          {packages.length === 0 && (
            <div className="empty">
              Aucun colis enregistré. Cliquez sur &quot;+ Nouveau colis&quot; pour commencer.
            </div>
          )}

          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              params={params}
              onChange={(updated) => updatePackage(pkg.id, updated)}
              onDelete={() => deletePackage(pkg.id)}
            />
          ))}
        </>
      )}

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && (
        <>
          <section className="kpi-grid">
            <KpiCard label="CA mensuel (planning)" value={eurInt(dashboard.monthlyCA)} />
            <KpiCard label="Profit brut mensuel" value={eurInt(dashboard.monthlyProfitBrut)} />
            <KpiCard label="Salaire net estimé" value={eurInt(dashboard.netSalary)} highlight sub={dashboard.statusNote} />
          </section>

          <section className="main-grid">
            <div className="stack">
              <Card title="Hypothèses mensuelles">
                <NumberField label="Volume mensuel" value={params.monthlyVolume} onChange={(v) => upd("monthlyVolume", v)} />
                <NumberField label="Ticket achat moyen (¥)" value={params.avgWatchPriceJpy} onChange={(v) => upd("avgWatchPriceJpy", v)} />
                <NumberField label="Mix Vinted %" value={params.mixVinted} onChange={(v) => upd("mixVinted", v)} />
                <NumberField label="Mix LeBonCoin %" value={params.mixLeboncoin} onChange={(v) => upd("mixLeboncoin", v)} />
                <NumberField label="Mix Chrono24 %" value={params.mixChrono24} onChange={(v) => upd("mixChrono24", v)} />
              </Card>

              <Card title="Charges fixes">
                <NumberField label="RC Pro + Assurance (€/mois)" value={params.rcProAssurance} onChange={(v) => upd("rcProAssurance", v)} suffix="€" />
                <NumberField label="Stockage sécurisé (€/mois)" value={params.storageMonthly} onChange={(v) => upd("storageMonthly", v)} suffix="€" />
                <NumberField label="Chrono24 abonnement (€/mois)" value={params.chrono24Sub} onChange={(v) => upd("chrono24Sub", v)} suffix="€" />
                <NumberField label="Amort. outillage (€/mois)" value={params.toolsAmort} onChange={(v) => upd("toolsAmort", v)} suffix="€" />
                <label className="field">
                  <span className="field-label">Statut juridique</span>
                  <select
                    className="select"
                    value={params.legalStatus}
                    onChange={(e) => upd("legalStatus", e.target.value as "micro" | "sasu")}
                  >
                    <option value="micro">Micro-entreprise</option>
                    <option value="sasu">SASU / EURL</option>
                  </select>
                </label>
                {params.legalStatus === "sasu" && (
                  <NumberField label="Compta (€/mois)" value={params.comptaSasu} onChange={(v) => upd("comptaSasu", v)} suffix="€" />
                )}
              </Card>
            </div>

            <div className="stack">
              <Card title="P&L mensuel (planning)">
                <StatRow label="CA" value={eur(dashboard.monthlyCA)} />
                <StatRow label="Profit brut" value={eur(dashboard.monthlyProfitBrut)} />
                <StatRow label="Charges fixes" value={eur(dashboard.fixedCosts)} />
                <StatRow label="Cotisations" value={eur(dashboard.cotisations)} />
                <StatRow label="Salaire net" value={eur(dashboard.netSalary)} strong />
              </Card>

              {packages.length > 0 && (
                <Card title="P&L réel (colis saisis)">
                  <StatRow label="Montres totales" value={`${pkgStats.watches}`} />
                  <StatRow label="Landed total" value={eur(pkgStats.totalLanded)} />
                  <StatRow label="CA réel (vendues)" value={eur(pkgStats.totalSold)} />
                  <StatRow label="Commissions canaux" value={eur(pkgStats.totalChannelFees)} />
                  <StatRow label="Profit réel" value={eur(pkgStats.totalProfit)} strong />
                  <StatRow label="Marge nette moy." value={pct(pkgStats.avgMarginNet)} />
                  {pkgStats.unsold > 0 && (
                    <StatRow
                      label={`Stock non vendu (${pkgStats.unsold} montres)`}
                      value={eur(pkgStats.unsoldLanded)}
                    />
                  )}
                </Card>
              )}
            </div>
          </section>
        </>
      )}

      {/* ── ROADMAP ── */}
      {tab === "roadmap" && (
        <section className="main-grid">
          <div className="stack">
            <Card title="Paramètres roadmap">
              <NumberField label="Capital initial" value={params.initialCapital} onChange={(v) => upd("initialCapital", v)} suffix="€" />
              <NumberField label="Rotation (jours)" value={params.rotationDays} onChange={(v) => upd("rotationDays", v)} />
              <NumberField label="Phase réinvestissement 1 (mois)" value={params.reinvestPhase1Months} onChange={(v) => upd("reinvestPhase1Months", v)} />
              <PercentField label="Taux réinvest phase 1" value={params.reinvestRate1} onChange={(v) => upd("reinvestRate1", v)} />
              <PercentField label="Taux réinvest phase 2" value={params.reinvestRate2} onChange={(v) => upd("reinvestRate2", v)} />
              <NumberField label="Salaire cible" value={params.targetSalary} onChange={(v) => upd("targetSalary", v)} suffix="€" />
            </Card>
          </div>
          <div className="stack">
            <Card title="Projection 24 mois — capital">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={roadmap}>
                    <defs>
                      <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9f7a52" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#9f7a52" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e6d9c8" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(v: unknown) => [`${Number(v).toLocaleString("fr-FR")} €`]} />
                    <Area type="monotone" dataKey="capital" stroke="#9f7a52" fill="url(#cap)" name="Capital" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
