"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Package,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Tag,
  Trash2,
  TrendingUp,
  Undo2,
} from "lucide-react";
import {
  Card,
  DateField,
  InfoTooltip,
  KpiCard,
  NumberField,
  PercentField,
  SelectField,
  StatRow,
  TabButton,
  TextField,
  ToggleField,
} from "@/components/ui/primitives";
import {
  CHANNELS,
  DEFAULTS,
  Parcel,
  Params,
  PendingWatch,
  PurchaseMode,
  WatchInParcel,
  ChannelKey,
  computeFixedCosts,
  computeLandedCost,
  computeMaxBidJpy,
  computeMinSellPrice,
  computeMonthlyDashboard,
  computeNetMargin,
  computeParcelWatchLanded,
  computeRealMonthlyPnl,
  computeWatchRealPnl,
  getShippingOut,
} from "@/lib/rentabilite/domain";
import { eur, eurInt, pct } from "@/lib/rentabilite/format";
import {
  getStoredParams,
  loadParcels,
  loadPendingWatches,
  saveParcels,
  savePendingWatches,
  setStoredParams,
} from "@/lib/storage";

type Tab = "simulator" | "colis" | "operations";

const WATCH_PROFILES = [
  { label: "Mint / NOS", value: 0, hint: "Emballage seulement" },
  { label: "Standard", value: 15, hint: "Pile, joint, nettoyage" },
  { label: "À restaurer", value: 45, hint: "Intervention importante" },
] as const;

const EMPTY_PARCEL_DRAFT = {
  ref: "",
  date: new Date().toISOString().slice(0, 10),
  carrier: "",
  freightJpy: 0,
  vatJpy: 0,
  tpcEur: 0,
  wiseFeeEur: 0,
};

const CHANNEL_OPTIONS = (Object.keys(CHANNELS) as ChannelKey[]).map((k) => ({
  value: k,
  label: CHANNELS[k].label,
}));

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function Page() {
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [tab, setTab] = useState<Tab>("simulator");
  const [saved, setSaved] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const upd = <K extends keyof Params>(k: K, v: Params[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  // Parcel state
  const [parcels, setParcelsState] = useState<Parcel[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingParcel, setAddingParcel] = useState(false);
  const [parcelDraft, setParcelDraft] = useState({ ...EMPTY_PARCEL_DRAFT });
  const [selectedForParcel, setSelectedForParcel] = useState<string[]>([]);
  const [addingWatchId, setAddingWatchId] = useState<string | null>(null);
  const [watchDraft, setWatchDraft] = useState<Omit<WatchInParcel, "id">>({
    name: "",
    priceJpy: 0,
    mode: "direct",
    zenmarketFeeJpy: DEFAULTS.zenmarketDirectJpy,
    interventionEur: DEFAULTS.interventionEur,
  });

  // Pending watches state (bought, not yet in a parcel)
  const [pendingWatches, setPendingState] = useState<PendingWatch[]>([]);
  const [addingPending, setAddingPending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Omit<PendingWatch, "id">>({
    name: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    priceJpy: 0,
    mode: "direct",
    zenmarketFeeJpy: DEFAULTS.zenmarketDirectJpy,
    interventionEur: DEFAULTS.interventionEur,
  });

  // Month selector for Operations dashboard
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Sale tracking state
  const [sellingWatchKey, setSellingWatchKey] = useState<string | null>(null);
  const [sellDraft, setSellDraft] = useState<{ salePrice: number; saleChannel: ChannelKey; saleDate: string }>({
    salePrice: 0,
    saleChannel: "chrono24",
    saleDate: new Date().toISOString().slice(0, 10),
  });
  const [rateUpdated, setRateUpdated] = useState(false);

  const updateParcels = (updated: Parcel[]) => {
    setParcelsState(updated);
    saveParcels(updated);
  };

  const updatePending = (updated: PendingWatch[]) => {
    setPendingState(updated);
    savePendingWatches(updated);
  };

  useEffect(() => {
    (async () => {
      const saved = await getStoredParams<Partial<Params>>("matrix-v5");
      if (saved) setParams((p) => ({ ...p, ...saved }));
      setParcelsState(loadParcels());
      setPendingState(loadPendingWatches());
    })();
    // Auto-fetch live JPY/EUR rate
    fetch("https://api.frankfurter.app/latest?from=JPY&to=EUR")
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.EUR;
        if (rate && typeof rate === "number") {
          setParams((p) => ({ ...p, jpyEur: rate }));
          setRateUpdated(true);
          setTimeout(() => setRateUpdated(false), 4000);
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    await setStoredParams("matrix-v5", params);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const reset = () => {
    if (window.confirm("Reinitialiser les valeurs par defaut ?")) setParams(DEFAULTS);
  };

  // ── Simulator computed ──
  const simLanded = useMemo(() => computeLandedCost(params), [params]);
  const maxBidJpy = useMemo(
    () =>
      params.simulatorMode === "auction"
        ? computeMaxBidJpy(params, params.targetSellPriceEur, params.targetSellChannel)
        : 0,
    [params]
  );
  const pricingLanded = useMemo(
    () =>
      params.simulatorMode === "auction" && maxBidJpy > 0
        ? computeLandedCost(params, maxBidJpy)
        : simLanded,
    [params, simLanded, maxBidJpy]
  );
  const pricingRows = useMemo(
    () =>
      (Object.keys(CHANNELS) as ChannelKey[]).map((ch) => {
        const ops = params.packaging + getShippingOut(params, ch) + params.interventionEur;
        const minPrice = computeMinSellPrice(
          pricingLanded.total,
          ch,
          params.targetMarginNet,
          ops,
          params.failureProvision
        );
        const margin = minPrice
          ? computeNetMargin(minPrice, pricingLanded.total, ops, ch, params.failureProvision)
          : null;
        return { ch, minPrice, margin };
      }),
    [params, pricingLanded]
  );

  // ── Ops computed ──
  const fixedCosts = useMemo(() => computeFixedCosts(params), [params]);
  const dashboard = useMemo(() => computeMonthlyDashboard(params, fixedCosts), [params, fixedCosts]);

  // ── Stock summary ──
  const stockSummary = useMemo(() => {
    const today = new Date();
    const allWatches: { watch: WatchInParcel; parcel: Parcel }[] = [];
    parcels.forEach((p) => p.watches.forEach((w) => allWatches.push({ watch: w, parcel: p })));
    const inStock = allWatches.filter((x) => !x.watch.status || x.watch.status === "stock");
    const sold = allWatches.filter((x) => x.watch.status === "vendu");
    const capitalImmobilise = inStock.reduce((sum, { watch, parcel }) => {
      const l = computeParcelWatchLanded(watch, parcel, params.jpyEur);
      return sum + l.total + watch.interventionEur;
    }, 0);
    const getAge = (watch: WatchInParcel, parcel: Parcel) => {
      const ref = watch.purchaseDate || parcel.date;
      if (!ref) return 0;
      return Math.floor((today.getTime() - new Date(ref).getTime()) / 86400000);
    };
    const stale = inStock
      .map(({ watch, parcel }) => ({ watch, parcel, ageDays: getAge(watch, parcel) }))
      .filter((x) => x.ageDays > 60);
    const avgAge = inStock.length > 0
      ? Math.round(inStock.reduce((s, { watch, parcel }) => s + getAge(watch, parcel), 0) / inStock.length)
      : 0;
    return { inStock: inStock.length, sold: sold.length, capitalImmobilise, stale, avgAge };
  }, [parcels, params.jpyEur]);

  // ── Real P&L (sold watches) ──
  const realPnl = useMemo(() => {
    const soldItems: { watch: WatchInParcel; parcel: Parcel; pnl: ReturnType<typeof computeWatchRealPnl> }[] = [];
    parcels.forEach((parcel) =>
      parcel.watches.forEach((watch) => {
        if (watch.status === "vendu") soldItems.push({ watch, parcel, pnl: computeWatchRealPnl(watch, parcel, params) });
      })
    );
    const totalCA = soldItems.reduce((s, x) => s + (x.watch.salePrice ?? 0), 0);
    const totalProfit = soldItems.reduce((s, x) => s + (x.pnl?.profit ?? 0), 0);
    const avgMargin = totalCA > 0 ? totalProfit / totalCA : 0;
    return { soldItems, totalCA, totalProfit, avgMargin };
  }, [parcels, params]);

  // ── Real monthly P&L for selected month ──
  const realMonthly = useMemo(
    () => computeRealMonthlyPnl(parcels, selectedMonth, params),
    [parcels, selectedMonth, params]
  );

  // ── Month navigation helpers ──
  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = new Date(selectedMonth + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // ── Pending watch handlers ──
  const setPendingMode = (mode: PurchaseMode) => {
    setPendingDraft((d) => ({
      ...d,
      mode,
      zenmarketFeeJpy: mode === "direct" ? params.zenmarketDirectJpy : params.zenmarketAuctionJpy,
    }));
  };

  const addPendingWatch = () => {
    if (pendingDraft.priceJpy <= 0) return;
    const w: PendingWatch = { id: newId(), ...pendingDraft };
    updatePending([w, ...pendingWatches]);
    setAddingPending(false);
    setPendingDraft({
      name: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      priceJpy: 0,
      mode: "direct",
      zenmarketFeeJpy: params.zenmarketDirectJpy,
      interventionEur: params.interventionEur,
    });
  };

  const deletePendingWatch = (id: string) => {
    updatePending(pendingWatches.filter((w) => w.id !== id));
    setSelectedForParcel((s) => s.filter((sid) => sid !== id));
  };

  const toggleParcelSelection = (id: string) => {
    setSelectedForParcel((s) =>
      s.includes(id) ? s.filter((sid) => sid !== id) : [...s, id]
    );
  };

  // ── Parcel handlers ──
  const addParcel = () => {
    if (!parcelDraft.ref) return;
    const selectedWatches: WatchInParcel[] = pendingWatches
      .filter((pw) => selectedForParcel.includes(pw.id))
      .map(({ ...rest }) => ({ ...rest, status: "stock" as const }));
    const p: Parcel = { id: newId(), ...parcelDraft, watches: selectedWatches };
    updateParcels([p, ...parcels]);
    updatePending(pendingWatches.filter((pw) => !selectedForParcel.includes(pw.id)));
    setSelectedForParcel([]);
    setAddingParcel(false);
    setParcelDraft({ ...EMPTY_PARCEL_DRAFT });
    setExpandedId(p.id);
  };

  const deleteParcel = (id: string) => {
    updateParcels(parcels.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const setWatchMode = (mode: PurchaseMode) => {
    setWatchDraft((d) => ({
      ...d,
      mode,
      zenmarketFeeJpy: mode === "direct" ? params.zenmarketDirectJpy : params.zenmarketAuctionJpy,
    }));
  };

  const openAddWatch = (parcelId: string) => {
    setAddingWatchId(parcelId);
    setWatchDraft({
      name: "",
      priceJpy: 0,
      mode: "direct",
      zenmarketFeeJpy: params.zenmarketDirectJpy,
      interventionEur: params.interventionEur,
    });
  };

  const addWatch = (parcelId: string) => {
    const watch: WatchInParcel = {
      id: newId(),
      ...watchDraft,
      status: "stock",
      purchaseDate: new Date().toISOString().slice(0, 10),
    };
    const updated = parcels.map((p) =>
      p.id === parcelId ? { ...p, watches: [...p.watches, watch] } : p
    );
    updateParcels(updated);
    setAddingWatchId(null);
  };

  const deleteWatch = (parcelId: string, watchId: string) => {
    const updated = parcels.map((p) =>
      p.id === parcelId ? { ...p, watches: p.watches.filter((w) => w.id !== watchId) } : p
    );
    updateParcels(updated);
  };

  const markSold = (parcelId: string, watchId: string) => {
    const updated = parcels.map((p) =>
      p.id === parcelId
        ? {
            ...p,
            watches: p.watches.map((w) =>
              w.id === watchId ? { ...w, status: "vendu" as const, ...sellDraft } : w
            ),
          }
        : p
    );
    updateParcels(updated);
    setSellingWatchKey(null);
  };

  const markUnsold = (parcelId: string, watchId: string) => {
    const updated = parcels.map((p) =>
      p.id === parcelId
        ? {
            ...p,
            watches: p.watches.map((w) =>
              w.id === watchId
                ? { ...w, status: "stock" as const, salePrice: undefined, saleChannel: undefined, saleDate: undefined }
                : w
            ),
          }
        : p
    );
    updateParcels(updated);
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="hero">
        <div>
          <h1>Matrice Rentabilite Horlogere</h1>
          <p>Simulateur + suivi de colis avec landed cost reel par montre.</p>
        </div>
        <div className="actions">
          {rateUpdated && (
            <span className="rate-badge">
              <Check size={11} /> Taux JPY mis a jour
            </span>
          )}
          <button className="btn primary" onClick={save}>
            {saved ? <Check size={14} /> : <Save size={14} />} {saved ? "Sauve" : "Sauvegarder"}
          </button>
          <button className="btn" onClick={reset}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="tabs">
        <TabButton active={tab === "simulator"} onClick={() => setTab("simulator")} icon={Calculator} label="Simulateur" />
        <TabButton active={tab === "colis"} onClick={() => setTab("colis")} icon={Package} label="Mes Colis" />
        <TabButton active={tab === "operations"} onClick={() => setTab("operations")} icon={TrendingUp} label="Operations" />
      </nav>

      {/* ════════════════════════════════════════
          SIMULATEUR
      ════════════════════════════════════════ */}
      {tab === "simulator" && (
        <>
          {/* ── Mode selector ── */}
          <div className="simulator-mode-switch">
            <button
              className={`sim-mode-btn ${params.simulatorMode === "direct" ? "sim-mode-active" : ""}`}
              onClick={() => upd("simulatorMode", "direct")}
            >
              Achat direct
              <span className="sim-mode-sub">Je connais le prix JPY → calcul du landed cost et du prix minimum</span>
            </button>
            <button
              className={`sim-mode-btn ${params.simulatorMode === "auction" ? "sim-mode-active" : ""}`}
              onClick={() => upd("simulatorMode", "auction")}
            >
              Mode enchere (reverse)
              <span className="sim-mode-sub">Je vise un prix de revente → calcul de l&rsquo;enchere maximum en JPY</span>
            </button>
          </div>

          <section className="kpi-grid">
            {params.simulatorMode === "direct" ? (
              <>
                <KpiCard label="Prix achat" value={`${params.watchPriceJpy.toLocaleString("fr-FR")} JPY`} />
                <KpiCard label="Landed Cost" value={eur(simLanded.total)} highlight />
                <KpiCard
                  label="Min Chrono24"
                  value={
                    pricingRows.find((r) => r.ch === "chrono24")?.minPrice
                      ? eurInt(pricingRows.find((r) => r.ch === "chrono24")!.minPrice!)
                      : "—"
                  }
                />
              </>
            ) : (
              <>
                <KpiCard
                  label="Revente cible"
                  value={`${eurInt(params.targetSellPriceEur)} (${CHANNELS[params.targetSellChannel].label})`}
                />
                <KpiCard
                  label="Enchere max"
                  value={maxBidJpy > 0 ? `${Math.floor(maxBidJpy).toLocaleString("fr-FR")} JPY` : "—"}
                  highlight
                />
                <KpiCard label="Landed estime" value={eur(pricingLanded.total)} />
              </>
            )}
          </section>

          <section className="main-grid">
            {/* Left: params */}
            <div className="stack">
              <Card title="Sourcing">
                {params.simulatorMode === "direct" ? (
                  <NumberField
                    label="Prix montre"
                    value={params.watchPriceJpy}
                    onChange={(v) => upd("watchPriceJpy", v)}
                    suffix="JPY"
                    hint="prix achat"
                  />
                ) : (
                  <>
                    <NumberField
                      label="Revente cible"
                      value={params.targetSellPriceEur}
                      onChange={(v) => upd("targetSellPriceEur", v)}
                      suffix="€"
                    />
                    <SelectField
                      label="Canal cible"
                      value={params.targetSellChannel}
                      onChange={(v) => upd("targetSellChannel", v as ChannelKey)}
                      options={CHANNEL_OPTIONS}
                    />
                  </>
                )}

                <NumberField
                  label="Taux JPY/EUR"
                  value={params.jpyEur}
                  onChange={(v) => upd("jpyEur", v)}
                  step={0.0001}
                />
              </Card>

              <button className="accordion-toggle" onClick={() => setAdvancedOpen((o) => !o)}>
                {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <Settings2 size={13} />
                Parametres avances
              </button>

              {advancedOpen && (
                <div className="accordion-body">
                  <div className="field-section" style={{ marginTop: 0 }}>Frais d&rsquo;acquisition</div>
                  <PercentField
                    label="Rechargement Wise → ZenMarket"
                    value={params.frictionRate}
                    onChange={(v) => upd("frictionRate", v)}
                    hint="~0.5–1.5%"
                    tooltip="Frais globaux perdu lors du virement EUR→JPY (Wise + dépôt ZenMarket). Payé une fois à l'approvisionnement, amorti ici sur chaque montre."
                  />
                  <NumberField
                    label="ZenMarket direct"
                    value={params.zenmarketDirectJpy}
                    onChange={(v) => upd("zenmarketDirectJpy", v)}
                    suffix="JPY"
                    tooltip="Frais de service ZenMarket pour un achat direct (boutique)"
                  />
                  <NumberField
                    label="ZenMarket enchere"
                    value={params.zenmarketAuctionJpy}
                    onChange={(v) => upd("zenmarketAuctionJpy", v)}
                    suffix="JPY"
                    tooltip="Frais de service ZenMarket pour un achat aux enchères (Yahoo Auctions)"
                  />
                  <NumberField
                    label="Shipping estime / montre"
                    value={params.shippingPerWatchJpy}
                    onChange={(v) => upd("shippingPerWatchJpy", v)}
                    suffix="JPY"
                    hint="fret colis / nb montres"
                  />
                  <NumberField
                    label="TPC estime / montre"
                    value={params.tpcTaxEur}
                    onChange={(v) => upd("tpcTaxEur", v)}
                    suffix="€"
                    hint="TPC colis / nb montres"
                    tooltip="Taxe Petits Colis prélevée par La Poste sur les envois hors UE (généralement ≤1€)"
                  />
                  <PercentField
                    label="TVA IOSS"
                    value={params.vatRate}
                    onChange={(v) => upd("vatRate", v)}
                    tooltip="TVA collectée par ZenMarket via le régime IOSS pour les colis <150€"
                  />
                  <hr className="field-divider" />
                  <div className="field-section">Sortie &amp; marges</div>
                  <NumberField label="Intervention defaut" value={params.interventionEur} onChange={(v) => upd("interventionEur", v)} suffix="€" />
                  <NumberField label="Emballage" value={params.packaging} onChange={(v) => upd("packaging", v)} suffix="€" />
                  <NumberField label="Expedition Vinted" value={params.shippingOutVinted} onChange={(v) => upd("shippingOutVinted", v)} suffix="€" hint="0 = acheteur paie" />
                  <NumberField label="Expedition LeBonCoin" value={params.shippingOutLbc} onChange={(v) => upd("shippingOutLbc", v)} suffix="€" />
                  <NumberField label="Expedition Chrono24" value={params.shippingOutChrono24} onChange={(v) => upd("shippingOutChrono24", v)} suffix="€" />
                  <PercentField
                    label="Provision echec"
                    value={params.failureProvision}
                    onChange={(v) => upd("failureProvision", v)}
                    tooltip="Marge de sécurité sur le coût pour absorber les ventes ratées ou les relances"
                  />
                  <PercentField label="Marge nette cible" value={params.targetMarginNet} onChange={(v) => upd("targetMarginNet", v)} />
                </div>
              )}
            </div>

            {/* Right: results */}
            <div className="stack">
              <Card title="Decomposition landed cost">
                {params.simulatorMode === "auction" && maxBidJpy > 0 && (
                  <>
                    <div className="sim-result-label">Enchere max</div>
                    <div className="max-bid-display">{Math.floor(maxBidJpy).toLocaleString("fr-FR")} JPY</div>
                  </>
                )}
                <StatRow label="Prix converti EUR" value={eur(pricingLanded.priceEur)} />
                <StatRow label="Quote-part rechargement Wise" value={eur(pricingLanded.frictionFee)} />
                <StatRow label="ZenMarket" value={eur(pricingLanded.zenFeeEur)} />
                <StatRow label="Shipping" value={eur(pricingLanded.shippingEur)} />
                <StatRow label="TVA IOSS" value={eur(pricingLanded.vat)} />
                <StatRow label="TPC" value={eur(pricingLanded.tpcEur)} />
                <StatRow label="Total" value={eur(pricingLanded.total)} strong />
              </Card>

              <Card title="Prix de vente minimum par canal">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th>Prix min</th>
                      <th>Commission</th>
                      <th>Profit</th>
                      <th>Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRows.map((row) => (
                      <tr key={row.ch}>
                        <td>{CHANNELS[row.ch].label}</td>
                        <td>{row.minPrice ? eurInt(row.minPrice) : "—"}</td>
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
        </>
      )}

      {/* ════════════════════════════════════════
          MES COLIS
      ════════════════════════════════════════ */}
      {tab === "colis" && (
        <>
          {/* ── Stock KPIs ── */}
          {(stockSummary.inStock > 0 || stockSummary.sold > 0) && (
            <div className="stock-kpi-row">
              <div className="stock-kpi-item">
                <span className="stock-kpi-label">En stock</span>
                <span className="stock-kpi-value">{stockSummary.inStock}</span>
              </div>
              <div className="stock-kpi-item highlight">
                <span className="stock-kpi-label">Capital immobilise</span>
                <span className="stock-kpi-value">{eur(stockSummary.capitalImmobilise)}</span>
              </div>
              <div className="stock-kpi-item">
                <span className="stock-kpi-label">Vendus</span>
                <span className="stock-kpi-value">{stockSummary.sold}</span>
              </div>
              <div className="stock-kpi-item">
                <span className="stock-kpi-label">Age moyen stock</span>
                <span className="stock-kpi-value">{stockSummary.avgAge} j</span>
              </div>
            </div>
          )}
          {stockSummary.stale.length > 0 && (
            <div className="stale-alert">
              <strong>Montres immobilisees &gt;60 j :</strong>{" "}
              {stockSummary.stale.map((x) => (
                <span key={x.watch.id} className="stale-chip">
                  {x.watch.name || "Montre"} ({x.ageDays} j)
                </span>
              ))}
            </div>
          )}

          {/* ── Montres en attente ── */}
          <div className="pending-section-header">
            <div>
              <span className="pending-section-title">Montres en attente</span>
              {pendingWatches.length > 0 && (
                <span className="pending-count">{pendingWatches.length}</span>
              )}
            </div>
            <button
              className="btn"
              onClick={() => { setAddingPending(true); setAddingParcel(false); }}
            >
              <Plus size={14} /> Ajouter une montre
            </button>
          </div>

          {/* Add pending watch form */}
          {addingPending && (
            <div className="add-form" style={{ marginBottom: 14 }}>
              <div className="form-grid">
                <TextField
                  label="Nom / description"
                  value={pendingDraft.name}
                  onChange={(v) => setPendingDraft((d) => ({ ...d, name: v }))}
                  placeholder="Seiko Type II, Citizen Exceed..."
                />
                <NumberField
                  label="Prix achat"
                  value={pendingDraft.priceJpy}
                  onChange={(v) => setPendingDraft((d) => ({ ...d, priceJpy: v }))}
                  suffix="JPY"
                />
                <DateField
                  label="Date d'achat"
                  value={pendingDraft.purchaseDate}
                  onChange={(v) => setPendingDraft((d) => ({ ...d, purchaseDate: v }))}
                />
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <ToggleField
                  label="Mode achat"
                  options={[
                    { value: "direct", label: "Direct" },
                    { value: "auction", label: "Enchere" },
                  ]}
                  value={pendingDraft.mode}
                  onChange={(v) => setPendingMode(v as PurchaseMode)}
                />
                <NumberField
                  label="ZenMarket"
                  value={pendingDraft.zenmarketFeeJpy}
                  onChange={(v) => setPendingDraft((d) => ({ ...d, zenmarketFeeJpy: v }))}
                  suffix="JPY"
                  hint="500 enc. / 800 direct"
                />
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <div className="field-top">
                  <span className="field-label">Etat de la montre</span>
                </div>
                <div className="watch-profile-row">
                  {WATCH_PROFILES.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`watch-profile-btn ${pendingDraft.interventionEur === p.value ? "profile-active" : ""}`}
                      onClick={() => setPendingDraft((d) => ({ ...d, interventionEur: p.value }))}
                      title={p.hint}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <NumberField
                  label="Intervention prevue"
                  value={pendingDraft.interventionEur}
                  onChange={(v) => setPendingDraft((d) => ({ ...d, interventionEur: v }))}
                  suffix="€"
                  hint="pile, nettoyage..."
                />
              </div>
              <div className="form-actions">
                <button className="btn" onClick={() => setAddingPending(false)}>Annuler</button>
                <button
                  className="btn primary"
                  onClick={addPendingWatch}
                  disabled={pendingDraft.priceJpy <= 0}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {/* Pending watches list */}
          {pendingWatches.length > 0 && (
            <div className="pending-list">
              {pendingWatches.map((pw) => (
                <div key={pw.id} className="pending-item">
                  <span className="pending-name">{pw.name || "Montre"}</span>
                  <span className="watch-meta">{pw.priceJpy.toLocaleString("fr")} ¥</span>
                  <span className={`badge badge-${pw.mode}`}>
                    {pw.mode === "direct" ? "Direct" : "Enchere"}
                  </span>
                  <span className="watch-meta" style={{ color: "var(--muted)" }}>
                    {pw.purchaseDate}
                  </span>
                  {pw.interventionEur > 0 && (
                    <span className="watch-meta">+{eur(pw.interventionEur)} interv.</span>
                  )}
                  <button className="icon-btn" onClick={() => deletePendingWatch(pw.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingWatches.length === 0 && !addingPending && (
            <div className="empty-state" style={{ marginBottom: 24, padding: "20px 24px" }}>
              <p style={{ margin: 0 }}>
                Aucune montre en attente. Ajoutez vos achats au fur et a mesure.
              </p>
            </div>
          )}

          {/* ── Colis reçus ── */}
          <div className="parcel-section-header">
            <div>
              <span className="pending-section-title">Colis recus</span>
              {parcels.length > 0 && (
                <span className="pending-count">{parcels.length}</span>
              )}
            </div>
            <button
              className="btn primary"
              onClick={() => { setAddingParcel(true); setAddingPending(false); setSelectedForParcel([]); }}
            >
              <Plus size={14} /> Nouveau colis
            </button>
          </div>

          {/* Add parcel form */}
          {addingParcel && (
            <div className="add-form" style={{ marginBottom: 14 }}>
              <div className="form-grid">
                <TextField
                  label="Reference"
                  value={parcelDraft.ref}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, ref: v }))}
                  placeholder="ECZEN13402166616"
                />
                <DateField
                  label="Date reception"
                  value={parcelDraft.date}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, date: v }))}
                />
                <TextField
                  label="Transporteur"
                  value={parcelDraft.carrier}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, carrier: v }))}
                  placeholder="ECMS_EXPRESS"
                />
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <NumberField
                  label="Fret + assurance"
                  value={parcelDraft.freightJpy}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, freightJpy: v }))}
                  suffix="JPY"
                  hint="facture ZenMarket"
                />
                <NumberField
                  label="TVA IOSS payee"
                  value={parcelDraft.vatJpy}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, vatJpy: v }))}
                  suffix="JPY"
                  hint="VAT sur facture"
                />
                <NumberField
                  label="TPC"
                  value={parcelDraft.tpcEur}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, tpcEur: v }))}
                  suffix="€"
                  hint="taxe petits colis"
                />
                <NumberField
                  label="Frais Wise"
                  value={parcelDraft.wiseFeeEur}
                  onChange={(v) => setParcelDraft((d) => ({ ...d, wiseFeeEur: v }))}
                  suffix="€"
                  hint="montant exact Wise"
                />
              </div>

              {/* Pending watch selection */}
              {pendingWatches.length > 0 && (
                <>
                  <hr className="field-divider" />
                  <div className="field-section">
                    Montres a inclure dans ce colis
                    {selectedForParcel.length > 0 && (
                      <span style={{ marginLeft: 8, color: "var(--accent)", fontWeight: 700 }}>
                        {selectedForParcel.length} selectionnee{selectedForParcel.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="watch-select-list">
                    {pendingWatches.map((pw) => (
                      <label key={pw.id} className="watch-select-item">
                        <input
                          type="checkbox"
                          checked={selectedForParcel.includes(pw.id)}
                          onChange={() => toggleParcelSelection(pw.id)}
                        />
                        <span style={{ flex: 1, fontWeight: 600, fontSize: "0.88rem" }}>
                          {pw.name || "Montre"}
                        </span>
                        <span className="watch-meta">{pw.priceJpy.toLocaleString("fr")} ¥</span>
                        <span className={`badge badge-${pw.mode}`} style={{ marginLeft: 4 }}>
                          {pw.mode === "direct" ? "Direct" : "Enchere"}
                        </span>
                        <span className="watch-meta" style={{ marginLeft: 8 }}>
                          {pw.purchaseDate}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <div className="form-actions">
                <button className="btn" onClick={() => { setAddingParcel(false); setSelectedForParcel([]); }}>
                  Annuler
                </button>
                <button className="btn primary" onClick={addParcel} disabled={!parcelDraft.ref}>
                  Creer le colis
                  {selectedForParcel.length > 0 && ` (${selectedForParcel.length} montre${selectedForParcel.length > 1 ? "s" : ""})`}
                </button>
              </div>
            </div>
          )}

          {/* Empty state for parcels */}
          {parcels.length === 0 && !addingParcel && (
            <div className="empty-state">
              <p>Aucun colis enregistre.</p>
              <p>Quand ZenMarket expedie un colis, cliquez sur &laquo;&nbsp;Nouveau colis&nbsp;&raquo; et selectionnez les montres qu&rsquo;il contient.</p>
            </div>
          )}

          {/* Parcel list */}
          <div className="parcel-list">
            {parcels.map((parcel) => {
              const isExpanded = expandedId === parcel.id;
              const totalInvested = parcel.watches.reduce((sum, w) => {
                const l = computeParcelWatchLanded(w, parcel, params.jpyEur);
                return sum + l.total + w.interventionEur;
              }, 0);

              return (
                <div key={parcel.id} className="parcel-card">
                  {/* Parcel header */}
                  <div
                    className="parcel-head"
                    onClick={() => setExpandedId(isExpanded ? null : parcel.id)}
                  >
                    <span className="parcel-ref">{parcel.ref || "Colis sans reference"}</span>
                    <div className="parcel-meta">
                      <span>{parcel.date}</span>
                      {parcel.carrier && <span>{parcel.carrier}</span>}
                      <span>
                        {parcel.watches.length} montre{parcel.watches.length !== 1 ? "s" : ""}
                      </span>
                      {totalInvested > 0 && (
                        <span style={{ fontWeight: 700, color: "var(--text)" }}>
                          {eur(totalInvested)}
                        </span>
                      )}
                    </div>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Supprimer ce colis et toutes ses montres ?")) {
                          deleteParcel(parcel.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    ) : (
                      <ChevronDown size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    )}
                  </div>

                  {/* Parcel body */}
                  {isExpanded && (
                    <div className="parcel-body">
                      {/* Costs from invoice */}
                      <div className="parcel-details">
                        <div className="parcel-detail-item">
                          <span>Fret + assurance</span>
                          <strong>{parcel.freightJpy.toLocaleString("fr")} ¥</strong>
                        </div>
                        <div className="parcel-detail-item">
                          <span>TVA IOSS</span>
                          <strong>{parcel.vatJpy.toLocaleString("fr")} ¥</strong>
                        </div>
                        <div className="parcel-detail-item">
                          <span>TPC</span>
                          <strong>{eur(parcel.tpcEur)}</strong>
                        </div>
                        <div className="parcel-detail-item">
                          <span>Frais Wise</span>
                          <strong>{eur(parcel.wiseFeeEur)}</strong>
                        </div>
                      </div>

                      {/* Watch list */}
                      <div className="section-label">
                        Montres — landed cost reel + prix minimum par plateforme
                      </div>
                      <div className="watch-list">
                        {parcel.watches.length === 0 && (
                          <p style={{ color: "var(--muted)", fontSize: "0.84rem", margin: 0 }}>
                            Aucune montre. Ajoutez les articles de ce colis.
                          </p>
                        )}
                        {parcel.watches.map((watch) => {
                          const landed = computeParcelWatchLanded(watch, parcel, params.jpyEur);
                          const watchPrices = (Object.keys(CHANNELS) as ChannelKey[]).map((ch) => {
                            const ops =
                              watch.interventionEur +
                              params.packaging +
                              getShippingOut(params, ch);
                            const minSell = computeMinSellPrice(
                              landed.total,
                              ch,
                              params.targetMarginNet,
                              ops,
                              params.failureProvision
                            );
                            return { ch, minSell };
                          });
                          const sellKey = `${parcel.id}:${watch.id}`;
                          const isSelling = sellingWatchKey === sellKey;
                          const pnl = computeWatchRealPnl(watch, parcel, params);

                          return (
                            <div key={watch.id} className={`watch-item${watch.status === "vendu" ? " watch-item-sold" : ""}`}>
                              <div className="watch-row">
                                <span className="watch-name">{watch.name || "Montre"}</span>
                                <span className="watch-meta">
                                  {watch.priceJpy.toLocaleString("fr")} ¥
                                </span>
                                <span className={`badge badge-${watch.mode}`}>
                                  {watch.mode === "direct" ? "Direct" : "Enchere"}
                                </span>
                                {watch.status === "vendu" && (
                                  <span className="badge badge-vendu">Vendu</span>
                                )}
                                {watch.interventionEur > 0 && (
                                  <span className="watch-meta">
                                    +{eur(watch.interventionEur)} interv.
                                  </span>
                                )}
                                {watch.status !== "vendu" && (
                                  <button
                                    className="btn btn-sell"
                                    onClick={() => {
                                      setSellingWatchKey(isSelling ? null : sellKey);
                                      if (!isSelling)
                                        setSellDraft((d) => ({ ...d, salePrice: 0 }));
                                    }}
                                  >
                                    <DollarSign size={12} /> Vendre
                                  </button>
                                )}
                                {watch.status === "vendu" && (
                                  <button
                                    className="icon-btn"
                                    title="Annuler la vente"
                                    onClick={() => markUnsold(parcel.id, watch.id)}
                                  >
                                    <Undo2 size={13} />
                                  </button>
                                )}
                                <button
                                  className="icon-btn"
                                  onClick={() => deleteWatch(parcel.id, watch.id)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              {/* Sell form */}
                              {isSelling && (
                                <div className="sell-form">
                                  <div className="form-grid">
                                    <NumberField
                                      label="Prix de vente reel"
                                      value={sellDraft.salePrice}
                                      onChange={(v) => setSellDraft((d) => ({ ...d, salePrice: v }))}
                                      suffix="€"
                                    />
                                    <SelectField
                                      label="Canal de vente"
                                      value={sellDraft.saleChannel}
                                      onChange={(v) => setSellDraft((d) => ({ ...d, saleChannel: v as ChannelKey }))}
                                      options={CHANNEL_OPTIONS}
                                    />
                                    <DateField
                                      label="Date de vente"
                                      value={sellDraft.saleDate}
                                      onChange={(v) => setSellDraft((d) => ({ ...d, saleDate: v }))}
                                    />
                                  </div>
                                  <div className="form-actions">
                                    <button className="btn" onClick={() => setSellingWatchKey(null)}>
                                      Annuler
                                    </button>
                                    <button
                                      className="btn primary"
                                      onClick={() => markSold(parcel.id, watch.id)}
                                      disabled={sellDraft.salePrice <= 0}
                                    >
                                      <Tag size={13} /> Confirmer la vente
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Price row / sold summary */}
                              {watch.status === "vendu" ? (
                                <div className="sold-summary">
                                  <span className="watch-meta">
                                    Vendu {eur(watch.salePrice!)} · {watch.saleChannel && CHANNELS[watch.saleChannel].label} · {watch.saleDate}
                                  </span>
                                  {pnl && (
                                    <span className={pnl.profit >= 0 ? "profit-positive" : "profit-negative"}>
                                      {pnl.profit >= 0 ? "+" : ""}{eur(pnl.profit)} ({pct(pnl.marginNet)})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="watch-prices">
                                  <span className="landed-chip">Landed {eur(landed.total)}</span>
                                  {watchPrices.map(
                                    ({ ch, minSell }) =>
                                      minSell !== null && (
                                        <span key={ch} className="price-chip">
                                          {CHANNELS[ch].label} min {eurInt(minSell)}
                                        </span>
                                      )
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add watch form / button */}
                      {addingWatchId === parcel.id ? (
                        <div className="add-form" style={{ marginTop: 14, marginBottom: 0 }}>
                          <div className="form-grid">
                            <TextField
                              label="Nom / description"
                              value={watchDraft.name}
                              onChange={(v) => setWatchDraft((d) => ({ ...d, name: v }))}
                              placeholder="Seiko Type II"
                            />
                            <NumberField
                              label="Prix achat"
                              value={watchDraft.priceJpy}
                              onChange={(v) => setWatchDraft((d) => ({ ...d, priceJpy: v }))}
                              suffix="JPY"
                            />
                          </div>
                          <div className="form-grid" style={{ marginTop: 12 }}>
                            <ToggleField
                              label="Mode achat"
                              options={[
                                { value: "direct", label: "Direct" },
                                { value: "auction", label: "Enchere" },
                              ]}
                              value={watchDraft.mode}
                              onChange={(v) => setWatchMode(v as PurchaseMode)}
                            />
                            <NumberField
                              label="ZenMarket"
                              value={watchDraft.zenmarketFeeJpy}
                              onChange={(v) => setWatchDraft((d) => ({ ...d, zenmarketFeeJpy: v }))}
                              suffix="JPY"
                              hint="500 enc. / 800 direct"
                            />
                          </div>
                          <div className="field" style={{ marginTop: 14 }}>
                            <div className="field-top">
                              <span className="field-label">Etat de la montre</span>
                            </div>
                            <div className="watch-profile-row">
                              {WATCH_PROFILES.map((p) => (
                                <button
                                  key={p.label}
                                  type="button"
                                  className={`watch-profile-btn ${watchDraft.interventionEur === p.value ? "profile-active" : ""}`}
                                  onClick={() => setWatchDraft((d) => ({ ...d, interventionEur: p.value }))}
                                  title={p.hint}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <NumberField
                              label="Intervention"
                              value={watchDraft.interventionEur}
                              onChange={(v) => setWatchDraft((d) => ({ ...d, interventionEur: v }))}
                              suffix="€"
                              hint="pile, nettoyage..."
                            />
                          </div>
                          <div className="form-actions">
                            <button className="btn" onClick={() => setAddingWatchId(null)}>
                              Annuler
                            </button>
                            <button
                              className="btn primary"
                              onClick={() => addWatch(parcel.id)}
                              disabled={watchDraft.priceJpy <= 0}
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="add-watch-btn"
                          onClick={() => openAddWatch(parcel.id)}
                        >
                          <Plus size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Ajouter une montre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          OPERATIONS
      ════════════════════════════════════════ */}
      {tab === "operations" && (
        <>
          {/* ── Month selector ── */}
          <div className="month-picker">
            <button className="btn" onClick={() => shiftMonth(-1)}>&#8249;</button>
            <span className="month-label">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
            <button className="btn" onClick={() => shiftMonth(1)}>&#8250;</button>
          </div>

          {/* ── KPIs réels du mois ── */}
          <section className="kpi-grid">
            <KpiCard
              label="CA reel"
              value={realMonthly ? eurInt(realMonthly.caReel) : "—"}
              sub={realMonthly ? `${realMonthly.soldCount} montre${realMonthly.soldCount > 1 ? "s" : ""} vendue${realMonthly.soldCount > 1 ? "s" : ""}` : "Aucune vente ce mois"}
            />
            <KpiCard
              label="Profit reel"
              value={realMonthly ? eur(realMonthly.profitReel) : "—"}
            />
            <KpiCard
              label="Marge reelle"
              value={realMonthly ? pct(realMonthly.avgMarginReel) : "—"}
              highlight={!!realMonthly}
            />
          </section>

          <section className="main-grid">
            <div className="stack">
              {/* ── Réel du mois ── */}
              <Card title="Reel du mois">
                {realMonthly ? (
                  <>
                    <StatRow label="Montres vendues" value={String(realMonthly.soldCount)} />
                    <StatRow label="CA" value={eur(realMonthly.caReel)} />
                    <StatRow label="Landed total" value={eur(realMonthly.totalLanded)} />
                    <StatRow label="Frais ops + canaux" value={eur(realMonthly.totalOps + realMonthly.totalChannelFees)} />
                    <StatRow label="Profit brut" value={eur(realMonthly.profitReel)} strong />
                    <hr className="field-divider" />
                    <StatRow label="Charges fixes" value={eur(fixedCosts)} />
                    <StatRow
                      label="Profit net (hors cot.)"
                      value={eur(realMonthly.profitReel - fixedCosts)}
                      strong
                    />
                  </>
                ) : (
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
                    Aucune vente enregistree pour ce mois. Marquez des montres comme vendues dans <strong>Mes Colis</strong>.
                  </p>
                )}
              </Card>

              {/* ── Prévisionnel ── */}
              <Card title="Previsionnel (simulation)">
                <StatRow label="Volume cible" value={`${params.monthlyVolume} montres`} />
                <StatRow label="CA estime" value={eur(dashboard.monthlyCA)} />
                <StatRow label="Marge brute estimee" value={eur(dashboard.monthlyProfitBrut)} />
                <StatRow label="Charges fixes" value={eur(dashboard.fixedCosts)} />
                <StatRow label="Cotisations" value={eur(dashboard.cotisations)} />
                <StatRow label="Salaire net estime" value={eur(dashboard.netSalary)} strong />
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 8 }}>{dashboard.statusNote}</div>
              </Card>

              {/* ── Detail ventes du mois ── */}
              {realMonthly && realMonthly.items.length > 0 && (
                <Card title={`Detail ventes — ${monthLabel}`}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Montre</th>
                        <th>Vente</th>
                        <th>Canal</th>
                        <th>Landed</th>
                        <th>Profit</th>
                        <th>Marge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realMonthly.items.map(({ watch, pnl: p }) => (
                        <tr key={watch.id}>
                          <td>{watch.name || "Montre"}</td>
                          <td>{eur(watch.salePrice!)}</td>
                          <td>{watch.saleChannel && CHANNELS[watch.saleChannel].label}</td>
                          <td>{eur(p.landedTotal)}</td>
                          <td className={p.profit >= 0 ? "profit-positive" : "profit-negative"}>
                            {p.profit >= 0 ? "+" : ""}{eur(p.profit)}
                          </td>
                          <td>{pct(p.marginNet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>

            <div className="stack">
              <Card title="Hypotheses mensuelles">
                <NumberField
                  label="Volume mensuel"
                  value={params.monthlyVolume}
                  onChange={(v) => upd("monthlyVolume", v)}
                />
                <NumberField
                  label="Ticket achat moyen"
                  value={params.avgWatchPriceJpy}
                  onChange={(v) => upd("avgWatchPriceJpy", v)}
                  suffix="JPY"
                />
                <hr className="field-divider" />
                <div className="field-section">Mix plateformes</div>
                <div className="mix-preset-row">
                  <button
                    className="mix-preset-btn"
                    onClick={() => { upd("mixVinted", 80); upd("mixLeboncoin", 10); upd("mixChrono24", 10); }}
                  >
                    Vinted +
                  </button>
                  <button
                    className="mix-preset-btn"
                    onClick={() => { upd("mixVinted", 50); upd("mixLeboncoin", 20); upd("mixChrono24", 30); }}
                  >
                    Equilibre
                  </button>
                  <button
                    className="mix-preset-btn"
                    onClick={() => { upd("mixVinted", 10); upd("mixLeboncoin", 20); upd("mixChrono24", 70); }}
                  >
                    Haut de gamme
                  </button>
                </div>
                <NumberField
                  label="Mix Vinted %"
                  value={params.mixVinted}
                  onChange={(v) => upd("mixVinted", v)}
                />
                <NumberField
                  label="Mix LeBonCoin %"
                  value={params.mixLeboncoin}
                  onChange={(v) => upd("mixLeboncoin", v)}
                />
                <NumberField
                  label="Mix Chrono24 %"
                  value={params.mixChrono24}
                  onChange={(v) => upd("mixChrono24", v)}
                />
              </Card>
              <Card title="Charges fixes mensuelles">
                <SelectField
                  label="Statut juridique"
                  value={params.legalStatus}
                  onChange={(v) => upd("legalStatus", v as "micro" | "sasu")}
                  options={[
                    { value: "micro", label: "Micro-entreprise BIC" },
                    { value: "sasu", label: "SASU / EURL" },
                  ]}
                />
                <NumberField
                  label="RC Pro + assurance stock"
                  value={params.rcProAssurance}
                  onChange={(v) => upd("rcProAssurance", v)}
                  suffix="€/mois"
                />
                <NumberField
                  label="Stockage securise"
                  value={params.storageMonthly}
                  onChange={(v) => upd("storageMonthly", v)}
                  suffix="€/mois"
                />
                <NumberField
                  label="Amort. outillage"
                  value={params.toolsAmort}
                  onChange={(v) => upd("toolsAmort", v)}
                  suffix="€/mois"
                />
                <NumberField
                  label="Abonnement Chrono24"
                  value={params.chrono24Sub}
                  onChange={(v) => upd("chrono24Sub", v)}
                  suffix="€/mois"
                />
                {params.legalStatus === "sasu" && (
                  <NumberField
                    label="Compta SASU"
                    value={params.comptaSasu}
                    onChange={(v) => upd("comptaSasu", v)}
                    suffix="€/mois"
                  />
                )}
              </Card>
            </div>
          </section>
        </>
      )}

    </div>
  );
}
