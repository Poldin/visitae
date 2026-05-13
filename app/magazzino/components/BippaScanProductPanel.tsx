"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { buildScaricoNotes, DEFAULT_SCARICO_REASON_ID } from "@/app/magazzino/lib/scaricoNotes";
import { finalizeInventoryLocationForApi } from "@/lib/inventoryLocation";
import { fetchManufacturerIdByMasterCatalogId } from "@/app/magazzino/lib/masterCatalogManufacturer";
import { useProductIdentityAutosave } from "@/app/magazzino/hooks/useProductIdentityAutosave";
import { inventoryUnitPriceFromDb, inventoryVatFromDb, parseLotPriceUi, parseLotVatUi } from "./manual-product-entry/format";
import { ManualProductEntryHeader } from "./manual-product-entry/ManualProductEntryHeader";
import { ManualProductEntryIdentityFields } from "./manual-product-entry/ManualProductEntryIdentityFields";
import { ManualProductLotsSection } from "./manual-product-entry/ManualProductLotsSection";
import { ProductHeroImageColumn } from "./manual-product-entry/ProductHeroImageColumn";
import type {
  ExistingInventoryLot,
  ManualLotRow,
  ManualProductCatalogPrefill,
  ManualProductEntryHeaderMode,
} from "./manual-product-entry/types";
import { Loader2, Package, SearchX, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FoundProduct = {
  state: "found_product";
  productId: string;
  name: string;
  brandName: string | null;
  brandImageUrl: string | null;
  ean: string | null;
  sku: string | null;
  imageUrl: string | null;
  description: string | null;
};

type LookupResult =
  | { state: "loading" }
  | FoundProduct
  | { state: "new"; prefill: ManualProductCatalogPrefill | null };

export type BippaScanProductPanelProps = {
  scannedCode: string;
  clinicId: string | null;
  existingProductNames: string[];
  onCreated: () => Promise<void> | void;
  /** Called when user wants to go back to scanner (e.g. "Nuova scansione"). */
  onReset: () => void;
  /** Notifica URL immagine hero per allargare layout (es. BippaScanExperience). */
  onProductHeroImageUrlChange?: (url: string | null) => void;
};

const makeDefaultLot = (): ManualLotRow => ({
  id: "lot-1",
  quantity: "1",
  lotCode: "",
  price: "",
  vat: "",
  expiryDate: "",
  location: "",
});

// ── Component ─────────────────────────────────────────────────────────────────

export function BippaScanProductPanel({
  scannedCode,
  clinicId,
  existingProductNames,
  onCreated,
  onReset,
  onProductHeroImageUrlChange,
}: BippaScanProductPanelProps) {
  const [lookup, setLookup] = useState<LookupResult>({ state: "loading" });

  // Shared operation state
  const [headerMode, setHeaderMode] = useState<ManualProductEntryHeaderMode>("carico");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [manualLots, setManualLots] = useState<ManualLotRow[]>([makeDefaultLot()]);
  const [existingInventoryLots, setExistingInventoryLots] = useState<ExistingInventoryLot[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [processingManualLotId, setProcessingManualLotId] = useState<string | null>(null);
  const [confirmedManualLotId, setConfirmedManualLotId] = useState<string | null>(null);
  const [manualCreatedProductId, setManualCreatedProductId] = useState<string | null>(null);
  const [uploadedManualImageUrl, setUploadedManualImageUrl] = useState<string | null>(null);
  const [notFoundBannerDismissed, setNotFoundBannerDismissed] = useState(false);

  // New-product form state
  const [manualName, setManualName] = useState("");
  const [manualManufacturer, setManualManufacturer] = useState("");
  const [manualSku, setManualSku] = useState("");
  const [manualEan, setManualEan] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImagePreviewUrl, setManualImagePreviewUrl] = useState<string | null>(null);
  const [catalogImageUrl, setCatalogImageUrl] = useState<string | null>(null);

  const modeDropdownRef = useRef<HTMLDivElement | null>(null);
  const manualImageInputRef = useRef<HTMLInputElement | null>(null);

  const existingNameSet = useMemo(
    () => new Set(existingProductNames.map((x) => x.trim().toLowerCase())),
    [existingProductNames],
  );

  // ── Barcode lookup ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clinicId || !scannedCode) return;

    let cancelled = false;

    setLookup({ state: "loading" });
    setNotFoundBannerDismissed(false);
    setSubmitError(null);
    setManualCreatedProductId(null);
    setExistingInventoryLots([]);
    setManualLots([makeDefaultLot()]);
    setManualImageFile(null);
    setUploadedManualImageUrl(null);
    setManualDescription("");

    const run = async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) return;

      // 1. Search products table (clinic's own inventory)
      const { data: product } = await supabase
        .from("products")
        .select("id, name, ean, sku, image_url, description, metadata, category")
        .eq("clinic_id", clinicId)
        .or(`ean.eq.${scannedCode},udi_di.eq.${scannedCode},hibc_primary.eq.${scannedCode}`)
        .maybeSingle();

      if (cancelled) return;

      if (product) {
        const meta = product.metadata as Record<string, unknown> | null;
        const manufacturerLabel =
          (typeof meta?.manufacturer === "string" ? meta.manufacturer.trim() : null) ||
          (typeof meta?.brand === "string" ? meta.brand.trim() : null) ||
          (product.category as string | null | undefined)?.trim() ||
          "";

        setManualName(product.name as string);
        setManualManufacturer(manufacturerLabel);
        setManualSku((product.sku as string | null) ?? "");
        setManualEan((product.ean as string | null) ?? scannedCode);
        setCatalogImageUrl((product.image_url as string | null) ?? null);
        setManualDescription(((product.description as string | null) ?? "").trim());
        setLookup({
          state: "found_product",
          productId: product.id as string,
          name: product.name as string,
          brandName: manufacturerLabel || null,
          brandImageUrl: null,
          ean: product.ean as string | null,
          sku: product.sku as string | null,
          imageUrl: product.image_url as string | null,
          description: product.description as string | null,
        });
        setHeaderMode("carico");
        return;
      }

      // 2. Search master_catalog
      const { data: masterItem } = await supabase
        .from("master_catalog")
        .select(
          "id, name, ean, sku, image_url, default_min_stock, default_description, tags, manufacturer:manufacturer_id(full_legal_name)",
        )
        .or(`ean.eq.${scannedCode},udi_di.eq.${scannedCode},hibc_primary.eq.${scannedCode}`)
        .maybeSingle();

      if (cancelled) return;

      if (masterItem) {
        const mfr = masterItem.manufacturer as { full_legal_name: string | null } | null;
        const manufacturerName = mfr?.full_legal_name?.trim() ?? null;
        const defaultDesc = ((masterItem.default_description as string | null) ?? "").trim();
        const prefill: ManualProductCatalogPrefill = {
          masterCatalogueId: masterItem.id as string,
          existingProductId: null,
          currentStockQty: null,
          name: masterItem.name as string,
          description: defaultDesc || null,
          manufacturer: manufacturerName,
          sku: masterItem.sku as string | null,
          ean: (masterItem.ean as string | null) ?? scannedCode,
          imageUrl: masterItem.image_url as string | null,
          defaultMinStock: masterItem.default_min_stock as number | null,
          tags: masterItem.tags as string[] | null,
        };
        setManualName(masterItem.name as string);
        setManualManufacturer(manufacturerName ?? "");
        setManualSku((masterItem.sku as string | null) ?? "");
        setManualEan((masterItem.ean as string | null) ?? scannedCode);
        setCatalogImageUrl(masterItem.image_url as string | null);
        setManualDescription(defaultDesc);
        setLookup({ state: "new", prefill });
        setHeaderMode("nuovo");
        return;
      }

      // 3. Not found anywhere — blank new product with EAN pre-filled
      setManualEan(scannedCode);
      setManualName("");
      setManualManufacturer("");
      setManualSku("");
      setCatalogImageUrl(null);
      setLookup({ state: "new", prefill: null });
      setHeaderMode("nuovo");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [scannedCode, clinicId]);

  // ── Existing inventory lots refresh ────────────────────────────────────────

  const effectiveProductId = useMemo(() => {
    if (lookup.state === "found_product") return lookup.productId;
    return manualCreatedProductId;
  }, [lookup, manualCreatedProductId]);

  const refreshExistingInventoryLots = useCallback(
    async (opts?: { clearQuantityForInventoryId?: string | null; productId?: string | null }) => {
      const pid = opts?.productId ?? effectiveProductId;
      if (!clinicId || !pid) {
        setExistingInventoryLots([]);
        return;
      }
      const syncRowsToInventory = headerMode === "scarico" || headerMode === "inventario";
      const supabase = getSupabaseAuthClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id,quantity,expiry_date,batch_number,price,location,VAT")
        .eq("clinic_id", clinicId)
        .eq("product_id", pid)
        .gt("quantity", 0)
        .order("expiry_date", { ascending: true, nullsFirst: false });

      if (error) {
        setSubmitError(error.message);
        return;
      }
      const lots: ExistingInventoryLot[] = (data ?? []).map((x) => {
        const row = x as {
          id: string;
          quantity: number;
          expiry_date: string | null;
          batch_number: string | null;
          price: unknown;
          location: string | null;
          VAT: unknown;
        };
        return {
          inventoryItemId: String(row.id),
          quantity: Number(row.quantity ?? 0),
          expiryDate: row.expiry_date ?? null,
          lotCode: row.batch_number ?? null,
          location: row.location ?? null,
          unitPrice: inventoryUnitPriceFromDb(row.price),
          vatPct: inventoryVatFromDb(row.VAT),
        };
      });
      setExistingInventoryLots(lots);

      if (syncRowsToInventory) {
        setManualLots(
          lots.map((x) => {
            const clear =
              opts?.clearQuantityForInventoryId != null &&
              opts.clearQuantityForInventoryId === x.inventoryItemId;
            return {
              id: x.inventoryItemId,
              quantity: clear ? "" : "",
              lotCode: x.lotCode ?? "",
              price: "",
              vat: "",
              expiryDate: x.expiryDate ?? "",
              location: x.location ?? "",
            };
          }),
        );
      }
    },
    [clinicId, effectiveProductId, headerMode],
  );

  useEffect(() => {
    if (!clinicId || !effectiveProductId) {
      setExistingInventoryLots([]);
      return;
    }
    void refreshExistingInventoryLots({ productId: effectiveProductId });
  }, [clinicId, effectiveProductId, headerMode, refreshExistingInventoryLots]);

  // Reset lots when switching to carico
  useEffect(() => {
    if (headerMode !== "carico") return;
    setManualLots([makeDefaultLot()]);
  }, [headerMode]);

  useEffect(() => {
    if (!modeDropdownOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!modeDropdownRef.current?.contains(e.target as Node)) setModeDropdownOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [modeDropdownOpen]);

  useEffect(() => {
    if (!manualImageFile) {
      setManualImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(manualImageFile);
    setManualImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [manualImageFile]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const catalogPrefill: ManualProductCatalogPrefill | null = useMemo(() => {
    if (lookup.state === "new") return lookup.prefill;
    return null;
  }, [lookup]);

  const productHeroImageUrl = useMemo(() => {
    if (lookup.state === "loading") return null;
    if (manualImagePreviewUrl) return manualImagePreviewUrl;
    const up = uploadedManualImageUrl?.trim();
    if (up) return up;
    const cat = catalogImageUrl?.trim();
    if (cat) return cat;
    if (lookup.state === "found_product") {
      const iu = lookup.imageUrl?.trim();
      if (iu) return iu;
    }
    return null;
  }, [
    lookup.state,
    lookup,
    manualImagePreviewUrl,
    uploadedManualImageUrl,
    catalogImageUrl,
  ]);

  useEffect(() => {
    onProductHeroImageUrlChange?.(productHeroImageUrl);
  }, [productHeroImageUrl, onProductHeroImageUrlChange]);

  const isLoadMode = headerMode === "carico" || headerMode === "nuovo";
  const isScaricoInventario = headerMode === "scarico" || headerMode === "inventario";
  const modeSwitcherLocked = lookup.state === "new" || lookup.state === "loading";

  const rowConfirmActionLabel =
    headerMode === "carico"
      ? "Carica"
      : headerMode === "scarico"
        ? "Scarica"
        : headerMode === "inventario"
          ? "Modifica"
          : "Aggiungi";

  const headerProductName = useMemo(() => {
    if (lookup.state === "found_product") return manualName.trim() || lookup.name;
    if (lookup.state === "new") return manualName.trim() || catalogPrefill?.name || "";
    return "";
  }, [lookup, manualName, catalogPrefill]);

  const autosaveProductId =
    lookup.state === "found_product" ? lookup.productId : manualCreatedProductId;

  const onCreatedRef = useRef(onCreated);
  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated]);
  const lastAutosaveEchoRef = useRef(0);

  const onAutosaveImageUploaded = useCallback((publicUrl: string) => {
    setUploadedManualImageUrl(publicUrl);
    setCatalogImageUrl(publicUrl);
    setManualImageFile(null);
  }, []);

  const onAutosavePersistError = useCallback((message: string) => {
    setSubmitError(message);
  }, []);

  const onAutosaveEcho = useCallback(() => {
    const now = Date.now();
    if (now - lastAutosaveEchoRef.current < 2600) return;
    lastAutosaveEchoRef.current = now;
    void onCreatedRef.current?.();
  }, []);

  useProductIdentityAutosave({
    enabled: Boolean(clinicId && autosaveProductId && lookup.state !== "loading"),
    clinicId,
    productId: autosaveProductId,
    hydrationKey: `${scannedCode}|${autosaveProductId ?? ""}`,
    manualName,
    manualManufacturer,
    manualSku,
    manualEan,
    manualDescription,
    uploadedManualImageUrl,
    catalogImageUrl,
    manualImageFile,
    onImageUploaded: onAutosaveImageUploaded,
    onPersistError: onAutosavePersistError,
    onAutosaveApplied: onAutosaveEcho,
  });

  // ── API calls (same logic as ManualProductEntryDialog) ─────────────────────

  const uploadManualImage = useCallback(async (): Promise<string | null> => {
    if (!manualImageFile) return null;
    const supabase = getSupabaseAuthClient();
    if (!supabase) { setSubmitError("Configurazione Supabase mancante."); return null; }
    const ext = manualImageFile.name.includes(".") ? manualImageFile.name.split(".").pop() : "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(`manual-products/${fileName}`, manualImageFile, { upsert: false });
    if (error) { setSubmitError(error.message); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(`manual-products/${fileName}`);
    return data.publicUrl ?? null;
  }, [manualImageFile]);

  const callCaricoApi = useCallback(
    async (productId: string, lot: ManualLotRow, opts?: { movementNote?: string }): Promise<boolean> => {
      const supabase = getSupabaseAuthClient();
      if (!supabase || !clinicId) { setSubmitError("Configurazione mancante."); return false; }
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token ?? "";
      if (!token) { setSubmitError("Sessione non valida."); return false; }

      const quantity = Math.max(1, Number(lot.quantity));
      const price = parseLotPriceUi(lot.price);
      const vat = parseLotVatUi(lot.vat);
      const location = finalizeInventoryLocationForApi(lot.location);

      const res = await fetch("/api/magazzino/actions/carico", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          products: [{
            productId,
            ...(opts?.movementNote ? { movementNote: opts.movementNote } : {}),
            lots: [{
              quantity,
              expiryDate: lot.expiryDate || null,
              lotCode: lot.lotCode || null,
              price,
              ...(vat != null ? { vat } : {}),
              ...(location ? { location } : {}),
            }],
          }],
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setSubmitError(payload?.error ?? "Carico non riuscito."); return false; }
      return true;
    },
    [clinicId],
  );

  const callScaricoApi = useCallback(
    async (productId: string, quantity: number, inventoryItemId: string, note = "Scarico merce (lotto singolo)"): Promise<boolean> => {
      const supabase = getSupabaseAuthClient();
      if (!supabase || !clinicId) { setSubmitError("Configurazione mancante."); return false; }
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token ?? "";
      if (!token) { setSubmitError("Sessione non valida."); return false; }

      const res = await fetch("/api/magazzino/actions/scarico", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          products: [{ productId, inventoryItemId, quantity, movementType: "unload", movementNote: note }],
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setSubmitError(payload?.error ?? "Scarico non riuscito."); return false; }
      return true;
    },
    [clinicId],
  );

  const callInventarioApi = useCallback(
    async (productId: string, targetQuantity: number, inventoryItemId: string, location: string, note = "Rettifica inventario (lotto singolo)"): Promise<boolean> => {
      const supabase = getSupabaseAuthClient();
      if (!supabase || !clinicId) { setSubmitError("Configurazione mancante."); return false; }
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token ?? "";
      if (!token) { setSubmitError("Sessione non valida."); return false; }

      const res = await fetch("/api/magazzino/actions/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          products: [{ productId, inventoryItemId, targetQuantity, movementNote: note, location }],
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setSubmitError(payload?.error ?? "Rettifica inventario non riuscita."); return false; }
      return true;
    },
    [clinicId],
  );

  const callNuovoArticoloApi = useCallback(
    async (lot: ManualLotRow, opts?: { movementNote?: string }): Promise<string | null> => {
      const supabase = getSupabaseAuthClient();
      if (!supabase || !clinicId) { setSubmitError("Configurazione mancante."); return null; }
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token ?? "";
      if (!token) { setSubmitError("Sessione non valida."); return null; }

      let imageUrl: string | null = uploadedManualImageUrl;
      if (manualImageFile && !uploadedManualImageUrl) {
        imageUrl = await uploadManualImage();
        if (!imageUrl) return null;
        setUploadedManualImageUrl(imageUrl);
      } else if (!manualImageFile && catalogImageUrl) {
        imageUrl = catalogImageUrl;
      }

      const minStockRaw = catalogPrefill?.defaultMinStock != null ? Number(catalogPrefill.defaultMinStock) : 0;
      const minStockLevel = Number.isFinite(minStockRaw) ? minStockRaw : 0;
      const quantity = Math.max(1, Number(lot.quantity));
      const location = finalizeInventoryLocationForApi(lot.location);
      const vatPct = parseLotVatUi(lot.vat);

      const res = await fetch("/api/magazzino/actions/nuovo-articolo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinicId,
          products: [{
            productId: catalogPrefill?.existingProductId ?? undefined,
            masterCatalogueId: catalogPrefill?.masterCatalogueId ?? null,
            name: manualName.trim(),
            manufacturer: manualManufacturer.trim() || null,
            sku: manualSku.trim() || null,
            ean: manualEan.trim() || null,
            description: manualDescription.trim() || null,
            imageUrl,
            minStockLevel,
            ...(opts?.movementNote ? { movementNote: opts.movementNote } : {}),
            lots: [{
              quantity,
              expiryDate: lot.expiryDate || null,
              lotCode: lot.lotCode || null,
              price: parseLotPriceUi(lot.price),
              ...(vatPct != null ? { vat: vatPct } : {}),
              ...(location ? { location } : {}),
            }],
          }],
        }),
      });
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        resolvedProducts?: Array<{ productId?: string }>;
      } | null;
      if (!res.ok) { setSubmitError(payload?.error ?? "Creazione articolo non riuscita."); return null; }
      const newId = payload?.resolvedProducts?.[0]?.productId?.trim();
      if (newId) return newId;
      setSubmitError("Risposta API senza ID prodotto.");
      return null;
    },
    [clinicId, uploadedManualImageUrl, manualImageFile, catalogImageUrl, catalogPrefill, uploadManualImage, manualName, manualManufacturer, manualSku, manualEan, manualDescription],
  );

  const ensureManualProduct = useCallback(async (): Promise<string | null> => {
    if (!clinicId) { setSubmitError("Clinic non trovata."); return null; }
    if (manualCreatedProductId) return manualCreatedProductId;

    const supabase = getSupabaseAuthClient();
    if (!supabase) { setSubmitError("Configurazione Supabase mancante."); return null; }

    const masterId = catalogPrefill?.masterCatalogueId;
    if (masterId) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("master_catalogue_id", masterId)
        .maybeSingle();
      if (existing?.id) {
        setManualCreatedProductId(existing.id);
        await onCreated();
        return existing.id;
      }
    }

    const name = manualName.trim();
    if (!name) { setSubmitError("Il nome prodotto è obbligatorio."); return null; }
    if (existingNameSet.has(name.toLowerCase())) {
      setSubmitError("Prodotto già presente nel tuo magazzino.");
      return null;
    }

    const manufacturerValue =
      manualManufacturer.trim() || catalogPrefill?.manufacturer?.trim() || null;
    const metadata =
      manufacturerValue || manualSku.trim() || manualEan.trim()
        ? {
            ...(manufacturerValue ? { manufacturer: manufacturerValue } : {}),
            ...(manualSku.trim() ? { sku: manualSku.trim() } : {}),
            ...(manualEan.trim() ? { ean: manualEan.trim() } : {}),
          }
        : null;

    let imageUrl: string | null = uploadedManualImageUrl;
    if (manualImageFile && !uploadedManualImageUrl) {
      imageUrl = await uploadManualImage();
      if (!imageUrl) return null;
      setUploadedManualImageUrl(imageUrl);
    } else if (!manualImageFile && catalogImageUrl) {
      imageUrl = catalogImageUrl;
    }

    const minStockRaw = catalogPrefill?.defaultMinStock != null ? Number(catalogPrefill.defaultMinStock) : 0;
    const min_stock_level = Number.isFinite(minStockRaw) ? minStockRaw : 0;
    const categoryValue = manufacturerValue || catalogPrefill?.manufacturer || catalogPrefill?.tags?.[0] || null;

    let manufacturerIdFromMaster: string | null = null;
    if (masterId) {
      manufacturerIdFromMaster = await fetchManufacturerIdByMasterCatalogId(supabase, masterId);
    }

    setSaving(true);
    setSubmitError(null);
    const insertPayload: Record<string, unknown> = {
      clinic_id: clinicId,
      name,
      sku: null,
      category: categoryValue,
      min_stock_level,
      image_url: imageUrl,
      description: manualDescription.trim() || null,
      metadata,
    };
    if (masterId) insertPayload.master_catalogue_id = masterId;
    if (manufacturerIdFromMaster) insertPayload.manufacturer_id = manufacturerIdFromMaster;

    const { data: created, error } = await supabase
      .from("products")
      .insert(insertPayload as never)
      .select("id")
      .single();
    setSaving(false);
    if (error || !created?.id) { setSubmitError(error?.message ?? "Creazione prodotto non riuscita."); return null; }
    setManualCreatedProductId(created.id);
    await onCreated();
    return created.id;
  }, [clinicId, manualCreatedProductId, catalogPrefill, manualName, existingNameSet, manualManufacturer, manualSku, manualEan, uploadedManualImageUrl, manualImageFile, catalogImageUrl, uploadManualImage, onCreated, manualDescription]);

  // ── Lot confirmation ────────────────────────────────────────────────────────

  const handleConfirmManualLot = useCallback(
    async (lot: ManualLotRow) => {
      if (!clinicId) return;
      setSubmitError(null);
      const isLoad = headerMode === "carico" || headerMode === "nuovo";

      if (isLoad) {
        const qty = Number(lot.quantity);
        if (!Number.isFinite(qty) || qty <= 0) return;
        if (lot.vat.trim() !== "" && parseLotVatUi(lot.vat) === null) {
          setSubmitError("IVA non valida (percentuale tra 0 e 100).");
          return;
        }
      } else {
        const n = Number(lot.quantity);
        if (!Number.isFinite(n)) return;
        if (headerMode === "scarico" && (n <= 0 || !Number.isInteger(n))) return;
        if (headerMode === "inventario" && (lot.quantity.trim() === "" || n < 0 || !Number.isInteger(n))) return;
      }

      setProcessingManualLotId(lot.id);
      setConfirmedManualLotId(null);

      const finishRowSuccess = () => {
        if (headerMode === "carico" || headerMode === "nuovo") {
          setConfirmedManualLotId(null);
          setManualLots((prev) => {
            if (!prev.some((x) => x.id === lot.id)) return prev;
            if (prev.length === 1) {
              return [{
                id: `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                quantity: "1", lotCode: "", price: "", vat: "", expiryDate: "", location: "",
              }];
            }
            return prev.filter((x) => x.id !== lot.id);
          });
          return;
        }
        setConfirmedManualLotId(lot.id);
        window.setTimeout(() => {
          setManualLots((prev) => {
            if (!prev.some((x) => x.id === lot.id)) return prev;
            return prev.filter((x) => x.id !== lot.id);
          });
          setConfirmedManualLotId((prev) => (prev === lot.id ? null : prev));
        }, 3000);
      };

      if (isLoad) {
        if (headerMode !== "nuovo") {
          const productId =
            lookup.state === "found_product"
              ? lookup.productId
              : await ensureManualProduct();
          if (!productId) { setProcessingManualLotId(null); return; }
          const ok = await callCaricoApi(productId, lot);
          setProcessingManualLotId(null);
          if (!ok) return;
          await refreshExistingInventoryLots({ productId });
          await onCreated();
        } else {
          const newId = await callNuovoArticoloApi(lot);
          setProcessingManualLotId(null);
          if (!newId) return;
          setManualCreatedProductId(newId);
          await refreshExistingInventoryLots({ productId: newId });
          await onCreated();
        }
        finishRowSuccess();
        return;
      }

      // Scarico / inventario — must have existing product
      const existingPid = lookup.state === "found_product" ? lookup.productId : null;
      if (!existingPid) {
        setSubmitError("Scarico e inventario sono disponibili solo per articoli già in giacenza.");
        setProcessingManualLotId(null);
        return;
      }

      const n = Number(lot.quantity);
      const currentLotStock = existingInventoryLots.find((x) => x.inventoryItemId === lot.id)?.quantity ?? null;

      if (headerMode === "scarico") {
        if (currentLotStock == null) { setSubmitError("Lotto non valido."); setProcessingManualLotId(null); return; }
        if (n > currentLotStock) { setSubmitError("Quantità superiore alla giacenza del lotto."); setProcessingManualLotId(null); return; }
        const ok = await callScaricoApi(
          existingPid,
          n,
          lot.id,
          buildScaricoNotes(lot.scaricoReasonId ?? DEFAULT_SCARICO_REASON_ID, lot.scaricoNoteDetail ?? ""),
        );
        setProcessingManualLotId(null);
        if (!ok) return;
        await onCreated();
        await refreshExistingInventoryLots({ clearQuantityForInventoryId: lot.id });
        finishRowSuccess();
        return;
      }

      if (headerMode === "inventario") {
        if (currentLotStock == null) { setSubmitError("Lotto non valido."); setProcessingManualLotId(null); return; }
        const ok = await callInventarioApi(
          existingPid, n, lot.id,
          finalizeInventoryLocationForApi(lot.location),
        );
        setProcessingManualLotId(null);
        if (!ok) return;
        await onCreated();
        await refreshExistingInventoryLots({ clearQuantityForInventoryId: lot.id });
        finishRowSuccess();
      }
    },
    [
      clinicId, headerMode, catalogPrefill, lookup, existingInventoryLots,
      ensureManualProduct, callCaricoApi, callNuovoArticoloApi, callScaricoApi, callInventarioApi,
      refreshExistingInventoryLots, onCreated,
    ],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (lookup.state === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Ricerca in corso…</p>
        <p className="font-mono text-xs text-slate-300">{scannedCode}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <ManualProductEntryHeader
        modeDropdownRef={modeDropdownRef}
        headerMode={headerMode}
        setHeaderMode={setHeaderMode}
        modeDropdownOpen={modeDropdownOpen}
        setModeDropdownOpen={setModeDropdownOpen}
        modeSwitcherLocked={modeSwitcherLocked}
        headerProductName={headerProductName}
        onClose={onReset}
        onTitleModeChange={setHeaderMode}
        dismissAppearance="collapse"
      />

      {/* Error */}
      {submitError ? (
        <div className="shrink-0 px-4 pt-2 pb-1 text-sm text-rose-600">{submitError}</div>
      ) : null}

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">

        {/* ── New product: not found info banner ── */}
        {lookup.state === "new" && !lookup.prefill && !notFoundBannerDismissed && (
          <div className="relative mb-4 rounded-xl border border-amber-200 bg-amber-50">
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
              aria-label="Nascondi avviso"
              onClick={() => setNotFoundBannerDismissed(true)}
            >
              <X size={14} strokeWidth={2} aria-hidden />
            </button>
            <div className="flex items-start gap-2.5 px-3 py-2.5 pr-11">
              <SearchX size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">Codice non trovato</p>
                <p className="text-xs text-amber-700">
                  Completa i dati per creare un nuovo articolo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── New product: master catalog found banner ── */}
        {lookup.state === "new" && lookup.prefill?.masterCatalogueId && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
            <Package size={16} className="mt-0.5 shrink-0 text-violet-500" />
            <div>
              <p className="text-sm font-semibold text-violet-800">Trovato nel catalogo</p>
              <p className="text-xs text-violet-700">
                Il prodotto è nel catalogo generale. Verifica e conferma per aggiungerlo al tuo magazzino.
              </p>
            </div>
          </div>
        )}

        {/* ── Identity fields (prodotto in magazzino o nuovo da catalogo / manuale) ── */}
        {(lookup.state === "found_product" || lookup.state === "new") && (
          <ManualProductEntryIdentityFields
            manualEan={manualEan}
            onManualEanChange={setManualEan}
            manualName={manualName}
            onManualNameChange={setManualName}
            manualDescription={manualDescription}
            onManualDescriptionChange={setManualDescription}
            manualManufacturer={manualManufacturer}
            onManualManufacturerChange={setManualManufacturer}
            manualSku={manualSku}
            onManualSkuChange={setManualSku}
            manualImageInputRef={manualImageInputRef}
            onManualImageFile={setManualImageFile}
            manualImageFile={manualImageFile}
            manualImagePreviewUrl={manualImagePreviewUrl}
          />
        )}

        {/* ── Lots section ── */}
        <ManualProductLotsSection
          density="compact"
          lots={manualLots}
          existingInventoryLots={existingInventoryLots}
          headerMode={headerMode}
          isLoadMode={isLoadMode}
          isScaricoInventario={isScaricoInventario}
          saving={saving}
          processingManualLotId={processingManualLotId}
          confirmedManualLotId={confirmedManualLotId}
          rowConfirmActionLabel={rowConfirmActionLabel}
          clinicId={clinicId}
          onConfirmLot={handleConfirmManualLot}
          onAddLotRow={() =>
            setManualLots((prev) => [
              ...prev,
              {
                id: `lot-${Date.now()}-${prev.length + 1}`,
                quantity: "1", lotCode: "", price: "", vat: "", expiryDate: "", location: "",
              },
            ])
          }
          onRemoveLotRow={(lotId) =>
            setManualLots((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== lotId) : prev))
          }
          onUpdateLotField={(lotId, patch) =>
            setManualLots((prev) => prev.map((x) => (x.id === lotId ? { ...x, ...patch } : x)))
          }
        />
        </div>

        {productHeroImageUrl ? (
          <ProductHeroImageColumn
            imageUrl={productHeroImageUrl}
            className="border-t border-slate-200 bg-slate-50/75 lg:w-[min(280px,28vw)] lg:border-l lg:border-t-0"
          />
        ) : null}
      </div>
    </div>
  );
}
