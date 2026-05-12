"use client";

import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import {
  ManualProductEntryDialog,
  type ManualProductCatalogPrefill,
  type ManualProductEntryTitleIntent,
} from "./ManualProductEntryDialog";

export type StockOperationMode = "carico" | "scarico" | "inventario" | "nuovo";

const STOCK_OPERATION_PAGE_SIZE = 100;
const rowBtn =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

export type StockProductSummary = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  brandImageUrl: string | null;
  imageUrl: string | null;
  totalQty: number;
  ean: string | null;
};

type MasterCatalogItem = {
  id: string;
  name: string;
  tags: string[] | null;
  brand: string | null;
  brand_image_url: string | null;
  sku: string | null;
  ean: string | null;
  image_url: string | null;
  default_min_stock: number | string | null;
};

type StockOperationDialogProps = {
  open: boolean;
  clinicId: string | null;
  existingProductNames: string[];
  initialMode: StockOperationMode;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export function StockOperationDialog({
  open,
  clinicId,
  existingProductNames,
  initialMode,
  onClose,
  onSaved,
}: StockOperationDialogProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [mode, setMode] = useState<StockOperationMode>(initialMode);
  const [productQuery, setProductQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clinicProducts, setClinicProducts] = useState<StockProductSummary[]>([]);
  const [clinicOffset, setClinicOffset] = useState(0);
  const [clinicHasMore, setClinicHasMore] = useState(true);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<MasterCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogOffset, setCatalogOffset] = useState(0);
  const [catalogHasMore, setCatalogHasMore] = useState(true);
  const catalogFetchIdRef = useRef(0);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  /** Dopo salvataggio da ManualProductEntryDialog, rifetch lista clinica + catalogo senza chiudere. */
  const [stockOperationDataGeneration, setStockOperationDataGeneration] = useState(0);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualCatalogPrefill, setManualCatalogPrefill] = useState<ManualProductCatalogPrefill | null>(null);
  const [manualEntryTitleIntent, setManualEntryTitleIntent] = useState<ManualProductEntryTitleIntent>({
    type: "default",
  });
  /** Impostato solo dopo fetch con ricerca vuota: clinica senza alcun prodotto in anagrafica. */
  const [clinicHasRegisteredProducts, setClinicHasRegisteredProducts] = useState<boolean | null>(null);

  const fetchDataPage = async (
    searchValue: string,
    clinicOffsetValue: number,
    masterOffsetValue: number,
  ) => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      return {
        clinicProducts: [] as StockProductSummary[],
        masterCatalogItems: [] as MasterCatalogItem[],
        error: "Configurazione Supabase mancante.",
        hasMoreMasterCatalog: false,
      };
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token ?? "";
    if (!token) {
      return {
        clinicProducts: [] as StockProductSummary[],
        masterCatalogItems: [] as MasterCatalogItem[],
        error: "Sessione non valida.",
        hasMoreMasterCatalog: false,
      };
    }
    const params = new URLSearchParams();
    params.set("clinicId", clinicId ?? "");
    params.set("query", searchValue);
    params.set("clinicOffset", String(clinicOffsetValue));
    params.set("clinicLimit", String(STOCK_OPERATION_PAGE_SIZE));
    params.set("masterOffset", String(masterOffsetValue));
    params.set("masterLimit", String(STOCK_OPERATION_PAGE_SIZE));
    const response = await fetch(`/api/magazzino/stock-operation?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          clinicProducts?: StockProductSummary[];
          masterCatalogItems?: MasterCatalogItem[];
          hasMoreClinicProducts?: boolean;
          hasMoreMasterCatalog?: boolean;
          error?: string;
        }
      | null;
    if (!response.ok) {
      return {
        clinicProducts: [] as StockProductSummary[],
        masterCatalogItems: [] as MasterCatalogItem[],
        error: payload?.error ?? "Errore caricamento dati.",
        hasMoreMasterCatalog: false,
      };
    }
    return {
      clinicProducts: Array.isArray(payload?.clinicProducts) ? payload.clinicProducts : [],
      masterCatalogItems: Array.isArray(payload?.masterCatalogItems) ? payload.masterCatalogItems : [],
      hasMoreClinicProducts: Boolean(payload?.hasMoreClinicProducts),
      error: null,
      hasMoreMasterCatalog: Boolean(payload?.hasMoreMasterCatalog),
    };
  };

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setMode(initialMode);
      setProductQuery("");
      setDebouncedSearch("");
      setClinicProducts([]);
      setClinicOffset(0);
      setClinicHasMore(true);
      setClinicLoading(false);
      setCatalogItems([]);
      setCatalogOffset(0);
      setCatalogHasMore(true);
      setCatalogError(null);
      setManualEntryOpen(false);
      setManualCatalogPrefill(null);
      setManualEntryTitleIntent({ type: "default" });
      setClinicHasRegisteredProducts(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(productQuery.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [productQuery, open]);

  useEffect(() => {
    if (!open) return;
    const fetchFirstPage = async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setCatalogError("Configurazione Supabase mancante.");
        return;
      }
      const fetchId = ++catalogFetchIdRef.current;
      setCatalogLoading(true);
      setClinicLoading(true);
      setCatalogError(null);
      const {
        clinicProducts: cp,
        masterCatalogItems,
        error,
        hasMoreMasterCatalog,
        hasMoreClinicProducts,
      } = await fetchDataPage(
        debouncedSearch,
        0,
        0,
      );
      if (fetchId !== catalogFetchIdRef.current) return;
      if (error) {
        setCatalogError(error);
        setClinicProducts([]);
        setClinicOffset(0);
        setClinicHasMore(false);
        setCatalogItems([]);
        setCatalogOffset(0);
        setCatalogHasMore(false);
      } else {
        setClinicProducts(cp);
        setClinicOffset(cp.length);
        setClinicHasMore(Boolean(hasMoreClinicProducts));
        setCatalogItems(masterCatalogItems);
        setCatalogOffset(masterCatalogItems.length);
        setCatalogHasMore(hasMoreMasterCatalog);
        if (debouncedSearch === "") {
          setClinicHasRegisteredProducts(cp.length > 0 || Boolean(hasMoreClinicProducts));
        }
      }
      setCatalogLoading(false);
      setClinicLoading(false);
    };
    void fetchFirstPage();
  }, [open, debouncedSearch, clinicId, stockOperationDataGeneration]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => {
        setMounted(true);
        window.setTimeout(() => setVisible(true), 10);
      }, 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => setMounted(false), 180);
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !visible) return;
    if (manualEntryOpen) return;
    const t = window.setTimeout(() => {
      productSearchInputRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, visible, manualEntryOpen]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (manualEntryOpen) {
        setManualEntryOpen(false);
        setManualCatalogPrefill(null);
        setManualEntryTitleIntent({ type: "default" });
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, manualEntryOpen]);

  const handleLoadMoreCatalog = async () => {
    if (catalogLoading || !catalogHasMore) return;
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setCatalogError("Configurazione Supabase mancante.");
      return;
    }
    setCatalogLoading(true);
    setCatalogError(null);
    const { masterCatalogItems, error, hasMoreMasterCatalog } = await fetchDataPage(
      debouncedSearch,
      0,
      catalogOffset,
    );
    if (error) {
      setCatalogError(error);
      setCatalogLoading(false);
      return;
    }
    setCatalogItems((prev) => {
      const seen = new Set(prev.map((x) => x.id));
      const additions = masterCatalogItems.filter((x) => {
        if (seen.has(x.id)) return false;
        seen.add(x.id);
        return true;
      });
      return [...prev, ...additions];
    });
    setCatalogOffset((prev) => prev + masterCatalogItems.length);
    setCatalogHasMore(hasMoreMasterCatalog);
    setCatalogLoading(false);
  };

  const handleLoadMoreClinic = async () => {
    if (clinicLoading || !clinicHasMore) return;
    setClinicLoading(true);
    setCatalogError(null);
    const { clinicProducts: cp, error, hasMoreClinicProducts } = await fetchDataPage(
      debouncedSearch,
      clinicOffset,
      0,
    );
    if (error) {
      setCatalogError(error);
      setClinicLoading(false);
      return;
    }
    setClinicProducts((prev) => [...prev, ...cp]);
    setClinicOffset((prev) => prev + cp.length);
    setClinicHasMore(Boolean(hasMoreClinicProducts));
    setClinicLoading(false);
  };

  const openManualFromSource = async (source: "clinic" | "catalog", itemId: string, fallbackProductName: string) => {
    const supabase = getSupabaseAuthClient();
    if (!supabase || !clinicId) {
      setCatalogError("Configurazione Supabase mancante.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token ?? "";
    if (!token) {
      setCatalogError("Sessione non valida.");
      return;
    }
    const params = new URLSearchParams();
    params.set("clinicId", clinicId);
    params.set("source", source);
    params.set("itemId", itemId);
    params.set("selectedMode", mode);
    const response = await fetch(`/api/magazzino/stock-item?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          resolvedMode?: StockOperationMode;
          prefill?: ManualProductCatalogPrefill;
          error?: string;
        }
      | null;
    if (!response.ok || !payload?.prefill || !payload?.resolvedMode) {
      setCatalogError(payload?.error ?? "Errore apertura articolo.");
      return;
    }

    setManualCatalogPrefill(payload.prefill);
    if (payload.resolvedMode === "nuovo") {
      setManualEntryTitleIntent({ type: "addFromMasterCatalog", productName: payload.prefill.name || fallbackProductName });
    } else {
      setManualEntryTitleIntent({
        type: "stock",
        mode: payload.resolvedMode,
        productName: payload.prefill.name || fallbackProductName,
      });
    }
    setManualEntryOpen(true);
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-120 bg-white transition-all duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`flex h-full flex-col px-4 py-4 transition-all duration-200 ease-out sm:px-6 ${
          visible ? "translate-y-0 scale-100" : "translate-y-1 scale-[0.995]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={`${rowBtn} ${
                mode === "carico"
                  ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/45 ring-offset-1 ring-offset-white"
                  : ""
              }`}
              title="Carico merce"
              onClick={() => setMode("carico")}
            >
              <ArrowDownRight size={14} className="text-emerald-600" /> Carico
            </button>
            <button
              type="button"
              className={`${rowBtn} ${
                mode === "scarico"
                  ? "border-rose-400 bg-rose-50 ring-2 ring-rose-400/45 ring-offset-1 ring-offset-white"
                  : ""
              }`}
              title="Scarico merce"
              onClick={() => setMode("scarico")}
            >
              <ArrowUpRight size={14} className="text-rose-600" /> Scarico
            </button>
            <button
              type="button"
              className={`${rowBtn} ${
                mode === "inventario"
                  ? "border-slate-500 bg-slate-100 ring-2 ring-slate-400/50 ring-offset-1 ring-offset-white"
                  : ""
              }`}
              title="Inventario fisico"
              onClick={() => setMode("inventario")}
            >
              <ClipboardCheck size={14} className="text-slate-700" /> Inventario
            </button>
            <button
              type="button"
              className={`${rowBtn} ${
                mode === "nuovo"
                  ? "border-violet-500 bg-violet-50 ring-2 ring-violet-400/45 ring-offset-1 ring-offset-white"
                  : ""
              }`}
              title="Nuovo articolo"
              onClick={() => setMode("nuovo")}
            >
              <Plus size={14} /> Nuovo articolo
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X size={14} />
            Chiudi
          </button>
        </div>

        <div className="mt-4 w-full max-w-2xl">
          <label className="mb-1 block text-xs font-medium text-slate-700">Cerca articolo</label>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={productSearchInputRef}
              type="search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Nome, SKU, brand, EAN..."
              className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-3 text-sm text-slate-600"
            />
          </div>
          <p className="mt-2 text-center text-xs text-slate-600">
            {mode === "nuovo"
              ? "Non trovi l'articolo che cercavi? "
              : "Non trovi l'articolo in elenco? "}
            {" "}
            <button
              type="button"
              onClick={() => {
                setManualCatalogPrefill(null);
                setManualEntryTitleIntent({ type: "default" });
                setManualEntryOpen(true);
              }}
              className="font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-700"
            >
              Aggiungilo manualmente
            </button>
            .
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-8 pb-4">
              {clinicHasRegisteredProducts !== false ? (
              <section>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  La tua giacenza
                </h3>
                <div className="flex w-fit min-w-full flex-wrap items-start gap-2">
                  {clinicLoading && clinicProducts.length === 0 ? (
                    <p className="text-sm text-slate-600">Caricamento...</p>
                  ) : clinicProducts.length === 0 ? (
                    <p className="text-sm text-slate-600">Nessun articolo corrisponde alla ricerca.</p>
                  ) : (
                    clinicProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => void openManualFromSource("clinic", p.id, p.name)}
                        className="relative w-fit min-w-[280px] rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <span className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-900 shadow-sm ring-1 ring-emerald-200/80">
                          {p.totalQty} pz
                        </span>
                        <div className="flex items-center gap-3 pr-16">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-14 w-14 shrink-0 rounded-md border border-emerald-200/80 object-cover"
                              loading="lazy"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                            {p.brand?.trim() ? (
                              <div className="mt-0.5 flex items-center gap-2">
                                {p.brandImageUrl ? (
                                  <img
                                    src={p.brandImageUrl}
                                    alt={p.brand}
                                    className="h-5 w-5 shrink-0 rounded-sm border border-emerald-200 object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                                <p className="truncate text-xs text-slate-700">{p.brand}</p>
                              </div>
                            ) : null}
                            {(p.sku || p.ean) ? (
                              <p className="mt-1 text-[11px] text-emerald-900/70">
                                {p.sku ? `SKU: ${p.sku}` : ""}
                                {p.sku && p.ean ? " • " : ""}
                                {p.ean ? `EAN: ${p.ean}` : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {clinicHasMore ? (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void handleLoadMoreClinic()}
                      disabled={clinicLoading}
                      className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Carica altro
                    </button>
                  </div>
                ) : null}
              </section>
              ) : null}

              <section>
                {clinicHasRegisteredProducts !== false ? (
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Prodotti che puoi aggiungere
                </h3>
                ) : null}
                {catalogLoading && catalogItems.length === 0 ? (
                  <p className="text-sm text-slate-600">Caricamento catalogo...</p>
                ) : catalogError ? (
                  <p className="text-sm text-rose-600">{catalogError}</p>
                ) : catalogItems.length === 0 ? (
                  <p className="text-sm text-slate-600">Nessun risultato nel catalogo.</p>
                ) : (
                  <>
                    <div className="flex w-fit min-w-full flex-wrap items-start gap-2">
                      {catalogItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void openManualFromSource("catalog", item.id, item.name)}
                          className="w-fit min-w-[280px] rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                                loading="lazy"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                              {item.brand?.trim() ? (
                                <div className="mt-0.5 flex items-center gap-2">
                                  {item.brand_image_url ? (
                                    <img
                                      src={item.brand_image_url}
                                      alt={item.brand}
                                      className="h-5 w-5 shrink-0 rounded-sm border border-slate-200 object-cover"
                                      loading="lazy"
                                    />
                                  ) : null}
                                  <p className="truncate text-xs text-slate-700">{item.brand}</p>
                                </div>
                              ) : null}
                              {(item.sku || item.ean) ? (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {item.sku ? `SKU: ${item.sku}` : ""}
                                  {item.sku && item.ean ? " • " : ""}
                                  {item.ean ? `EAN: ${item.ean}` : ""}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {catalogHasMore ? (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => void handleLoadMoreCatalog()}
                          disabled={catalogLoading}
                          className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          carica di piu
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
          </div>
        </div>

      </div>
      <ManualProductEntryDialog
        open={manualEntryOpen}
        clinicId={clinicId}
        existingNames={existingProductNames}
        catalogPrefill={manualCatalogPrefill}
        titleIntent={manualEntryTitleIntent}
        onTitleModeChange={setMode}
        onClose={() => {
          setManualEntryOpen(false);
          setManualCatalogPrefill(null);
          setManualEntryTitleIntent({ type: "default" });
        }}
        onCreated={async () => {
          await onSaved();
          setStockOperationDataGeneration((n) => n + 1);
        }}
      />
    </div>
  );
}
