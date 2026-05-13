"use client";

import { ImagePlus } from "lucide-react";
import type { RefObject } from "react";

type ManualProductEntryIdentityFieldsProps = {
  manualEan: string;
  onManualEanChange: (v: string) => void;
  manualName: string;
  onManualNameChange: (v: string) => void;
  manualDescription: string;
  onManualDescriptionChange: (v: string) => void;
  manualManufacturer: string;
  onManualManufacturerChange: (v: string) => void;
  manualSku: string;
  onManualSkuChange: (v: string) => void;
  manualImageInputRef: RefObject<HTMLInputElement | null>;
  onManualImageFile: (file: File | null) => void;
  manualImageFile: File | null;
  manualImagePreviewUrl: string | null;
};

export function ManualProductEntryIdentityFields({
  manualEan,
  onManualEanChange,
  manualName,
  onManualNameChange,
  manualDescription,
  onManualDescriptionChange,
  manualManufacturer,
  onManualManufacturerChange,
  manualSku,
  onManualSkuChange,
  manualImageInputRef,
  onManualImageFile,
  manualImageFile,
  manualImagePreviewUrl,
}: ManualProductEntryIdentityFieldsProps) {
  return (
    <div className="mb-6 grid max-w-3xl gap-3 sm:grid-cols-2">
      {/* Row 1: EAN + Nome */}
      <div className="sm:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">EAN · UDI · HIBC</label>
            <input
              type="text"
              value={manualEan}
              onChange={(e) => onManualEanChange(e.target.value)}
              placeholder="Inserisci codice"
              className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
            />
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

      {/* Row 2: Descrizione (full width) */}
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-700">Descrizione</label>
        <textarea
          value={manualDescription}
          onChange={(e) => onManualDescriptionChange(e.target.value)}
          placeholder="Descrizione opzionale del prodotto"
          rows={2}
          className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
        />
      </div>

      {/* Row 3: Produttore + SKU + immagine */}
      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-fit min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-slate-700">Produttore</label>
            <input
              type="text"
              value={manualManufacturer}
              onChange={(e) => onManualManufacturerChange(e.target.value)}
              placeholder="Nome produttore"
              className="h-9 w-fit rounded-md border border-slate-200 px-3 text-sm text-slate-600"
            />
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
        ) : null}
      </div>
    </div>
  );
}
