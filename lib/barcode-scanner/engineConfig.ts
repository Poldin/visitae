export type BarcodeEnginePreference = "auto" | "rxing" | "zxing";

/**
 * `NEXT_PUBLIC_BARCODE_ENGINE`:
 * - `rxing` — rxing-wasm (Rust); falls back to Zxing if WASM fails to load.
 * - `zxing` — previous stack (@zxing/browser) only.
 * - `auto` or unset — prefer rxing, fallback to zxing (default).
 */
export function getBarcodeEnginePreference(): BarcodeEnginePreference {
  const v = process.env.NEXT_PUBLIC_BARCODE_ENGINE?.trim().toLowerCase();
  if (v === "zxing" || v === "rxing" || v === "auto") return v;
  return "auto";
}
