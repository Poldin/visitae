type RxingModule = typeof import("rxing-wasm");

let cached: RxingModule | null | undefined;

/** Singleflight load; static `null` means a previous attempt failed. */
export async function loadRxingWasm(): Promise<RxingModule | null> {
  if (cached !== undefined) return cached;
  try {
    cached = await import("rxing-wasm");
    return cached;
  } catch (e) {
    console.warn("[barcode] rxing-wasm failed to load; using Zxing if selected or as fallback", e);
    cached = null;
    return null;
  }
}

export function isRxingLoadFailed(): boolean {
  return cached === null;
}
