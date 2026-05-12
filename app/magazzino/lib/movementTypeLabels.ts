/**
 * Etichette italiane per `stock_movements.movement_type` (slug da DB / RPC).
 * Usata dalla tab Movimenti e dalla riepilogazione Statistiche.
 */
const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  manually_add: "Aggiunta manuale",
  catalogue_add: "Aggiunta da catalogo",
  load: "Carico merce",
  purchase: "Carico merce",
  unload: "Scarico",
  usage: "Scarico",
  inventory_adjust: "Rettifica inventario",
  adjustment: "Rettifica",
  expired: "Scaduto",
};

function normalizeMovementTypeKey(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC");
}

export function formatMovementTypeLabel(value: string | null): string {
  if (value == null) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  const key = normalizeMovementTypeKey(raw);
  return MOVEMENT_TYPE_LABELS[key] ?? raw;
}
