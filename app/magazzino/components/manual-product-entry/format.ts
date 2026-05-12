/** Input prezzo: cifre e un separatore decimale, massimo 2 decimali (accetta , o .). */
export function sanitizePriceInput(raw: string): string {
  if (raw === "") return "";
  let s = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  const before = s.slice(0, dot).replace(/\./g, "");
  let after = s.slice(dot + 1).replace(/\./g, "");
  after = after.slice(0, 2);
  return after.length > 0 ? `${before}.${after}` : `${before}.`;
}

export function parseLotPriceUi(s: string): number | null {
  const t = s.trim().replace(",", ".").replace(/\.$/, "");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** Percentuale IVA per `inventory_items.VAT`; vuoto ⇒ null (nessun aggiornamento). */
export function parseLotVatUi(s: string): number | null {
  const t = s.trim().replace(",", ".").replace(/\.$/, "");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

/** Totale riga carico: imponibile × qty × (1 + IVA/100). IVA assente o 0 → solo imponibile. */
export function lotLineGrossTotal(quantity: number, unitNetEur: number, vatPct: number | null): number {
  const rate = vatPct != null && vatPct > 0 ? vatPct / 100 : 0;
  return Math.round(quantity * unitNetEur * (1 + rate) * 100) / 100;
}

export function fmtLotUnitPriceEur(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtDateMedium(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(d);
}

export function inventoryUnitPriceFromDb(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
