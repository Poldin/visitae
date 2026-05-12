/** Caratteri ammessi per il memo posizione: minuscolo, cifre, spazio e alcuni separatori. */
const LOCATION_ALLOWED = /[^a-z0-9 \-_./:]/g;

/**
 * Durante la digitazione: forza minuscolo e rimuove caratteri non ammessi.
 */
export function sanitizeInventoryLocationTyping(raw: string): string {
  return raw.toLowerCase().replace(LOCATION_ALLOWED, "");
}

/**
 * Valore da inviare al server (trim / spazi compressi). Stringa vuota = nessun memo.
 */
export function finalizeInventoryLocationForApi(raw: string): string {
  return sanitizeInventoryLocationTyping(raw).replace(/\s+/g, " ").trim();
}
