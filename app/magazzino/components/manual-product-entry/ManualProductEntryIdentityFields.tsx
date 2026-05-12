"use client";

import { Barcode, ImagePlus } from "lucide-react";
import type { RefObject } from "react";
import type { BrandOption, ManualProductCatalogPrefill } from "./types";

type ManualProductEntryIdentityFieldsProps = {
  manualEan: string;
  onManualEanChange: (v: string) => void;
  onOpenEanScanner: () => void;
  manualName: string;
  onManualNameChange: (v: string) => void;
  brandBoxRef: RefObject<HTMLDivElement | null>;
  brandSearch: string;
  onBrandSearchChange: (v: string) => void;
  onPickBrand: (name: string) => void;
  onBrandFocusOpen: () => void;
  brandDropdownOpen: boolean;
  selectedBrandImageUrl: string | null;
  exactBrandMatch: BrandOption | null;
  catalogPrefill: ManualProductCatalogPrefill | null;
  filteredBrandOptions: BrandOption[];
  brandLoading: boolean;
  canCreateBrand: boolean;
  normalizedBrandSearch: string;
  onUseTypedBrand: () => void;
  manualSku: string;
  onManualSkuChange: (v: string) => void;
  manualImageInputRef: RefObject<HTMLInputElement | null>;
  onManualImageFile: (file: File | null) => void;
  manualImageFile: File | null;
  manualImagePreviewUrl: string | null;
  catalogImageUrl: string | null;
};

export function ManualProductEntryIdentityFields({
  manualEan,
  onManualEanChange,
  onOpenEanScanner,
  manualName,
  onManualNameChange,
  brandBoxRef,
  brandSearch,
  onBrandSearchChange,
  onPickBrand,
  onBrandFocusOpen,
  brandDropdownOpen,
  selectedBrandImageUrl,
  exactBrandMatch,
  catalogPrefill,
  filteredBrandOptions,
  brandLoading,
  canCreateBrand,
  normalizedBrandSearch,
  onUseTypedBrand,
  manualSku,
  onManualSkuChange,
  manualImageInputRef,
  onManualImageFile,
  manualImageFile,
  manualImagePreviewUrl,
  catalogImageUrl,
}: ManualProductEntryIdentityFieldsProps) {
  return (
    <div className="mb-6 grid max-w-3xl gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">EAN · UDI · HIBC</label>
            <div className="relative">
              <input
                type="text"
                value={manualEan}
                onChange={(e) => onManualEanChange(e.target.value)}
                placeholder="Inserisci codice"
                className="h-9 w-full rounded-md border border-slate-200 px-3 pr-10 text-sm text-slate-600"
              />
              <button
                type="button"
                onClick={onOpenEanScanner}
                className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title="Scannerizza codice a barre"
                aria-label="Scannerizza codice a barre"
              >
                <Barcode size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome prodotto *</label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => onManualNameChange(e.target.value)}
              placeholder="3-Drill for Osseospeed EV-GS 9-11 WD"
              className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
            />
          </div>
        </div>
      </div>
      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-fit min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-slate-700">Brand</label>
            <div ref={brandBoxRef} className="relative">
              {selectedBrandImageUrl ? (
                <img
                  src={selectedBrandImageUrl}
                  alt={exactBrandMatch?.name ?? catalogPrefill?.brand ?? "Brand selezionato"}
                  className="pointer-events-none absolute left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-sm border border-slate-200 object-cover"
                  loading="eager"
                />
              ) : null}
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => {
                  onBrandSearchChange(e.target.value);
                }}
                onFocus={onBrandFocusOpen}
                placeholder="Cerca o aggiungi brand"
                className={`h-9 w-fit rounded-md border border-slate-200 px-3 text-sm text-slate-600 ${
                  selectedBrandImageUrl ? "pl-9" : ""
                }`}
              />
              {brandDropdownOpen ? (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-44 overflow-y-auto py-1">
                    {filteredBrandOptions.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => {
                          onPickBrand(brand.name);
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
                    {brandLoading ? (
                      <div className="px-3 py-2 text-xs text-slate-500">Ricerca brand...</div>
                    ) : null}
                    {filteredBrandOptions.length === 0 && !canCreateBrand && !brandLoading ? (
                      <div className="px-3 py-2 text-xs text-slate-500">Nessun brand trovato.</div>
                    ) : null}
                  </div>
                  {canCreateBrand ? (
                    <div className="border-t border-slate-100 p-1.5">
                      <button
                        type="button"
                        onClick={onUseTypedBrand}
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-normal text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {`Usa "${normalizedBrandSearch}"`}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">SKU</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualSku}
                onChange={(e) => onManualSkuChange(e.target.value)}
                placeholder="Inserisci SKU"
                className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm text-slate-600"
              />
              <input
                ref={manualImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => onManualImageFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => manualImageInputRef.current?.click()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                title="Aggiungi immagine"
              >
                <ImagePlus size={16} />
              </button>
            </div>
          </div>
        </div>
        {manualImageFile ? (
          <div className="mt-2">
            <p className="text-xs text-slate-500">{manualImageFile.name}</p>
            {manualImagePreviewUrl ? (
              <div className="mt-1">
                <img
                  src={manualImagePreviewUrl}
                  alt="Anteprima immagine prodotto"
                  className="h-14 w-14 rounded-md border border-slate-200 object-cover"
                />
              </div>
            ) : null}
          </div>
        ) : catalogImageUrl ? (
          <div className="mt-2">
            <p className="text-xs text-slate-500">Immagine da catalogo</p>
            <div className="mt-1">
              <img
                src={catalogImageUrl}
                alt=""
                className="h-14 w-14 rounded-md border border-slate-200 object-cover"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
