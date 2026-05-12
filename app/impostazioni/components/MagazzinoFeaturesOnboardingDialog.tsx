"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleHelp,
  ClipboardCheck,
  ExternalLink,
  Plus,
  ScanBarcode,
  Truck,
  Warehouse,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type FeatureId = "carico" | "scarico" | "nuovo" | "inventario" | "ddt" | "bippa" | "help";

const rowBtn =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

const rowBtnSelected =
  "border-blue-300 bg-blue-50 text-blue-900 ring-1 ring-blue-200/80 hover:border-blue-400 hover:bg-blue-50";

type MagazzinoFeaturesOnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
};

const FEATURES: Array<{
  id: FeatureId;
  label: string;
  shortcut?: string;
  icon: ReactNode;
  description: string;
}> = [
  {
    id: "carico",
    label: "Carico",
    shortcut: "R",
    icon: <ArrowDownRight size={14} className="text-emerald-600" aria-hidden />,
    description:
      "Registra merce in entrata: ordini ai fornitori, consegne e resi verso lo studio. Scegli il prodotto (anche cercando per SKU o nome), indica quantità, lotto e scadenza quando serve. Utile appena arriva un pacco o aggiorni la giacenza dopo un ordine.",
  },
  {
    id: "scarico",
    label: "Scarico",
    shortcut: "S",
    icon: <ArrowUpRight size={14} className="text-rose-600" aria-hidden />,
    description:
      "Segna materiali usati in sede o dati via al paziente. Riduce la quantità in magazzino e tiene traccia dei movimenti. Ideale a fine giornata o dopo un intervento, quando vuoi allineare lo stock a ciò che hai davvero consumato.",
  },
  {
    id: "nuovo",
    label: "Nuovo articolo",
    shortcut: "N",
    icon: <Plus size={14} aria-hidden />,
    description:
      "Aggiunge un prodotto che non è ancora nel tuo elenco clinica: dati anagrafici, codici (EAN/UDI/HIBC), scorta minima e primo lotto. Lo userai per articoli nuovi o mai registrati prima nel tuo magazzino Visitae.",
  },
  {
    id: "inventario",
    label: "Inventario",
    shortcut: "I",
    icon: <ClipboardCheck size={14} className="text-slate-700" aria-hidden />,
    description:
      "Confronta le quantità contate fisicamente con quelle in sistema e rettifica le differenze. Serve per inventari periodici, dopo uno spostamento o quando noti uno scostamento tra scaffale e applicazione.",
  },
  {
    id: "ddt",
    label: "DDT",
    shortcut: "D",
    icon: <Truck size={14} className="text-amber-700" aria-hidden />,
    description:
      "Importa righe da un documento di trasporto così carichi più articoli insieme senza digitarli uno per uno. Utile quando il fornitore ti invia un DDT con molti codici in un colpo solo.",
  },
  {
    id: "bippa",
    label: "Bippa",
    shortcut: "B",
    icon: <ScanBarcode size={14} className="text-slate-700" aria-hidden />,
    description:
      "Usa la fotocamera o uno scanner per leggere un codice a barre ed aprire subito il prodotto giusto: rapido in corsia, in reception o quando hai il blister in mano e vuoi evitare errori di digitazione.",
  },
  {
    id: "help",
    label: "Aiuto!?",
    icon: <CircleHelp size={14} className="text-violet-600" aria-hidden />,
    description:
      "Non è un'azione sul magazzino: è il punto dove approfondire Visitae. Nel centro assistenza trovi spiegazioni sul software, flussi consigliati e materiali per orientarti. Clicca sul pulsante qui sotto per aprire il centro assistenza.",
  },
];

function DemoCarico() {
  return (
    <div className="space-y-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anteprima · Carico</p>
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <div className="h-9 w-9 shrink-0 rounded-md bg-slate-100" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">Guanti nitrile M</p>
            <p className="text-[10px] text-slate-500">SKU · GL-NIT-M</p>
          </div>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-0.5 block text-[10px] font-medium text-slate-600">Quantità</span>
            <div className="flex h-8 items-center rounded-md border border-emerald-200 bg-emerald-50/80 px-2">
              <ArrowDownRight size={14} className="text-emerald-600" aria-hidden />
              <span className="ml-1 font-mono text-xs font-semibold text-emerald-900">24</span>
            </div>
          </label>
          <button
            type="button"
            className="h-8 rounded-md bg-emerald-600 px-2 text-[11px] font-semibold text-white"
            tabIndex={-1}
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoScarico() {
  return (
    <div className="space-y-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anteprima · Scarico</p>
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5">
          <span className="text-xs font-medium text-slate-700">Lotto A · scad. 12/2026</span>
          <span className="font-mono text-[11px] font-semibold text-slate-600">Qtà 18</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-0.5 block text-[10px] font-medium text-slate-600">Da scaricare</span>
            <div className="flex h-8 items-center rounded-md border border-rose-200 bg-rose-50/80 px-2">
              <ArrowUpRight size={14} className="text-rose-600" aria-hidden />
              <span className="ml-1 font-mono text-xs font-semibold text-rose-900">3</span>
            </div>
          </label>
          <button type="button" className="h-8 rounded-md bg-rose-600 px-2 text-[11px] font-semibold text-white" tabIndex={-1}>
            Scarica
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoNuovo() {
  return (
    <div className="space-y-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anteprima · Nuovo articolo</p>
      <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3">
        <div className="h-2 w-[75%] rounded bg-slate-200" />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="h-8 rounded border border-slate-200 bg-white px-2 text-[10px] leading-8 text-slate-400">Nome commerciale</div>
          <div className="h-8 rounded border border-slate-200 bg-white px-2 text-[10px] leading-8 text-slate-400">SKU</div>
          <div className="h-8 rounded border border-slate-200 bg-white px-2 text-[10px] leading-8 text-slate-400 sm:col-span-2">
            EAN / codice a barre
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white">
            <Plus size={12} aria-hidden /> Crea articolo
          </span>
        </div>
      </div>
    </div>
  );
}

function DemoInventario() {
  return (
    <div className="space-y-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anteprima · Inventario</p>
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-center text-[10px]">
          <div>
            <p className="font-medium text-slate-500">In sistema</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-800">42</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Contati</p>
            <p className="mt-1 font-mono text-lg font-semibold text-blue-700">40</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2">
          <ClipboardCheck size={14} className="text-amber-800" aria-hidden />
          <span className="text-[11px] font-medium text-amber-900">Rettifica −2 unità</span>
        </div>
      </div>
    </div>
  );
}

function DemoDdt() {
  return (
    <div className="space-y-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anteprima · DDT</p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/90 px-2 py-1.5">
          <Truck size={14} className="text-amber-700" aria-hidden />
          <span className="text-[11px] font-semibold text-amber-900">DDT n. 4521 · Fornitore Alfa</span>
        </div>
        <table className="w-full text-left text-[10px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <th className="px-2 py-1 font-medium">Articolo</th>
              <th className="px-2 py-1 font-medium">Qtà</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            <tr className="border-b border-slate-50">
              <td className="px-2 py-1.5">Salviette cliniche</td>
              <td className="px-2 py-1.5 font-mono">10</td>
            </tr>
            <tr>
              <td className="px-2 py-1.5">Digestivi monouso</td>
              <td className="px-2 py-1.5 font-mono">50</td>
            </tr>
          </tbody>
        </table>
        <div className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-right">
          <span className="text-[10px] font-semibold text-slate-600">Importa in magazzino →</span>
        </div>
      </div>
    </div>
  );
}

function DemoBippa() {
  return (
    <div className="space-y-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anteprima · Bippa</p>
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-linear-to-b from-slate-900 to-slate-800 p-4 text-white shadow-inner">
        <div className="relative mx-auto h-14 w-44 overflow-hidden rounded border border-white/20 bg-black/40">
          <div className="relative z-0 flex h-full items-center justify-center font-mono text-[10px] tracking-[0.35em] text-emerald-400">
            |||||| |||| ||
          </div>
          <div
            className="bippa-scanner-line pointer-events-none absolute inset-x-2 top-[12%] z-10 h-0.5 bg-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
            aria-hidden
          />
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-300">
          Codice letto: <span className="font-mono font-semibold text-white">8032547719021</span>
        </p>
        <p className="mt-1 text-center text-[10px] text-slate-500">Prodotto trovato · apri scheda</p>
      </div>
    </div>
  );
}

function HelpCenterOpenButton() {
  return (
    <Link
      href="/help"
      target="_blank"
      rel="noopener noreferrer"
      className={rowBtn}
      aria-label="Apri il centro assistenza (si apre in una nuova scheda)"
    >
      <CircleHelp size={14} className="shrink-0 text-violet-600" aria-hidden />
      Apri il centro assistenza
      <ExternalLink size={14} className="ml-0.5 shrink-0 text-slate-500" aria-hidden />
    </Link>
  );
}

function FeatureDemo({ id }: { id: FeatureId }) {
  switch (id) {
    case "carico":
      return <DemoCarico />;
    case "scarico":
      return <DemoScarico />;
    case "nuovo":
      return <DemoNuovo />;
    case "inventario":
      return <DemoInventario />;
    case "ddt":
      return <DemoDdt />;
    case "bippa":
      return <DemoBippa />;
    case "help":
      return <HelpCenterOpenButton />;
    default:
      return null;
  }
}

export function MagazzinoFeaturesOnboardingDialog({ open, onClose }: MagazzinoFeaturesOnboardingDialogProps) {
  const [selected, setSelected] = useState<FeatureId>("carico");

  useEffect(() => {
    if (open) setSelected("carico");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingContext =
        tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (isTypingContext) return;

      const key = event.key.toLowerCase();
      const byKey: Partial<Record<string, FeatureId>> = {
        n: "nuovo",
        b: "bippa",
        d: "ddt",
        r: "carico",
        s: "scarico",
        i: "inventario",
      };
      const next = byKey[key];
      if (!next) return;
      event.preventDefault();
      setSelected(next);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const active = FEATURES.find((f) => f.id === selected) ?? FEATURES[0];

  return (
    <div
      className="fixed inset-0 z-141 flex items-center justify-center bg-slate-950/70 p-4 sm:p-6"
      aria-modal="true"
      role="dialog"
      aria-labelledby="magazzino-onboarding-title"
      aria-describedby="magazzino-onboarding-desc"
    >
      <div className="flex h-[90vh] max-h-[90vh] w-full max-w-[96vw] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:min-w-[70vw]">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              <Warehouse size={12} aria-hidden />
              Magazzino
            </div>
            <h2 id="magazzino-onboarding-title" className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Super! Adesso scopriamo le funzioni più importanti.
            </h2>
            <p id="magazzino-onboarding-desc" className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Visitae nasce per supportarti nella gestione del magazzino della tua clinica. Clicca sulle funzioni principali
              per conoscerle e sapere quando usarle.
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex shrink-0 flex-wrap gap-2" role="tablist" aria-label="Funzioni magazzino e centro assistenza">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected === f.id}
                onClick={() => setSelected(f.id)}
                className={`${rowBtn} ${selected === f.id ? rowBtnSelected : ""}`}
              >
                {f.icon}
                {f.label}
                {f.shortcut ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-slate-300 bg-slate-100 px-1 text-[10px] font-bold leading-none text-slate-700">
                    {f.shortcut}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-5 overflow-y-auto">
            <div className="w-full">
              <h3 className="text-sm font-semibold text-slate-900">{active.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{active.description}</p>
            </div>
            {active.id === "help" ? (
              <div className="flex shrink-0 justify-center pt-1">
                <FeatureDemo id={active.id} />
              </div>
            ) : (
              <div className="w-full max-w-md shrink-0 self-center rounded-xl border border-slate-100 bg-slate-50/90 p-4 shadow-sm">
                <FeatureDemo id={active.id} />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Link
              href="/magazzino"
              onClick={onClose}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Vai al magazzino
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
