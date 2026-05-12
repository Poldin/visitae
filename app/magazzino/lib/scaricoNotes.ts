/** Motivo scarico: etichetta + nota finale combinata in `stock_movements.notes` (tipo resta `unload`). */

export const DEFAULT_SCARICO_REASON_ID = "consumption" as const;

export const SCARICO_REASON_OPTIONS = [
  { id: "consumption", label: "Utilizzo in sala / consumo" },
  { id: "expired", label: "Scaduto / fuori uso" },
  { id: "damaged", label: "Deterioramento / rottura" },
  { id: "transfer", label: "Trasferimento / uscita sede" },
  { id: "other", label: "Altro" },
] as const;

export type ScaricoReasonId = (typeof SCARICO_REASON_OPTIONS)[number]["id"];

export function labelForScaricoReason(id: string): string {
  const row = SCARICO_REASON_OPTIONS.find((o) => o.id === id);
  return row?.label ?? id;
}

/** Unisce motivo preimpostato e dettaglio libero (separatore ·). */
export function buildScaricoNotes(reasonId: string, freeText: string): string {
  const label = labelForScaricoReason(reasonId);
  const detail = freeText.trim();
  if (!detail) return label;
  return `${label} · ${detail}`;
}
