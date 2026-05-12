import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Plus, type LucideIcon } from "lucide-react";
import type { ManualProductEntryHeaderMode, ManualProductEntryTitleIntent } from "./types";

export function intentToHeaderMode(intent: ManualProductEntryTitleIntent | undefined): ManualProductEntryHeaderMode {
  const t = intent ?? { type: "default" as const };
  if (t.type === "addFromMasterCatalog") return "nuovo";
  if (t.type === "stock") return t.mode;
  return "carico";
}

export const BRAND_DROPDOWN_LIMIT = 8;

export type EntryModeOption = {
  id: ManualProductEntryHeaderMode;
  label: string;
  Icon: LucideIcon;
  iconClass: string;
  activeRing: string;
};

export const ENTRY_MODE_OPTIONS: EntryModeOption[] = [
  {
    id: "carico",
    label: "Carico",
    Icon: ArrowDownRight,
    iconClass: "text-emerald-600",
    activeRing:
      "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/45 ring-offset-1 ring-offset-white",
  },
  {
    id: "scarico",
    label: "Scarico",
    Icon: ArrowUpRight,
    iconClass: "text-rose-600",
    activeRing: "border-rose-400 bg-rose-50 ring-2 ring-rose-400/45 ring-offset-1 ring-offset-white",
  },
  {
    id: "inventario",
    label: "Inventario",
    Icon: ClipboardCheck,
    iconClass: "text-slate-700",
    activeRing: "border-slate-500 bg-slate-100 ring-2 ring-slate-400/50 ring-offset-1 ring-offset-white",
  },
  {
    id: "nuovo",
    label: "Nuovo articolo",
    Icon: Plus,
    iconClass: "text-violet-600",
    activeRing: "border-violet-500 bg-violet-50 ring-2 ring-violet-400/45 ring-offset-1 ring-offset-white",
  },
];

/** Solo Carico / Scarico / Inventario: interscambiabili. «Nuovo articolo» è una modalità fissa a parte. */
export const STOCK_TRIO_MODE_OPTIONS = ENTRY_MODE_OPTIONS.filter((o) => o.id !== "nuovo");

export const modeTriggerBase =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50";
