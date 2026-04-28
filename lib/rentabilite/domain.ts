export type LegalStatus = "micro" | "sasu";
export type SourcingMode = "direct" | "auction";
export type ChannelKey = "vinted" | "leboncoin" | "chrono24";

export type ChannelConfig = {
  label: string;
  commission: number;
  flat: number;
  shippingOutbound: number;
};

export type ChannelsConfig = Record<ChannelKey, ChannelConfig>;

export type WatchInPackage = {
  id: string;
  reference: string;
  sourcingMode: SourcingMode;
  priceJpy: number;
  zenmarketFeeJpy: number;
  interventionEur: number;
  notes?: string;
  soldChannel?: ChannelKey | null;
  soldPriceEur?: number | null;
  soldAt?: string | null;
};

export type RealPackage = {
  id: string;
  reference: string;
  carrier: string;
  shippedAt: string;
  shippingJpy: number;
  vatJpy: number;
  jpyEur: number;
  wiseFeeEur: number;
  watches: WatchInPackage[];
};

export type Params = {
  // Conversion / planning
  jpyEur: number;
  vatRate: number;
  wiseFeeRate: number;
  zenmarketDirectJpy: number;
  zenmarketAuctionJpy: number;
  expectedPkgWatches: number;
  expectedPkgShippingJpy: number;
  defaultInterventionEur: number;
  packaging: number;
  failureProvision: number;
  targetMarginNet: number;

  // Channels
  channels: ChannelsConfig;

  // Pre-purchase simulator
  targetSellPriceVinted: number;
  targetSellPriceLeboncoin: number;
  targetSellPriceChrono24: number;

  // Dashboard / planning
  monthlyVolume: number;
  avgWatchPriceJpy: number;
  mixVinted: number;
  mixLeboncoin: number;
  mixChrono24: number;

  // Fixed costs / status
  legalStatus: LegalStatus;
  rcProAssurance: number;
  storageMonthly: number;
  chrono24Sub: number;
  toolsAmort: number;
  comptaSasu: number;

  // Roadmap
  initialCapital: number;
  rotationDays: number;
  reinvestPhase1Months: number;
  reinvestRate1: number;
  reinvestRate2: number;
  targetSalary: number;
};

export const DEFAULT_CHANNELS: ChannelsConfig = {
  vinted: { label: "Vinted", commission: 0, flat: 0, shippingOutbound: 0 },
  leboncoin: { label: "LeBonCoin", commission: 0, flat: 0, shippingOutbound: 12 },
  chrono24: { label: "Chrono24", commission: 0.065, flat: 0, shippingOutbound: 18 },
};

export const DEFAULTS: Params = {
  jpyEur: 0.0061,
  vatRate: 0.2,
  wiseFeeRate: 0.005,
  zenmarketDirectJpy: 800,
  zenmarketAuctionJpy: 500,
  expectedPkgWatches: 4,
  expectedPkgShippingJpy: 4000,
  defaultInterventionEur: 10,
  packaging: 4,
  failureProvision: 0.05,
  targetMarginNet: 0.3,

  channels: DEFAULT_CHANNELS,

  targetSellPriceVinted: 250,
  targetSellPriceLeboncoin: 280,
  targetSellPriceChrono24: 400,

  monthlyVolume: 12,
  avgWatchPriceJpy: 35000,
  mixVinted: 40,
  mixLeboncoin: 20,
  mixChrono24: 40,

  legalStatus: "micro",
  rcProAssurance: 45,
  storageMonthly: 20,
  chrono24Sub: 30,
  toolsAmort: 15,
  comptaSasu: 110,

  initialCapital: 3000,
  rotationDays: 50,
  reinvestPhase1Months: 8,
  reinvestRate1: 1,
  reinvestRate2: 0.4,
  targetSalary: 2500,
};

// ----- Real packages: actual landed cost per watch (prorata price) -----
export type WatchLanded = {
  priceEur: number;
  zenFeeEur: number;
  shippingShareEur: number;
  vatShareEur: number;
  wiseShareEur: number;
  interventionEur: number;
  total: number;
};

export function computeWatchLandedReal(pkg: RealPackage, watch: WatchInPackage): WatchLanded {
  const totalPriceJpy = pkg.watches.reduce((s, w) => s + w.priceJpy, 0);
  const ratio = totalPriceJpy > 0 ? watch.priceJpy / totalPriceJpy : 1 / Math.max(1, pkg.watches.length);
  const priceEur = watch.priceJpy * pkg.jpyEur;
  const zenFeeEur = watch.zenmarketFeeJpy * pkg.jpyEur;
  const shippingShareEur = pkg.shippingJpy * pkg.jpyEur * ratio;
  const vatShareEur = pkg.vatJpy * pkg.jpyEur * ratio;
  const wiseShareEur = pkg.wiseFeeEur * ratio;
  const total = priceEur + zenFeeEur + shippingShareEur + vatShareEur + wiseShareEur + watch.interventionEur;
  return { priceEur, zenFeeEur, shippingShareEur, vatShareEur, wiseShareEur, interventionEur: watch.interventionEur, total };
}

export function computePackageVatPlanned(pkg: RealPackage, vatRate: number) {
  const fobJpy = pkg.watches.reduce((s, w) => s + w.priceJpy, 0);
  return (fobJpy + pkg.shippingJpy) * vatRate;
}

// ----- Planning landed cost (estimated, for pre-purchase calculators) -----
export function computePlanningLanded(p: Params, priceJpy: number, mode: SourcingMode, interventionEur: number) {
  const r = p.jpyEur;
  const zenJpy = mode === "direct" ? p.zenmarketDirectJpy : p.zenmarketAuctionJpy;
  const N = Math.max(1, p.expectedPkgWatches);
  const priceEur = priceJpy * r;
  const zenFeeEur = zenJpy * r;
  const shippingShareEur = (p.expectedPkgShippingJpy * r) / N;
  // IOSS VAT applies to (FOB share + freight share)
  const vatShareEur = p.vatRate * (priceEur + shippingShareEur);
  const wiseShareEur = p.wiseFeeRate * priceEur;
  const total = priceEur + zenFeeEur + shippingShareEur + vatShareEur + wiseShareEur + interventionEur;
  return { priceEur, zenFeeEur, shippingShareEur, vatShareEur, wiseShareEur, interventionEur, total };
}

// ----- Channel pricing -----
export function computeChannelFee(channel: ChannelConfig, sellPrice: number) {
  return sellPrice * channel.commission + channel.flat;
}

export function computeNetMargin(p: Params, channelKey: ChannelKey, sellPrice: number, landedTotal: number) {
  const ch = p.channels[channelKey];
  const baseCost = (landedTotal + ch.shippingOutbound + p.packaging) * (1 + p.failureProvision);
  const channelFee = computeChannelFee(ch, sellPrice);
  const profit = sellPrice - baseCost - channelFee;
  return { profit, marginNet: sellPrice > 0 ? profit / sellPrice : 0, channelFee, baseCost };
}

export function computeMinSellPrice(p: Params, channelKey: ChannelKey, landedTotal: number) {
  const ch = p.channels[channelKey];
  const baseCost = (landedTotal + ch.shippingOutbound + p.packaging) * (1 + p.failureProvision);
  const denom = 1 - ch.commission - p.targetMarginNet;
  if (denom <= 0) return null;
  return (baseCost + ch.flat) / denom;
}

// ----- Max buy price (JPY) for a given target sell price on a given channel and mode -----
export function computeMaxBuyJpy(p: Params, channelKey: ChannelKey, sellPriceEur: number, mode: SourcingMode, interventionEur: number) {
  const ch = p.channels[channelKey];
  const r = p.jpyEur;
  const N = Math.max(1, p.expectedPkgWatches);
  const zenJpy = mode === "direct" ? p.zenmarketDirectJpy : p.zenmarketAuctionJpy;

  // Target landed (max) so that net margin = targetMarginNet
  const denomNumer = sellPriceEur * (1 - ch.commission - p.targetMarginNet) - ch.flat;
  if (denomNumer <= 0) return 0;
  const targetBaseCost = denomNumer / (1 + p.failureProvision);
  const landedMax = targetBaseCost - ch.shippingOutbound - p.packaging;
  if (landedMax <= 0) return 0;

  // Reverse landed = priceEur*(1 + vat + wiseRate) + zenFeeEur + shippingShareEur*(1+vat) + intervention
  const fixedShare = zenJpy * r + (p.expectedPkgShippingJpy * r / N) * (1 + p.vatRate) + interventionEur;
  const remaining = landedMax - fixedShare;
  if (remaining <= 0) return 0;
  const priceEurMax = remaining / (1 + p.vatRate + p.wiseFeeRate);
  return Math.max(0, priceEurMax / r);
}

// ----- Fixed costs -----
export function computeFixedCosts(p: Params) {
  const base = p.rcProAssurance + p.storageMonthly + p.toolsAmort;
  const c24 = p.mixChrono24 > 0 ? p.chrono24Sub : 0;
  return base + c24 + (p.legalStatus === "sasu" ? p.comptaSasu : 0);
}

// ----- Monthly dashboard (planning, based on avg watch price) -----
export function computeMonthlyDashboard(p: Params, fixedCosts: number) {
  const avgLandedDirect = computePlanningLanded(p, p.avgWatchPriceJpy, "direct", p.defaultInterventionEur).total;
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  if (mixSum <= 0) {
    return { avgLanded: avgLandedDirect, monthlyCA: 0, monthlyProfitBrut: 0, totalChannelFees: 0, fixedCosts, cotisations: 0, netSalary: -fixedCosts, statusNote: "Mix vide" };
  }
  const mix: Record<ChannelKey, number> = {
    vinted: p.mixVinted / mixSum,
    leboncoin: p.mixLeboncoin / mixSum,
    chrono24: p.mixChrono24 / mixSum,
  };
  let totalCA = 0;
  let totalProfitBrut = 0;
  let totalChannelFees = 0;
  (Object.keys(mix) as ChannelKey[]).forEach((ch) => {
    const w = mix[ch];
    const price = computeMinSellPrice(p, ch, avgLandedDirect);
    if (!price) return;
    const m = computeNetMargin(p, ch, price, avgLandedDirect);
    totalCA += price * w;
    totalProfitBrut += m.profit * w;
    totalChannelFees += m.channelFee * w;
  });
  const monthlyCA = totalCA * p.monthlyVolume;
  const monthlyProfitBrut = totalProfitBrut * p.monthlyVolume;
  const profitBeforeTax = monthlyProfitBrut - fixedCosts;
  const cotisations = p.legalStatus === "micro" ? monthlyCA * 0.133 : Math.max(0, profitBeforeTax * 0.46);
  const netSalary = monthlyProfitBrut - fixedCosts - cotisations;
  const statusNote = p.legalStatus === "micro" ? "Micro-BIC · 13,3% du CA" : "SASU · ~46% sur remuneration";
  return { avgLanded: avgLandedDirect, monthlyCA, monthlyProfitBrut, totalChannelFees: totalChannelFees * p.monthlyVolume, fixedCosts, cotisations, netSalary, statusNote };
}

// ----- Roadmap simulation -----
export function simulateRoadmap(p: Params, fixedCosts: number) {
  const months: { mois: number; capital: number; ca: number; salaire: number }[] = [];
  let capital = p.initialCapital;
  const rotationsPerMonth = 30 / Math.max(1, p.rotationDays);
  const avgLanded = computePlanningLanded(p, p.avgWatchPriceJpy, "direct", p.defaultInterventionEur).total;
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix: Record<ChannelKey, number> = mixSum > 0
    ? { vinted: p.mixVinted / mixSum, leboncoin: p.mixLeboncoin / mixSum, chrono24: p.mixChrono24 / mixSum }
    : { vinted: 0, leboncoin: 0, chrono24: 0 };
  let avgProfitPerWatch = 0;
  let avgPricePerWatch = 0;
  (Object.keys(mix) as ChannelKey[]).forEach((ch) => {
    const w = mix[ch];
    const price = computeMinSellPrice(p, ch, avgLanded);
    if (!price) return;
    const m = computeNetMargin(p, ch, price, avgLanded);
    avgProfitPerWatch += m.profit * w;
    avgPricePerWatch += price * w;
  });
  for (let i = 1; i <= 24; i++) {
    const watchesPerMonth = avgLanded > 0 ? (capital / avgLanded) * rotationsPerMonth : 0;
    const monthCA = watchesPerMonth * avgPricePerWatch;
    const monthProfitBrut = watchesPerMonth * avgProfitPerWatch;
    const cotisations = p.legalStatus === "micro" ? monthCA * 0.133 : Math.max(0, (monthProfitBrut - fixedCosts) * 0.46);
    const profitDispo = monthProfitBrut - fixedCosts - cotisations;
    const reinvestRate = i <= p.reinvestPhase1Months ? p.reinvestRate1 : p.reinvestRate2;
    const reinvested = Math.max(0, profitDispo) * reinvestRate;
    const salaire = Math.max(0, profitDispo) - reinvested;
    capital += reinvested;
    months.push({ mois: i, capital: Math.round(capital), ca: Math.round(monthCA), salaire: Math.round(Math.max(0, salaire)) });
  }
  return months;
}

// ----- Aggregation over real packages (actual P&L) -----
export type PackageStats = {
  watches: number;
  totalLanded: number;
  totalSold: number;
  totalChannelFees: number;
  totalProfit: number;
  avgMarginNet: number;
  unsold: number;
  unsoldLanded: number;
};

export function aggregatePackages(packages: RealPackage[], p: Params): PackageStats {
  let watches = 0;
  let totalLanded = 0;
  let totalSold = 0;
  let totalChannelFees = 0;
  let totalProfit = 0;
  let unsold = 0;
  let unsoldLanded = 0;
  let marginSumWeighted = 0;
  let marginWeight = 0;
  for (const pkg of packages) {
    for (const w of pkg.watches) {
      watches += 1;
      const landed = computeWatchLandedReal(pkg, w);
      totalLanded += landed.total;
      if (w.soldChannel && w.soldPriceEur && w.soldPriceEur > 0) {
        const m = computeNetMargin(p, w.soldChannel, w.soldPriceEur, landed.total);
        totalSold += w.soldPriceEur;
        totalChannelFees += m.channelFee;
        totalProfit += m.profit;
        marginSumWeighted += m.marginNet * w.soldPriceEur;
        marginWeight += w.soldPriceEur;
      } else {
        unsold += 1;
        unsoldLanded += landed.total;
      }
    }
  }
  return {
    watches,
    totalLanded,
    totalSold,
    totalChannelFees,
    totalProfit,
    avgMarginNet: marginWeight > 0 ? marginSumWeighted / marginWeight : 0,
    unsold,
    unsoldLanded,
  };
}
