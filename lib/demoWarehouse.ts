/** Dataset dimostrativo magazzino studio (articoli e movimenti). */

export type StockCategoryId = "tutti" | "consumo" | "strumenti" | "farmaci" | "ortodonzia";

export type DemoStockItem = {
  id: string;
  sku: string;
  name: string;
  category: Exclude<StockCategoryId, "tutti">;
  location: string;
  qty: number;
  minQty: number;
  unit: string;
  /** Prezzo unitario imponibile (demo, per valore giacenza). */
  unitPrice: number;
  lastMoveIso: string;
  /** Scadenza lotto (opzionale). */
  expiryIso: string | null;
};

export type DemoStockMove = {
  id: string;
  dateIso: string;
  time: string;
  type: "carico" | "scarico" | "rettifica";
  sku: string;
  name: string;
  qty: number;
  user: string;
};

export const STOCK_CATEGORY_LABEL: Record<Exclude<StockCategoryId, "tutti">, string> = {
  consumo: "Consumo",
  strumenti: "Strumenti",
  farmaci: "Farmaci",
  ortodonzia: "Ortodonzia",
};

export const DEMO_STOCK_ITEMS: DemoStockItem[] = [
  {
    id: "m-1",
    sku: "GU-500",
    name: "Guanti nitrile M — scatola 100",
    category: "consumo",
    location: "A1",
    qty: 12,
    minQty: 4,
    unit: "scat.",
    unitPrice: 8.5,
    lastMoveIso: "2026-04-11",
    expiryIso: null,
  },
  {
    id: "m-2",
    sku: "MAS-CH",
    name: "Mascherine chirurgiche — scatola 50",
    category: "consumo",
    location: "A1",
    qty: 3,
    minQty: 5,
    unit: "scat.",
    unitPrice: 12.0,
    lastMoveIso: "2026-04-08",
    expiryIso: null,
  },
  {
    id: "m-3",
    sku: "TUR-25",
    name: "Turbo punta diamantata fine",
    category: "strumenti",
    location: "B2",
    qty: 28,
    minQty: 8,
    unit: "pz",
    unitPrice: 4.2,
    lastMoveIso: "2026-04-02",
    expiryIso: null,
  },
  {
    id: "m-4",
    sku: "AN-ART",
    name: "Anestesia articaina 4% — cartuccia",
    category: "farmaci",
    location: "C-frigo",
    qty: 42,
    minQty: 15,
    unit: "pz",
    unitPrice: 2.85,
    lastMoveIso: "2026-04-12",
    expiryIso: "2027-06-30",
  },
  {
    id: "m-5",
    sku: "COL-CL",
    name: "Collutorio clorexidina 0.2% — flacone",
    category: "farmaci",
    location: "C",
    qty: 6,
    minQty: 4,
    unit: "fl.",
    unitPrice: 3.4,
    lastMoveIso: "2026-03-20",
    expiryIso: "2026-12-01",
  },
  {
    id: "m-6",
    sku: "ALL-01",
    name: "Allineatore step 14 — arcata sup.",
    category: "ortodonzia",
    location: "D4",
    qty: 1,
    minQty: 0,
    unit: "pz",
    unitPrice: 0,
    lastMoveIso: "2026-04-09",
    expiryIso: null,
  },
  {
    id: "m-7",
    sku: "TNT-ROL",
    name: "Telini TNT — rotolo",
    category: "consumo",
    location: "A2",
    qty: 9,
    minQty: 3,
    unit: "rot.",
    unitPrice: 6.75,
    lastMoveIso: "2026-04-01",
    expiryIso: null,
  },
  {
    id: "m-8",
    sku: "IMPL-TI",
    name: "Vite implantare Ti — Ø3.5 L10",
    category: "strumenti",
    location: "B1",
    qty: 4,
    minQty: 2,
    unit: "pz",
    unitPrice: 48.0,
    lastMoveIso: "2026-01-15",
    expiryIso: "2028-01-01",
  },
];

export const DEMO_STOCK_MOVES: DemoStockMove[] = [
  {
    id: "mv-1",
    dateIso: "2026-04-12",
    time: "09:14",
    type: "carico",
    sku: "AN-ART",
    name: "Anestesia articaina 4%",
    qty: 24,
    user: "D.ssa Bianchi",
  },
  {
    id: "mv-2",
    dateIso: "2026-04-11",
    time: "17:02",
    type: "scarico",
    sku: "GU-500",
    name: "Guanti nitrile M",
    qty: 2,
    user: "R. assistente",
  },
  {
    id: "mv-3",
    dateIso: "2026-04-11",
    time: "11:30",
    type: "scarico",
    sku: "TUR-25",
    name: "Turbo punta diamantata",
    qty: 3,
    user: "Dott. Verdi",
  },
  {
    id: "mv-4",
    dateIso: "2026-04-09",
    time: "08:45",
    type: "carico",
    sku: "ALL-01",
    name: "Allineatore step 14",
    qty: 1,
    user: "Segreteria",
  },
  {
    id: "mv-5",
    dateIso: "2026-04-08",
    time: "16:20",
    type: "rettifica",
    sku: "MAS-CH",
    name: "Mascherine chirurgiche",
    qty: -1,
    user: "Magazzino",
  },
  {
    id: "mv-6",
    dateIso: "2026-04-07",
    time: "10:05",
    type: "carico",
    sku: "TNT-ROL",
    name: "Telini TNT — rotolo",
    qty: 6,
    user: "Fornitore — bolla BOL-8842",
  },
  {
    id: "mv-7",
    dateIso: "2026-04-05",
    time: "14:22",
    type: "scarico",
    sku: "COL-CL",
    name: "Collutorio clorexidina 0.2%",
    qty: 2,
    user: "Igiene",
  },
  {
    id: "mv-8",
    dateIso: "2026-04-03",
    time: "09:00",
    type: "carico",
    sku: "IMPL-TI",
    name: "Vite implantare Ti — Ø3.5 L10",
    qty: 8,
    user: "Ordine ORD-2026-031",
  },
  {
    id: "mv-9",
    dateIso: "2026-03-28",
    time: "11:40",
    type: "scarico",
    sku: "AN-ART",
    name: "Anestesia articaina 4%",
    qty: 6,
    user: "Riunito 3",
  },
  {
    id: "mv-10",
    dateIso: "2026-03-22",
    time: "08:15",
    type: "carico",
    sku: "GU-500",
    name: "Guanti nitrile M",
    qty: 20,
    user: "Fornitore — bolla BOL-8790",
  },
];

export function getDemoStockItemById(id: string): DemoStockItem | undefined {
  return DEMO_STOCK_ITEMS.find((i) => i.id === id);
}

/** Movimenti registrati per SKU, dal più recente. */
export function getDemoMovesForSku(sku: string): DemoStockMove[] {
  return [...DEMO_STOCK_MOVES].filter((m) => m.sku === sku).sort((a, b) => {
    const da = `${a.dateIso}T${a.time}:00`;
    const db = `${b.dateIso}T${b.time}:00`;
    return db.localeCompare(da);
  });
}

export function stockMoveTypeLabel(type: DemoStockMove["type"]): string {
  switch (type) {
    case "carico":
      return "Carico";
    case "scarico":
      return "Scarico";
    case "rettifica":
      return "Rettifica";
    default:
      return type;
  }
}
