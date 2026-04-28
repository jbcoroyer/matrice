"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Check, Rocket, RotateCcw, Save, Tag, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, KpiCard, NumberField, PercentField, StatRow, TabButton } from "@/components/ui/primitives";
import {
  CHANNELS,
  DEFAULTS,
  Params,
  computeFixedCosts,
  computeLandedCost,
  computeMaxBidJpy,
  computeMinSellPrice,
  computeMonthlyDashboard,
  computeNetMargin,
  computeOpsCost,
  simulateRoadmap,
} from "@/lib/rentabilite/domain";
import { eur, eurInt, pct } from "@/lib/rentabilite/format";
import { getStoredParams, setStoredParams } from "@/lib/storage";

type Tab = "landed" | "pricing" | "dashboard" | "roadmap";

export default function Page() {
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [tab, setTab] = useState<Tab>("landed");
  const [saved, setSaved] = useState(false);
  const upd = <K extends keyof Params>(k: K, v: Params[K]) => setParams((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    (async () => {
      const savedParams = await getStoredParams<Partial<Params>>("matrix-v4-next");
      if (savedParams) setParams((prev) => ({ ...prev, ...savedParams }));
    })();
  }, []);

  const save = async () => {
    await setStoredParams("matrix-v4-next", params);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const reset = () => {
    if (window.confirm("Reinitialiser les valeurs par defaut ?")) setParams(DEFAULTS);
  };

  const landed = useMemo(() => computeLandedCost(params), [params]);
  const ops = useMemo(() => computeOpsCost(params), [params]);
  const fixedCosts = useMemo(() => computeFixedCosts(params), [params]);
  const dashboard = useMemo(() => computeMonthlyDashboard(params, fixedCosts), [params, fixedCosts]);
  const roadmap = useMemo(() => simulateRoadmap(params, fixedCosts), [params, fixedCosts]);
  const maxBidJpy = useMemo(() => computeMaxBidJpy(params, params.targetSellPriceEur, "chrono24"), [params]);

  const pricingTable = useMemo(() => {
    return (Object.keys(CHANNELS) as Array<keyof typeof CHANNELS>).map((ch) => {
      const minPrice = computeMinSellPrice(landed.total, ch, params.targetMarginNet, ops, params.failureProvision);
      const margin = minPrice ? computeNetMargin(minPrice, landed.total, ops, ch, params.failureProvision) : null;
      return { channel: ch, minPrice, margin };
    });
  }, [landed.total, ops, params.targetMarginNet, params.failureProvision]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>Matrice Rentabilite Horlogere</h1>
          <p>UI premium minimaliste: claire, spacieuse, et rapide a manipuler.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={save}>
            {saved ? <Check size={14} /> : <Save size={14} />} {saved ? "Sauve" : "Sauvegarder"}
          </button>
          <button className="btn" onClick={reset}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      <nav className="tabs">
        <TabButton active={tab === "landed"} onClick={() => setTab("landed")} icon={ArrowRightLeft} label="Sourcing IOSS" />
        <TabButton active={tab === "pricing"} onClick={() => setTab("pricing")} icon={Tag} label="Distribution" />
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={TrendingUp} label="Operations" />
        <TabButton active={tab === "roadmap"} onClick={() => setTab("roadmap")} icon={Rocket} label="Roadmap 24 mois" />
      </nav>

      {tab === "landed" && (
        <>
          <section className="kpi-grid">
            <KpiCard label="Prix achat" value={`${params.watchPriceJpy.toLocaleString("fr-FR")} JPY`} />
            <KpiCard label="Landed Cost" value={eur(landed.total)} highlight />
            <KpiCard label="Enchere max" value={`${Math.floor(maxBidJpy).toLocaleString("fr-FR")} JPY`} />
          </section>

          <section className="main-grid">
            <div className="stack">
              <Card title="Sourcing" subtitle="Achat direct et reverse">
                <NumberField label="Prix montre" value={params.watchPriceJpy} onChange={(v) => upd("watchPriceJpy", v)} suffix="JPY" />
                <NumberField label="Taux JPY/EUR" value={params.jpyEur} onChange={(v) => upd("jpyEur", v)} step={0.0001} />
                <NumberField label="Port moyen" value={params.shippingPerWatchJpy} onChange={(v) => upd("shippingPerWatchJpy", v)} suffix="JPY" />
                <PercentField label="Friction bancaire" value={params.frictionRate} onChange={(v) => upd("frictionRate", v)} />
                <PercentField label="TVA" value={params.vatRate} onChange={(v) => upd("vatRate", v)} />
              </Card>
            </div>
            <div className="stack">
              <Card title="Decomposition landed cost">
                <StatRow label="Prix converti EUR" value={eur(landed.priceEur)} />
                <StatRow label="Friction" value={eur(landed.frictionFee)} />
                <StatRow label="ZenMarket" value={eur(landed.zenmarketFeeEur)} />
                <StatRow label="Shipping" value={eur(landed.shippingEur)} />
                <StatRow label="TVA" value={eur(landed.vat)} />
                <StatRow label="TPC" value={eur(landed.tpcTaxEur)} />
                <StatRow label="Total" value={eur(landed.total)} strong />
              </Card>
            </div>
          </section>
        </>
      )}

      {tab === "pricing" && (
        <section className="main-grid">
          <div className="stack">
            <Card title="Parametres operations">
              <NumberField label="Intervention horloger" value={params.interventionEur} onChange={(v) => upd("interventionEur", v)} suffix="€" />
              <NumberField label="Emballage" value={params.packaging} onChange={(v) => upd("packaging", v)} suffix="€" />
              <NumberField label="Expedition sortante" value={params.shippingOutbound} onChange={(v) => upd("shippingOutbound", v)} suffix="€" />
              <PercentField label="Provision echec" value={params.failureProvision} onChange={(v) => upd("failureProvision", v)} />
              <PercentField label="Marge cible" value={params.targetMarginNet} onChange={(v) => upd("targetMarginNet", v)} />
            </Card>
          </div>
          <div className="stack">
            <Card title="Prix de vente minimum par canal">
              <table className="table">
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th>Prix min</th>
                    <th>Frais</th>
                    <th>Profit</th>
                    <th>Marge</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTable.map((row) => (
                    <tr key={row.channel}>
                      <td>{CHANNELS[row.channel].label}</td>
                      <td>{row.minPrice ? eur(row.minPrice) : "—"}</td>
                      <td>{row.margin ? eur(row.margin.channelFee) : "—"}</td>
                      <td>{row.margin ? eur(row.margin.profit) : "—"}</td>
                      <td>{row.margin ? pct(row.margin.marginNet) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </section>
      )}

      {tab === "dashboard" && (
        <>
          <section className="kpi-grid">
            <KpiCard label="CA mensuel" value={eurInt(dashboard.monthlyCA)} />
            <KpiCard label="Marge brute" value={eurInt(dashboard.monthlyProfitBrut)} />
            <KpiCard label="Salaire net dispo" value={eurInt(dashboard.netSalary)} highlight sub={dashboard.statusNote} />
          </section>
          <section className="main-grid">
            <div className="stack">
              <Card title="Hypotheses mensuelles">
                <NumberField label="Volume mensuel" value={params.monthlyVolume} onChange={(v) => upd("monthlyVolume", v)} />
                <NumberField label="Ticket achat moyen JPY" value={params.avgWatchPriceJpy} onChange={(v) => upd("avgWatchPriceJpy", v)} />
                <NumberField label="Mix Vinted %" value={params.mixVinted} onChange={(v) => upd("mixVinted", v)} />
                <NumberField label="Mix LeBonCoin %" value={params.mixLeboncoin} onChange={(v) => upd("mixLeboncoin", v)} />
                <NumberField label="Mix Chrono24 %" value={params.mixChrono24} onChange={(v) => upd("mixChrono24", v)} />
              </Card>
            </div>
            <div className="stack">
              <Card title="P&L mensuel">
                <StatRow label="Chiffre d'affaires" value={eur(dashboard.monthlyCA)} />
                <StatRow label="Marge brute" value={eur(dashboard.monthlyProfitBrut)} />
                <StatRow label="Charges fixes" value={eur(dashboard.fixedCosts)} />
                <StatRow label="Cotisations" value={eur(dashboard.cotisations)} />
                <StatRow label="Salaire net" value={eur(dashboard.netSalary)} strong />
              </Card>
            </div>
          </section>
        </>
      )}

      {tab === "roadmap" && (
        <section className="main-grid">
          <div className="stack">
            <Card title="Parametres roadmap">
              <NumberField label="Capital initial" value={params.initialCapital} onChange={(v) => upd("initialCapital", v)} suffix="€" />
              <NumberField label="Rotation (jours)" value={params.rotationDays} onChange={(v) => upd("rotationDays", v)} />
              <NumberField label="Phase reinvestissement 1 (mois)" value={params.reinvestPhase1Months} onChange={(v) => upd("reinvestPhase1Months", v)} />
              <PercentField label="Taux reinvest phase 1" value={params.reinvestRate1} onChange={(v) => upd("reinvestRate1", v)} />
              <PercentField label="Taux reinvest phase 2" value={params.reinvestRate2} onChange={(v) => upd("reinvestRate2", v)} />
              <NumberField label="Salaire cible" value={params.targetSalary} onChange={(v) => upd("targetSalary", v)} suffix="€" />
            </Card>
          </div>
          <div className="stack">
            <Card title="Projection 24 mois">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={roadmap}>
                    <defs>
                      <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2d6cff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2d6cff" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf0f7" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="capital" stroke="#2d6cff" fill="url(#cap)" />
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
