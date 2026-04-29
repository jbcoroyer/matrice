import type { Parcel, PendingWatch } from "./rentabilite/domain";

export async function getStoredParams<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) return JSON.parse(fromLocal) as T;
  } catch {
    return null;
  }
  return null;
}

export async function setStoredParams<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadParcels(): Parcel[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("parcels-v1");
    if (data) return JSON.parse(data) as Parcel[];
  } catch {}
  return [];
}

export function saveParcels(parcels: Parcel[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("parcels-v1", JSON.stringify(parcels));
}

export function loadPendingWatches(): PendingWatch[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("pending-watches-v1");
    if (data) return JSON.parse(data) as PendingWatch[];
  } catch {}
  return [];
}

export function savePendingWatches(watches: PendingWatch[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("pending-watches-v1", JSON.stringify(watches));
}
