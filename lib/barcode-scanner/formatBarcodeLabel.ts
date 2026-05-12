/** Human-readable label for a barcode symbology string (Zxing-style names, e.g. `EAN_13`, `QR_CODE`). */
export function formatBarcodeLabel(raw: string): string {
  return raw
    .replace(/_/g, "-")
    .replace(/\b(\w)/g, (c) => c.toUpperCase())
    .replace("Ean", "EAN")
    .replace("Upc", "UPC")
    .replace("Qr", "QR")
    .replace("Hibc", "HIBC")
    .replace("Udi", "UDI")
    .replace("Pdf", "PDF")
    .replace("Manual", "Inserimento manuale");
}
