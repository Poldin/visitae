"use client";

import { ChevronDown, X } from "lucide-react";
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
}: ManualProductEntryHeaderProps) {
  const activeModeOption = ENTRY_MODE_OPTIONS.find((o) => o.id === headerMode) ?? ENTRY_MODE_OPTIONS[0];
  const ActiveModeIcon = activeModeOption.Icon;

  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
      <div
        id="manual-product-entry-title"
        className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3"
        role="heading"
        aria-level={2}
      >
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
            <ActiveModeIcon size={16} className={`shrink-0 ${activeModeOption.iconClass}`} />
            <span>{activeModeOption.label}</span>
            {modeSwitcherLocked ? null : (
              <ChevronDown
                size={14}
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
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      selected ? "bg-slate-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setHeaderMode(opt.id);
                      setModeDropdownOpen(false);
                      onTitleModeChange?.(opt.id);
                    }}
                  >
                    <OptIcon size={16} className={`shrink-0 ${opt.iconClass}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        {headerProductName ? (
          <span className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900 sm:text-xl">
            {headerProductName}
          </span>
        ) : null}
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
  );
}
