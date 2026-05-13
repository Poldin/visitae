"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronsUpDown,
  ClipboardCheck,
  History,
  Plus,
  ScanBarcode,
  ShoppingBag,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { MenuWorkspaceShell } from "../components/MenuWorkspaceShell";
import { ClinicSwitcher } from "../components/ClinicSwitcher";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { finalizeInventoryLocationForApi } from "@/lib/inventoryLocation";
import { ProductsListControls, type ProductFilters } from "./components/ProductsListControls";
import {
  ManualProductEntryDialog,
  type ManualProductCatalogPrefill,
  type ManualProductEntryTitleIntent,
} from "./components/ManualProductEntryDialog";
import { ManualProductLotsSection } from "./components/manual-product-entry/ManualProductLotsSection";
import type { ExistingInventoryLot, ManualLotRow } from "./components/manual-product-entry/types";
import { formatMovementTypeLabel } from "@/app/magazzino/lib/movementTypeLabels";
import { buildScaricoNotes, DEFAULT_SCARICO_REASON_ID } from "@/app/magazzino/lib/scaricoNotes";
import { parseLotPriceUi, parseLotVatUi, inventoryVatFromDb } from "./components/manual-product-entry/format";
import { BippaScanDialog } from "./components/BippaScanDialog";
import { DdtImportDialog } from "./components/DdtImportDialog";
import { StockOperationDialog, type StockOperationMode } from "./components/StockOperationDialog";
import { StatisticsTab } from "./components/StatisticsTab";

type SectionId = "prodotti" | "movimenti" | "statistiche";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  udi: string | null;
  hibc: string | null;
  manufacturer: string | null;
  manufacturerImageUrl: string | null;
  imageUrl: string | null;
  category: string | null;
  minStock: number;
  totalQty: number;
  expiringQty: number;
  nonExpiringQty: number;
  nextExpiry: string | null;
  nextExpiryQty: number;
  lastUpdated: string | null;
  lastMovementAt: string | null;
  lots: Array<{
    inventoryItemId: string;
    expiryDate: string | null;
    quantity: number;
    lotCode: string | null;
    price: number | null;
    vatPct: number | null;
    location: string | null;
  }>;
};

function productLotsToExistingInventoryLots(lots: ProductRow["lots"]): ExistingInventoryLot[] {
  return lots.map((lot) => ({
    inventoryItemId: lot.inventoryItemId,
    quantity: lot.quantity,
    expiryDate: lot.expiryDate,
    lotCode: lot.lotCode,
    location: lot.location ?? null,
    unitPrice:
      lot.price != null && Number.isFinite(lot.price) && lot.price > 0 ? lot.price : null,
    vatPct: inventoryVatFromDb(lot.vatPct),
  }));
}

type MovementRow = {
  id: string;
  createdAt: string;
  movementType: string | null;
  quantity: number;
  notes: string | null;
  productId: string;
  sku: string;
  productName: string;
  manufacturer: string | null;
  manufacturerImageUrl: string | null;
};

type MyClinicRpcRow = {
  clinic_id: string;
  clinic_name: string;
  is_current: boolean;
};

function isSectionId(value: string | null): value is SectionId {
  return value === "prodotti" || value === "movimenti" || value === "statistiche";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(d);
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

const fmtMovementType = formatMovementTypeLabel;

const MAGAZZINO_TABLE_SKELETON_ROWS = 8;

function MagazzinoProductsTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: MAGAZZINO_TABLE_SKELETON_ROWS }, (_, i) => (
        <tr key={`prod-sk-${i}`} className="animate-pulse">
          <td className="px-3 py-2">
            <div className="h-8 w-8 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-4 max-w-56 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-28 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-24 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-4 w-10 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-32 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="ml-auto flex justify-end gap-1">
              <div className="h-7 w-8 rounded-md bg-slate-200/80" />
              <div className="h-7 w-8 rounded-md bg-slate-200/80" />
              <div className="h-7 w-8 rounded-md bg-slate-200/80" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function MagazzinoMovementsTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: MAGAZZINO_TABLE_SKELETON_ROWS }, (_, i) => (
        <tr key={`mov-sk-${i}`} className="animate-pulse">
          <td className="px-3 py-2">
            <div className="h-3 w-36 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-20 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-24 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 max-w-48 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-28 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-8 rounded bg-slate-200/80" />
          </td>
          <td className="px-3 py-2">
            <div className="h-3 w-full max-w-xs rounded bg-slate-200/80" />
          </td>
        </tr>
      ))}
    </>
  );
}

const NEAR_EXPIRY_DAYS = 10;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseLotExpiryDay(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function lotExpiryStartDayOrNull(iso: string): Date | null {
  const d = parseLotExpiryDay(iso);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

function calendarDaysFromTo(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** Prossima scadenza in tabella: priorità a lotti scaduti, poi alert più soft se mancano meno di 10 giorni. */
function getProssimaScadenzaCell(p: ProductRow):
  | { variant: "expired"; nextExpiry: string; nextExpiryQty: number }
  | { variant: "soon"; nextExpiry: string; nextExpiryQty: number; daysUntil: number }
  | { variant: "normal"; nextExpiry: string | null; nextExpiryQty: number } {
  const today = startOfLocalDay(new Date());
  const lotsWithQty = p.lots.filter((lot) => lot.quantity > 0);
  const dated = lotsWithQty.filter((lot): lot is (typeof lotsWithQty)[number] & { expiryDate: string } =>
    Boolean(lot.expiryDate),
  );
  const expiredLots = dated.filter((lot) => {
    const day = lotExpiryStartDayOrNull(lot.expiryDate);
    return day !== null && day < today;
  });
  if (expiredLots.length > 0) {
    expiredLots.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const firstIso = expiredLots[0].expiryDate;
    const qty = expiredLots.filter((x) => x.expiryDate === firstIso).reduce((s, x) => s + x.quantity, 0);
    return { variant: "expired", nextExpiry: firstIso, nextExpiryQty: qty };
  }
  const futureOrToday = dated.filter((lot) => {
    const day = lotExpiryStartDayOrNull(lot.expiryDate);
    return day !== null && day >= today;
  });
  if (futureOrToday.length === 0) {
    return { variant: "normal", nextExpiry: null, nextExpiryQty: 0 };
  }
  futureOrToday.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const nextIso = futureOrToday[0].expiryDate;
  const nextQty = futureOrToday.filter((x) => x.expiryDate === nextIso).reduce((s, x) => s + x.quantity, 0);
  const nextDay = parseLotExpiryDay(nextIso);
  if (Number.isNaN(nextDay.getTime())) {
    return { variant: "normal", nextExpiry: nextIso, nextExpiryQty: nextQty };
  }
  const daysUntil = calendarDaysFromTo(today, nextDay);
  if (daysUntil >= 0 && daysUntil < NEAR_EXPIRY_DAYS) {
    return { variant: "soon", nextExpiry: nextIso, nextExpiryQty: nextQty, daysUntil };
  }
  return { variant: "normal", nextExpiry: nextIso, nextExpiryQty: nextQty };
}

const rowBtn =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

/** Toolbar sopra tabella: icona + scorciatoia sempre visibili; label solo hover/focus. */
const magazzinoToolbarActionBtn =
  "group inline-flex h-7 shrink-0 items-center gap-1 overflow-hidden rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 transition-[border-color,background-color,padding] duration-200 hover:border-slate-300 hover:bg-slate-50 hover:px-2 focus-visible:border-slate-300 focus-visible:bg-slate-50 focus-visible:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40";

function MagazzinoToolbarActionButton(props: {
  title: string;
  label: string;
  shortcut: string;
  onClick: () => void;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  const { title, label, shortcut, onClick, icon: Icon, iconClassName } = props;
  const kbdCls =
    "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 px-1 text-[10px] font-bold leading-none text-slate-700";
  const labelRevealCls =
    "inline-block max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-[220px] group-hover:opacity-100 group-focus-visible:max-w-[220px] group-focus-visible:opacity-100";

  return (
    <button
      type="button"
      className={magazzinoToolbarActionBtn}
      title={title}
      aria-label={`${label} (${shortcut})`}
      onClick={onClick}
    >
      <Icon size={14} className={`shrink-0 ${iconClassName ?? ""}`} aria-hidden />
      <span className={kbdCls}>{shortcut}</span>
      <span className={labelRevealCls}>
        <span className="inline-block whitespace-nowrap pl-1">{label}</span>
      </span>
    </button>
  );
}

const PRODUCTS_PAGE_SIZE = 100;

function productRowToManualPrefill(p: ProductRow): ManualProductCatalogPrefill {
  return {
    masterCatalogueId: null,
    existingProductId: p.id,
    currentStockQty: p.totalQty,
    name: p.name,
    description: null,
    manufacturer: p.manufacturer?.trim() || null,
    sku: p.sku ? p.sku : null,
    ean: p.ean,
    imageUrl: p.imageUrl,
    defaultMinStock: 0,
    tags: null,
  };
}

export default function MagazzinoPage() {
  const [section, setSection] = useState<SectionId>("prodotti");
  const [tabSyncReady, setTabSyncReady] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    query: "",
    sortField: "name",
    sortDir: "asc",
    filterRows: [],
  });
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsNextOffset, setProductsNextOffset] = useState(0);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [movementsNextOffset, setMovementsNextOffset] = useState(0);
  const [movementsHasMore, setMovementsHasMore] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [myClinics, setMyClinics] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [expandAllProducts, setExpandAllProducts] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogMode, setStockDialogMode] = useState<StockOperationMode>("carico");
  const [bippaDialogOpen, setBippaDialogOpen] = useState(false);
  const [ddtDialogOpen, setDdtDialogOpen] = useState(false);
  const [rowManualEntryOpen, setRowManualEntryOpen] = useState(false);
  const [rowManualPrefill, setRowManualPrefill] = useState<ManualProductCatalogPrefill | null>(null);
  const [rowManualTitleIntent, setRowManualTitleIntent] = useState<ManualProductEntryTitleIntent>({
    type: "default",
  });
  const [expandedRowMode, setExpandedRowMode] = useState<"carico" | "scarico" | "inventario">("scarico");
  const [inlineLotsByProduct, setInlineLotsByProduct] = useState<Record<string, ManualLotRow[]>>({});
  const [inlineProcessingLotId, setInlineProcessingLotId] = useState<string | null>(null);
  const [inlineErrorByProduct, setInlineErrorByProduct] = useState<Record<string, string | null>>({});
  const runLoadDataRef = useRef<() => Promise<void>>(async () => {});

  const openRowManualEntry = useCallback((product: ProductRow, mode: "carico" | "scarico" | "inventario") => {
    setRowManualPrefill(productRowToManualPrefill(product));
    setRowManualTitleIntent({
      type: "stock",
      mode,
      productName: product.name,
    });
    setRowManualEntryOpen(true);
  }, []);

  const handleCarico = useCallback(() => {
    setStockDialogMode("carico");
    setStockDialogOpen(true);
  }, []);

  const handleScarico = useCallback(() => {
    setStockDialogMode("scarico");
    setStockDialogOpen(true);
  }, []);

  const handleInventario = useCallback(() => {
    setStockDialogMode("inventario");
    setStockDialogOpen(true);
  }, []);

  const handleNuovoArticolo = useCallback(() => {
    setStockDialogMode("nuovo");
    setStockDialogOpen(true);
  }, []);

  const handleBippa = useCallback(() => {
    setBippaDialogOpen(true);
  }, []);

  const handleDdt = useCallback(() => {
    setDdtDialogOpen(true);
  }, []);

  const getAccessToken = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token ?? null;
  }, []);

  const submitExpandedProductLot = useCallback(
    async (product: ProductRow, row: ManualLotRow) => {
      if (!clinicId) return;
      const token = await getAccessToken();
      if (!token) {
        setInlineErrorByProduct((prev) => ({ ...prev, [product.id]: "Sessione non valida." }));
        return;
      }

      if (expandedRowMode === "carico") {
        const n = Number(row.quantity);
        if (!Number.isFinite(n) || n <= 0) {
          setInlineErrorByProduct((prev) => ({ ...prev, [product.id]: "Quantità non valida." }));
          return;
        }
        if (row.vat.trim() !== "" && parseLotVatUi(row.vat) === null) {
          setInlineErrorByProduct((prev) => ({
            ...prev,
            [product.id]: "IVA non valida (percentuale tra 0 e 100).",
          }));
          return;
        }
        setInlineProcessingLotId(row.id);
        setInlineErrorByProduct((prev) => ({ ...prev, [product.id]: null }));
        const price = parseLotPriceUi(row.price);
        const vat = parseLotVatUi(row.vat);
        const locationMemo = finalizeInventoryLocationForApi(row.location);
        const response = await fetch("/api/magazzino/actions/carico", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clinicId,
            products: [
              {
                productId: product.id,
                lots: [
                  {
                    quantity: Math.max(1, n),
                    expiryDate: row.expiryDate || null,
                    lotCode: row.lotCode || null,
                    price,
                    ...(vat != null ? { vat } : {}),
                    ...(locationMemo ? { location: locationMemo } : {}),
                  },
                ],
              },
            ],
          }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setInlineProcessingLotId(null);
        if (!response.ok) {
          setInlineErrorByProduct((prev) => ({ ...prev, [product.id]: payload?.error ?? "Carico non riuscito." }));
          return;
        }
        setInlineLotsByProduct((prev) => {
          const rest = (prev[product.id] ?? []).filter((x) => x.id !== row.id);
          const nextRows =
            rest.length > 0
              ? rest
              : [{ id: `load-${Date.now()}`, quantity: "", lotCode: "", price: "", vat: "", expiryDate: "", location: "" }];
          return { ...prev, [product.id]: nextRows };
        });
        await runLoadDataRef.current();
        return;
      }

      const invRow = product.lots.find((x) => x.inventoryItemId === row.id);
      if (!invRow) {
        setInlineErrorByProduct((prev) => ({ ...prev, [product.id]: "Lotto non trovato." }));
        return;
      }
      const raw = row.quantity.trim();
      const n = Number(raw);
      const mode = expandedRowMode;
      const invalid =
        raw === "" ||
        !Number.isFinite(n) ||
        !Number.isInteger(n) ||
        (mode === "scarico" ? n <= 0 || n > invRow.quantity : n < 0);
      if (invalid) {
        setInlineErrorByProduct((prev) => ({
          ...prev,
          [product.id]:
            mode === "scarico"
              ? "Inserisci una quantità intera valida (<= giacenza del lotto selezionato)."
              : "Inserisci una quantità intera >= 0.",
        }));
        return;
      }

      setInlineProcessingLotId(row.id);
      setInlineErrorByProduct((prev) => ({ ...prev, [product.id]: null }));
      const url = mode === "scarico" ? "/api/magazzino/actions/scarico" : "/api/magazzino/actions/inventario";
      const productPayload =
        mode === "scarico"
          ? {
              productId: product.id,
              inventoryItemId: invRow.inventoryItemId,
              quantity: n,
              movementType: "unload",
              movementNote: buildScaricoNotes(
                row.scaricoReasonId ?? DEFAULT_SCARICO_REASON_ID,
                row.scaricoNoteDetail ?? "",
              ),
            }
          : {
              productId: product.id,
              inventoryItemId: invRow.inventoryItemId,
              targetQuantity: n,
              movementNote: "Rettifica inventario (lotto singolo)",
              location: finalizeInventoryLocationForApi(row.location),
            };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clinicId, products: [productPayload] }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setInlineProcessingLotId(null);
      if (!response.ok) {
        setInlineErrorByProduct((prev) => ({
          ...prev,
          [product.id]:
            payload?.error ?? (mode === "scarico" ? "Scarico non riuscito." : "Rettifica inventario non riuscita."),
        }));
        return;
      }
      setInlineLotsByProduct((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] ?? []).map((r) =>
          r.id === row.id ? { ...r, quantity: "" } : r,
        ),
      }));
      await runLoadDataRef.current();
    },
    [clinicId, expandedRowMode, getAccessToken],
  );

  useEffect(() => {
    if (!expandedProductId) return;

    if (expandedRowMode === "scarico" || expandedRowMode === "inventario") {
      const product = products.find((x) => x.id === expandedProductId);
      if (!product) return;
      setInlineLotsByProduct((prev) => ({
        ...prev,
        [expandedProductId]: product.lots.map((lot) => {
          const old = prev[expandedProductId]?.find((r) => r.id === lot.inventoryItemId);
          return {
            id: lot.inventoryItemId,
            quantity: old?.quantity ?? "",
            lotCode: lot.lotCode ?? "",
            price: "",
            vat: "",
            expiryDate: lot.expiryDate ?? "",
            location: lot.location ?? "",
          };
        }),
      }));
      return;
    }

    if (expandedRowMode === "carico") {
      setInlineLotsByProduct((prev) => {
        const existing = prev[expandedProductId] ?? [];
        if (existing.some((r) => r.id.startsWith("load-"))) return prev;
        return {
          ...prev,
          [expandedProductId]: [
            {
              id: `load-${Date.now()}-${expandedProductId}`,
              quantity: "",
              lotCode: "",
              price: "",
              vat: "",
              expiryDate: "",
              location: "",
            },
          ],
        };
      });
    }
  }, [expandedProductId, expandedRowMode, products]);

  useEffect(() => {
    if (!expandAllProducts) return;
    if (expandedRowMode !== "scarico" && expandedRowMode !== "inventario") return;
    setInlineLotsByProduct((prev) => {
      const next = { ...prev };
      for (const product of products) {
        next[product.id] = product.lots.map((lot) => {
          const old = prev[product.id]?.find((r) => r.id === lot.inventoryItemId);
          return {
            id: lot.inventoryItemId,
            quantity: old?.quantity ?? "",
            lotCode: lot.lotCode ?? "",
            price: "",
            vat: "",
            expiryDate: lot.expiryDate ?? "",
            location: lot.location ?? "",
          };
        });
      }
      return next;
    });
  }, [expandAllProducts, expandedRowMode, products]);

  const loadProductsPage = useCallback(
    async (
      supabaseToken: string,
      activeClinicId: string,
      nextFilters: ProductFilters,
      offset: number,
      mode: "replace" | "append" = "replace",
    ) => {
      const params = new URLSearchParams();
      params.set("clinicId", activeClinicId);
      params.set("query", nextFilters.query);
      params.set("sortField", nextFilters.sortField);
      params.set("sortDir", nextFilters.sortDir);
      params.set("filters", JSON.stringify(nextFilters.filterRows));
      params.set("limit", String(PRODUCTS_PAGE_SIZE));
      params.set("offset", String(offset));

      const response = await fetch(`/api/magazzino/products?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            items?: ProductRow[];
            total?: number;
            limit?: number;
            offset?: number;
            hasMore?: boolean;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Errore nel caricamento prodotti.");
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      setProducts((prev) => (mode === "append" ? [...prev, ...items] : items));
      setProductsTotal(Number(payload?.total ?? 0));
      const nextOffset = Number(payload?.offset ?? 0) + Number(payload?.limit ?? PRODUCTS_PAGE_SIZE);
      setProductsNextOffset(nextOffset);
      setProductsHasMore(Boolean(payload?.hasMore));
    },
    [],
  );

  const loadMovementsPage = useCallback(
    async (supabaseToken: string, activeClinicId: string, offset: number, mode: "replace" | "append" = "replace") => {
      const params = new URLSearchParams();
      params.set("clinicId", activeClinicId);
      params.set("limit", String(PRODUCTS_PAGE_SIZE));
      params.set("offset", String(offset));

      const response = await fetch(`/api/magazzino/movements?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            items?: MovementRow[];
            limit?: number;
            offset?: number;
            hasMore?: boolean;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Errore nel caricamento movimenti.");
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      setMovements((prev) => (mode === "append" ? [...prev, ...items] : items));
      const nextOffset = Number(payload?.offset ?? 0) + Number(payload?.limit ?? PRODUCTS_PAGE_SIZE);
      setMovementsNextOffset(nextOffset);
      setMovementsHasMore(Boolean(payload?.hasMore));
    },
    [],
  );

  const handleLoadMoreProducts = useCallback(
    async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase || !clinicId) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token ?? "";
      if (!accessToken) {
        setError("Sessione non valida.");
        return;
      }
      setIsRefreshing(true);
      try {
        await loadProductsPage(accessToken, clinicId, filters, productsNextOffset, "append");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel caricamento prodotti.");
      } finally {
        setIsRefreshing(false);
      }
    },
    [clinicId, filters, loadProductsPage, productsNextOffset],
  );

  const handleLoadMoreMovements = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    if (!supabase || !clinicId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) {
      setError("Sessione non valida.");
      return;
    }
    setIsRefreshing(true);
    try {
      await loadMovementsPage(accessToken, clinicId, movementsNextOffset, "append");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento movimenti.");
    } finally {
      setIsRefreshing(false);
    }
  }, [clinicId, loadMovementsPage, movementsNextOffset]);

  const runLoadData = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    setIsRefreshing(true);
    if (!supabase) {
      setError("Configurazione Supabase mancante.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    setError(null);

    const { data: membershipsData, error: membershipsErr } = await supabase.rpc("get_my_clinics");
    if (membershipsErr) {
      setError(membershipsErr.message);
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }
    const clinics = ((membershipsData ?? []) as MyClinicRpcRow[]).map((row) => ({
      id: row.clinic_id,
      name: row.clinic_name,
      isCurrent: row.is_current,
    }));
    setMyClinics(clinics.map(({ id, name }) => ({ id, name })));

    const activeClinicId =
      clinics.find((clinic) => clinic.id === clinicId)?.id ??
      clinics.find((clinic) => clinic.isCurrent)?.id ??
      clinics[0]?.id ??
      null;
    setClinicId(activeClinicId);

    if (!activeClinicId) {
      setProducts([]);
      setProductsTotal(0);
      setProductsNextOffset(0);
      setProductsHasMore(false);
      setMovements([]);
      setMovementsNextOffset(0);
      setMovementsHasMore(false);
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) {
      setError("Sessione non valida.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    try {
      await loadProductsPage(accessToken, activeClinicId, filters, 0, "replace");
      await loadMovementsPage(accessToken, activeClinicId, 0, "replace");
    } catch (loadProductsErr) {
      setError(loadProductsErr instanceof Error ? loadProductsErr.message : "Errore nel caricamento prodotti.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }
    setHasLoadedOnce(true);
    setIsRefreshing(false);
  }, [clinicId, filters, loadMovementsPage, loadProductsPage]);

  useEffect(() => {
    runLoadDataRef.current = runLoadData;
  }, [runLoadData]);

  const handleClinicSwitch = useCallback(
    async (nextClinicId: string) => {
      if (nextClinicId === clinicId) return;
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setError("Configurazione Supabase mancante.");
        return;
      }
      setError(null);
      const { error: rpcErr } = await supabase.rpc("set_my_active_clinic", {
        target_clinic_id: nextClinicId,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      setClinicId(nextClinicId);
    },
    [clinicId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runLoadData();
    }, 0);
    return () => window.clearTimeout(t);
  }, [runLoadData]);

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
    if (isSectionId(tabFromUrl) && tabFromUrl !== section) {
      window.setTimeout(() => setSection(tabFromUrl), 0);
    }
    window.setTimeout(() => setTabSyncReady(true), 0);
  }, []);

  useEffect(() => {
    if (!tabSyncReady || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get("tab");
    if (currentTab === section) return;
    params.set("tab", section);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [section, tabSyncReady]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (stockDialogOpen || rowManualEntryOpen || bippaDialogOpen || ddtDialogOpen) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingContext =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;
      if (isTypingContext) return;
      if (key === "n") {
        event.preventDefault();
        handleNuovoArticolo();
        return;
      }
      if (section !== "prodotti") return;
      if (key === "b") {
        event.preventDefault();
        handleBippa();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        handleDdt();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        handleCarico();
        return;
      }
      if (key === "s") {
        event.preventDefault();
        handleScarico();
        return;
      }
      if (key === "i") {
        event.preventDefault();
        handleInventario();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    section,
    stockDialogOpen,
    rowManualEntryOpen,
    bippaDialogOpen,
    ddtDialogOpen,
    handleBippa,
    handleDdt,
    handleCarico,
    handleScarico,
    handleInventario,
    handleNuovoArticolo,
  ]);

  useEffect(() => {
    if (!expandAllProducts || expandedRowMode !== "carico") return;
    setInlineLotsByProduct((prev) => {
      const next = { ...prev };
      for (const product of products) {
        const rows = next[product.id];
        const hasLoadRow = rows?.some((r) => r.id.startsWith("load-"));
        if (!hasLoadRow) {
          next[product.id] = [
            { id: `load-${Date.now()}-${product.id}`, quantity: "", lotCode: "", price: "", vat: "", expiryDate: "", location: "" },
          ];
        }
      }
      return next;
    });
  }, [expandAllProducts, expandedRowMode, products]);

  const filteredProducts = products;

  const showInitialSkeleton = !hasLoadedOnce && isRefreshing;

  return (
    <>
      <MenuWorkspaceShell
      headerLeft={
        <ClinicSwitcher
          clinics={myClinics}
          value={clinicId}
          onChange={(id) => void handleClinicSwitch(id)}
          disabled={isRefreshing}
        />
      }
      headerCenter={
        <div role="tablist" className="mx-auto flex min-w-0 max-w-full items-center justify-center gap-1.5 overflow-x-auto px-0.5 py-0.5">
          {[
            { id: "prodotti", label: "La mia giacenza", Icon: Warehouse },
            { id: "movimenti", label: "Movimenti", Icon: History },
            { id: "statistiche", label: "Statistiche", Icon: BarChart3 },
          ].map(({ id, label, Icon }) => {
            const selected = section === (id as SectionId);
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSection(id as SectionId)}
                className={`${rowBtn} h-8 gap-1.5 whitespace-nowrap px-2.5 text-xs ${
                  selected
                    ? "border-slate-900! bg-slate-900! text-white! shadow-sm ring-1 ring-slate-900/10 hover:border-slate-900! hover:bg-slate-900! hover:text-white!"
                    : ""
                }`}
              >
                <Icon size={15} aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      }
      headerRight={
        <Link
          href="/shop"
          className="shop-button inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-extrabold tracking-[0.12em] text-white shadow-sm ring-1 ring-fuchsia-300/60"
          title="Shop"
        >
          <ShoppingBag size={14} aria-hidden />
          SHOP
        </Link>
      }
    >
            {section === "prodotti" ? (
              <div
                className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
                aria-busy={showInitialSkeleton}
              >
                {error ? <div className="px-4 pt-3 text-sm text-red-600">{error}</div> : null}
                <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-slate-100 px-2 pb-2 pt-1 sm:gap-3 sm:px-4 sm:pb-3 sm:pt-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <ProductsListControls value={filters} onChange={setFilters} />
                    <button
                      type="button"
                      className={rowBtn}
                      title={expandAllProducts ? "Chiudi tutte le righe" : "Espandi tutte le righe"}
                      aria-label={expandAllProducts ? "Chiudi tutte le righe" : "Espandi tutte le righe"}
                      onClick={() => {
                        setExpandAllProducts((prev) => !prev);
                        setExpandedProductId(null);
                      }}
                    >
                      <ChevronsUpDown size={14} className="text-slate-700" aria-hidden />
                    </button>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    <MagazzinoToolbarActionButton
                      title="Bippa (B)"
                      label="Bippa"
                      shortcut="B"
                      onClick={handleBippa}
                      icon={ScanBarcode}
                      iconClassName="text-slate-700"
                    />
                    <MagazzinoToolbarActionButton
                      title="DDT (D)"
                      label="DDT"
                      shortcut="D"
                      onClick={handleDdt}
                      icon={Truck}
                      iconClassName="text-amber-700"
                    />
                    <MagazzinoToolbarActionButton
                      title="Carico merce (R)"
                      label="Carico"
                      shortcut="R"
                      onClick={handleCarico}
                      icon={ArrowDownRight}
                      iconClassName="text-emerald-600"
                    />
                    <MagazzinoToolbarActionButton
                      title="Scarico merce (S)"
                      label="Scarico"
                      shortcut="S"
                      onClick={handleScarico}
                      icon={ArrowUpRight}
                      iconClassName="text-rose-600"
                    />
                    <MagazzinoToolbarActionButton
                      title="Inventario fisico (I)"
                      label="Inventario"
                      shortcut="I"
                      onClick={handleInventario}
                      icon={ClipboardCheck}
                      iconClassName="text-slate-700"
                    />
                    <MagazzinoToolbarActionButton
                      title="Nuovo articolo (N)"
                      label="Nuovo articolo"
                      shortcut="N"
                      onClick={handleNuovoArticolo}
                      icon={Plus}
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 sm:px-4">
                  <table className="w-full min-w-150 border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Img</th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Prodotto</th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">EAN · UDI · HIBC</th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Produttore</th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Qtà totale</th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">Prossima scadenza</th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {showInitialSkeleton ? (
                        <MagazzinoProductsTableSkeletonRows />
                      ) : (
                        filteredProducts.map((p) => {
                        const expanded = expandAllProducts || expandedProductId === p.id;
                        const prossimaScadenza = getProssimaScadenzaCell(p);
                        return (
                          <Fragment key={p.id}>
                            <tr
                              className={`group cursor-pointer transition-colors hover:bg-slate-800 hover:text-slate-100 ${
                                expanded ? "bg-slate-50/70" : ""
                              }`}
                              onClick={() => {
                                if (expandAllProducts) {
                                  setExpandAllProducts(false);
                                  setExpandedProductId(p.id);
                                  return;
                                }
                                setExpandedProductId((prev) => (prev === p.id ? null : p.id));
                              }}
                            >
                              <td className="px-3 py-2">
                                <div>
                                  {p.imageUrl ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage({ url: p.imageUrl as string, name: p.name });
                                      }}
                                      className="inline-flex rounded"
                                      title="Apri immagine"
                                    >
                                      <Image
                                        src={p.imageUrl}
                                        alt={p.name}
                                        width={32}
                                        height={32}
                                        className="h-8 w-8 rounded object-cover"
                                        sizes="32px"
                                      />
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 font-semibold">{p.name}</td>
                              <td className="px-3 py-2 font-mono text-xs">
                                {p.ean ?? p.udi ?? p.hibc ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center gap-2">
                                  {p.manufacturerImageUrl ? (
                                    <Image
                                      src={p.manufacturerImageUrl}
                                      alt={p.manufacturer ?? "Produttore"}
                                      width={20}
                                      height={20}
                                      className="h-5 w-5 rounded-sm border border-slate-200 object-cover"
                                      sizes="20px"
                                    />
                                  ) : null}
                                  <span>{p.manufacturer ?? "—"}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2 font-semibold tabular-nums">{p.totalQty}</td>
                              <td className="px-3 py-2">
                                {prossimaScadenza.variant === "expired" ? (
                                  <span
                                    className="inline-flex items-center gap-1.5"
                                    title="Lotti in magazzino già scaduti"
                                    aria-label={`Scaduto il ${fmtDate(prossimaScadenza.nextExpiry)}, quantità ${prossimaScadenza.nextExpiryQty}`}
                                  >
                                    <span
                                      aria-hidden
                                      className="text-base leading-none text-rose-600 group-hover:text-rose-300"
                                    >
                                      ⚠️
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700 group-hover:text-rose-200">
                                      <span aria-hidden>{fmtDate(prossimaScadenza.nextExpiry)}</span>
                                      <span
                                        aria-hidden
                                        className="text-[10px] font-normal text-rose-600/90 group-hover:text-rose-300/95"
                                      >
                                        •
                                      </span>
                                      <span className="tabular-nums" aria-hidden>
                                        {prossimaScadenza.nextExpiryQty}
                                      </span>
                                    </span>
                                  </span>
                                ) : prossimaScadenza.variant === "soon" ? (
                                  <span
                                    className="inline-flex items-center gap-1.5"
                                    title={
                                      prossimaScadenza.daysUntil === 0
                                        ? "Scade oggi"
                                        : `Tra ${prossimaScadenza.daysUntil} giorni`
                                    }
                                  >
                                    <span
                                      aria-hidden
                                      className="text-base leading-none text-amber-600 group-hover:text-amber-300"
                                    >
                                      ⏰
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-amber-900 group-hover:text-amber-100">
                                      <span>{fmtDate(prossimaScadenza.nextExpiry)}</span>
                                      <span
                                        aria-hidden
                                        className="text-[10px] text-amber-700/85 group-hover:text-amber-300/90"
                                      >
                                        •
                                      </span>
                                      <span className="tabular-nums">{prossimaScadenza.nextExpiryQty}</span>
                                    </span>
                                  </span>
                                ) : prossimaScadenza.nextExpiry ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span>{fmtDate(prossimaScadenza.nextExpiry)}</span>
                                    <span aria-hidden className="text-[10px] text-slate-400 group-hover:text-slate-400">
                                      •
                                    </span>
                                    <span className="tabular-nums">{prossimaScadenza.nextExpiryQty}</span>
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    className={rowBtn}
                                    title="Carico merce"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRowManualEntry(p, "carico");
                                    }}
                                  >
                                    <ArrowDownRight size={14} className="text-emerald-600" />
                                  </button>
                                  <button
                                    type="button"
                                    className={rowBtn}
                                    title="Scarico merce"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRowManualEntry(p, "scarico");
                                    }}
                                  >
                                    <ArrowUpRight size={14} className="text-rose-600" />
                                  </button>
                                  <button
                                    type="button"
                                    className={rowBtn}
                                    title="Inventario fisico"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRowManualEntry(p, "inventario");
                                    }}
                                  >
                                    <ClipboardCheck size={14} className="text-slate-700" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t-0! bg-slate-50/60">
                              <td colSpan={7} className="px-3 py-0">
                                <div
                                  className={`overflow-hidden transition-all duration-200 ease-out ${
                                    expanded ? "relative max-h-56 py-2 opacity-100 pl-2" : "max-h-0 py-0 opacity-0"
                                  }`}
                                >
                                  {expanded ? (
                                    <span
                                      aria-hidden
                                      className="pointer-events-none absolute bottom-[2px] left-0 top-0 w-px bg-slate-300"
                                    />
                                  ) : null}
                                  <div className="space-y-1 text-xs text-slate-700">
                                    <div className="mb-4 flex items-center gap-1">
                                      <button
                                        type="button"
                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                                          expandedRowMode === "carico"
                                            ? "border-slate-900! bg-slate-900! text-white! shadow-sm ring-1 ring-slate-900/10 hover:border-slate-900! hover:bg-slate-900! hover:text-white!"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                        title="Modalità carico"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedRowMode("carico");
                                          setInlineErrorByProduct((prev) => ({ ...prev, [p.id]: null }));
                                        }}
                                      >
                                        <ArrowDownRight
                                          size={12}
                                          className={expandedRowMode === "carico" ? "text-white" : "text-emerald-600"}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                                          expandedRowMode === "scarico"
                                            ? "border-slate-900! bg-slate-900! text-white! shadow-sm ring-1 ring-slate-900/10 hover:border-slate-900! hover:bg-slate-900! hover:text-white!"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                        title="Modalità scarico"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedRowMode("scarico");
                                          setInlineErrorByProduct((prev) => ({ ...prev, [p.id]: null }));
                                        }}
                                      >
                                        <ArrowUpRight
                                          size={12}
                                          className={expandedRowMode === "scarico" ? "text-white" : "text-rose-600"}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                                          expandedRowMode === "inventario"
                                            ? "border-slate-900! bg-slate-900! text-white! shadow-sm ring-1 ring-slate-900/10 hover:border-slate-900! hover:bg-slate-900! hover:text-white!"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                        title="Modalità inventario"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedRowMode("inventario");
                                          setInlineErrorByProduct((prev) => ({ ...prev, [p.id]: null }));
                                        }}
                                      >
                                        <ClipboardCheck
                                          size={12}
                                          className={expandedRowMode === "inventario" ? "text-white" : "text-slate-700"}
                                        />
                                      </button>
                                    </div>
                                    <ManualProductLotsSection
                                      density="compact"
                                      containClicks
                                      clinicId={clinicId}
                                      lots={inlineLotsByProduct[p.id] ?? []}
                                      existingInventoryLots={productLotsToExistingInventoryLots(p.lots)}
                                      headerMode={expandedRowMode}
                                      isLoadMode={expandedRowMode === "carico"}
                                      isScaricoInventario={
                                        expandedRowMode === "scarico" || expandedRowMode === "inventario"
                                      }
                                      saving={false}
                                      processingManualLotId={inlineProcessingLotId}
                                      confirmedManualLotId={null}
                                      rowConfirmActionLabel={
                                        expandedRowMode === "carico"
                                          ? "Carica"
                                          : expandedRowMode === "scarico"
                                            ? "Scarica"
                                            : "Modifica"
                                      }
                                      onConfirmLot={(lot) => {
                                        void submitExpandedProductLot(p, lot);
                                      }}
                                      onAddLotRow={() =>
                                        setInlineLotsByProduct((prev) => ({
                                          ...prev,
                                          [p.id]: [
                                            ...(prev[p.id] ?? []),
                                            {
                                              id: `load-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                              quantity: "",
                                              lotCode: "",
                                              price: "",
                                              vat: "",
                                              expiryDate: "",
                                              location: "",
                                            },
                                          ],
                                        }))
                                      }
                                      onRemoveLotRow={(lotId) =>
                                        setInlineLotsByProduct((prev) => ({
                                          ...prev,
                                          [p.id]:
                                            (prev[p.id] ?? []).length > 1
                                              ? (prev[p.id] ?? []).filter((x) => x.id !== lotId)
                                              : (prev[p.id] ?? []),
                                        }))
                                      }
                                      onUpdateLotField={(lotId, patch) =>
                                        setInlineLotsByProduct((prev) => ({
                                          ...prev,
                                          [p.id]: (prev[p.id] ?? []).map((x) =>
                                            x.id === lotId ? { ...x, ...patch } : x,
                                          ),
                                        }))
                                      }
                                    />
                                    {inlineErrorByProduct[p.id] ? (
                                      <p className="text-[11px] text-rose-600">{inlineErrorByProduct[p.id]}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                  {!showInitialSkeleton && productsHasMore ? (
                    <div className="flex justify-center py-3">
                      <button
                        type="button"
                        className={rowBtn}
                        disabled={isRefreshing}
                        onClick={() => void handleLoadMoreProducts()}
                      >
                        Carica altro
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : section === "movimenti" ? (
              <div
                className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
                aria-busy={showInitialSkeleton}
              >
                {error ? <div className="pb-3 text-sm text-red-600">{error}</div> : null}
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Data</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Tipo</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">SKU</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Prodotto</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Produttore</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {showInitialSkeleton ? (
                      <MagazzinoMovementsTableSkeletonRows />
                    ) : (
                      movements.map((m) => {
                      return (
                        <tr key={m.id} className="group transition-colors hover:bg-slate-800 hover:text-slate-100">
                          <td className="px-3 py-2">{fmtDateTime(m.createdAt)}</td>
                          <td className="px-3 py-2">{fmtMovementType(m.movementType)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{m.sku}</td>
                          <td className="px-3 py-2">{m.productName}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-2">
                              {m.manufacturerImageUrl ? (
                                <Image
                                  src={m.manufacturerImageUrl}
                                  alt={m.manufacturer ?? "Produttore"}
                                  width={20}
                                  height={20}
                                  className="h-5 w-5 rounded-sm border border-slate-200 object-cover"
                                  sizes="20px"
                                />
                              ) : null}
                              <span>{m.manufacturer ?? "—"}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums">{m.quantity}</td>
                          <td className="px-3 py-2 text-xs text-slate-600 group-hover:text-slate-100">{m.notes ?? "—"}</td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
                {!showInitialSkeleton && movementsHasMore ? (
                  <div className="flex justify-center py-3">
                    <button
                      type="button"
                      className={rowBtn}
                      disabled={isRefreshing}
                      onClick={() => void handleLoadMoreMovements()}
                    >
                      Carica altro
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {error ? <div className="px-4 pt-3 text-sm text-red-600">{error}</div> : null}
                <StatisticsTab
                  products={products}
                  movements={movements}
                  fmtDate={fmtDate}
                  fmtMovementType={fmtMovementType}
                  loading={showInitialSkeleton}
                />
              </>
            )}
      </MenuWorkspaceShell>
      <BippaScanDialog
        open={bippaDialogOpen}
        onClose={() => setBippaDialogOpen(false)}
        clinicId={clinicId}
        existingProductNames={products.map((p) => p.name)}
        onCreated={runLoadData}
      />
      <DdtImportDialog open={ddtDialogOpen} onClose={() => setDdtDialogOpen(false)} />
      <StockOperationDialog
        open={stockDialogOpen}
        clinicId={clinicId}
        existingProductNames={products.map((p) => p.name)}
        initialMode={stockDialogMode}
        onClose={() => setStockDialogOpen(false)}
        onSaved={runLoadData}
      />
      <ManualProductEntryDialog
        open={rowManualEntryOpen}
        clinicId={clinicId}
        existingNames={products.map((p) => p.name)}
        catalogPrefill={rowManualPrefill}
        titleIntent={rowManualTitleIntent}
        onTitleModeChange={(mode) => {
          const name = rowManualPrefill?.name ?? "";
          if (mode === "nuovo") {
            setRowManualTitleIntent({ type: "addFromMasterCatalog", productName: name });
          } else {
            setRowManualTitleIntent({ type: "stock", mode, productName: name });
          }
        }}
        onClose={() => {
          setRowManualEntryOpen(false);
          setRowManualPrefill(null);
          setRowManualTitleIntent({ type: "default" });
        }}
        onCreated={runLoadData}
      />
      {previewImage ? (
        <div
          className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/80 text-white hover:bg-slate-900"
              title="Chiudi"
            >
              <X size={14} />
            </button>
            <div className="relative h-[min(84vh,1080px)] w-[min(84vw,1440px)]">
              <Image
                src={previewImage.url}
                alt={previewImage.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 84vw, min(84vw, 1440px)"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

