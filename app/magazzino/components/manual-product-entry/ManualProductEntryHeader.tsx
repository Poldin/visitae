"use client";

import { ChevronDown, ChevronsUp, X } from "lucide-react";
import type { RefObject } from "react";
import { ENTRY_MODE_OPTIONS, modeTriggerBase, STOCK_TRIO_MODE_OPTIONS } from "./constants";
import type { ManualProductEntryHeaderMode } from "./types";

type ManualProductEntryHeaderProps = {
  modeDropdownRef: RefObject<HTMLDivElement | null>;
  headerMode: ManualProductEntryHeaderMode;
  setHeaderMode: (m: ManualProductEntryHeaderMode) => void;
  modeDropdownOpen: boolean;
  setModeDropdownOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  modeSwitcherLocked: boolean;
  headerProductName: string;
  onClose: () => void;
  onTitleModeChange?: (mode: ManualProductEntryHeaderMode) => void;
  /**
   * `close`: pulsante icona chiusura (dialog standalone).
   * `collapse`: solo icona — comprime il riepilogo prodotto e torna alla scansione (es. Bippa nel dialog).
   */
  dismissAppearance?: "close" | "collapse";
};

export function ManualProductEntryHeader({
  modeDropdownRef,
  headerMode,
  setHeaderMode,
  modeDropdownOpen,
  setModeDropdownOpen,
  modeSwitcherLocked,
  headerProductName,
  onClose,
  onTitleModeChange,
  dismissAppearance = "close",
}: ManualProductEntryHeaderProps) {
  const activeModeOption = ENTRY_MODE_OPTIONS.find((o) => o.id === headerMode) ?? ENTRY_MODE_OPTIONS[0];
  const ActiveModeIcon = activeModeOption.Icon;

  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2.5">
        <div ref={modeDropdownRef} className="relative shrink-0">
          <button
            type="button"
            className={`${modeTriggerBase} ${activeModeOption.activeRing} ${
              modeSwitcherLocked ? "cursor-default" : ""
            } disabled:opacity-100`}
            aria-expanded={modeSwitcherLocked ? false : modeDropdownOpen}
            aria-haspopup={modeSwitcherLocked ? undefined : "listbox"}
            aria-label={
              modeSwitcherLocked
                ? "Modalità Nuovo articolo (non modificabile da qui)"
                : "Modalità operazione magazzino"
            }
            disabled={modeSwitcherLocked}
            onClick={() => {
              if (modeSwitcherLocked) return;
              setModeDropdownOpen((v) => !v);
            }}
          >
            <ActiveModeIcon size={14} className={`shrink-0 ${activeModeOption.iconClass}`} />
            <span>{activeModeOption.label}</span>
            {modeSwitcherLocked ? null : (
              <ChevronDown
                size={12}
                className={`shrink-0 text-slate-500 transition-transform ${modeDropdownOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            )}
          </button>
          {!modeSwitcherLocked && modeDropdownOpen ? (
            <div
              className="absolute left-0 top-full z-40 mt-1 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              role="listbox"
              aria-label="Scegli tra Carico, Scarico o Inventario"
            >
              {STOCK_TRIO_MODE_OPTIONS.map((opt) => {
                const OptIcon = opt.Icon;
                const selected = headerMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                      selected ? "bg-slate-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setHeaderMode(opt.id);
                      setModeDropdownOpen(false);
                      onTitleModeChange?.(opt.id);
                    }}
                  >
                    <OptIcon size={14} className={`shrink-0 ${opt.iconClass}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div
          id="manual-product-entry-title"
          role="heading"
          aria-level={2}
          className={
            headerProductName
              ? "min-w-0 flex-1 truncate text-base font-semibold leading-snug text-slate-900 sm:text-lg"
              : "sr-only"
          }
        >
          {headerProductName || "Inserimento prodotto"}
        </div>
      </div>
      {dismissAppearance === "collapse" ? (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          title="Torna alla scansione"
          aria-label="Torna alla scansione"
        >
          <ChevronsUp size={15} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          title="Chiudi"
          aria-label="Chiudi"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}
