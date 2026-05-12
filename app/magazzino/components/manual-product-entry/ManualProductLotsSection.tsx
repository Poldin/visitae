"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { ExistingLotSummaryBar } from "./ExistingLotSummaryBar";
import { InventoryLocationInput } from "./InventoryLocationInput";
import { DEFAULT_SCARICO_REASON_ID, type ScaricoReasonId } from "@/app/magazzino/lib/scaricoNotes";
import { ScaricoReasonFields } from "../ScaricoReasonFields";
import {
  fmtLotPriceInput,
  fmtLotUnitPriceEur,
  lotLineGrossTotal,
  parseLotPriceUi,
  parseLotVatUi,
  sanitizePriceInput,
  unitNetFromLineGross,
} from "./format";
import type { ExistingInventoryLot, ManualLotRow, ManualProductEntryHeaderMode } from "./types";

export type ManualProductLotRowProps = {
  lot: ManualLotRow;
  lotIdx: number;
  headerMode: ManualProductEntryHeaderMode;
  existingInventoryLots: ExistingInventoryLot[];
  isLoadMode: boolean;
  isScaricoInventario: boolean;
  saving: boolean;
  processingManualLotId: string | null;
  confirmedManualLotId: string | null;
  manualLotsLength: number;
  rowConfirmActionLabel: string;
  /** Dialog: campo pieno; tabella prodotti: compatta (tab modalità gestita dal padre). */
  density?: "default" | "compact";
  /** Per suggerimenti posizione da DB clinica. */
  clinicId: string | null;
  onConfirm: (lot: ManualLotRow) => void;
  onRemoveRow: (lotId: string) => void;
  onUpdateLotField: (lotId: string, patch: Partial<ManualLotRow>) => void;
};

export function ManualProductLotRow({
  lot,
  lotIdx,
  headerMode,
  existingInventoryLots,
  isLoadMode,
  isScaricoInventario,
  saving,
  processingManualLotId,
  confirmedManualLotId,
  manualLotsLength,
  rowConfirmActionLabel,
  density = "default",
  clinicId,
  onConfirm,
  onRemoveRow,
  onUpdateLotField,
}: ManualProductLotRowProps) {
  const compact = density === "compact";

  const currentLotStock = existingInventoryLots.find((x) => x.inventoryItemId === lot.id)?.quantity ?? null;
  const nQty = Number(lot.quantity);
  const lotConfirmDisabled =
    saving ||
    processingManualLotId === lot.id ||
    (isLoadMode && (!Number.isFinite(nQty) || nQty <= 0)) ||
    (headerMode === "scarico" &&
      (currentLotStock == null ||
        !Number.isFinite(nQty) ||
        nQty <= 0 ||
        !Number.isInteger(nQty) ||
        nQty > currentLotStock)) ||
    (headerMode === "inventario" &&
      (currentLotStock == null ||
        lot.quantity.trim() === "" ||
        !Number.isFinite(nQty) ||
        nQty < 0 ||
        !Number.isInteger(nQty)));

  const invRow = existingInventoryLots.find((x) => x.inventoryItemId === lot.id);
  const showQuantityLabel = isLoadMode && !compact;
  const quantityAriaLabel =
    headerMode === "scarico"
      ? "Quantità da scaricare"
      : headerMode === "inventario"
        ? "Nuova quantità"
        : "Quantità";

  const quantityPlaceholder =
    headerMode === "scarico"
      ? "da scaricare"
      : headerMode === "inventario"
        ? "Nuova quantità in magazzino"
        : headerMode === "carico" || headerMode === "nuovo"
          ? "Quantità da caricare"
          : undefined;

  const quantityInputProps = {
    type: "number" as const,
    min: headerMode === "inventario" ? 0 : 1,
    max:
      headerMode === "scarico" &&
      existingInventoryLots.find((x) => x.inventoryItemId === lot.id)?.quantity != null
        ? existingInventoryLots.find((x) => x.inventoryItemId === lot.id)?.quantity ?? undefined
        : undefined,
    step: 1,
    value: lot.quantity,
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      onUpdateLotField(lot.id, { quantity: e.target.value }),
    placeholder: quantityPlaceholder,
    "aria-label": isScaricoInventario || !showQuantityLabel ? quantityAriaLabel : undefined,
    className: compact
      ? "h-7 w-full min-w-0 rounded-md border border-slate-200 px-2 text-[11px] text-slate-600 tabular-nums"
      : isLoadMode
        ? "h-9 w-full min-w-0 max-w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600 tabular-nums"
        : "h-9 w-full min-w-42 rounded-md border border-slate-200 px-3 text-sm text-slate-600 tabular-nums",
  };

  const confirmSize = compact ? 12 : 14;
  const confirmBtnH = compact ? "h-7" : "h-9";
  const confirmBtnW = lotConfirmDisabled
    ? compact
      ? "w-7"
      : "w-9"
    : compact
      ? "min-w-0 gap-1 px-2"
      : "min-w-9 gap-1.5 px-2.5";

  const enabledConfirmLabel =
    headerMode === "scarico" && !lotConfirmDisabled
      ? `Scarica ${nQty} ${nQty === 1 ? "pezzo" : "pezzi"}`
      : headerMode === "inventario" && !lotConfirmDisabled
        ? `Modifica a ${nQty} la giacenza`
        : rowConfirmActionLabel;

  const confirmEnabledLabelClass = compact
    ? "text-[11px] font-semibold leading-none"
    : "text-xs font-semibold leading-none";

  const confirmButton = (
    <button
      type="button"
      onClick={() => void onConfirm(lot)}
      disabled={lotConfirmDisabled}
      className={`inline-flex ${confirmBtnH} shrink-0 items-center justify-center rounded-md border border-slate-200 text-white transition-all duration-300 ${confirmBtnW} ${
        confirmedManualLotId === lot.id ? "bg-emerald-500 scale-105" : "bg-slate-900 hover:bg-slate-800"
      } disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500`}
      title={enabledConfirmLabel}
    >
      {lotConfirmDisabled ? (
        <Check size={confirmSize} className={confirmedManualLotId === lot.id ? "animate-pulse" : ""} />
      ) : (
        <>
          <span className={confirmEnabledLabelClass}>{enabledConfirmLabel}</span>
          <Check size={confirmSize} className={`shrink-0 ${confirmedManualLotId === lot.id ? "animate-pulse" : ""}`} />
        </>
      )}
    </button>
  );

  const trashButton = (
    <button
      type="button"
      onClick={() => onRemoveRow(lot.id)}
      className={`inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 ${
        compact ? "h-7 w-7" : "h-9 w-9"
      }`}
      disabled={manualLotsLength === 1 || !isLoadMode}
      title="Rimuovi riga"
    >
      <Trash2 size={compact ? 12 : 15} />
    </button>
  );

  const qtyColClass = compact
    ? "min-w-24 w-24 shrink-0"
    : isLoadMode
      ? "w-[5.25rem] shrink-0 min-w-0"
      : "min-w-42 shrink-0";

  const [lineTotalFocused, setLineTotalFocused] = useState(false);
  const [lineTotalDraft, setLineTotalDraft] = useState("");

  const loadQtyForLine = Number(lot.quantity);
  const loadUnitParsed = parseLotPriceUi(lot.price);
  const vatPctForLine = parseLotVatUi(lot.vat);
  const qtyOkForLine = Number.isInteger(loadQtyForLine) && loadQtyForLine > 0;
  const grossFromUnitPrice =
    qtyOkForLine && loadUnitParsed != null && loadUnitParsed > 0
      ? lotLineGrossTotal(loadQtyForLine, loadUnitParsed, vatPctForLine)
      : null;

  useEffect(() => {
    if (!lineTotalFocused) return;
    const d = lineTotalDraft;
    if (d.trim() === "") {
      if (lot.price !== "") onUpdateLotField(lot.id, { price: "" });
      return;
    }
    const g = parseLotPriceUi(d);
    const q = Number(lot.quantity);
    const v = parseLotVatUi(lot.vat);
    if (g == null || g <= 0 || !Number.isInteger(q) || q <= 0) return;
    if (lot.vat.trim() !== "" && v === null) return;
    const unit = unitNetFromLineGross(g, q, v);
    if (unit == null || unit <= 0) return;
    const next = fmtLotPriceInput(unit);
    if (next !== lot.price) onUpdateLotField(lot.id, { price: next });
  }, [
    lineTotalFocused,
    lineTotalDraft,
    lot.quantity,
    lot.vat,
    lot.price,
    lot.id,
    onUpdateLotField,
  ]);

  return (
    <div
      className={`flex flex-wrap gap-x-2 gap-y-1 ${
        isScaricoInventario ? "items-center" : compact ? "items-center" : "items-end"
      }`}
    >
      {isScaricoInventario ? (
        <div
          className={`flex min-w-0 w-full flex-wrap items-center justify-start ${compact ? "gap-1.5" : "gap-x-2 gap-y-1"}`}
        >
          <div className="min-w-0 w-fit max-w-full shrink-0">
            {invRow ? (
              <ExistingLotSummaryBar inv={invRow} />
            ) : (
              <p className={`text-slate-500 ${compact ? "text-[11px]" : "text-xs"}`}>Lotto non disponibile.</p>
            )}
          </div>
          {headerMode === "scarico" ? (
            <ScaricoReasonFields
              inline
              compact={compact}
              disabled={saving}
              idPrefix={`scarico-${lot.id}`}
              reasonId={(lot.scaricoReasonId as ScaricoReasonId | undefined) ?? DEFAULT_SCARICO_REASON_ID}
              freeText={lot.scaricoNoteDetail ?? ""}
              onReasonIdChange={(id) => onUpdateLotField(lot.id, { scaricoReasonId: id })}
              onFreeTextChange={(v) => onUpdateLotField(lot.id, { scaricoNoteDetail: v })}
            />
          ) : null}
          {headerMode === "inventario" && invRow ? (
            <div className={compact ? "w-32 min-w-32 max-w-36" : "w-40 min-w-40 max-w-44"}>
              {!compact ? (
                <label className="mb-1 block text-xs font-medium text-slate-700">Posizione</label>
              ) : null}
              <InventoryLocationInput
                clinicId={clinicId}
                value={lot.location}
                onChange={(v) => onUpdateLotField(lot.id, { location: v })}
                compact={compact}
                disabled={saving}
              />
            </div>
          ) : null}
          <div className={qtyColClass}>
            <input {...quantityInputProps} />
          </div>
          {confirmButton}
          {isLoadMode ? trashButton : null}
        </div>
      ) : (
        <>
          <div className={qtyColClass}>
            {showQuantityLabel ? (
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantità</label>
            ) : null}
            <input {...quantityInputProps} />
          </div>
          {isLoadMode ? (
            <>
              <div className={compact ? "w-28 min-w-28" : "w-36 min-w-36"}>
                {!compact ? (
                  <label className="mb-1 block text-xs font-medium text-slate-700">Codice lotto</label>
                ) : null}
                <input
                  type="text"
                  value={lot.lotCode}
                  onChange={(e) => onUpdateLotField(lot.id, { lotCode: e.target.value })}
                  placeholder="Lotto"
                  className={
                    compact
                      ? "h-7 w-full rounded-md border border-slate-200 px-2 text-[11px] text-slate-600"
                      : "h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                  }
                />
              </div>
              <div className={compact ? "w-auto min-w-35" : "w-44 min-w-44"}>
                {!compact ? (
                  <label className="mb-1 block text-xs font-medium text-slate-700">Scadenza</label>
                ) : null}
                <input
                  type="date"
                  value={lot.expiryDate}
                  onChange={(e) => onUpdateLotField(lot.id, { expiryDate: e.target.value })}
                  className={
                    compact
                      ? "h-7 w-35 max-w-full rounded-md border border-slate-200 px-2 text-[11px] text-slate-600"
                      : "h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600"
                  }
                />
              </div>
              <div className={compact ? "w-28 min-w-28 max-w-34" : "min-w-36 flex-1 basis-36"}>
                {!compact ? (
                  <label className="mb-1 block text-xs font-medium text-slate-700">Posizione</label>
                ) : null}
                <InventoryLocationInput
                  clinicId={clinicId}
                  value={lot.location}
                  onChange={(v) => onUpdateLotField(lot.id, { location: v })}
                  compact={compact}
                  disabled={saving}
                />
              </div>
              <div className={compact ? "w-20 min-w-20" : "w-28 min-w-28"}>
                {!compact ? (
                  <label className="mb-1 block text-xs font-medium text-slate-700">Imponibile (€)</label>
                ) : null}
                <input
                  type="text"
                  inputMode="decimal"
                  value={lot.price}
                  onChange={(e) => onUpdateLotField(lot.id, { price: sanitizePriceInput(e.target.value) })}
                  placeholder="prezzo"
                  title="Prezzo unitario imponibile (prima dell’IVA)"
                  className={
                    compact
                      ? "h-7 w-full rounded-md border border-slate-200 px-2 text-[11px] text-slate-600 tabular-nums"
                      : "h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600 tabular-nums"
                  }
                  autoComplete="off"
                />
              </div>
              <div className={compact ? "w-[3.25rem] min-w-[3.25rem]" : "w-16 min-w-16"}>
                {!compact ? (
                  <label className="mb-1 block text-xs font-medium text-slate-700">IVA %</label>
                ) : null}
                <input
                  type="text"
                  inputMode="decimal"
                  value={lot.vat}
                  onChange={(e) => onUpdateLotField(lot.id, { vat: sanitizePriceInput(e.target.value) })}
                  placeholder="IVA"
                  title="Percentuale IVA (allineata a inventory_items.VAT)"
                  className={
                    compact
                      ? "h-7 w-full rounded-md border border-slate-200 px-2 text-[11px] text-slate-600 tabular-nums"
                      : "h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600 tabular-nums"
                  }
                  autoComplete="off"
                />
              </div>
              {qtyOkForLine ? (() => {
                const showBreakdown =
                  loadUnitParsed != null && loadUnitParsed > 0 && grossFromUnitPrice != null;
                const netTot =
                  showBreakdown && loadUnitParsed != null
                    ? Math.round(loadQtyForLine * loadUnitParsed * 100) / 100
                    : 0;
                const vatEuro =
                  showBreakdown && grossFromUnitPrice != null
                    ? Math.round(Math.max(0, grossFromUnitPrice - netTot) * 100) / 100
                    : 0;
                const textCls = compact ? "text-[11px]" : "text-sm";
                const boxH = compact ? "h-7 min-h-7" : "h-9 min-h-9";
                const tip =
                  showBreakdown &&
                  grossFromUnitPrice != null &&
                  vatPctForLine != null &&
                  vatPctForLine > 0
                    ? `Imponibile ${fmtLotUnitPriceEur(netTot)} · IVA ${vatPctForLine}% · Totale ${fmtLotUnitPriceEur(grossFromUnitPrice)}`
                    : showBreakdown && grossFromUnitPrice != null
                      ? `Totale imponibile ${fmtLotUnitPriceEur(grossFromUnitPrice)}`
                      : "Totale riga (IVA inclusa). Modificando qui si ricalcola l’imponibile unitario in base a quantità e IVA.";
                const totalInputCls = compact
                  ? "h-7 w-[4.75rem] min-w-[4.75rem] rounded-md border border-slate-200 px-1.5 text-[11px] font-semibold text-slate-700 tabular-nums"
                  : "h-9 w-[6.25rem] min-w-[6.25rem] rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-700 tabular-nums";
                return (
                  <div
                    className={`flex ${boxH} items-center gap-x-1.5 self-end ${textCls} text-slate-700`}
                    title={tip}
                  >
                    <span className="select-none text-[10px] text-slate-400" aria-hidden>
                      •
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      <span className="whitespace-nowrap">
                        tot.{" "}
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Totale riga IVA inclusa"
                          value={
                            lineTotalFocused
                              ? lineTotalDraft
                              : grossFromUnitPrice != null
                                ? fmtLotPriceInput(grossFromUnitPrice)
                                : ""
                          }
                          onChange={(e) => setLineTotalDraft(sanitizePriceInput(e.target.value))}
                          onFocus={() => {
                            setLineTotalFocused(true);
                            if (grossFromUnitPrice != null) {
                              setLineTotalDraft(fmtLotPriceInput(grossFromUnitPrice));
                            } else {
                              setLineTotalDraft("");
                            }
                          }}
                          onBlur={() => {
                            setLineTotalFocused(false);
                            setLineTotalDraft("");
                          }}
                          placeholder="totale"
                          title="Totale riga (IVA inclusa). Modificando qui si ricalcola l’imponibile unitario."
                          className={totalInputCls}
                          autoComplete="off"
                        />
                      </span>
                      <span className="font-normal text-slate-500">
                        IVA incl.
                        {showBreakdown && vatPctForLine != null && vatPctForLine > 0 ? (
                          <span className="tabular-nums">
                            {" "}
                            ({vatPctForLine.toLocaleString("it-IT", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                            % · {fmtLotUnitPriceEur(vatEuro)})
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>
                );
              })() : null}
            </>
          ) : null}
          {confirmButton}
          {trashButton}
        </>
      )}
    </div>
  );
}

type ManualProductLotsSectionProps = {
  lots: ManualLotRow[];
  existingInventoryLots: ExistingInventoryLot[];
  headerMode: ManualProductEntryHeaderMode;
  isLoadMode: boolean;
  isScaricoInventario: boolean;
  saving: boolean;
  processingManualLotId: string | null;
  confirmedManualLotId: string | null;
  rowConfirmActionLabel: string;
  density?: "default" | "compact";
  /** Evita che click su input/pulsanti collassino la riga tabella. */
  containClicks?: boolean;
  /** Scarico / inventario senza lotti in magazzino */
  inventoryEmptyLabel?: string;
  /** In modalità carico: elenco read-only delle giacenze esistenti sopra le righe da caricare (dialog e tabella). */
  showExistingInventoryWhenLoad?: boolean;
  clinicId: string | null;
  onConfirmLot: (lot: ManualLotRow) => void;
  onAddLotRow: () => void;
  onRemoveLotRow: (lotId: string) => void;
  onUpdateLotField: (lotId: string, patch: Partial<ManualLotRow>) => void;
};

export function ManualProductLotsSection({
  lots,
  existingInventoryLots,
  headerMode,
  isLoadMode,
  isScaricoInventario,
  saving,
  processingManualLotId,
  confirmedManualLotId,
  rowConfirmActionLabel,
  density = "default",
  containClicks = false,
  inventoryEmptyLabel = "Nessuna giacenza disponibile.",
  showExistingInventoryWhenLoad = true,
  clinicId,
  onConfirmLot,
  onAddLotRow,
  onRemoveLotRow,
  onUpdateLotField,
}: ManualProductLotsSectionProps) {
  const compact = density === "compact";

  const showExistingLoadBanner =
    isLoadMode && showExistingInventoryWhenLoad && existingInventoryLots.length > 0;

  const existingLotsPosQty = existingInventoryLots.filter((i) => i.quantity > 0);
  /** Micro-totali: carico (sopra riepilogo lotti) oppure scarico / inventario (sopre le righe operative). */
  const showMicroTotals =
    existingInventoryLots.length > 0 &&
    existingLotsPosQty.length > 1 &&
    ((isLoadMode && showExistingInventoryWhenLoad) || isScaricoInventario);

  let existingMicroTotalQty = 0;
  let existingMicroImponibile = 0;
  let existingMicroGross = 0;
  for (const inv of existingLotsPosQty) {
    existingMicroTotalQty += inv.quantity;
    const u = inv.unitPrice;
    if (u != null && u > 0) {
      existingMicroImponibile += Math.round(inv.quantity * u * 100) / 100;
      existingMicroGross += lotLineGrossTotal(inv.quantity, u, inv.vatPct);
    }
  }
  const existingMicroHasPrice = existingLotsPosQty.some((i) => i.unitPrice != null && i.unitPrice > 0);
  existingMicroImponibile = Math.round(existingMicroImponibile * 100) / 100;
  existingMicroGross = Math.round(existingMicroGross * 100) / 100;

  const scaricoInventarioMicroAbove =
    !showExistingLoadBanner && isScaricoInventario && showMicroTotals;

  const sectionOuterClass = compact
    ? "mt-0 max-w-none space-y-1.5"
    : showExistingLoadBanner
      ? "mt-0 max-w-3xl space-y-2"
      : scaricoInventarioMicroAbove
        ? "mt-0 max-w-3xl space-y-2"
        : "mt-10 max-w-3xl space-y-2";

  const microTotalsBadges = showMicroTotals ? (
    <div
      className={
        compact ? "mb-0.5 flex flex-wrap items-center gap-1.5" : "mb-1 flex flex-wrap items-center gap-1.5"
      }
    >
      <span className="inline-flex items-baseline gap-1.5 rounded-md bg-slate-900 px-2 py-1 text-xs tabular-nums text-slate-100">
        <span className="font-medium text-slate-400">Giacenza</span>
        <span>
          <span className="font-semibold text-slate-50">{existingMicroTotalQty}</span> pz
        </span>
      </span>
      {existingMicroHasPrice ? (
        <>
          <span className="inline-flex items-baseline gap-1.5 rounded-md bg-slate-900 px-2 py-1 text-xs tabular-nums text-slate-100">
            <span className="font-medium text-slate-400">Imponibile tot.</span>
            <span className="font-semibold text-slate-50">
              {fmtLotUnitPriceEur(existingMicroImponibile)}
            </span>
          </span>
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0 rounded-md bg-slate-900 px-2 py-1 text-xs tabular-nums text-slate-100">
            <span className="font-medium text-slate-400">tot.</span>
            <span className="font-semibold text-slate-50">
              {fmtLotUnitPriceEur(existingMicroGross)}
            </span>
            <span className="text-slate-400">IVA incl.</span>
          </span>
        </>
      ) : null}
    </div>
  ) : null;

  const addWrapClass = compact ? "mt-1.5 max-w-none" : "mt-3 max-w-3xl";
  const addBtnClass = compact
    ? "inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
    : "inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  const addIconSize = compact ? 12 : 14;

  const inner = (
    <>
      {showExistingLoadBanner ? (
        <div className={compact ? "mt-3 mb-2 space-y-1" : "mt-10 mb-6 max-w-3xl space-y-3"}>
          {!compact ? (
            <p className="text-xs font-semibold tracking-wide text-slate-600">Giacenza attuale</p>
          ) : null}
          {microTotalsBadges}
          {existingInventoryLots.map((inv) => (
            <ExistingLotSummaryBar key={inv.inventoryItemId} inv={inv} />
          ))}
        </div>
      ) : null}
      {isScaricoInventario && lots.length === 0 ? (
        <p className={compact ? "text-[11px] text-slate-500" : "text-sm text-slate-500"}>{inventoryEmptyLabel}</p>
      ) : (
        <>
          {scaricoInventarioMicroAbove ? (
            <div className={compact ? "mb-1.5 max-w-none" : "mb-2 mt-10 max-w-3xl"}>{microTotalsBadges}</div>
          ) : null}
          <div className={sectionOuterClass}>
          {lots.map((lot, lotIdx) => (
            <ManualProductLotRow
              key={lot.id}
              lot={lot}
              lotIdx={lotIdx}
              headerMode={headerMode}
              existingInventoryLots={existingInventoryLots}
              isLoadMode={isLoadMode}
              isScaricoInventario={isScaricoInventario}
              saving={saving}
              processingManualLotId={processingManualLotId}
              confirmedManualLotId={confirmedManualLotId}
              manualLotsLength={lots.length}
              rowConfirmActionLabel={rowConfirmActionLabel}
              density={density}
              clinicId={clinicId}
              onConfirm={onConfirmLot}
              onRemoveRow={onRemoveLotRow}
              onUpdateLotField={onUpdateLotField}
            />
          ))}
        </div>
        </>
      )}
      {isLoadMode ? (
        <div className={addWrapClass}>
          <button type="button" onClick={onAddLotRow} className={addBtnClass}>
            <Plus size={addIconSize} />
          </button>
        </div>
      ) : null}
    </>
  );

  if (containClicks) {
    return (
      <div onClick={(e) => e.stopPropagation()} role="presentation">
        {inner}
      </div>
    );
  }

  return inner;
}
