export type LegalStatus = "micro" | "sasu";
export type SourcingMode = "direct" | "auction";
export type ChannelKey = "vinted" | "leboncoin" | "chrono24";

export type Params = {
  sourcingMode: SourcingMode;
  jpyEur: number;
  frictionRate: number;
  watchPriceJpy: number;
  targetSellPriceEur: number;
  zenmarketAuctionJpy: number;
  zenmarketDirectJpy: number;
  shippingPerWatchJpy: number;
  tpcTaxEur: number;
  vatRate: number;
  interventionEur: number;
  packaging: number;
  shippingOutbound: number;
  failureProvision: number;
  targetMarginNet: number;
  monthlyVolume: number;
  mixVinted: number;
  mixLeboncoin: number;
  mixChrono24: number;
  legalStatus: LegalStatus;
  avgWatchPriceJpy: number;
  rcProAssurance: number;
  storageMonthly: number;
  chrono24Sub: number;
  toolsAmort: number;
  comptaSasu: number;
  initialCapital: number;
  rotationDays: number;
  reinvestPhase1Months: number;
  reinvestRate1: number;
  reinvestRate2: number;
  targetSalary: number;
};

export const DEFAULTS: Params = {
  sourcingMode: "direct",
  jpyEur: 0.0061,
  frictionRate: 0.015,
  watchPriceJpy: 28000,
  targetSellPriceEur: 400,
  zenmarketAuctionJpy: 500,
  zenmarketDirectJpy: 800,
  shippingPerWatchJpy: 600,
  tpcTaxEur: 1,
  vatRate: 0.2,
  interventionEur: 15,
  packaging: 4,
  shippingOutbound: 12,
  failureProvision: 0.05,
  targetMarginNet: 0.3,
  monthlyVolume: 12,
  mixVinted: 50,
  mixLeboncoin: 20,
  mixChrono24: 30,
  legalStatus: "micro",
  avgWatchPriceJpy: 35000,
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

export function computeLandedCost(p: Params, forcePriceJpy: number | null = null) {
  const priceJpy = forcePriceJpy ?? p.watchPriceJpy;
  const priceEur = priceJpy * p.jpyEur;
  const frictionFee = priceEur * p.frictionRate;
  const zenmarketFeeJpy = p.sourcingMode === "direct" ? p.zenmarketDirectJpy : p.zenmarketAuctionJpy;
  const zenmarketFeeEur = zenmarketFeeJpy * p.jpyEur;
  const shippingEur = p.shippingPerWatchJpy * p.jpyEur;
  const cif = priceEur + zenmarketFeeEur + shippingEur;
  const vat = cif * p.vatRate;
  const total = priceEur + frictionFee + zenmarketFeeEur + shippingEur + vat + p.tpcTaxEur;
  return { priceEur, frictionFee, zenmarketFeeEur, shippingEur, vat, tpcTaxEur: p.tpcTaxEur, total, cif };
}

export const computeOpsCost = (p: Params) => p.interventionEur + p.packaging + p.shippingOutbound;

export function computeMinSellPrice(landedCostTotal: number, channelKey: ChannelKey, marginNet: number, opsCost: number, failureProvision: number) {
  const c = CHANNELS[channelKey];
  const baseCost = (landedCostTotal + opsCost) * (1 + failureProvision);
  const denom = 1 - c.commission - marginNet;
  if (denom <= 0) return null;
  return (baseCost + c.flat) / denom;
}

export function computeMaxBidJpy(p: Params, targetSellPrice: number, channelKey: ChannelKey) {
  const c = CHANNELS[channelKey];
  const opsCost = computeOpsCost(p);
  const targetBaseCost = (targetSellPrice * (1 - c.commission - p.targetMarginNet) - c.flat) / (1 + p.failureProvision);
  const targetLanded = targetBaseCost - opsCost;
  const fixedLandedCosts =
    p.tpcTaxEur +
    p.zenmarketAuctionJpy * p.jpyEur * (1 + p.vatRate) +
    p.shippingPerWatchJpy * p.jpyEur * (1 + p.vatRate);
  const maxPriceEur = (targetLanded - fixedLandedCosts) / (1 + p.frictionRate + p.vatRate);
  return Math.max(0, maxPriceEur / p.jpyEur);
}

export function computeNetMargin(sellPrice: number, landedCostTotal: number, opsCost: number, channelKey: ChannelKey, failureProvision: number) {
  const c = CHANNELS[channelKey];
  const baseCost = (landedCostTotal + opsCost) * (1 + failureProvision);
  const channelFee = sellPrice * c.commission + c.flat;
  const profit = sellPrice - baseCost - channelFee;
  return { profit, marginNet: profit / sellPrice, channelFee, baseCost };
}

export function computeFixedCosts(p: Params) {
  const base = p.rcProAssurance + p.storageMonthly + p.toolsAmort;
  const c24 = p.mixChrono24 > 0 ? p.chrono24Sub : 0;
  return base + c24 + (p.legalStatus === "sasu" ? p.comptaSasu : 0);
}

export function computeMonthlyDashboard(p: Params, fixedCosts: number) {
  const avgLanded = computeLandedCost(p, p.avgWatchPriceJpy).total;
  const ops = computeOpsCost(p);
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix = { vinted: p.mixVinted / mixSum, leboncoin: p.mixLeboncoin / mixSum, chrono24: p.mixChrono24 / mixSum };
  let totalCA = 0;
  let totalProfitBrut = 0;
  let totalChannelFees = 0;
  (Object.entries(mix) as [ChannelKey, number][]).forEach(([ch, weight]) => {
    const price = computeMinSellPrice(avgLanded, ch, p.targetMarginNet, ops, p.failureProvision);
    if (!price) return;
    const m = computeNetMargin(price, avgLanded, ops, ch, p.failureProvision);
    totalCA += price * weight;
    totalProfitBrut += m.profit * weight;
    totalChannelFees += m.channelFee * weight;
  });
  const monthlyCA = totalCA * p.monthlyVolume;
  const monthlyProfitBrut = totalProfitBrut * p.monthlyVolume;
  const profitBeforeTax = monthlyProfitBrut - fixedCosts;
  const cotisations = p.legalStatus === "micro" ? monthlyCA * 0.133 : Math.max(0, profitBeforeTax * 0.46);
  const netSalary = monthlyProfitBrut - fixedCosts - cotisations;
  const statusNote = p.legalStatus === "micro" ? "Micro-BIC · 13,3% du CA" : "SASU · ~46% sur remuneration";
  return { avgLanded, monthlyCA, monthlyProfitBrut, totalChannelFees: totalChannelFees * p.monthlyVolume, fixedCosts, cotisations, netSalary, statusNote };
}

export function simulateRoadmap(p: Params, fixedCosts: number) {
  const months: { mois: number; capital: number; ca: number; salaire: number }[] = [];
  let capital = p.initialCapital;
  const rotationsPerMonth = 30 / p.rotationDays;
  const avgLanded = computeLandedCost(p, p.avgWatchPriceJpy).total;
  const ops = computeOpsCost(p);
  const mixSum = p.mixVinted + p.mixLeboncoin + p.mixChrono24;
  const mix = { vinted: p.mixVinted / mixSum, leboncoin: p.mixLeboncoin / mixSum, chrono24: p.mixChrono24 / mixSum };
  let avgProfitPerWatch = 0;
  let avgPricePerWatch = 0;
  (Object.entries(mix) as [ChannelKey, number][]).forEach(([ch, w]) => {
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
