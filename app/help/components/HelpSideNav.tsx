"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  ChevronRight,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScanBarcode,
  Settings,
  Truck,
  UserCircle,
  Users,
  Warehouse,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Tutti gli hash validi per /help */
export const HELP_HASH_IDS = [
  "magazzino",
  "carico",
  "scarico",
  "nuovo",
  "inventario",
  "ddt",
  "bippa",
  "movimenti",
  "statistiche",
  "profilo",
  "cliniche",
  "cliniche-configura",
  "cliniche-utenti",
  "intro",
] as const;

export type HelpHashId = (typeof HELP_HASH_IDS)[number];

function isHelpHash(raw: string): raw is HelpHashId {
  return (HELP_HASH_IDS as readonly string[]).includes(raw);
}

function hashFromWindow(): HelpHashId | "" {
  if (typeof window === "undefined") return "";
  const raw = window.location.hash.replace(/^#/, "");
  return raw && isHelpHash(raw) ? raw : "";
}

type NavLeaf = {
  id: HelpHashId;
  label: string;
  Icon?: LucideIcon;
  iconClass?: string;
};

const MAGAZZINO_ITEMS: NavLeaf[] = [
  { id: "carico", label: "Carico", Icon: ArrowDownRight, iconClass: "text-emerald-600" },
  { id: "scarico", label: "Scarico", Icon: ArrowUpRight, iconClass: "text-rose-600" },
  { id: "nuovo", label: "Nuovo articolo", Icon: Plus, iconClass: "text-slate-700" },
  { id: "inventario", label: "Inventario", Icon: ClipboardCheck, iconClass: "text-slate-700" },
  { id: "ddt", label: "DDT", Icon: Truck, iconClass: "text-amber-700" },
  { id: "bippa", label: "Bippa", Icon: ScanBarcode, iconClass: "text-slate-700" },
  { id: "movimenti", label: "Movimenti", Icon: History, iconClass: "text-slate-700" },
  { id: "statistiche", label: "Statistiche", Icon: BarChart3, iconClass: "text-slate-700" },
];

const CLINICHE_ITEMS: NavLeaf[] = [
  { id: "cliniche-configura", label: "Configura", Icon: Settings, iconClass: "text-slate-700" },
  { id: "cliniche-utenti", label: "Utenti", Icon: Users, iconClass: "text-slate-700" },
];

function macroExpandedDefault(hash: HelpHashId | ""): {
  magazzino: boolean;
  cliniche: boolean;
} {
  const magIds = new Set(MAGAZZINO_ITEMS.map((i) => i.id));
  magIds.add("magazzino");
  const clinIds = new Set(CLINICHE_ITEMS.map((i) => i.id));
  clinIds.add("cliniche");

  return {
    magazzino: hash === "magazzino" || hash === "" || magIds.has(hash as HelpHashId),
    cliniche: clinIds.has(hash as HelpHashId),
  };
}

export type HelpSideNavProps = {
  className?: string;
};

/** Voce attiva: stesso linguaggio visivo di /magazzino, senza sottolineatura. */
const navLeafActive = "bg-slate-100 text-slate-900 font-semibold";
const navLeafIdle = "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium";

const navMacroActive = "bg-slate-100 text-slate-900 font-semibold";
const navMacroIdle = "text-slate-800 hover:bg-slate-100 font-semibold";

export default function HelpSideNav({ className }: HelpSideNavProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [hash, setHash] = useState<HelpHashId | "">("");
  const [openMacro, setOpenMacro] = useState(() => macroExpandedDefault(""));

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setPanelOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const syncHash = useCallback(() => {
    const h = hashFromWindow();
    setHash(h);
    setOpenMacro((prev) => {
      const d = macroExpandedDefault(h);
      return {
        magazzino: d.magazzino || prev.magazzino,
        cliniche: d.cliniche || prev.cliniche,
      };
    });
  }, []);

  useEffect(() => {
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [syncHash]);

  const activeLeafIds = useMemo(() => {
    const set = new Set<string>();
    if (hash) set.add(hash);
    return set;
  }, [hash]);

  const toggleMacro = (key: "magazzino" | "cliniche") => {
    setOpenMacro((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const inner = (
    <div className="flex min-w-56 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-3 md:px-4">
        <div className="min-w-0">
          <Link href="/" className="text-sm font-bold tracking-tight text-slate-800 hover:text-slate-950">
            Visitae
          </Link>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">Assistenza</p>
        </div>
        <button
          type="button"
          aria-expanded={panelOpen}
          aria-controls="help-side-nav-panel"
          onClick={() => setPanelOpen(false)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 md:size-8"
          title="Chiudi menu"
        >
          <PanelLeftClose size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <nav id="help-side-nav-panel" className="flex flex-col gap-0.5 overflow-y-auto px-2 py-3 md:px-3" aria-label="Indice assistenza">
        {/* Magazzino */}
        <div>
          <div className="flex items-stretch gap-0.5">
            <Link
              href="/help#magazzino"
              aria-current={hash === "magazzino" ? "location" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                hash === "magazzino" ? navMacroActive : navMacroIdle
              }`}
            >
              <Warehouse size={18} strokeWidth={2} className="shrink-0 text-slate-600" aria-hidden />
              <span className="truncate">Magazzino</span>
            </Link>
            <button
              type="button"
              aria-expanded={openMacro.magazzino}
              onClick={() => toggleMacro("magazzino")}
              className="flex w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title={openMacro.magazzino ? "Comprimi sottovoci" : "Espandi sottovoci"}
            >
              <ChevronRight
                size={18}
                strokeWidth={2}
                className={`transition-transform ${openMacro.magazzino ? "rotate-90" : ""}`}
                aria-hidden
              />
            </button>
          </div>
          {openMacro.magazzino && (
            <ul className="mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 ml-3 pb-1">
              {MAGAZZINO_ITEMS.map(({ id, label, Icon, iconClass }) => {
                const active = activeLeafIds.has(id);
                return (
                  <li key={id}>
                    <Link
                      href={`/help#${id}`}
                      aria-current={active ? "location" : undefined}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        active ? navLeafActive : navLeafIdle
                      }`}
                    >
                      {Icon ? (
                        <Icon size={16} strokeWidth={2} className={`shrink-0 ${iconClass ?? "text-slate-600"}`} aria-hidden />
                      ) : (
                        <span className="inline-block w-4 shrink-0" aria-hidden />
                      )}
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Profilo */}
        <Link
          href="/help#profilo"
          aria-current={hash === "profilo" ? "location" : undefined}
          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
            hash === "profilo" ? navMacroActive : navMacroIdle
          }`}
        >
          <UserCircle size={18} strokeWidth={2} className="shrink-0 text-slate-600" aria-hidden />
          Profilo
        </Link>

        {/* Cliniche */}
        <div>
          <div className="flex items-stretch gap-0.5">
            <Link
              href="/help#cliniche"
              aria-current={hash === "cliniche" ? "location" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                hash === "cliniche" ? navMacroActive : navMacroIdle
              }`}
              onClick={() => setOpenMacro((p) => ({ ...p, cliniche: true }))}
            >
              <Building2 size={18} strokeWidth={2} className="shrink-0 text-slate-600" aria-hidden />
              <span className="truncate">Cliniche</span>
            </Link>
            <button
              type="button"
              aria-expanded={openMacro.cliniche}
              onClick={() => toggleMacro("cliniche")}
              className="flex w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title={openMacro.cliniche ? "Comprimi sottovoci" : "Espandi sottovoci"}
            >
              <ChevronRight
                size={18}
                strokeWidth={2}
                className={`transition-transform ${openMacro.cliniche ? "rotate-90" : ""}`}
                aria-hidden
              />
            </button>
          </div>
          {openMacro.cliniche && (
            <ul className="mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 ml-3 pb-1">
              {CLINICHE_ITEMS.map(({ id, label, Icon, iconClass }) => {
                const active = activeLeafIds.has(id);
                return (
                  <li key={id}>
                    <Link
                      href={`/help#${id}`}
                      aria-current={active ? "location" : undefined}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        active ? navLeafActive : navLeafIdle
                      }`}
                    >
                      {Icon ? (
                        <Icon size={16} strokeWidth={2} className={`shrink-0 ${iconClass ?? ""}`} aria-hidden />
                      ) : null}
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop: colonna affiancata al contenuto */}
      <div
        className={`relative hidden shrink-0 flex-col overflow-hidden border-slate-200 bg-slate-50 transition-[width] duration-200 ease-out md:flex md:border-r ${
          panelOpen ? "w-56" : "w-0 border-r-0"
        } ${className ?? ""}`}
        aria-hidden={!panelOpen}
      >
        <div className="flex h-full min-h-0 flex-col">{inner}</div>
      </div>

      {/* Mobile: drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw,14rem)] flex-col border-r border-slate-200 bg-slate-50 shadow-xl transition-transform duration-200 ease-out md:hidden ${
          panelOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!panelOpen}
      >
        {inner}
      </div>
      {panelOpen && (
        <button
          type="button"
          aria-label="Chiudi menu assistenza"
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Riapri menu */}
      {!panelOpen && (
        <div className="pointer-events-none fixed left-0 top-1/2 z-40 -translate-y-1/2 md:sticky md:top-24 md:translate-y-0 md:self-start md:pointer-events-auto">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="help-side-nav-panel"
            onClick={() => setPanelOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-r-xl border border-l-0 border-slate-200 bg-white py-3 pl-2 pr-3 text-slate-700 shadow-md hover:bg-slate-50 hover:text-slate-900 md:rounded-xl md:border-l md:pl-3"
            title="Apri menu assistenza"
          >
            <PanelLeftOpen size={20} strokeWidth={2} aria-hidden />
            <span className="hidden text-sm font-semibold md:inline">Menu</span>
          </button>
        </div>
      )}
    </>
  );
}
