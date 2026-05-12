import type { BarcodeFormat as RxingBarcodeFormat } from "rxing-wasm";

/**
 * Maps rxing-wasm {@link BarcodeFormat} enum values to Zxing-style names
 * so existing UI (`formatBarcodeLabel`) and callbacks stay consistent.
 */
export function rxingFormatEnumToZxingName(format: RxingBarcodeFormat): string {
  switch (format) {
    case 0:
      return "AZTEC";
    case 1:
      return "CODABAR";
    case 2:
      return "CODE_39";
    case 3:
      return "CODE_93";
    case 4:
      return "CODE_128";
    case 5:
      return "DATA_MATRIX";
    case 6:
      return "EAN_8";
    case 7:
      return "EAN_13";
    case 8:
      return "ITF";
    case 9:
      return "MAXICODE";
    case 10:
      return "PDF_417";
    case 11:
      return "QR_CODE";
    case 12:
      return "RSS_14";
    case 13:
      return "RSS_EXPANDED";
    case 14:
      return "UPC_A";
    case 15:
      return "UPC_E";
    case 16:
      return "UPC_EAN_EXTENSION";
    case 17:
      return "MICRO_QR_CODE";
    case 18:
      return "TELEPEN";
    case 19:
      return "RMQR";
    default:
      return "UNKNOWN";
  }
}
