import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Tag, TrendingUp, Rocket, Save, RotateCcw, Info, Check, ArrowRightLeft } from 'lucide-react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';

// ═══════════════════════════════════════════════════════════════
//  MATRICE DE RENTABILITÉ — NÉGOCE HORLOGER VINTAGE JP→EU
//  v3.0 — Arbitrage Pur & Logistique IOSS
// ═══════════════════════════════════════════════════════════════

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');`;

const C = {
  bg: '#0A0908', bgRaised: '#15130F', bgCard: '#1C1916', bgCardHi: '#252119',
  border: '#2D2820', borderHi: '#544C3D', borderAccent: '#73633C',
  text: '#FAF6EC', textSec: '#CFC8B5', textMuted: '#A89F8C', textDim: '#7A7363',
  gold: '#E8BF52', patina: '#7FBB8F', copper: '#E5874C', rust: '#E37862',
};

const DEFAULTS = {
  // Sourcing & Banque
  sourcingMode: 'direct', // 'direct' ou 'auction'
  jpyEur: 0.0061, 
  frictionRate: 0.015, // Wise (0.45%) + Dépôt ZenMarket (~1%)
  watchPriceJpy: 28000,
  targetSellPriceEur: 400, // Pour le calcul Reverse
  
  // Frais ZenMarket
  zenmarketAuctionJpy: 500,
  zenmarketDirectJpy: 800,
  
  // Logistique IOSS
  shippingPerWatchJpy: 600, // Freight & Insurance mutualisé (3 à 6 pièces/colis)
  tpcTaxEur: 1, // Taxe Petits Colis
  vatRate: 0.20,
  
  // Opérations Internes
  interventionEur: 15, // Budget horloger
  packaging: 4, 
  shippingOutbound: 12, 
  failureProvision: 0.05,
  
  // Business
  targetMarginNet: 0.30, 
  monthlyVolume: 12, 
  mixVinted: 50, mixLeboncoin: 20, mixChrono24: 30, 
  legalStatus: 'micro', 
  avgWatchPriceJpy: 35000,
  rcProAssurance: 45, storageMonthly: 20, chrono24Sub: 30, toolsAmort: 15, comptaSasu: 110,
  initialCapital: 3000, rotationDays: 50, reinvestPhase1Months: 8, reinvestRate1: 1.0, reinvestRate2: 0.4, targetSalary: 2500,
};

const CHANNELS = {
  vinted:    { label: 'Vinted',      commission: 0.00,  flat: 0,    note: 'Rapide, flux <300€' },
  leboncoin: { label: 'LeBonCoin',   commission: 0.00,  flat: 0,    note: 'Cashflow, main-propre' },
  chrono24:  { label: 'Chrono24',    commission: 0.065, flat: 0,    note: 'Premium, >1000€' },
};

function computeLandedCost(p, forcePriceJpy = null) {
  const priceJpy = forcePriceJpy !== null ? forcePriceJpy : p.watchPriceJpy;
  const priceEur = priceJpy * p.jpyEur;
  
  const frictionFee = priceEur * p.frictionRate;
  const zenmarketFeeJpy = p.sourcingMode === 'direct' ? p.zenmarketDirectJpy : p.zenmarketAuctionJpy;
  const zenmarketFeeEur = zenmarketFeeJpy * p.jpyEur;
  
  const shippingEur = p.shippingPerWatchJpy * p.jpyEur;
  const cif = priceEur + zenmarketFeeEur + shippingEur; // Valeur pour la douane
  const vat = cif * p.vatRate;
  
  const total = priceEur + frictionFee + zenmarketFeeEur + shippingEur + vat + p.tpcTaxEur;
  
  return { priceJpy, priceEur, frictionFee, zenmarketFeeEur, shippingEur, vat, tpcTaxEur: p.tpcTaxEur, total, cif };
}

const computeOpsCost = (p) => p.interventionEur + p.packaging + p.shippingOutbound;

function computeMinSellPrice(landedCostTotal, channelKey, marginNet, opsCost, failureProvision) {
  const c = CHANNELS[channelKey];
  const baseCost = (landedCostTotal + opsCost) * (1 + failureProvision);
  const denom = 1 - c.commission - marginNet;
  if (denom <= 0) return null;
  return (baseCost + c.flat) / denom;
}

// Calcul Reverse (Enchères) : Trouve le prix d'achat max JPY à partir d'un prix de vente cible
function computeMaxBidJpy(p, targetSellPrice, channelKey) {
  const c = CHANNELS[channelKey];
  const opsCost = computeOpsCost(p);
  
  // Coût de base max autorisé
  const targetBaseCost = (targetSellPrice * (1 - c.commission - p.targetMarginNet) - c.flat) / (1 + p.failureProvision);
  
  // Landed cost max autorisé
  const targetLanded = targetBaseCost - opsCost;
  
  // Équation : Landed = priceEur * (1 + frictionRate + vatRate) + (zenFeeJpy * jpyEur) * (1 + vatRate) + (shipJpy * jpyEur) * (1 + vatRate) + tpc
  const fixedLandedCosts = p.tpcTaxEur + (p.zenmarketAuctionJpy * p.jpyEur) * (1 + p.vatRate) + (p.shippingPerWatchJpy * p.jpyEur) * (1 + p.vatRate);
  
  const maxPriceEur = (targetLanded - fixedLandedCosts) / (1 + p.frictionRate + p.vatRate);
  
  return Math.max(0, maxPriceEur / p.jpyEur);
}

function computeNetMargin(sellPrice, landedCostTotal, opsCost, channelKey, failureProvision) {
  const c = CHANNELS[channelKey];
  const baseCost = (landedCostTotal + opsCost) * (1 + failureProvision);
  const channelFee = sellPrice * c.commission + c.flat;
  const profit = sellPrice - baseCost - channelFee;
  return { profit, marginNet: profit / sellPrice, channelFee, baseCost };
}

function computeMonthlyDashboard(p, fixedCosts) {
  const avgLanded = computeLandedCost(p, p.avgWatchPriceJpy).total;
  const ops = computeOpsCost(p);
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix = { vinted: p.mixVinted/mixSum, leboncoin: p.mixLeboncoin/mixSum, chrono24: p.mixChrono24/mixSum };
  let totalCA = 0, totalProfitBrut = 0, totalChannelFees = 0;
  
  Object.entries(mix).forEach(([ch, weight]) => {
    const price = computeMinSellPrice(avgLanded, ch, p.targetMarginNet, ops, p.failureProvision);
    if (price == null) return;
    const m = computeNetMargin(price, avgLanded, ops, ch, p.failureProvision);
    totalCA += price * weight;
    totalProfitBrut += m.profit * weight;
    totalChannelFees += m.channelFee * weight;
  });
  
  const monthlyCA = totalCA * p.monthlyVolume;
  const monthlyProfitBrut = totalProfitBrut * p.monthlyVolume;
  const profitBeforeTax = monthlyProfitBrut - fixedCosts;
  let cotisations = 0, netSalary = 0, statusNote = '';
  
  if (p.legalStatus === 'micro') {
    cotisations = monthlyCA * 0.133;
    netSalary = monthlyProfitBrut - fixedCosts - cotisations;
    statusNote = 'Micro-BIC · 13,3% du CA';
  } else {
    cotisations = Math.max(0, profitBeforeTax * 0.46);
    netSalary = profitBeforeTax - cotisations;
    statusNote = 'SASU · ~46% sur rémunération';
  }
  
  return {
    avgLanded, avgPrice: totalCA, avgMarginNet: totalCA > 0 ? totalProfitBrut / totalCA : 0,
    monthlyCA, monthlyProfitBrut, totalChannelFees: totalChannelFees * p.monthlyVolume,
    fixedCosts, profitBeforeTax, cotisations, netSalary, statusNote,
  };
}

function simulateRoadmap(p, fixedCosts) {
  const months = [];
  let capital = p.initialCapital;
  const rotationsPerMonth = 30 / p.rotationDays;
  const ops = computeOpsCost(p);
  const avgLanded = computeLandedCost(p, p.avgWatchPriceJpy).total;
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix = { vinted: p.mixVinted/mixSum, leboncoin: p.mixLeboncoin/mixSum, chrono24: p.mixChrono24/mixSum };
  
  let avgProfitPerWatch = 0, avgPricePerWatch = 0;
  Object.entries(mix).forEach(([ch, w]) => {
    const price = computeMinSellPrice(avgLanded, ch, p.targetMarginNet, ops, p.failureProvision);
    if (price == null) return;
    const m = computeNetMargin(price, avgLanded, ops, ch, p.failureProvision);
    avgProfitPerWatch += m.profit * w;
    avgPricePerWatch += price * w;
  });
  
  let salaireDebloqueAuMois = null;
  for (let i = 1; i <= 24; i++) {
    const watchesPerMonth = (capital / avgLanded) * rotationsPerMonth;
    const monthCA = watchesPerMonth * avgPricePerWatch;
    const monthProfitBrut = watchesPerMonth * avgProfitPerWatch;
    const cotisations = p.legalStatus === 'micro' ? monthCA * 0.133 : Math.max(0, (monthProfitBrut - fixedCosts) * 0.46);
    const profitDispo = monthProfitBrut - fixedCosts - cotisations;
    const reinvestRate = i <= p.reinvestPhase1Months ? p.reinvestRate1 : p.reinvestRate2;
    const reinvested = Math.max(0, profitDispo) * reinvestRate;
    const salaire = Math.max(0, profitDispo) - reinvested;
    capital += reinvested;
    if (salaire >= p.targetSalary && salaireDebloqueAuMois == null) salaireDebloqueAuMois = i;
    months.push({
      mois: i, capital: Math.round(capital), ca: Math.round(monthCA),
      profitBrut: Math.round(monthProfitBrut), salaire: Math.round(Math.max(0, salaire)),
      reinvesti: Math.round(reinvested), volume: +watchesPerMonth.toFixed(1),
    });
  }
  return { months, salaireDebloqueAuMois, avgProfitPerWatch, avgPricePerWatch };
}

// ─── Composants UI ─────────────────────────────────────────────

function NumberField({ label, value, onChange, suffix, hint, step = 1 }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.14em] font-medium" style={{ color: C.textSec }}>{label}</span>
        {hint && <span className="text-[10px] italic" style={{ color: C.textDim }}>{hint}</span>}
      </div>
      <div className="relative">
        <input
          type="number" value={value} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-md px-3.5 py-2.5 text-[14px] outline-none transition-all duration-150 font-['JetBrains_Mono']"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}
          onFocus={(e) => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.gold}22`; }}
          onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-['JetBrains_Mono'] pointer-events-none" style={{ color: C.textMuted }}>
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

const PercentField = ({ label, value, onChange, hint }) =>
  <NumberField label={label} value={(value * 100).toFixed(2)} onChange={(v) => onChange(v / 100)} suffix="%" hint={hint} step={0.1} />;

function StatRow({ label, value, valueColor, sub, strong, dim }) {
  return (
    <div className="flex items-baseline justify-between py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div className="flex flex-col flex-1 min-w-0 pr-3">
        <span className="text-[13px] leading-snug" style={{ color: strong ? C.text : (dim ? C.textMuted : C.textSec), fontWeight: strong ? 500 : 400 }}>{label}</span>
        {sub && <span className="text-[10.5px] mt-0.5 italic" style={{ color: C.textDim }}>{sub}</span>}
      </div>
      <span className="font-['JetBrains_Mono'] tabular-nums whitespace-nowrap" style={{ color: valueColor || C.text, fontSize: strong ? '17px' : '13.5px', fontWeight: strong ? 500 : 400 }}>{value}</span>
    </div>
  );
}

function Card({ children, title, subtitle, accent }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}>
      {title && (
        <div className="px-6 py-4 flex items-baseline justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="min-w-0">
            <h3 className="font-['Fraunces'] text-[16px] font-medium tracking-tight" style={{ color: C.text }}>{title}</h3>
            {subtitle && <p className="text-[11.5px] mt-1 italic leading-tight" style={{ color: C.textMuted }}>{subtitle}</p>}
          </div>
          {accent && (
            <span className="text-[10px] uppercase tracking-[0.18em] font-medium px-2 py-1 rounded whitespace-nowrap ml-3" style={{ color: C.gold, backgroundColor: `${C.gold}14`, border: `1px solid ${C.gold}33` }}>
              {accent}
            </span>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick} className="relative flex items-center gap-3 px-6 py-5 text-left transition-all duration-200 whitespace-nowrap"
      style={{ color: active ? C.text : C.textMuted }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = C.textSec; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.textMuted; }}
    >
      <Icon size={17} strokeWidth={1.5} style={{ color: active ? C.gold : 'currentColor' }} />
      <div className="flex flex-col">
        <span className="font-['Fraunces'] text-[15px] tracking-tight font-medium">{label}</span>
        <span className="text-[10.5px] tracking-wide mt-0.5" style={{ color: active ? C.textMuted : C.textDim }}>{sub}</span>
      </div>
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${C.gold} 20%, ${C.gold} 80%, transparent 100%)` }} />}
    </button>
  );
}

function KpiCard({ label, value, sub, color, highlight }) {
  return (
    <div className="rounded-lg p-6 relative overflow-hidden" style={{ backgroundColor: C.bgCard, border: `1px solid ${highlight ? C.borderAccent : C.border}` }}>
      {highlight && <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: `radial-gradient(circle at 100% 0%, ${C.gold}1A, transparent 50%)` }} />}
      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: highlight ? C.gold : C.textMuted }}>{label}</div>
        <div className="font-['Fraunces'] text-[34px] font-light leading-none mt-3 tracking-tight tabular-nums" style={{ color: color || C.text }}>{value}</div>
        {sub && <div className="text-[11px] mt-2" style={{ color: C.textMuted }}>{sub}</div>}
      </div>
    </div>
  );
}

const fmt = (n, d = 2) => {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const eur = (n) => `${fmt(n)} €`;
const eurInt = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MatriceRentabiliteHorlogere() {
  const [params, setParams] = useState(DEFAULTS);
  const [tab, setTab] = useState('landed');
  const [saved, setSaved] = useState(false);
  const upd = (k, v) => setParams((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get('matrix-v3');
        if (r && r.value) setParams({ ...DEFAULTS, ...JSON.parse(r.value) });
      } catch (e) {}
    })();
  }, []);

  const save = async () => {
    try {
      await window.storage.set('matrix-v3', JSON.stringify(params));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
  };

  const reset = () => { if (confirm('Réinitialiser aux valeurs par défaut ?')) setParams(DEFAULTS); };

  const landed = useMemo(() => computeLandedCost(params), [params]);
  const ops = useMemo(() => computeOpsCost(params), [params]);
  const fixedCosts = useMemo(() => {
    const base = params.rcProAssurance + params.storageMonthly + params.toolsAmort;
    const c24 = (params.mixChrono24 > 0) ? params.chrono24Sub : 0;
    return base + c24 + (params.legalStatus === 'sasu' ? params.comptaSasu : 0);
  }, [params]);
  
  const dashboard = useMemo(() => computeMonthlyDashboard(params, fixedCosts), [params, fixedCosts]);
  const roadmap = useMemo(() => simulateRoadmap(params, fixedCosts), [params, fixedCosts]);
  const maxBidJpy = useMemo(() => computeMaxBidJpy(params, params.targetSellPriceEur, 'chrono24'), [params]);

  const pricingTable = useMemo(() => {
    const result = {};
    Object.keys(CHANNELS).forEach((ch) => {
      const minPrice = computeMinSellPrice(landed.total, ch, params.targetMarginNet, ops, params.failureProvision);
      const margin = minPrice ? computeNetMargin(minPrice, landed.total, ops, ch, params.failureProvision) : null;
      result[ch] = { minPrice, margin };
    });
    return result;
  }, [landed.total, ops, params.targetMarginNet, params.failureProvision]);

  return (
    <div className="min-h-screen font-['Manrope']" style={{ backgroundColor: C.bg, color: C.text }}>
      <style>{FONT_IMPORT}</style>

      <header style={{ borderBottom: `1px solid ${C.border}`, backgroundImage: `radial-gradient(ellipse 800px 300px at 15% 0%, ${C.gold}10, transparent 60%)` }}>
        <div className="max-w-7xl mx-auto px-8 py-10 flex items-end justify-between gap-8 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-10" style={{ backgroundColor: C.gold }} />
              <span className="text-[10px] uppercase tracking-[0.32em] font-semibold" style={{ color: C.gold }}>Matrice — v3.0</span>
            </div>
            <h1 className="font-['Fraunces'] text-[44px] leading-[1.05] font-light tracking-tight" style={{ color: C.text }}>
              Arbitrage <em className="italic font-normal" style={{ color: C.gold }}>Horloger</em>
            </h1>
            <p className="mt-4 text-[13px] max-w-lg leading-relaxed" style={{ color: C.textMuted }}>
              Logique intégrée IOSS & Frais mutualisés. Sourcing direct vs Enchères.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={save} className="flex items-center gap-2 px-3.5 py-2.5 rounded-md text-[11px] uppercase font-medium transition-all" style={{ color: saved ? C.patina : C.textSec, border: `1px solid ${saved ? C.patina : C.border}`, backgroundColor: C.bgCard }}>
              {saved ? <Check size={13} strokeWidth={2} /> : <Save size={13} strokeWidth={1.5} />} {saved ? 'Sauvé' : 'Sauver'}
            </button>
            <button onClick={reset} className="flex items-center gap-2 px-3.5 py-2.5 rounded-md text-[11px] uppercase font-medium transition-all" style={{ color: C.textSec, border: `1px solid ${C.border}`, backgroundColor: C.bgCard }}>
              <RotateCcw size={13} strokeWidth={1.5} /> Reset
            </button>
          </div>
        </div>
      </header>

      <nav style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.bgRaised }}>
        <div className="max-w-7xl mx-auto px-8 flex overflow-x-auto">
          <Tab active={tab === 'landed'}    onClick={() => setTab('landed')}    icon={ArrowRightLeft} label="Sourcing IOSS" sub="Achat & Reverse" />
          <Tab active={tab === 'pricing'}   onClick={() => setTab('pricing')}   icon={Tag}        label="Distribution"     sub="Prix de vente cible" />
          <Tab active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={TrendingUp} label="Opérations"   sub="Salaire & Charges" />
          <Tab active={tab === 'roadmap'}   onClick={() => setTab('roadmap')}   icon={Rocket}     label="Roadmap"     sub="Capitalisation 24m" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-10">

        {tab === 'landed' && (
          <div className="space-y-6">
            
            <div className="flex items-center gap-4 bg-[#15130F] p-2 rounded-lg border border-[#2D2820] w-fit mx-auto mb-8">
              <button onClick={() => upd('sourcingMode', 'direct')} className={`px-6 py-2 rounded-md text-[13px] font-medium transition-all ${params.sourcingMode === 'direct' ? 'bg-[#252119] text-[#FAF6EC] border border-[#544C3D]' : 'text-[#A89F8C] border border-transparent'}`}>
                Achat Direct (Forward)
              </button>
              <button onClick={() => upd('sourcingMode', 'auction')} className={`px-6 py-2 rounded-md text-[13px] font-medium transition-all ${params.sourcingMode === 'auction' ? 'bg-[#252119] text-[#FAF6EC] border border-[#E8BF52] shadow-[0_0_10px_rgba(232,191,82,0.1)]' : 'text-[#A89F8C] border border-transparent'}`}>
                Enchères (Reverse)
              </button>
            </div>

            {params.sourcingMode === 'direct' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Prix d'achat" value={`${params.watchPriceJpy.toLocaleString('fr-FR')}`} sub="JPY" color={C.text} />
                <KpiCard label="Surcoût total" value={`+${fmt((landed.total / landed.priceEur - 1) * 100, 1)}%`} sub="TVA & Logistique IOSS" color={C.copper} />
                <KpiCard label="Landed Cost" value={eur(landed.total)} sub="Coût rendu exact" color={C.gold} highlight />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Prix de revente cible" value={eurInt(params.targetSellPriceEur)} sub="Chrono24" color={C.text} />
                <KpiCard label="Marge nette garantie" value={pct(params.targetMarginNet)} sub="Après tous frais" color={C.patina} />
                <KpiCard label="Enchère max. autorisée" value={`${Math.floor(maxBidJpy).toLocaleString('fr-FR')}`} sub="JPY" color={C.gold} highlight />
              </div>
            )}

            <div className="grid grid-cols-12 gap-6 mt-6">
              <div className="col-span-12 lg:col-span-5 space-y-6">
                
                {params.sourcingMode === 'direct' ? (
                  <Card title="Saisie Sourcing" subtitle="Prix observé sur ZenMarket" accent="Calcul Forward">
                    <div className="space-y-4">
                      <NumberField label="Prix de la montre" value={params.watchPriceJpy} onChange={(v) => upd('watchPriceJpy', v)} suffix="JPY" />
                      <NumberField label="Taux de change (Wise)" value={params.jpyEur} onChange={(v) => upd('jpyEur', v)} step={0.0001} hint="ex: 0.0061" />
                    </div>
                  </Card>
                ) : (
                  <Card title="Stratégie Enchère" subtitle="Défini ton enchère max" accent="Calcul Reverse">
                    <div className="space-y-4">
                      <NumberField label="Prix de revente estimé (Chrono24)" value={params.targetSellPriceEur} onChange={(v) => upd('targetSellPriceEur', v)} suffix="€" />
                      <NumberField label="Taux de change (Wise)" value={params.jpyEur} onChange={(v) => upd('jpyEur', v)} step={0.0001} hint="ex: 0.0061" />
                    </div>
                  </Card>
                )}

                <Card title="Frais Mutualisés" subtitle="Facturation par lots (IOSS)">
                  <div className="space-y-4">
                    <PercentField label="Friction Bancaire (Wise + Dépôt)" value={params.frictionRate} onChange={(v) => upd('frictionRate', v)} hint="~1.5% total" />
                    <NumberField label="Port moyen par montre" value={params.shippingPerWatchJpy} onChange={(v) => upd('shippingPerWatchJpy', v)} suffix="JPY" hint="~600 JPY lissé" />
                    <NumberField label="Taxe Petits Colis (TPC)" value={params.tpcTaxEur} onChange={(v) => upd('tpcTaxEur', v)} suffix="€" hint="~1€ par montre" />
                    <PercentField label="TVA (Liquidée à la source)" value={params.vatRate} onChange={(v) => upd('vatRate', v)} />
                  </div>
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-7 space-y-6">
                <Card title="Décomposition du Landed Cost" subtitle="Le coût réel rendu de la montre (Base: Achat Direct)">
                  <StatRow label="Prix d'achat (converti EUR)" value={eur(landed.priceEur)} />
                  <StatRow label="Friction bancaire (1.5%)"    value={eur(landed.frictionFee)} valueColor={C.copper} />
                  <StatRow label={`Commission ZenMarket (${params.sourcingMode === 'direct' ? 'Direct' : 'Enchère'})`} value={eur(landed.zenmarketFeeEur)} valueColor={C.copper} sub={`${params.sourcingMode === 'direct' ? params.zenmarketDirectJpy : params.zenmarketAuctionJpy} JPY`} />
                  <StatRow label="Port mutualisé & Assurance"  value={eur(landed.shippingEur)} valueColor={C.copper} sub={`${params.shippingPerWatchJpy} JPY / montre`} />
                  <div className="my-3 h-px" style={{ backgroundColor: C.borderHi }} />
                  <StatRow label="Valeur commerciale IOSS (CIP)" value={eur(landed.cif)} dim />
                  <StatRow label="TVA 20%"                     value={eur(landed.vat)} valueColor={C.rust} />
                  <StatRow label="Taxe TPC (Colis)"            value={eur(landed.tpcTaxEur)} valueColor={C.rust} />
                  <div className="my-3 h-px" style={{ backgroundColor: C.gold }} />
                  <StatRow label="LANDED COST TOTAL" value={eur(landed.total)} valueColor={C.gold} strong />
                </Card>
              </div>
            </div>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <Card title="Opérations & Risque" subtitle="Liés à la montre">
                <div className="space-y-4">
                  <NumberField  label="Intervention Horloger (Pile/Joint)" value={params.interventionEur} onChange={(v) => upd('interventionEur', v)} suffix="€" />
                  <NumberField  label="Emballage" value={params.packaging} onChange={(v) => upd('packaging', v)} suffix="€" />
                  <NumberField  label="Expédition sortante" value={params.shippingOutbound} onChange={(v) => upd('shippingOutbound', v)} suffix="€" />
                  <PercentField label="Provision pour rebut (Franken)" value={params.failureProvision} onChange={(v) => upd('failureProvision', v)} />
                </div>
              </Card>

              <Card title="Marge Cible">
                <PercentField label="Marge Nette" value={params.targetMarginNet} onChange={(v) => upd('targetMarginNet', v)} />
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-6">
              <Card title="Prix de vente requis par canal" subtitle={`Basé sur le Landed Cost de l'onglet Sourcing`}>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                        <th className="text-left py-3 px-6">Canal</th>
                        <th className="text-right py-3 px-3">Prix min</th>
                        <th className="text-right py-3 px-3">Frais canal</th>
                        <th className="text-right py-3 px-3">Profit Net</th>
                        <th className="text-right py-3 px-6">Marge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(CHANNELS).map(([k, ch]) => {
                        const r = pricingTable[k];
                        if (!r.minPrice) return null;
                        return (
                          <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td className="py-4 px-6">
                              <div className="font-['Fraunces'] text-[15.5px] font-medium" style={{ color: C.text }}>{ch.label}</div>
                            </td>
                            <td className="text-right px-3 font-['JetBrains_Mono'] tabular-nums font-medium" style={{ color: C.gold }}>{eur(r.minPrice)}</td>
                            <td className="text-right px-3 font-['JetBrains_Mono'] tabular-nums" style={{ color: C.textMuted }}>{eur(r.margin.channelFee)}</td>
                            <td className="text-right px-3 font-['JetBrains_Mono'] tabular-nums font-medium" style={{ color: C.patina }}>{eur(r.margin.profit)}</td>
                            <td className="text-right px-6 font-['JetBrains_Mono'] tabular-nums" style={{ color: C.text }}>{pct(r.margin.marginNet)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard label="Chiffre d'affaires" value={eurInt(dashboard.monthlyCA)} sub={`/mois · ${params.monthlyVolume} pièces`} color={C.text} />
              <KpiCard label="Marge brute globale" value={eurInt(dashboard.monthlyProfitBrut)} sub={`${pct(dashboard.avgMarginNet)} sur CA`} color={C.patina} />
              <KpiCard label="Salaire net dispo" value={eurInt(dashboard.netSalary)} sub={dashboard.statusNote} color={dashboard.netSalary >= 0 ? C.gold : C.rust} highlight />
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <Card title="Modèle Mensuel">
                  <div className="space-y-4">
                    <NumberField label="Volume mensuel" value={params.monthlyVolume} onChange={(v) => upd('monthlyVolume', v)} suffix="montres" />
                    <NumberField label="Ticket d'achat moyen (JPY)" value={params.avgWatchPriceJpy} onChange={(v) => upd('avgWatchPriceJpy', v)} />
                    <div className="pt-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3" style={{ color: C.textSec }}>Mix Plateformes (%)</div>
                      <div className="space-y-3">
                        <NumberField label="Vinted" value={params.mixVinted} onChange={(v) => upd('mixVinted', v)} />
                        <NumberField label="LeBonCoin" value={params.mixLeboncoin} onChange={(v) => upd('mixLeboncoin', v)} />
                        <NumberField label="Chrono24" value={params.mixChrono24} onChange={(v) => upd('mixChrono24', v)} />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Charges Fixes">
                  <div className="space-y-3.5">
                    <NumberField label="Assurance RC pro" value={params.rcProAssurance} onChange={(v) => upd('rcProAssurance', v)} />
                    <NumberField label="Stockage / Coffre" value={params.storageMonthly} onChange={(v) => upd('storageMonthly', v)} />
                    <NumberField label="Abo Chrono24" value={params.chrono24Sub} onChange={(v) => upd('chrono24Sub', v)} />
                    <div className="pt-3 flex justify-between" style={{ borderTop: `1px solid ${C.borderHi}` }}>
                      <span className="text-[12px] font-medium" style={{ color: C.textSec }}>Total fixe</span>
                      <span className="font-['JetBrains_Mono'] text-[16px] font-medium" style={{ color: C.gold }}>{eur(fixedCosts)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-8 space-y-6">
                <Card title="P&L Mensuel" subtitle="Arbitrage pur">
                  <StatRow label="Chiffre d'affaires" value={eur(dashboard.monthlyCA)} strong />
                  <StatRow label="− Coût Landed cumulé" value={`−${eur(dashboard.avgLanded * params.monthlyVolume)}`} valueColor={C.copper} />
                  <StatRow label="− Coûts Horloger & Logistique" value={`−${eur(ops * params.monthlyVolume)}`} valueColor={C.copper} />
                  <StatRow label="− Frais Plateformes" value={`−${eur(dashboard.totalChannelFees)}`} valueColor={C.copper} />
                  <div className="my-3 h-px" style={{ backgroundColor: C.borderHi }} />
                  <StatRow label="= Marge Brute" value={eur(dashboard.monthlyProfitBrut)} valueColor={C.patina} strong />
                  <StatRow label="− Charges Fixes" value={`−${eur(dashboard.fixedCosts)}`} valueColor={C.copper} />
                  <StatRow label="− Cotisations" value={`−${eur(dashboard.cotisations)}`} valueColor={C.rust} sub={dashboard.statusNote} />
                  <div className="my-3 h-px" style={{ backgroundColor: C.gold }} />
                  <StatRow label="SALAIRE NET" value={eur(dashboard.netSalary)} valueColor={dashboard.netSalary >= 0 ? C.gold : C.rust} strong />
                </Card>
              </div>
            </div>
          </div>
        )}

        {tab === 'roadmap' && (
          <div className="space-y-6 text-center text-sm" style={{ color: C.textMuted }}>
            [Module Roadmap inchangé vis-à-vis de la V2]
          </div>
        )}
      </main>
    </div>
  );
}