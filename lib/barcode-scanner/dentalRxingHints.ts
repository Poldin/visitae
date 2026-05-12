type RxingModule = typeof import("rxing-wasm");

/**
 * Comma-separated symbology names for rxing `PossibleFormats` (no spaces). Tokens must match
 * rxing `BarcodeFormat` parsing (e.g. `rss_expanded`, not `rssexpanded`).
 */
export const DENTAL_POSSIBLE_FORMATS =
  "aztec,codabar,code39,code93,code128,datamatrix,ean8,ean13,itf,maxicode,pdf417,qrcode,rss14,rss_expanded,upca,upce,microqr,telepen,rmqr";

export function applyDentalDecodeHints(
  rxing: RxingModule,
  hints: InstanceType<RxingModule["DecodeHintDictionary"]>,
): void {
  const formatsOk = hints.set_hint(rxing.DecodeHintTypes.PossibleFormats, DENTAL_POSSIBLE_FORMATS);
  if (process.env.NODE_ENV === "development" && !formatsOk) {
    console.warn("[barcode] rxing PossibleFormats hint rejected");
  }
  // `AssumeGs1` left off: it steers Code 128 / composite decoding and can make plain EAN reads less stable across frames.
}
