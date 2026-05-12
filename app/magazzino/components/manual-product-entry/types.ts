/** Dati per precompilare il form manuale (catalogo master e/o campi da articolo clinica). */
export type ManualProductCatalogPrefill = {
  /** Se valorizzato, creazione legata al catalogo master; `null` per solo testo campi (es. copia da giacenza). */
  masterCatalogueId: string | null;
  /** Prodotto già in giacenza (click da lista clinica); necessario per scarico / inventario. */
  existingProductId: string | null;
  /** Totale pezzi in giacenza al momento dell'apertura (solo da lista clinica). */
  currentStockQty: number | null;
  name: string;
  brand: string | null;
  /** Logo brand da mostrare subito nel campo (stesso dato usato in lista giacenza / card catalogo). */
  brandImageUrl: string | null;
  sku: string | null;
  ean: string | null;
  imageUrl: string | null;
  defaultMinStock: number | string | null;
  tags: string[] | null;
};

/** Titolo finestra: da StockOperationDialog in base a modalità / origine click. */
export type ManualProductEntryTitleIntent =
  | { type: "default" }
  | { type: "stock"; mode: "carico" | "scarico" | "inventario"; productName: string }
  | { type: "addFromMasterCatalog"; productName: string };

/** Allineato ai pulsanti Carico / Scarico / Inventario / Nuovo articolo (pagina magazzino e StockOperationDialog). */
export type ManualProductEntryHeaderMode = "carico" | "scarico" | "inventario" | "nuovo";

export type BrandOption = {
  id: string;
  name: string;
  image_url: string | null;
};

export type ManualLotRow = {
  id: string;
  quantity: string;
  lotCode: string;
  /** Prezzo unitario imponibile (€); il totale riga somma l’IVA se indicata in `vat`. */
  price: string;
  /** Percentuale IVA (UI); salvata come `inventory_items.VAT`. */
  vat: string;
  expiryDate: string;
  /** Memo posizione fisica (normalizzato in salvataggio). */
  location: string;
  /** Modalità scarico: id motivo (vedi `SCARICO_REASON_OPTIONS`). */
  scaricoReasonId?: string;
  /** Modalità scarico: dettaglio libero nelle note movimento. */
  scaricoNoteDetail?: string;
};

export type ExistingInventoryLot = {
  inventoryItemId: string;
  quantity: number;
  expiryDate: string | null;
  lotCode: string | null;
  /** Memo posizione fisica in magazzino. */
  location: string | null;
  /** Prezzo unitario imponibile da DB; assente o ≤ 0 non mostrato in UI. */
  unitPrice: number | null;
  /** Allineato a `inventory_items.VAT`; assente o 0 = nessuna aliquota in riepilogo. */
  vatPct: number | null;
};

export type ManualProductEntryDialogProps = {
  open: boolean;
  clinicId: string | null;
  existingNames: string[];
  /** Se valorizzato (es. da click su card catalogo), campi e creazione prodotto legati al master catalogo. */
  catalogPrefill: ManualProductCatalogPrefill | null;
  /** Se omesso, titolo classico manuale. */
  titleIntent?: ManualProductEntryTitleIntent;
  /** Sincronizza la modalità operativa con il genitore (es. StockOperationDialog) quando l'utente cambia la select in header. */
  onTitleModeChange?: (mode: ManualProductEntryHeaderMode) => void;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};
