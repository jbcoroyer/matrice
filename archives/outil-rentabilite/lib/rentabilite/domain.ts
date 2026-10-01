export type LegalStatus = "micro" | "sasu";
export type PurchaseMode = "direct" | "auction";
export type ChannelKey = "vinted" | "leboncoin" | "chrono24";

export type WatchInParcel = {
  id: string;
  name: string;
  priceJpy: number;
  mode: PurchaseMode;
  zenmarketFeeJpy: number;
  interventionEur: number;
  purchaseDate?: string;
  status?: "stock" | "vendu";
  salePrice?: number;
  saleChannel?: ChannelKey;
  saleDate?: string;
};

// Watch purchased but not yet assigned to a parcel
export type PendingWatch = WatchInParcel & {
  purchaseDate: string;
};

export type Parcel = {
  id: string;
  ref: string;
  date: string;
  carrier: string;
  freightJpy: number;
  vatJpy: number;
  tpcEur: number;
  wiseFeeEur: number;
  watches: WatchInParcel[];
};

export type Params = {
  // Simulator
  simulatorMode: PurchaseMode;
  jpyEur: number;
  frictionRate: number;
  watchPriceJpy: number;
  targetSellPriceEur: number;
  targetSellChannel: ChannelKey;
  zenmarketAuctionJpy: number;
  zenmarketDirectJpy: number;
  shippingPerWatchJpy: number;
  tpcTaxEur: number;
  vatRate: number;
  // Ops
  interventionEur: number;
  packaging: number;
  shippingOutVinted: number;
  shippingOutLbc: number;
  shippingOutChrono24: number;
  failureProvision: number;
  targetMarginNet: number;
  // Dashboard
  monthlyVolume: number;
  mixVinted: number;
  mixLeboncoin: number;
  mixChrono24: number;
  avgWatchPriceJpy: number;
  legalStatus: LegalStatus;
  // Fixed costs
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

export const DEFAULTS: Params = {
  simulatorMode: "direct",
  jpyEur: 0.0061,
  frictionRate: 0.005,
  watchPriceJpy: 5000,
  targetSellPriceEur: 150,
  targetSellChannel: "chrono24",
  zenmarketAuctionJpy: 500,
  zenmarketDirectJpy: 800,
  shippingPerWatchJpy: 600,
  tpcTaxEur: 1,
  vatRate: 0.2,
  interventionEur: 10,
  packaging: 4,
  shippingOutVinted: 0,
  shippingOutLbc: 8,
  shippingOutChrono24: 12,
  failureProvision: 0.05,
  targetMarginNet: 0.3,
  monthlyVolume: 12,
  mixVinted: 50,
  mixLeboncoin: 20,
  mixChrono24: 30,
  avgWatchPriceJpy: 5000,
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

export const CHANNELS = {
  vinted: { label: "Vinted", commission: 0, flat: 0 },
  leboncoin: { label: "LeBonCoin", commission: 0, flat: 0 },
  chrono24: { label: "Chrono24", commission: 0.065, flat: 0 },
} as const;

export function getShippingOut(p: Params, ch: ChannelKey): number {
  if (ch === "vinted") return p.shippingOutVinted;
  if (ch === "leboncoin") return p.shippingOutLbc;
  return p.shippingOutChrono24;
}

// Simulator: estimate landed cost from params (no real parcel data)
export function computeLandedCost(p: Params, forcePriceJpy?: number) {
  const priceJpy = forcePriceJpy ?? p.watchPriceJpy;
  const priceEur = priceJpy * p.jpyEur;
  const frictionFee = priceEur * p.frictionRate;
  const zenFeeJpy = p.simulatorMode === "direct" ? p.zenmarketDirectJpy : p.zenmarketAuctionJpy;
  const zenFeeEur = zenFeeJpy * p.jpyEur;
  const shippingEur = p.shippingPerWatchJpy * p.jpyEur;
  const cif = priceEur + zenFeeEur + shippingEur;
  const vat = cif * p.vatRate;
  const total = priceEur + frictionFee + zenFeeEur + shippingEur + vat + p.tpcTaxEur;
  return { priceEur, frictionFee, zenFeeEur, shippingEur, vat, tpcEur: p.tpcTaxEur, total, cif };
}

export type WatchLanded = {
  priceEur: number;
  zenFeeEur: number;
  shippingShareEur: number;
  vatShareEur: number;
  tpcShareEur: number;
  wiseFeeShareEur: number;
  total: number;
};

// Real parcel: compute landed cost per watch from actual invoice data
// Shipping, VAT, TPC and Wise fee are prorated by FOB purchase price share
export function computeParcelWatchLanded(watch: WatchInParcel, parcel: Parcel, jpyEur: number): WatchLanded {
  const fobTotal = parcel.watches.reduce((s, w) => s + w.priceJpy, 0);
  const share = fobTotal > 0 ? watch.priceJpy / fobTotal : 1 / Math.max(parcel.watches.length, 1);
  const priceEur = watch.priceJpy * jpyEur;
  const zenFeeEur = watch.zenmarketFeeJpy * jpyEur;
  const shippingShareEur = parcel.freightJpy * share * jpyEur;
  const vatShareEur = parcel.vatJpy * share * jpyEur;
  const tpcShareEur = parcel.tpcEur * share;
  const wiseFeeShareEur = parcel.wiseFeeEur * share;
  const total = priceEur + zenFeeEur + shippingShareEur + vatShareEur + tpcShareEur + wiseFeeShareEur;
  return { priceEur, zenFeeEur, shippingShareEur, vatShareEur, tpcShareEur, wiseFeeShareEur, total };
}

export type WatchPnl = {
  landedTotal: number;
  opsCost: number;
  channelFee: number;
  profit: number;
  marginNet: number;
};

export function computeWatchRealPnl(watch: WatchInParcel, parcel: Parcel, p: Params): WatchPnl | null {
  if (watch.status !== "vendu" || !watch.salePrice || !watch.saleChannel) return null;
  const landed = computeParcelWatchLanded(watch, parcel, p.jpyEur);
  const ops = watch.interventionEur + p.packaging + getShippingOut(p, watch.saleChannel);
  const c = CHANNELS[watch.saleChannel];
  const channelFee = watch.salePrice * c.commission + c.flat;
  const profit = watch.salePrice - landed.total - ops - channelFee;
  const marginNet = watch.salePrice > 0 ? profit / watch.salePrice : 0;
  return { landedTotal: landed.total, opsCost: ops, channelFee, profit, marginNet };
}

export function computeMinSellPrice(
  landedCostTotal: number,
  channelKey: ChannelKey,
  marginNet: number,
  opsCost: number,
  failureProvision: number
): number | null {
  const c = CHANNELS[channelKey];
  const baseCost = (landedCostTotal + opsCost) * (1 + failureProvision);
  const denom = 1 - c.commission - marginNet;
  if (denom <= 0) return null;
  return (baseCost + c.flat) / denom;
}

// Auction mode: given target sell price on a channel, compute max bid in JPY
export function computeMaxBidJpy(p: Params, targetSellPrice: number, channelKey: ChannelKey): number {
  const c = CHANNELS[channelKey];
  const ops = p.packaging + getShippingOut(p, channelKey) + p.interventionEur;
  const targetLandedPlusOps = (targetSellPrice * (1 - c.commission - p.targetMarginNet) - c.flat) / (1 + p.failureProvision);
  const targetLanded = targetLandedPlusOps - ops;
  // landed = priceEur×(1 + friction + vat) + (zenFee + shipping)×(1 + vat) + tpc
  const zenFeeEur = p.zenmarketAuctionJpy * p.jpyEur;
  const shippingEur = p.shippingPerWatchJpy * p.jpyEur;
  const fixedCosts = p.tpcTaxEur + (zenFeeEur + shippingEur) * (1 + p.vatRate);
  const maxPriceEur = (targetLanded - fixedCosts) / (1 + p.frictionRate + p.vatRate);
  return Math.max(0, maxPriceEur / p.jpyEur);
}

export function computeNetMargin(
  sellPrice: number,
  landedCostTotal: number,
  opsCost: number,
  channelKey: ChannelKey,
  failureProvision: number
) {
  const c = CHANNELS[channelKey];
  const baseCost = (landedCostTotal + opsCost) * (1 + failureProvision);
  const channelFee = sellPrice * c.commission + c.flat;
  const profit = sellPrice - baseCost - channelFee;
  return { profit, marginNet: profit / sellPrice, channelFee, baseCost };
}

export type RealMonthlyPnl = {
  soldCount: number;
  caReel: number;
  profitReel: number;
  avgMarginReel: number;
  totalLanded: number;
  totalOps: number;
  totalChannelFees: number;
  items: { watch: WatchInParcel; parcel: Parcel; pnl: WatchPnl }[];
};

export function computeRealMonthlyPnl(parcels: Parcel[], month: string, params: Params): RealMonthlyPnl | null {
  const items: { watch: WatchInParcel; parcel: Parcel; pnl: WatchPnl }[] = [];
  for (const parcel of parcels) {
    for (const watch of parcel.watches) {
      if (watch.status === "vendu" && watch.saleDate?.startsWith(month)) {
        const pnl = computeWatchRealPnl(watch, parcel, params);
        if (pnl) items.push({ watch, parcel, pnl });
      }
    }
  }
  if (items.length === 0) return null;
  const caReel = items.reduce((s, x) => s + (x.watch.salePrice ?? 0), 0);
  const profitReel = items.reduce((s, x) => s + x.pnl.profit, 0);
  const totalLanded = items.reduce((s, x) => s + x.pnl.landedTotal, 0);
  const totalOps = items.reduce((s, x) => s + x.pnl.opsCost, 0);
  const totalChannelFees = items.reduce((s, x) => s + x.pnl.channelFee, 0);
  return {
    soldCount: items.length,
    caReel,
    profitReel,
    avgMarginReel: caReel > 0 ? profitReel / caReel : 0,
    totalLanded,
    totalOps,
    totalChannelFees,
    items,
  };
}

export function computeFixedCosts(p: Params): number {
  const base = p.rcProAssurance + p.storageMonthly + p.toolsAmort;
  const c24 = p.mixChrono24 > 0 ? p.chrono24Sub : 0;
  return base + c24 + (p.legalStatus === "sasu" ? p.comptaSasu : 0);
}

export function computeMonthlyDashboard(p: Params, fixedCosts: number) {
  const avgLanded = computeLandedCost(p, p.avgWatchPriceJpy).total;
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix: Record<ChannelKey, number> = {
    vinted: p.mixVinted / mixSum,
    leboncoin: p.mixLeboncoin / mixSum,
    chrono24: p.mixChrono24 / mixSum,
  };
  let totalCA = 0, totalProfitBrut = 0, totalChannelFees = 0;
  (Object.entries(mix) as [ChannelKey, number][]).forEach(([ch, weight]) => {
    const ops = p.packaging + getShippingOut(p, ch) + p.interventionEur;
    const price = computeMinSellPrice(avgLanded, ch, p.targetMarginNet, ops, p.failureProvision);
    if (!price) return;
    const m = computeNetMargin(price, avgLanded, ops, ch, p.failureProvision);
    totalCA += price * weight;
    totalProfitBrut += m.profit * weight;
    totalChannelFees += m.channelFee * weight;
  });
  const monthlyCA = totalCA * p.monthlyVolume;
  const monthlyProfitBrut = totalProfitBrut * p.monthlyVolume;
  const cotisations = p.legalStatus === "micro"
    ? monthlyCA * 0.133
    : Math.max(0, (monthlyProfitBrut - fixedCosts) * 0.46);
  const netSalary = monthlyProfitBrut - fixedCosts - cotisations;
  const statusNote = p.legalStatus === "micro" ? "Micro-BIC · 13,3% du CA" : "SASU · ~46% sur remuneration";
  return {
    avgLanded, monthlyCA, monthlyProfitBrut,
    totalChannelFees: totalChannelFees * p.monthlyVolume,
    fixedCosts, cotisations, netSalary, statusNote,
  };
}

export function simulateRoadmap(p: Params, fixedCosts: number) {
  const months: { mois: number; capital: number; ca: number; salaire: number }[] = [];
  let capital = p.initialCapital;
  const rotationsPerMonth = 30 / p.rotationDays;
  const avgLanded = computeLandedCost(p, p.avgWatchPriceJpy).total;
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix: Record<ChannelKey, number> = {
    vinted: p.mixVinted / mixSum,
    leboncoin: p.mixLeboncoin / mixSum,
    chrono24: p.mixChrono24 / mixSum,
  };
  let avgProfitPerWatch = 0, avgPricePerWatch = 0;
  (Object.entries(mix) as [ChannelKey, number][]).forEach(([ch, w]) => {
    const ops = p.packaging + getShippingOut(p, ch) + p.interventionEur;
    const price = computeMinSellPrice(avgLanded, ch, p.targetMarginNet, ops, p.failureProvision);
    if (!price) return;
    const m = computeNetMargin(price, avgLanded, ops, ch, p.failureProvision);
    avgProfitPerWatch += m.profit * w;
    avgPricePerWatch += price * w;
  });
  for (let i = 1; i <= 24; i++) {
    const watchesPerMonth = (capital / avgLanded) * rotationsPerMonth;
    const monthCA = watchesPerMonth * avgPricePerWatch;
    const monthProfitBrut = watchesPerMonth * avgProfitPerWatch;
    const cotisations = p.legalStatus === "micro"
      ? monthCA * 0.133
      : Math.max(0, (monthProfitBrut - fixedCosts) * 0.46);
    const profitDispo = monthProfitBrut - fixedCosts - cotisations;
    const reinvestRate = i <= p.reinvestPhase1Months ? p.reinvestRate1 : p.reinvestRate2;
    const reinvested = Math.max(0, profitDispo) * reinvestRate;
    const salaire = Math.max(0, profitDispo) - reinvested;
    capital += reinvested;
    months.push({ mois: i, capital: Math.round(capital), ca: Math.round(monthCA), salaire: Math.round(Math.max(0, salaire)) });
  }
  return months;
}
