"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { finalizeInventoryLocationForApi } from "@/lib/inventoryLocation";
import { BRAND_DROPDOWN_LIMIT } from "./manual-product-entry/constants";
import { inventoryUnitPriceFromDb, parseLotPriceUi, parseLotVatUi } from "./manual-product-entry/format";
import { ManualProductEntryHeader } from "./manual-product-entry/ManualProductEntryHeader";
import { ManualProductEntryIdentityFields } from "./manual-product-entry/ManualProductEntryIdentityFields";
import { ManualProductLotsSection } from "./manual-product-entry/ManualProductLotsSection";
import type {
  BrandOption,
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
  const [brandSearch, setBrandSearch] = useState("");
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState("");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [manualSku, setManualSku] = useState("");
  const [manualEan, setManualEan] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImagePreviewUrl, setManualImagePreviewUrl] = useState<string | null>(null);
  const [catalogImageUrl, setCatalogImageUrl] = useState<string | null>(null);

  const brandBoxRef = useRef<HTMLDivElement | null>(null);
  const modeDropdownRef = useRef<HTMLDivElement | null>(null);
  const manualImageInputRef = useRef<HTMLInputElement | null>(null);

  const existingNameSet = useMemo(
    () => new Set(existingProductNames.map((x) => x.trim().toLowerCase())),
    [existingProductNames],
  );

  // ── Barcode lookup ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clinicId || !scannedCode) return;

    setLookup({ state: "loading" });
    setNotFoundBannerDismissed(false);
    setSubmitError(null);
    setManualCreatedProductId(null);
    setExistingInventoryLots([]);
    setManualLots([makeDefaultLot()]);

    const run = async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) return;

      // 1. Search products table (clinic's own inventory)
      const { data: product } = await supabase
        .from("products")
        .select("id, name, ean, sku, image_url, description, brand:brand_id(name, image_url)")
        .eq("clinic_id", clinicId)
        .or(`ean.eq.${scannedCode},udi_di.eq.${scannedCode},hibc_primary.eq.${scannedCode}`)
        .maybeSingle();

      if (product) {
        const brand = product.brand as { name: string; image_url: string | null } | null;
        setLookup({
          state: "found_product",
          productId: product.id as string,
          name: product.name as string,
          brandName: (brand?.name ?? null) as string | null,
          brandImageUrl: (brand?.image_url ?? null) as string | null,
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
        .select("id, name, ean, sku, image_url, default_min_stock, tags, brand:brand_id(name, image_url)")
        .or(`ean.eq.${scannedCode},udi_di.eq.${scannedCode},hibc_primary.eq.${scannedCode}`)
        .maybeSingle();

      if (masterItem) {
        const brand = masterItem.brand as { name: string; image_url: string | null } | null;
        const prefill: ManualProductCatalogPrefill = {
          masterCatalogueId: masterItem.id as string,
          existingProductId: null,
          currentStockQty: null,
          name: masterItem.name as string,
          brand: brand?.name ?? null,
          brandImageUrl: brand?.image_url ?? null,
          sku: masterItem.sku as string | null,
          ean: (masterItem.ean as string | null) ?? scannedCode,
          imageUrl: masterItem.image_url as string | null,
          defaultMinStock: masterItem.default_min_stock as number | null,
          tags: masterItem.tags as string[] | null,
        };
        setManualName(masterItem.name as string);
        setBrandSearch(brand?.name ?? "");
        setDebouncedBrandSearch((brand?.name ?? "").trim());
        setManualSku((masterItem.sku as string | null) ?? "");
        setManualEan((masterItem.ean as string | null) ?? scannedCode);
        setCatalogImageUrl(masterItem.image_url as string | null);
        setLookup({ state: "new", prefill });
        setHeaderMode("nuovo");
        return;
      }

      // 3. Not found anywhere — blank new product with EAN pre-filled
      setManualEan(scannedCode);
      setManualName("");
      setBrandSearch("");
      setDebouncedBrandSearch("");
      setManualSku("");
      setCatalogImageUrl(null);
      setLookup({ state: "new", prefill: null });
      setHeaderMode("nuovo");
    };

    void run();
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
        .select("id,quantity,expiry_date,batch_number,price,location")
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
        };
        return {
          inventoryItemId: String(row.id),
          quantity: Number(row.quantity ?? 0),
          expiryDate: row.expiry_date ?? null,
          lotCode: row.batch_number ?? null,
          location: row.location ?? null,
          unitPrice: inventoryUnitPriceFromDb(row.price),
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

  // ── Brand dropdown debounce ─────────────────────────────────────────────────

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedBrandSearch(brandSearch.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [brandSearch]);

  useEffect(() => {
    if (!brandDropdownOpen) return;
    const fetchBrands = async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) return;
      setBrandLoading(true);
      let options: BrandOption[] = [];
      if (debouncedBrandSearch) {
        const { data } = await supabase
          .from("brands")
          .select("id,name,image_url")
          .ilike("name", `%${debouncedBrandSearch}%`)
          .order("name", { ascending: true })
          .limit(BRAND_DROPDOWN_LIMIT);
        options = (data ?? [])
          .filter((item): item is { id: string; name: string; image_url: string | null } =>
            Boolean(item?.id && item?.name),
          )
          .map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null }));
      } else {
        const { count } = await supabase.from("brands").select("id", { count: "exact", head: true });
        const safeCount = count ?? 0;
        const maxOffset = Math.max(0, safeCount - BRAND_DROPDOWN_LIMIT);
        const randomOffset = maxOffset > 0 ? Math.floor(Math.random() * (maxOffset + 1)) : 0;
        const { data } = await supabase
          .from("brands")
          .select("id,name,image_url")
          .order("name", { ascending: true })
          .range(randomOffset, randomOffset + BRAND_DROPDOWN_LIMIT - 1);
        options = (data ?? [])
          .filter((item): item is { id: string; name: string; image_url: string | null } =>
            Boolean(item?.id && item?.name),
          )
          .map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null }));
      }
      setBrandOptions(options);
      setBrandLoading(false);
    };
    void fetchBrands();
  }, [brandDropdownOpen, debouncedBrandSearch]);

  useEffect(() => {
    if (!brandDropdownOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!brandBoxRef.current?.contains(e.target as Node)) setBrandDropdownOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [brandDropdownOpen]);

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

  const normalizedBrandSearch = brandSearch.trim();
  const exactBrandMatch = useMemo(
    () =>
      brandOptions.find((b) => b.name.trim().toLowerCase() === normalizedBrandSearch.toLowerCase()) ?? null,
    [brandOptions, normalizedBrandSearch],
  );
  const filteredBrandOptions = useMemo(() => brandOptions.slice(0, BRAND_DROPDOWN_LIMIT), [brandOptions]);
  const canCreateBrand = Boolean(normalizedBrandSearch) && !exactBrandMatch;

  const catalogPrefill: ManualProductCatalogPrefill | null = useMemo(() => {
    if (lookup.state === "new") return lookup.prefill;
    return null;
  }, [lookup]);

  const selectedBrandImageUrl = useMemo(() => {
    if (exactBrandMatch?.image_url) return exactBrandMatch.image_url;
    if (lookup.state === "found_product") return lookup.brandImageUrl;
    if (catalogPrefill?.brand?.trim().toLowerCase() === normalizedBrandSearch.toLowerCase()) {
      return catalogPrefill.brandImageUrl ?? null;
    }
    return null;
  }, [exactBrandMatch, lookup, catalogPrefill, normalizedBrandSearch]);

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
    if (lookup.state === "found_product") return lookup.name;
    if (lookup.state === "new") return manualName.trim() || catalogPrefill?.name || "";
    return "";
  }, [lookup, manualName, catalogPrefill]);

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
    async (productId: string, lot: ManualLotRow, opts: { fromCatalog: boolean; movementNote: string }): Promise<boolean> => {
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
            movementType: opts.fromCatalog ? "catalogue_add" : "manually_add",
            movementNote: opts.movementNote,
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
    async (lot: ManualLotRow, opts: { fromCatalog: boolean; movementNote: string }): Promise<string | null> => {
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
            brand: normalizedBrandSearch || null,
            sku: manualSku.trim() || null,
            ean: manualEan.trim() || null,
            description: manualDescription.trim() || null,
            imageUrl,
            minStockLevel,
            movementType: opts.fromCatalog ? "catalogue_add" : "manually_add",
            movementNote: opts.movementNote,
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
    [clinicId, uploadedManualImageUrl, manualImageFile, catalogImageUrl, catalogPrefill, uploadManualImage, manualName, normalizedBrandSearch, manualSku, manualEan, manualDescription],
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

    const manualBrandName = normalizedBrandSearch || null;
    const metadata =
      manualBrandName || manualSku.trim() || manualEan.trim()
        ? {
            ...(manualBrandName ? { brand: manualBrandName } : {}),
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
    const categoryValue = normalizedBrandSearch.trim() || catalogPrefill?.brand || catalogPrefill?.tags?.[0] || null;

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
  }, [clinicId, manualCreatedProductId, catalogPrefill, manualName, existingNameSet, normalizedBrandSearch, manualSku, manualEan, uploadedManualImageUrl, manualImageFile, catalogImageUrl, uploadManualImage, onCreated, manualDescription]);

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
        const fromCatalog = Boolean(catalogPrefill?.masterCatalogueId);
        const baseNote = fromCatalog ? "Carico da catalogo (scan)" : "Carico da scansione codice";
        const unitPrice = parseLotPriceUi(lot.price);
        const vatPct = parseLotVatUi(lot.vat);
        const movementNote =
          unitPrice != null
            ? `${baseNote} · Prezzo unit. impon.: ${unitPrice.toFixed(2).replace(".", ",")} €${vatPct != null && vatPct > 0 ? ` · IVA ${vatPct}%` : ""}`
            : baseNote;

        if (headerMode !== "nuovo") {
          const productId = await ensureManualProduct();
          if (!productId) { setProcessingManualLotId(null); return; }
          const ok = await callCaricoApi(productId, lot, { fromCatalog, movementNote });
          setProcessingManualLotId(null);
          if (!ok) return;
          await refreshExistingInventoryLots({ productId });
          await onCreated();
        } else {
          const newId = await callNuovoArticoloApi(lot, { fromCatalog, movementNote });
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
        const ok = await callScaricoApi(existingPid, n, lot.id);
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">

        {/* ── Existing product: read-only identity card ── */}
        {lookup.state === "found_product" && (
          <div className="mb-4 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {lookup.imageUrl ? (
              <img
                src={lookup.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                <Package size={22} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 leading-snug">{lookup.name}</p>
              {lookup.brandName && (
                <div className="mt-0.5 flex items-center gap-1.5">
                  {lookup.brandImageUrl && (
                    <img src={lookup.brandImageUrl} alt="" className="h-4 w-4 rounded object-contain" />
                  )}
                  <p className="text-sm text-slate-500">{lookup.brandName}</p>
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {lookup.ean && <span>EAN: <span className="font-mono text-slate-700">{lookup.ean}</span></span>}
                {lookup.sku && <span>SKU: <span className="font-mono text-slate-700">{lookup.sku}</span></span>}
              </div>
              {lookup.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{lookup.description}</p>
              )}
            </div>
          </div>
        )}

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

        {/* ── New product: identity fields ── */}
        {lookup.state === "new" && (
          <ManualProductEntryIdentityFields
            manualEan={manualEan}
            onManualEanChange={setManualEan}
            manualName={manualName}
            onManualNameChange={setManualName}
            brandBoxRef={brandBoxRef}
            brandSearch={brandSearch}
            onBrandSearchChange={(v) => { setBrandSearch(v); setBrandDropdownOpen(true); }}
            onPickBrand={(name) => { setBrandSearch(name); setBrandDropdownOpen(false); }}
            onBrandFocusOpen={() => setBrandDropdownOpen(true)}
            brandDropdownOpen={brandDropdownOpen}
            selectedBrandImageUrl={selectedBrandImageUrl}
            exactBrandMatch={exactBrandMatch}
            catalogPrefill={catalogPrefill}
            filteredBrandOptions={filteredBrandOptions}
            brandLoading={brandLoading}
            canCreateBrand={canCreateBrand}
            normalizedBrandSearch={normalizedBrandSearch}
            onUseTypedBrand={() => { if (normalizedBrandSearch) setBrandDropdownOpen(false); }}
            manualSku={manualSku}
            onManualSkuChange={setManualSku}
            manualImageInputRef={manualImageInputRef}
            onManualImageFile={setManualImageFile}
            manualImageFile={manualImageFile}
            manualImagePreviewUrl={manualImagePreviewUrl}
            catalogImageUrl={catalogImageUrl}
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
    </div>
  );
}
