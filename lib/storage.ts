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
