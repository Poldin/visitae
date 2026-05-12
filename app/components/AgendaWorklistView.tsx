"use client";

import { Printer } from "lucide-react";

export type AgendaWorklistItem = {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  patient: string;
  doctorName: string;
  doctorColor: string;
  roomCode: string;
  roomName: string;
};

type AgendaWorklistViewProps = {
  dayLabel: string;
  isToday: boolean;
  items: AgendaWorklistItem[];
  formatTimeRange: (start: number, end: number) => string;
};

/**
 * Vista “lista di lavoro”: prestazioni del giorno selezionato in ordine cronologico.
 */
export default function AgendaWorklistView({
  dayLabel,
  isToday,
  items,
  formatTimeRange,
}: AgendaWorklistViewProps) {
  const visitCount = items.length;
  const visitCountLabel = visitCount === 1 ? "visita prevista" : "visite previste";

  return (
    <div
      id="agenda-worklist-print-root"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-3 py-2.5 sm:px-4 print:border-slate-300">
        <div
          className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1"
          aria-label={`${dayLabel}, ${visitCount} ${visitCountLabel}`}
        >
          <p className="text-sm font-semibold capitalize leading-snug text-slate-900 print:text-black">
            <span>{dayLabel}</span>
            {isToday ? (
              <span className="ml-1.5 inline-block rounded-md bg-slate-900 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-white print:border print:border-black print:bg-white print:text-black">
                Oggi
              </span>
            ) : null}
          </p>
          <span
            className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 print:bg-black"
            aria-hidden
          />
          <p className="text-xs font-medium leading-snug text-slate-600 print:text-black">
            <span className="tabular-nums text-slate-900 print:text-black">{visitCount}</span>
            <span className="text-slate-500 print:text-black"> {visitCountLabel}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 print:hidden"
        >
          <Printer size={14} strokeWidth={2} className="text-slate-500" aria-hidden />
          Stampa
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-y-contain p-3 sm:p-4 print:overflow-visible print:p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50/80 px-4 py-12 text-center print:bg-transparent">
            <p className="text-sm font-medium text-slate-700 print:text-black">Nessuna prestazione in agenda</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500 print:text-black">
              Per questo giorno non risultano prestazioni con i filtri attuali (specialisti e sale).
            </p>
          </div>
        ) : (
          <ol className="mx-auto max-w-3xl space-y-4 print:max-w-none" aria-label="Prestazioni in ordine cronologico">
            {items.map((item, index) => (
              <li key={item.id}>
                <article className="flex gap-3 py-1 print:py-2 print:break-inside-avoid">
                  <div className="flex w-8 shrink-0 flex-col items-center text-center print:w-6">
                    <span className="text-[10px] font-bold tabular-nums text-slate-400 print:text-black">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 print:text-black">
                        {formatTimeRange(item.startHour, item.endHour)}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 print:text-black">{item.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 print:text-black">
                      <span className="font-medium text-slate-800 print:font-semibold">{item.patient}</span>
                      <span className="text-slate-400 print:text-black"> · </span>
                      <span>{item.doctorName}</span>
                      <span className="text-slate-400 print:text-black"> · </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700 print:text-black">
                        {item.roomCode}
                      </span>
                      <span className="text-slate-500 print:text-black"> ({item.roomName})</span>
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
