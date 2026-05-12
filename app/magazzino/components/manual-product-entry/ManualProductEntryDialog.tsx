"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { useProductIdentityAutosave } from "@/app/magazzino/hooks/useProductIdentityAutosave";
import { buildScaricoNotes, DEFAULT_SCARICO_REASON_ID } from "@/app/magazzino/lib/scaricoNotes";
import { finalizeInventoryLocationForApi } from "@/lib/inventoryLocation";
import { BRAND_DROPDOWN_LIMIT, intentToHeaderMode } from "./constants";
import { inventoryUnitPriceFromDb, inventoryVatFromDb, parseLotPriceUi, parseLotVatUi } from "./format";
import { ManualProductEntryHeader } from "./ManualProductEntryHeader";
import { ManualProductEntryIdentityFields } from "./ManualProductEntryIdentityFields";
import { ManualProductLotsSection } from "./ManualProductLotsSection";
import { ProductHeroImageColumn } from "./ProductHeroImageColumn";
import type {
  BrandOption,
  ExistingInventoryLot,
  ManualLotRow,
  ManualProductEntryDialogProps,
  ManualProductEntryHeaderMode,
} from "./types";

export type {
  ManualProductCatalogPrefill,
  ManualProductEntryHeaderMode,
  ManualProductEntryTitleIntent,
} from "./types";

export function ManualProductEntryDialog({
  open,
  clinicId,
  existingNames,
  catalogPrefill,
  titleIntent,
  onTitleModeChange,
  onClose,
  onCreated,
}: ManualProductEntryDialogProps) {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState("");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [manualSku, setManualSku] = useState("");
  const [manualEan, setManualEan] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualLots, setManualLots] = useState<ManualLotRow[]>([
    { id: "lot-1", quantity: "1", lotCode: "", price: "", vat: "", expiryDate: "", location: "" },
  ]);
  const [manualCreatedProductId, setManualCreatedProductId] = useState<string | null>(null);
  const [uploadedManualImageUrl, setUploadedManualImageUrl] = useState<string | null>(null);
  const [processingManualLotId, setProcessingManualLotId] = useState<string | null>(null);
  const [confirmedManualLotId, setConfirmedManualLotId] = useState<string | null>(null);
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImagePreviewUrl, setManualImagePreviewUrl] = useState<string | null>(null);
  const manualImageInputRef = useRef<HTMLInputElement | null>(null);
  const brandBoxRef = useRef<HTMLDivElement | null>(null);
  const modeDropdownRef = useRef<HTMLDivElement | null>(null);
  const defaultLots = useMemo(() => [{ id: "lot-1", quantity: "1", lotCode: "", price: "", vat: "", expiryDate: "", location: "" }], []);
  const prevOpenForAutosaveHydrationRef = useRef(false);

  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const [catalogImageUrl, setCatalogImageUrl] = useState<string | null>(null);
  const [headerMode, setHeaderMode] = useState<ManualProductEntryHeaderMode>("carico");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [existingInventoryLots, setExistingInventoryLots] = useState<ExistingInventoryLot[]>([]);
  const [autosaveHydrationKey, setAutosaveHydrationKey] = useState(0);

  const existingNameSet = useMemo(() => new Set(existingNames.map((x) => x.trim().toLowerCase())), [existingNames]);

  const headerProductName = useMemo(() => {
    const typed = manualName.trim();
    if (typed) return typed;
    if (titleIntent?.type === "stock" || titleIntent?.type === "addFromMasterCatalog") return titleIntent.productName;
    return "";
  }, [manualName, titleIntent]);

  useEffect(() => {
    if (open) {
      setOverlayMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setOverlayVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setOverlayVisible(false);
    const t = window.setTimeout(() => setOverlayMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setSubmitError(null);
    setManualDescription("");
    const m = intentToHeaderMode(titleIntent);
    if (m === "scarico" || m === "inventario") {
      setManualLots([]);
    } else {
      setManualLots(defaultLots);
    }
    setManualImageFile(null);
    setManualImagePreviewUrl(null);
    setManualCreatedProductId(null);
    setUploadedManualImageUrl(null);
    setProcessingManualLotId(null);
    setConfirmedManualLotId(null);

    const p = catalogPrefill;
    if (p) {
      setManualName(p.name);
      setBrandSearch(p.brand ?? "");
      setDebouncedBrandSearch((p.brand ?? "").trim());
      setBrandDropdownOpen(false);
      setManualSku(p.sku ?? "");
      setManualEan(p.ean ?? "");
      setCatalogImageUrl(p.imageUrl);
    } else {
      setManualName("");
      setBrandSearch("");
      setDebouncedBrandSearch("");
      setBrandDropdownOpen(false);
      setManualSku("");
      setManualEan("");
      setCatalogImageUrl(null);
    }
  }, [open, catalogPrefill, defaultLots, titleIntent]);

  useEffect(() => {
    if (open && !prevOpenForAutosaveHydrationRef.current) {
      setAutosaveHydrationKey((k) => k + 1);
    }
    prevOpenForAutosaveHydrationRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHeaderMode(intentToHeaderMode(titleIntent));
    setModeDropdownOpen(false);
  }, [open, titleIntent]);

  useEffect(() => {
    if (headerMode !== "scarico" && headerMode !== "inventario") return;
    setManualLots((prev) => {
      const first = prev[0];
      if (!first) {
        return [{ id: "lot-1", quantity: headerMode === "scarico" ? "1" : "", lotCode: "", price: "", vat: "", expiryDate: "", location: "" }];
      }
      return [
        {
          ...first,
          price: "",
          vat: "",
          expiryDate: "",
          quantity: headerMode === "scarico" ? (first.quantity.trim() || "1") : first.quantity,
          location: first.location ?? "",
        },
      ];
    });
  }, [headerMode]);

  const refreshExistingInventoryLots = useCallback(
    async (opts?: { clearQuantityForInventoryId?: string | null; productId?: string | null }) => {
      const existingProductIdVal =
        (opts?.productId != null && String(opts.productId).trim()) ||
        manualCreatedProductId?.trim() ||
        catalogPrefill?.existingProductId?.trim() ||
        null;
      if (!open || !clinicId || !existingProductIdVal) {
        setExistingInventoryLots([]);
        return;
      }
      const syncRowsToInventory =
        headerMode === "scarico" || headerMode === "inventario";
      /** Carico e nuovo articolo mostrano «Giacenza attuale»; senza questo il modo «nuovo» svuotava sempre i lotti. */
      if (!syncRowsToInventory && headerMode !== "carico" && headerMode !== "nuovo") {
        setExistingInventoryLots([]);
        return;
      }
      const supabase = getSupabaseAuthClient();
      if (!supabase) return;
      const productIdForRefresh = existingProductIdVal;
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id,quantity,expiry_date,batch_number,price,location,VAT")
        .eq("clinic_id", clinicId)
        .eq("product_id", productIdForRefresh)
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
        setManualLots((prev) =>
          lots.map((x) => {
            const prevRow = prev.find((p) => p.id === x.inventoryItemId);
            const clear =
              opts?.clearQuantityForInventoryId != null &&
              opts.clearQuantityForInventoryId === x.inventoryItemId;
            return {
              id: x.inventoryItemId,
              quantity: clear ? "" : (prevRow?.quantity ?? ""),
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
    [open, clinicId, catalogPrefill?.existingProductId, manualCreatedProductId, headerMode],
  );

  useEffect(() => {
    const effectiveProductId = (manualCreatedProductId || catalogPrefill?.existingProductId || "").trim();
    if (!open || !clinicId || !effectiveProductId) {
      setExistingInventoryLots([]);
      return;
    }
    void refreshExistingInventoryLots({ productId: effectiveProductId });
  }, [open, clinicId, catalogPrefill?.existingProductId, manualCreatedProductId, headerMode, refreshExistingInventoryLots]);

  useEffect(() => {
    if (headerMode !== "carico") return;
    setManualLots(defaultLots);
  }, [headerMode, defaultLots]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setDebouncedBrandSearch(brandSearch.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [brandSearch, open]);

  const fetchBrandOptions = async (searchValue: string) => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return;
    }
    setBrandLoading(true);
    setSubmitError(null);
    let options: BrandOption[] = [];
    if (searchValue) {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,image_url")
        .ilike("name", `%${searchValue}%`)
        .order("name", { ascending: true })
        .limit(BRAND_DROPDOWN_LIMIT);
      if (error) {
        setSubmitError(error.message);
      } else {
        options = (data ?? [])
          .filter((item): item is { id: string; name: string; image_url: string | null } => Boolean(item?.id && item?.name))
          .map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null }));
      }
    } else {
      const { count, error: countError } = await supabase
        .from("brands")
        .select("id", { count: "exact", head: true });
      if (countError) {
        setSubmitError(countError.message);
      } else {
        const safeCount = count ?? 0;
        const maxOffset = Math.max(0, safeCount - BRAND_DROPDOWN_LIMIT);
        const randomOffset = maxOffset > 0 ? Math.floor(Math.random() * (maxOffset + 1)) : 0;
        const { data, error } = await supabase
          .from("brands")
          .select("id,name,image_url")
          .order("name", { ascending: true })
          .range(randomOffset, randomOffset + BRAND_DROPDOWN_LIMIT - 1);
        if (error) {
          setSubmitError(error.message);
        } else {
          options = (data ?? [])
            .filter((item): item is { id: string; name: string; image_url: string | null } => Boolean(item?.id && item?.name))
            .map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null }));
        }
      }
    }
    setBrandOptions(options);
    setBrandLoading(false);
  };

  useEffect(() => {
    if (!open || !brandDropdownOpen) return;
    void fetchBrandOptions(debouncedBrandSearch);
  }, [open, brandDropdownOpen, debouncedBrandSearch]);

  useEffect(() => {
    if (!brandDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!brandBoxRef.current) return;
      if (!brandBoxRef.current.contains(event.target as Node)) {
        setBrandDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [brandDropdownOpen]);

  useEffect(() => {
    if (!modeDropdownOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!modeDropdownRef.current) return;
      if (!modeDropdownRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [modeDropdownOpen]);

  useEffect(() => {
    if (!manualImageFile) {
      setManualImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(manualImageFile);
    setManualImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [manualImageFile]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modeDropdownOpen) {
          setModeDropdownOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, modeDropdownOpen]);

  const normalizedBrandSearch = brandSearch.trim();
  const exactBrandMatch = useMemo(
    () => brandOptions.find((b) => b.name.trim().toLowerCase() === normalizedBrandSearch.toLowerCase()) ?? null,
    [brandOptions, normalizedBrandSearch],
  );
  const filteredBrandOptions = useMemo(() => brandOptions.slice(0, BRAND_DROPDOWN_LIMIT), [brandOptions]);
  const canCreateBrand = Boolean(normalizedBrandSearch) && !exactBrandMatch;
  const selectedBrandImageUrl = useMemo(() => {
    if (exactBrandMatch?.image_url) return exactBrandMatch.image_url;
    const pre = catalogPrefill;
    const preBrand = pre?.brand?.trim().toLowerCase();
    if (
      pre &&
      preBrand &&
      preBrand === normalizedBrandSearch.toLowerCase() &&
      pre.brandImageUrl
    ) {
      return pre.brandImageUrl;
    }
    return null;
  }, [exactBrandMatch, catalogPrefill, normalizedBrandSearch]);

  const productHeroImageUrl = useMemo(() => {
    if (!open) return null;
    if (manualImagePreviewUrl) return manualImagePreviewUrl;
    const up = uploadedManualImageUrl?.trim();
    if (up) return up;
    const cat = catalogImageUrl?.trim();
    if (cat) return cat;
    const preImg = catalogPrefill?.imageUrl?.trim();
    if (preImg) return preImg;
    return null;
  }, [open, manualImagePreviewUrl, uploadedManualImageUrl, catalogImageUrl, catalogPrefill?.imageUrl]);

  const autosaveProductId =
    manualCreatedProductId?.trim() || catalogPrefill?.existingProductId?.trim() || null;

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
    enabled: Boolean(open && clinicId?.trim() && autosaveProductId),
    clinicId,
    productId: autosaveProductId,
    hydrationKey: `${autosaveHydrationKey}|${autosaveProductId ?? ""}`,
    manualName,
    normalizedBrandSearch,
    exactBrandMatch,
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

  const isLoadMode = headerMode === "carico" || headerMode === "nuovo";
  const isScaricoInventario = headerMode === "scarico" || headerMode === "inventario";
  /** «Nuovo articolo» non è interscambiabile con le altre; le tre modalità magazzino sì. */
  const modeSwitcherLocked = headerMode === "nuovo";
  const rowConfirmActionLabel =
    headerMode === "carico"
      ? "Carica"
      : headerMode === "scarico"
        ? "Scarica"
        : headerMode === "inventario"
          ? "Modifica"
          : headerMode === "nuovo"
            ? "Aggiungi"
            : "Conferma";
  const currentStockDisplay = catalogPrefill?.currentStockQty ?? null;
  const lotsForUi = manualLots;

  const addLotsToProduct = async (
    productId: string,
    clinicIdValue: string,
    options: {
      lots: Array<{ quantity: number; expiryDate: string | null }>;
      movementType?: "manually_add" | "catalogue_add";
      movementNote?: string;
    },
  ) => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return false;
    }
    const lots = options.lots;
    for (const lot of lots) {
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory_items")
        .insert({
          clinic_id: clinicIdValue,
          product_id: productId,
          quantity: 0,
          expiry_date: lot.expiryDate,
        })
        .select("id")
        .single();
      if (inventoryError || !inventoryItem?.id) {
        setSubmitError(inventoryError?.message ?? "Creazione lotto inventario non riuscita.");
        return false;
      }
      const { error: movementError } = await supabase.from("stock_movements").insert({
        clinic_id: clinicIdValue,
        product_id: productId,
        inventory_item_id: inventoryItem.id,
        quantity: lot.quantity,
        movement_type: options.movementType ?? "manually_add",
        notes: options.movementNote ?? "Carico iniziale da creazione articolo",
      });
      if (movementError) {
        setSubmitError(movementError.message);
        return false;
      }
    }
    return true;
  };

  const callCaricoApi = async (
    productId: string,
    clinicIdValue: string,
    lot: ManualLotRow,
    options?: { movementNote?: string },
  ): Promise<boolean> => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return false;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) {
      setSubmitError("Sessione non valida.");
      return false;
    }

    const parsedQuantity = Number(lot.quantity);
    const quantity = Math.max(1, parsedQuantity);
    const price = parseLotPriceUi(lot.price);
    const vat = parseLotVatUi(lot.vat);
    const locationMemo = finalizeInventoryLocationForApi(lot.location);

    const response = await fetch("/api/magazzino/actions/carico", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        clinicId: clinicIdValue,
        products: [
          {
            productId,
            ...(options?.movementNote ? { movementNote: options.movementNote } : {}),
            lots: [
              {
                quantity,
                expiryDate: lot.expiryDate || null,
                lotCode: lot.lotCode || null,
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
    if (!response.ok) {
      setSubmitError(payload?.error ?? "Carico non riuscito.");
      return false;
    }
    return true;
  };

  const callScaricoApi = async (
    productId: string,
    clinicIdValue: string,
    quantity: number,
    inventoryItemId: string,
    movementNote = "Scarico merce (lotto singolo)",
  ): Promise<boolean> => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return false;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) {
      setSubmitError("Sessione non valida.");
      return false;
    }

    const response = await fetch("/api/magazzino/actions/scarico", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        clinicId: clinicIdValue,
        products: [
          {
            productId,
            inventoryItemId,
            quantity,
            movementType: "unload",
            movementNote,
          },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSubmitError(payload?.error ?? "Scarico non riuscito.");
      return false;
    }
    return true;
  };

  const callInventarioApi = async (
    productId: string,
    clinicIdValue: string,
    targetQuantity: number,
    inventoryItemId: string,
    locationMemo: string,
    movementNote = "Rettifica inventario (lotto singolo)",
  ): Promise<boolean> => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return false;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) {
      setSubmitError("Sessione non valida.");
      return false;
    }

    const response = await fetch("/api/magazzino/actions/inventario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        clinicId: clinicIdValue,
        products: [
          {
            productId,
            inventoryItemId,
            targetQuantity,
            movementNote,
            location: locationMemo,
          },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSubmitError(payload?.error ?? "Rettifica inventario non riuscita.");
      return false;
    }
    return true;
  };

  const callNuovoArticoloApi = async (
    clinicIdValue: string,
    lot: ManualLotRow,
    options?: { movementNote?: string },
  ): Promise<string | null> => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return null;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) {
      setSubmitError("Sessione non valida.");
      return null;
    }

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
    const locationMemo = finalizeInventoryLocationForApi(lot.location);
    const vatPct = parseLotVatUi(lot.vat);
    const payloadProduct = {
      productId: catalogPrefill?.existingProductId ?? undefined,
      masterCatalogueId: catalogPrefill?.masterCatalogueId ?? null,
      name: manualName.trim(),
      brand: normalizedBrandSearch || null,
      sku: manualSku.trim() || null,
      ean: manualEan.trim() || null,
      description: manualDescription.trim() || null,
      imageUrl,
      minStockLevel,
      ...(options?.movementNote ? { movementNote: options.movementNote } : {}),
      lots: [
        {
          quantity,
          expiryDate: lot.expiryDate || null,
          lotCode: lot.lotCode || null,
          price: parseLotPriceUi(lot.price),
          ...(vatPct != null ? { vat: vatPct } : {}),
          ...(locationMemo ? { location: locationMemo } : {}),
        },
      ],
    };

    const response = await fetch("/api/magazzino/actions/nuovo-articolo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        clinicId: clinicIdValue,
        products: [payloadProduct],
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; resolvedProducts?: Array<{ productId?: string }> }
      | null;
    if (!response.ok) {
      setSubmitError(payload?.error ?? "Creazione articolo non riuscita.");
      return null;
    }
    const newId = payload?.resolvedProducts?.[0]?.productId?.trim();
    if (newId) return newId;
    setSubmitError("Risposta API senza ID prodotto.");
    return null;
  };

  const getTotalInventoryQuantity = async (productId: string, clinicIdValue: string): Promise<number | null> => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return null;
    }
    const { data, error } = await supabase
      .from("inventory_items")
      .select("quantity")
      .eq("clinic_id", clinicIdValue)
      .eq("product_id", productId);
    if (error) {
      setSubmitError(error.message);
      return null;
    }
    return (data ?? []).reduce((s, r) => s + Number((r as { quantity: number }).quantity ?? 0), 0);
  };

  const uploadManualImage = async (): Promise<string | null> => {
    if (!manualImageFile) return null;
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return null;
    }
    const ext = manualImageFile.name.includes(".") ? manualImageFile.name.split(".").pop() : "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `manual-products/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, manualImageFile, {
      upsert: false,
    });
    if (uploadError) {
      setSubmitError(uploadError.message);
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl ?? null;
  };

  const ensureManualProduct = async () => {
    if (!clinicId) {
      setSubmitError("Clinic non trovata per il profilo utente.");
      return null;
    }
    if (manualCreatedProductId) return manualCreatedProductId;
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setSubmitError("Configurazione Supabase mancante.");
      return null;
    }

    const existingPid = catalogPrefill?.existingProductId?.trim();
    if (existingPid) {
      setManualCreatedProductId(existingPid);
      return existingPid;
    }

    const masterId = catalogPrefill?.masterCatalogueId;
    if (masterId) {
      const { data: existingRow, error: existingErr } = await supabase
        .from("products")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("master_catalogue_id", masterId)
        .maybeSingle();
      if (existingErr) {
        setSubmitError(existingErr.message);
        return null;
      }
      if (existingRow?.id) {
        setManualCreatedProductId(existingRow.id);
        await onCreated();
        return existingRow.id;
      }
    }

    const name = manualName.trim();
    if (!name) {
      setSubmitError("Il nome prodotto e obbligatorio.");
      return null;
    }
    if (existingNameSet.has(name.toLowerCase())) {
      setSubmitError("Prodotto gia presente nel tuo magazzino.");
      return null;
    }
    const manualBrandName = normalizedBrandSearch || null;
    const manualSkuValue = manualSku.trim() || null;
    const manualEanValue = manualEan.trim() || null;
    const metadata =
      manualBrandName || manualSkuValue || manualEanValue
        ? {
            ...(manualBrandName ? { brand: manualBrandName } : {}),
            ...(manualSkuValue ? { sku: manualSkuValue } : {}),
            ...(manualEanValue ? { ean: manualEanValue } : {}),
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

    const minStockRaw =
      catalogPrefill?.defaultMinStock != null ? Number(catalogPrefill.defaultMinStock) : 0;
    const min_stock_level = Number.isFinite(minStockRaw) ? minStockRaw : 0;

    const categoryValue =
      normalizedBrandSearch.trim() ||
      catalogPrefill?.brand ||
      catalogPrefill?.tags?.[0] ||
      null;

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
    if (masterId) {
      insertPayload.master_catalogue_id = masterId;
    }
    const { data: createdProduct, error } = await supabase
      .from("products")
      .insert(insertPayload as never)
      .select("id")
      .single();
    setSaving(false);
    if (error || !createdProduct?.id) {
      setSubmitError(error?.message ?? "Creazione prodotto non riuscita.");
      return null;
    }
    setManualCreatedProductId(createdProduct.id);
    await onCreated();
    return createdProduct.id;
  };

  const handleConfirmManualLot = async (lot: ManualLotRow) => {
    if (!clinicId) return;
    const isLoad = headerMode === "carico" || headerMode === "nuovo";
    if (isLoad) {
      const parsedQuantity = Number(lot.quantity);
      const isLotValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
      if (!isLotValid) return;
      if (lot.vat.trim() !== "" && parseLotVatUi(lot.vat) === null) {
        setSubmitError("IVA non valida (percentuale tra 0 e 100).");
        return;
      }
    } else {
      const n = Number(lot.quantity);
      if (!Number.isFinite(n)) return;
      if (headerMode === "scarico") {
        if (n <= 0 || !Number.isInteger(n)) return;
      } else if (headerMode === "inventario") {
        if (lot.quantity.trim() === "" || n < 0 || !Number.isInteger(n)) return;
      } else return;
    }

    setProcessingManualLotId(lot.id);
    setConfirmedManualLotId(null);
    setSubmitError(null);
    const finishRowSuccess = () => {
      /** Carico e nuovo articolo: stessa UX immediata (niente timer, niente chiusura automatica). */
      if (headerMode === "carico" || headerMode === "nuovo") {
        setConfirmedManualLotId(null);
        setManualLots((prev) => {
          if (!prev.some((x) => x.id === lot.id)) return prev;
          if (prev.length === 1) {
            return [
              {
                id: `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                quantity: "1",
                lotCode: "",
                price: "",
                vat: "",
                expiryDate: "",
                location: "",
              },
            ];
          }
          return prev.filter((x) => x.id !== lot.id);
        });
        return;
      }
      setConfirmedManualLotId(lot.id);
      window.setTimeout(() => {
        let closeAfterUpdate = false;
        setManualLots((prev) => {
          if (!prev.some((x) => x.id === lot.id)) return prev;
          if (prev.length === 1) {
            closeAfterUpdate = true;
            return prev;
          }
          return prev.filter((x) => x.id !== lot.id);
        });
        setConfirmedManualLotId((prev) => (prev === lot.id ? null : prev));
        if (closeAfterUpdate) {
          onClose();
        }
      }, 3000);
    };

    if (isLoad) {
      if (headerMode !== "nuovo") {
        const productId = await ensureManualProduct();
        if (!productId) {
          setProcessingManualLotId(null);
          return;
        }
        const lotSaved = await callCaricoApi(productId, clinicId, lot);
        setProcessingManualLotId(null);
        if (!lotSaved) return;
        await refreshExistingInventoryLots({ productId });
        await onCreated();
      } else {
        const newProductId = await callNuovoArticoloApi(clinicId, lot);
        setProcessingManualLotId(null);
        if (!newProductId) return;
        setManualCreatedProductId(newProductId);
        await refreshExistingInventoryLots({ productId: newProductId });
        await onCreated();
      }
      finishRowSuccess();
      return;
    }

    const existingPid = catalogPrefill?.existingProductId?.trim();
    if (!existingPid) {
      setSubmitError("Scarico e inventario sono disponibili solo per articoli già in giacenza.");
      setProcessingManualLotId(null);
      return;
    }

    const n = Number(lot.quantity);
    const currentLotStock = existingInventoryLots.find((x) => x.inventoryItemId === lot.id)?.quantity ?? null;
    if (headerMode === "scarico") {
      if (currentLotStock == null) {
        setSubmitError("Lotto non valido.");
        setProcessingManualLotId(null);
        return;
      }
      if (n > currentLotStock) {
        setSubmitError("Quantità superiore alla giacenza del lotto selezionato.");
        setProcessingManualLotId(null);
        return;
      }
      const ok = await callScaricoApi(
        existingPid,
        clinicId,
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
      if (currentLotStock == null) {
        setSubmitError("Lotto non valido.");
        setProcessingManualLotId(null);
        return;
      }
      const ok = await callInventarioApi(existingPid, clinicId, n, lot.id, finalizeInventoryLocationForApi(lot.location));
      setProcessingManualLotId(null);
      if (!ok) return;
      await onCreated();
      await refreshExistingInventoryLots({ clearQuantityForInventoryId: lot.id });
      finishRowSuccess();
    }
  };

  const handleUseTypedBrand = () => {
    if (!normalizedBrandSearch) return;
    setBrandSearch(normalizedBrandSearch);
    setBrandDropdownOpen(false);
  };

  if (!overlayMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-130 flex items-center justify-center bg-black/40 px-3 py-4 transition-opacity duration-200 ease-out ${
        overlayVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`flex min-h-[95vh] h-[95vh] w-full min-w-[70vw] ${
          productHeroImageUrl ? "max-w-[min(96vw,1520px)]" : "max-w-[min(96vw,1400px)]"
        } flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition duration-200 ease-out will-change-transform ${
          overlayVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-product-entry-title"
      >
        <ManualProductEntryHeader
          modeDropdownRef={modeDropdownRef}
          headerMode={headerMode}
          setHeaderMode={setHeaderMode}
          modeDropdownOpen={modeDropdownOpen}
          setModeDropdownOpen={setModeDropdownOpen}
          modeSwitcherLocked={modeSwitcherLocked}
          headerProductName={headerProductName}
          onClose={onClose}
          onTitleModeChange={onTitleModeChange}
        />

        {submitError ? <div className="shrink-0 px-4 pt-3 text-sm text-rose-600 sm:px-6">{submitError}</div> : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">

          <ManualProductEntryIdentityFields
            manualEan={manualEan}
            onManualEanChange={setManualEan}
            manualName={manualName}
            onManualNameChange={setManualName}
            brandBoxRef={brandBoxRef}
            brandSearch={brandSearch}
            onBrandSearchChange={(v) => {
              setBrandSearch(v);
              setBrandDropdownOpen(true);
            }}
            onPickBrand={(name) => {
              setBrandSearch(name);
              setBrandDropdownOpen(false);
            }}
            onBrandFocusOpen={() => setBrandDropdownOpen(true)}
            brandDropdownOpen={brandDropdownOpen}
            selectedBrandImageUrl={selectedBrandImageUrl}
            exactBrandMatch={exactBrandMatch}
            catalogPrefill={catalogPrefill}
            filteredBrandOptions={filteredBrandOptions}
            brandLoading={brandLoading}
            canCreateBrand={canCreateBrand}
            normalizedBrandSearch={normalizedBrandSearch}
            onUseTypedBrand={handleUseTypedBrand}
            manualSku={manualSku}
            onManualSkuChange={setManualSku}
            manualImageInputRef={manualImageInputRef}
            onManualImageFile={setManualImageFile}
            manualImageFile={manualImageFile}
            manualImagePreviewUrl={manualImagePreviewUrl}
          />
          <ManualProductLotsSection
            density="compact"
            lots={lotsForUi}
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
                  quantity: "1",
                  lotCode: "",
                  price: "",
                  vat: "",
                  expiryDate: "",
                  location: "",
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
              className="border-t border-slate-200 bg-slate-50/75 lg:w-[min(300px,30vw)] lg:border-l lg:border-t-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
