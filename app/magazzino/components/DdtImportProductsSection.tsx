"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";

type BrandOption = {
  id: string;
  name: string;
  image_url: string | null;
};

const BRAND_DROPDOWN_LIMIT = 8;

type DdtImportLotRow = {
  id: string;
  quantity: string;
  lotCode: string;
  price: string;
  expiryDate: string;
};

export type DdtImportProductRow = {
  id: string;
  ean: string;
  name: string;
  brand: string;
  brandImageUrl: string | null;
  sku: string;
  description: string;
  showDescription: boolean;
  expanded: boolean;
  lots: DdtImportLotRow[];
};

const createLot = (suffix = "1"): DdtImportLotRow => ({
  id: `lot-${Date.now()}-${suffix}`,
  quantity: "1",
  lotCode: "",
  price: "",
  expiryDate: "",
});

const createProduct = (suffix = "1"): DdtImportProductRow => ({
  id: `product-${Date.now()}-${suffix}`,
  ean: "",
  name: "",
  brand: "",
  brandImageUrl: null,
  sku: "",
  description: "",
  showDescription: false,
  expanded: false,
  lots: [createLot("1")],
});

type DdtImportProductsSectionProps = {
  onProductsChange?: (products: DdtImportProductRow[]) => void;
};

export function DdtImportProductsSection({ onProductsChange }: DdtImportProductsSectionProps) {
  const [products, setProducts] = useState<DdtImportProductRow[]>([createProduct("1")]);
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandDropdownProductId, setBrandDropdownProductId] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [debouncedBrandSearchTerm, setDebouncedBrandSearchTerm] = useState("");
  const brandBoxRef = useRef<HTMLDivElement | null>(null);

  const canRemoveProduct = useMemo(() => products.length > 1, [products.length]);
  const activeBrandProduct = useMemo(
    () => products.find((p) => p.id === brandDropdownProductId) ?? null,
    [products, brandDropdownProductId],
  );
  const normalizedBrandSearch = (activeBrandProduct?.brand ?? "").trim();
  const exactBrandMatch = useMemo(
    () => brandOptions.find((b) => b.name.trim().toLowerCase() === normalizedBrandSearch.toLowerCase()) ?? null,
    [brandOptions, normalizedBrandSearch],
  );
  const filteredBrandOptions = useMemo(() => brandOptions.slice(0, BRAND_DROPDOWN_LIMIT), [brandOptions]);
  const canCreateBrand = Boolean(normalizedBrandSearch) && !exactBrandMatch;
  const selectedBrandImageUrl = exactBrandMatch?.image_url ?? null;
  const totals = useMemo(() => {
    const totalProducts = products.length;
    let totalQuantity = 0;
    let totalRegisteredPrice = 0;
    for (const product of products) {
      for (const lot of product.lots) {
        const qty = Number(lot.quantity);
        const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0;
        totalQuantity += safeQty;
        const normalizedPrice = lot.price.trim().replace(",", ".");
        const unitPrice = Number(normalizedPrice);
        if (Number.isFinite(unitPrice) && unitPrice > 0) {
          totalRegisteredPrice += unitPrice * safeQty;
        }
      }
    }
    return { totalProducts, totalQuantity, totalRegisteredPrice };
  }, [products]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedBrandSearchTerm(brandSearchTerm.trim());
    }, 250);
    return () => window.clearTimeout(t);
  }, [brandSearchTerm]);

  useEffect(() => {
    if (!brandDropdownProductId) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!brandBoxRef.current) return;
      if (!brandBoxRef.current.contains(event.target as Node)) {
        setBrandDropdownProductId(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [brandDropdownProductId]);

  useEffect(() => {
    if (!brandDropdownProductId) return;
    void fetchBrandOptions(debouncedBrandSearchTerm);
  }, [brandDropdownProductId, debouncedBrandSearchTerm]);

  const fetchBrandOptions = async (searchValue: string) => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setBrandError("Configurazione Supabase mancante.");
      return;
    }
    setBrandLoading(true);
    setBrandError(null);
    let options: BrandOption[] = [];
    if (searchValue) {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,image_url")
        .ilike("name", `%${searchValue}%`)
        .order("name", { ascending: true })
        .limit(BRAND_DROPDOWN_LIMIT);
      if (error) {
        setBrandError(error.message);
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
        setBrandError(countError.message);
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
          setBrandError(error.message);
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

  const handleUseTypedBrand = () => {
    if (!brandDropdownProductId || !normalizedBrandSearch) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === brandDropdownProductId ? { ...p, brand: normalizedBrandSearch, brandImageUrl: null } : p,
      ),
    );
    setBrandDropdownProductId(null);
  };

  useEffect(() => {
    onProductsChange?.(products);
  }, [products, onProductsChange]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
          <span>Prodotti</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
          <span className="text-xs font-medium text-slate-600">{`Totale prodotti: ${totals.totalProducts}`}</span>
          <span className="text-xs font-medium text-slate-600">{`Totale quantita: ${totals.totalQuantity}`}</span>
          <span className="text-xs font-medium text-slate-600">
            {`Totale prezzo registrato: ${totals.totalRegisteredPrice.toLocaleString("it-IT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €`}
          </span>
        </h3>
      </div>

      <div className="space-y-2">
        {products.map((product, productIdx) => (
          <div key={product.id} className="rounded-none border-l border-slate-200 bg-white pl-3 pr-0 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setProducts((prev) =>
                    prev.map((p) => (p.id === product.id ? { ...p, expanded: !p.expanded } : p)),
                  )
                }
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label={product.expanded ? "Collassa prodotto" : "Espandi prodotto"}
                title={product.expanded ? "Collassa" : "Espandi"}
              >
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={`transition-transform duration-200 ${product.expanded ? "rotate-180" : "rotate-0"}`}
                />
              </button>
              <div className="min-w-0 flex-1 max-w-3xl">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">EAN · UDI · HIBC</label>
                    <input
                      type="text"
                      value={product.ean}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) => (p.id === product.id ? { ...p, ean: e.target.value } : p)),
                        )
                      }
                      placeholder="Inserisci codice"
                      className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Nome prodotto *</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) => (p.id === product.id ? { ...p, name: e.target.value } : p)),
                        )
                      }
                      placeholder="3-Drill for Osseospeed EV-GS 9-11 WD"
                      className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setProducts((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== product.id) : prev))
                }
                disabled={!canRemoveProduct}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                title="Rimuovi prodotto"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                product.expanded ? "max-h-[600px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
              }`}
            >
              <div className="pt-3">
                <div className="relative z-30 mt-3 flex flex-wrap items-end gap-2">
                    <div
                      ref={brandDropdownProductId === product.id ? brandBoxRef : null}
                      className="relative z-40 w-fit min-w-[200px]"
                    >
                      <label className="mb-1 block text-xs font-medium text-slate-700">Brand</label>
                      {product.brandImageUrl || selectedBrandImageUrl ? (
                        <img
                          src={(product.brandImageUrl ?? selectedBrandImageUrl) as string}
                          alt={product.brand || exactBrandMatch?.name || "Brand selezionato"}
                          className="pointer-events-none absolute left-2.5 top-[calc(50%+12px)] h-5 w-5 -translate-y-1/2 rounded-sm border border-slate-200 object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <input
                        type="text"
                        value={product.brand}
                        onChange={(e) =>
                          setProducts((prev) =>
                            prev.map((p) =>
                              p.id === product.id
                                ? {
                                    ...p,
                                    brand: e.target.value,
                                    brandImageUrl:
                                      p.brandImageUrl &&
                                      p.brand.trim().toLowerCase() !== e.target.value.trim().toLowerCase()
                                        ? null
                                        : p.brandImageUrl,
                                  }
                                : p,
                            ),
                          )
                        }
                        onFocus={() => {
                          setBrandDropdownProductId(product.id);
                          setBrandSearchTerm(product.brand);
                        }}
                        onClick={() => {
                          setBrandDropdownProductId(product.id);
                          setBrandSearchTerm(product.brand);
                        }}
                        onInput={(e) => {
                          if (brandDropdownProductId !== product.id) {
                            setBrandDropdownProductId(product.id);
                          }
                          setBrandSearchTerm((e.target as HTMLInputElement).value);
                        }}
                        placeholder="Cerca o aggiungi brand"
                        className={`h-9 w-fit rounded-md border border-slate-200 px-3 text-sm text-slate-600 ${
                          product.brandImageUrl || selectedBrandImageUrl ? "pl-9" : ""
                        }`}
                      />
                      {brandDropdownProductId === product.id ? (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                          <div className="max-h-44 overflow-y-auto py-1">
                            {filteredBrandOptions.map((brand) => (
                              <button
                                key={brand.id}
                                type="button"
                                onClick={() => {
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === product.id
                                        ? { ...p, brand: brand.name, brandImageUrl: brand.image_url ?? null }
                                        : p,
                                    ),
                                  );
                                  setBrandDropdownProductId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                              >
                                {brand.image_url ? (
                                  <img
                                    src={brand.image_url}
                                    alt={brand.name}
                                    className="h-5 w-5 shrink-0 rounded-sm border border-slate-200 object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                                <span className="truncate">{brand.name}</span>
                              </button>
                            ))}
                            {brandLoading ? <div className="px-3 py-2 text-xs text-slate-500">Ricerca brand...</div> : null}
                            {filteredBrandOptions.length === 0 && !canCreateBrand && !brandLoading ? (
                              <div className="px-3 py-2 text-xs text-slate-500">Nessun brand trovato.</div>
                            ) : null}
                            {brandError ? <div className="px-3 py-2 text-xs text-rose-600">{brandError}</div> : null}
                          </div>
                          {canCreateBrand ? (
                            <div className="border-t border-slate-100 p-1.5">
                              <button
                                type="button"
                                onClick={handleUseTypedBrand}
                                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-normal text-slate-700 hover:bg-slate-100"
                              >
                                {`Usa "${normalizedBrandSearch}"`}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="w-fit min-w-[220px]">
                      <label className="mb-1 block text-xs font-medium text-slate-700">SKU</label>
                      <input
                        type="text"
                        value={product.sku}
                        onChange={(e) =>
                          setProducts((prev) =>
                            prev.map((p) => (p.id === product.id ? { ...p, sku: e.target.value } : p)),
                          )
                        }
                        placeholder="Inserisci SKU"
                        className="h-9 w-fit rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                      />
                    </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setProducts((prev) =>
                        prev.map((p) => (p.id === product.id ? { ...p, showDescription: !p.showDescription } : p)),
                      )
                    }
                    className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
                  >
                    {product.showDescription ? "Nascondi descrizione" : "Aggiungi descrizione"}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      product.showDescription ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <textarea
                      value={product.description}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) => (p.id === product.id ? { ...p, description: e.target.value } : p)),
                        )
                      }
                      rows={3}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                      placeholder="Aggiungi una descrizione del prodotto..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {product.lots.map((lot) => (
                <div key={lot.id} className="flex flex-wrap items-end gap-2">
                  <div className="w-28 min-w-28">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Quantita</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={lot.quantity}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) =>
                            p.id === product.id
                              ? {
                                  ...p,
                                  lots: p.lots.map((x) => (x.id === lot.id ? { ...x, quantity: e.target.value } : x)),
                                }
                              : p,
                          ),
                        )
                      }
                      className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600 tabular-nums"
                    />
                  </div>
                  <div className="w-36 min-w-36">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Codice lotto</label>
                    <input
                      type="text"
                      value={lot.lotCode}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) =>
                            p.id === product.id
                              ? {
                                  ...p,
                                  lots: p.lots.map((x) => (x.id === lot.id ? { ...x, lotCode: e.target.value } : x)),
                                }
                              : p,
                          ),
                        )
                      }
                      placeholder="Inserisci codice lotto"
                      className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                    />
                  </div>
                  <div className="w-28 min-w-28">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Prezzo (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={lot.price}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) =>
                            p.id === product.id
                              ? { ...p, lots: p.lots.map((x) => (x.id === lot.id ? { ...x, price: e.target.value } : x)) }
                              : p,
                          ),
                        )
                      }
                      placeholder="0,00"
                      className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600 tabular-nums"
                      autoComplete="off"
                    />
                  </div>
                  <div className="w-44 min-w-44">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Data scadenza</label>
                    <input
                      type="date"
                      value={lot.expiryDate}
                      onChange={(e) =>
                        setProducts((prev) =>
                          prev.map((p) =>
                            p.id === product.id
                              ? {
                                  ...p,
                                  lots: p.lots.map((x) => (x.id === lot.id ? { ...x, expiryDate: e.target.value } : x)),
                                }
                              : p,
                          ),
                        )
                      }
                      className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setProducts((prev) =>
                        prev.map((p) =>
                          p.id === product.id
                            ? {
                                ...p,
                                lots: p.lots.length > 1 ? p.lots.filter((x) => x.id !== lot.id) : p.lots,
                              }
                            : p,
                        ),
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    disabled={product.lots.length === 1}
                    title="Rimuovi riga"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === product.id
                        ? {
                            ...p,
                            lots: [...p.lots, createLot(`${productIdx + 1}-${p.lots.length + 1}`)],
                          }
                        : p,
                    ),
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                aria-label="Aggiungi riga lotto"
                title="Aggiungi riga lotto"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={() =>
            setProducts((prev) => [...prev, createProduct(`${prev.length + 1}`)])
          }
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Plus size={14} />
          aggiungi prodotto
        </button>
      </div>
    </section>
  );
}
