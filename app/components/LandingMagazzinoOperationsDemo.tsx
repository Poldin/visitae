"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PhaseId = "carico" | "scarico" | "inventario" | "ddt";

const CYCLE_MS = 5200;

const PHASES: {
  id: PhaseId;
  label: string;
  short: string;
  pillClass: string;
  Icon: LucideIcon;
}[] = [
  {
    id: "carico",
    label: "Carico",
    short: "Nuovo pacco registrato: la giacenza sale all’istante.",
    pillClass:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200",
    Icon: ArrowDownRight,
  },
  {
    id: "scarico",
    label: "Scarico",
    short: "Consumo in sala o uscita merce: scarico in un click.",
    pillClass:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200",
    Icon: ArrowUpRight,
  },
  {
    id: "inventario",
    label: "Inventario",
    short: "Rettifica sul conteggio fisico senza perdere il filo.",
    pillClass:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100",
    Icon: ClipboardCheck,
  },
  {
    id: "ddt",
    label: "DDT",
    short: "Import da documento di trasporto: quantità aggiornata come un carico.",
    pillClass:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-100",
    Icon: FileText,
  },
];

export default function LandingMagazzinoOperationsDemo() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [qty, setQty] = useState(18);
  const [delta, setDelta] = useState<string | null>(null);
  const [deltaVisible, setDeltaVisible] = useState(false);
  const [footnote, setFootnote] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const phase = PHASES[phaseIdx];
  const PhaseIcon = phase.Icon;

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setDelta(null);
    setDeltaVisible(false);
    setFootnote(null);

    const instant =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, instant ? 0 : ms);
      timersRef.current.push(t);
    };

    if (phase.id === "carico") {
      setQty(18);
      schedule(() => {
        setDelta("+8");
        setDeltaVisible(true);
        setQty(26);
      }, 400);
    } else if (phase.id === "scarico") {
      setQty(26);
      schedule(() => {
        setDelta("−5");
        setDeltaVisible(true);
        setQty(21);
      }, 450);
    } else if (phase.id === "inventario") {
      setQty(21);
      schedule(() => {
        setFootnote(
          "Verifica sullo scaffale: conteggio 17 pz. Allineato in un passaggio.",
        );
      }, 350);
      schedule(() => {
        setDelta("−4");
        setDeltaVisible(true);
        setQty(17);
      }, 1100);
    } else {
      setQty(17);
      schedule(() => {
        setFootnote("DDT n. 2411-09 · PDF importato, righe confermate.");
      }, 350);
      schedule(() => {
        setDelta("+10");
        setDeltaVisible(true);
        setQty(27);
      }, 450);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [phase.id, phaseIdx]);

  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const deltaTone =
    phase.id === "carico"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : phase.id === "scarico"
        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
        : phase.id === "inventario"
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
          : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";

  const caption = footnote ?? phase.short;

  return (
    <div className="rounded-3xl bg-zinc-50 p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] md:p-7 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        Movimenti in magazzino
      </p>
      <p className="mt-1.5 text-sm leading-snug text-zinc-600 dark:text-zinc-300">
        Carico, scarico, inventario e DDT sullo stesso articolo: la quantità che
        vedi è quella aggiornata, senza fogli né doppioni.
      </p>

      <div
        className="hide-scrollbar mt-4 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5"
        role="tablist"
        aria-label="Tipo di movimento"
      >
        {PHASES.map((p, i) => {
          const active = i === phaseIdx;
          const TabIcon = p.Icon;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPhaseIdx(i)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <TabIcon size={12} aria-hidden /> {p.label}
            </button>
          );
        })}
      </div>

      <div
        className="mt-5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              In giacenza
            </p>
            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
              Guanti nitrile M · lotto 24-B-1184
            </p>
            <p className="text-xs text-zinc-500">EAN · 8051234567892</p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${phase.pillClass}`}
          >
            <PhaseIcon size={14} aria-hidden /> {phase.label}
          </span>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500">Giacenza</p>
            <p className="mt-1 inline-flex items-baseline gap-1 tabular-nums">
              <span
                className={`text-3xl font-semibold tracking-tight text-zinc-900 transition-transform duration-500 motion-reduce:transition-none dark:text-zinc-50 ${deltaVisible ? "scale-[1.03]" : "scale-100"}`}
              >
                {qty}
              </span>
              <span className="text-sm font-medium text-zinc-500">pz</span>
            </p>
          </div>

          {delta ? (
            <div
              className={`rounded-xl border px-3 py-2 text-center text-sm font-bold tabular-nums transition-all duration-500 motion-reduce:transition-none ${deltaTone} ${deltaVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"}`}
            >
              {delta}
            </div>
          ) : (
            <span className="w-px shrink opacity-0" aria-hidden />
          )}
        </div>

        {caption ? (
          <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
