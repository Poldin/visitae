"use client";

import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ScaricoReasonId } from "@/app/magazzino/lib/scaricoNotes";
import {
  DEFAULT_SCARICO_REASON_ID,
  labelForScaricoReason,
  SCARICO_REASON_OPTIONS,
} from "@/app/magazzino/lib/scaricoNotes";

/** Stessi token dei campi compatti in `ManualProductLotsSection` (qty / input riga). */
const inlineControlBase =
  "rounded-md border border-slate-200 bg-white text-[11px] text-slate-600 transition-colors " +
  "hover:border-slate-300 hover:bg-slate-50 " +
  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/25";

const listboxPanelClass =
  "z-[1000] max-h-[min(240px,calc(100vh-1rem))] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg";

function ScaricoReasonListbox({
  reasonId,
  onReasonIdChange,
  disabled,
  idPrefix,
  variant,
}: {
  reasonId: ScaricoReasonId;
  onReasonIdChange: (id: ScaricoReasonId) => void;
  disabled?: boolean;
  idPrefix: string;
  variant: "inline" | "stackedCompact" | "stackedDefault";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const syncPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minW = variant === "inline" ? Math.max(r.width, 192) : Math.max(r.width, 200);
    const width = Math.min(minW, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setCoords({
      top: r.bottom + 4,
      left,
      width,
    });
  }, [variant]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    syncPosition();
    const onWin = () => syncPosition();
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("resize", onWin);
    return () => {
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("resize", onWin);
    };
  }, [open, syncPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const triggerClass =
    variant === "inline"
      ? `inline-flex h-7 max-w-[min(11rem,100vw)] min-w-0 shrink-0 items-center justify-between gap-1 pl-2 pr-2 text-left font-normal ${inlineControlBase} disabled:cursor-not-allowed disabled:opacity-50`
      : variant === "stackedCompact"
        ? `flex h-7 w-full max-w-[min(100%,14rem)] items-center justify-between gap-1 px-2 text-left font-normal ${inlineControlBase} disabled:cursor-not-allowed disabled:opacity-50`
        : "flex h-9 w-full max-w-md items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-left text-sm font-normal text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/25 disabled:cursor-not-allowed disabled:opacity-50";

  /** Allineato alle righe tabella prodotti: hover scuro + testo chiaro; peso normale. */
  const optionClass = (selected: boolean) =>
    `flex w-full items-center px-2.5 py-1.5 text-left text-[11px] font-normal transition-colors ${
      selected
        ? "bg-slate-100 text-slate-800 hover:bg-slate-800 hover:text-slate-100"
        : "text-slate-700 hover:bg-slate-800 hover:text-slate-100"
    }`;

  const label = labelForScaricoReason(reasonId);

  const listboxPanel =
    open && coords ? (
      <div
        ref={panelRef}
        id={listId}
        role="listbox"
        aria-labelledby={variant === "inline" ? undefined : `${idPrefix}-trigger`}
        className={`fixed ${listboxPanelClass}`}
        style={{
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
      >
        {SCARICO_REASON_OPTIONS.map((o) => {
          const selected = o.id === reasonId;
          return (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={optionClass(selected)}
              onClick={() => {
                onReasonIdChange(o.id as ScaricoReasonId);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div className={variant === "inline" ? "relative inline-flex w-fit shrink-0" : "relative w-full"}>
      <button
        ref={triggerRef}
        id={`${idPrefix}-trigger`}
        type="button"
        className={triggerClass}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={variant === "inline" ? "Motivo scarico" : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {typeof document !== "undefined" && listboxPanel ? createPortal(listboxPanel, document.body) : null}
    </div>
  );
}

const stackedTextareaBase =
  "rounded-md border border-slate-200 bg-white transition-colors " +
  "hover:border-slate-300 hover:bg-slate-50 " +
  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/25";

export type ScaricoReasonFieldsProps = {
  reasonId: ScaricoReasonId;
  onReasonIdChange: (id: ScaricoReasonId) => void;
  freeText: string;
  onFreeTextChange: (value: string) => void;
  compact?: boolean;
  inline?: boolean;
  disabled?: boolean;
  idPrefix?: string;
};

export function ScaricoReasonFields({
  reasonId,
  onReasonIdChange,
  freeText,
  onFreeTextChange,
  compact = false,
  inline = false,
  disabled = false,
  idPrefix = "scarico-reason",
}: ScaricoReasonFieldsProps) {
  const txtCls = inline
    ? `h-7 w-fit min-w-[5.5rem] max-w-[9rem] px-2 font-medium ${inlineControlBase} placeholder:text-slate-400 disabled:opacity-50`
    : compact
      ? `h-7 w-full min-w-0 px-2 text-[11px] text-slate-700 placeholder:text-slate-400 ${stackedTextareaBase}`
      : `h-9 w-full min-w-0 px-3 text-sm text-slate-700 placeholder:text-slate-400 ${stackedTextareaBase}`;

  if (inline) {
    return (
      <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-1.5">
        <ScaricoReasonListbox
          idPrefix={idPrefix}
          reasonId={reasonId}
          onReasonIdChange={onReasonIdChange}
          disabled={disabled}
          variant="inline"
        />
        <input
          id={`${idPrefix}-detail`}
          type="text"
          className={txtCls}
          placeholder="Note…"
          value={freeText}
          disabled={disabled}
          aria-label="Dettaglio note scarico"
          onChange={(e) => onFreeTextChange(e.target.value)}
          autoComplete="off"
        />
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "mb-1 flex max-w-none flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-end"
          : "mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
      }
    >
      <label className="flex min-w-0 flex-1 flex-col gap-0.5" htmlFor={`${idPrefix}-trigger`}>
        <span className={compact ? "text-[10px] font-medium text-slate-500" : "text-xs font-medium text-slate-600"}>
          Motivo scarico
        </span>
        <ScaricoReasonListbox
          idPrefix={idPrefix}
          reasonId={reasonId}
          onReasonIdChange={onReasonIdChange}
          disabled={disabled}
          variant={compact ? "stackedCompact" : "stackedDefault"}
        />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-[2]" htmlFor={`${idPrefix}-detail`}>
        <span className={compact ? "text-[10px] font-medium text-slate-500" : "text-xs font-medium text-slate-600"}>
          Dettaglio (facoltativo)
        </span>
        <input
          id={`${idPrefix}-detail`}
          type="text"
          className={txtCls}
          placeholder="Es. note per audit, operatore, lotto…"
          value={freeText}
          disabled={disabled}
          onChange={(e) => onFreeTextChange(e.target.value)}
          autoComplete="off"
        />
      </label>
    </div>
  );
}

export { DEFAULT_SCARICO_REASON_ID };
