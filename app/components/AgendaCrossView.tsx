"use client";

import { useCallback, useId, useMemo, useState, type FormEvent } from "react";
import { CalendarSearch, Info } from "lucide-react";

export type AgendaCrossDoctor = {
  id: string;
  name: string;
  color: string;
};

export type AgendaCrossRoom = {
  id: string;
  name: string;
  code: string;
};

/** Suggerimenti prestazione (solo UI). */
const PRESTAZIONI_SUGGERIMENTI: string[] = [
  "Visita cardiologica",
  "Visita dermatologica",
  "Prima visita ortopedica",
  "Controllo neurologico",
  "ECG",
  "Holter pressorio",
  "Elettromiografia",
  "Infiltrazione articolare",
  "Videodermatoscopia",
];

export type AgendaCrossSlot = {
  id: string;
  date: Date;
  startLabel: string;
  endLabel: string;
  roomCode: string;
  roomName: string;
  doctorName: string;
  doctorColor: string;
  scoreLabel?: string;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function localDayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildDemoSlots(
  prestazione: string,
  selectedDoctorId: string | null,
  anchor: Date,
  doctorList: AgendaCrossDoctor[],
  roomList: AgendaCrossRoom[],
): AgendaCrossSlot[] {
  const picks =
    selectedDoctorId === null || selectedDoctorId === ""
      ? doctorList
      : doctorList.filter((d) => d.id === selectedDoctorId);
  const doctorsPick = picks.length > 0 ? picks : doctorList;

  const templates: { dayOffset: number; startH: number; startM: number; durationMin: number; roomIdx: number }[] = [
    { dayOffset: 0, startH: 9, startM: 0, durationMin: 30, roomIdx: 0 },
    { dayOffset: 0, startH: 11, startM: 15, durationMin: 45, roomIdx: 1 },
    { dayOffset: 1, startH: 8, startM: 30, durationMin: 30, roomIdx: 2 },
    { dayOffset: 1, startH: 15, startM: 0, durationMin: 40, roomIdx: 0 },
    { dayOffset: 2, startH: 10, startM: 0, durationMin: 50, roomIdx: 1 },
    { dayOffset: 3, startH: 14, startM: 30, durationMin: 35, roomIdx: 2 },
    { dayOffset: 4, startH: 9, startM: 45, durationMin: 25, roomIdx: 1 },
  ];

  return templates.map((t, i) => {
    const day = addDays(anchor, t.dayOffset);
    const startTotal = t.startH * 60 + t.startM;
    const endTotal = startTotal + t.durationMin;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    const room = roomList[t.roomIdx % roomList.length] ?? roomList[0];
    const doc = doctorsPick[i % doctorsPick.length] ?? doctorsPick[0];
    if (!room || !doc) {
      return null;
    }
    const id = `demo-slot-${day.toISOString().slice(0, 10)}-${i}-${prestazione.slice(0, 8)}`;
    return {
      id,
      date: day,
      startLabel: `${pad2(t.startH)}:${pad2(t.startM)}`,
      endLabel: `${pad2(endH)}:${pad2(endM)}`,
      roomCode: room.code,
      roomName: room.name,
      doctorName: doc.name,
      doctorColor: doc.color,
      scoreLabel: i === 0 ? "Tutto il team" : i < 3 ? "Buona aderenza" : undefined,
    };
  }).filter(Boolean) as AgendaCrossSlot[];
}

type AgendaCrossViewProps = {
  dayLabel: string;
  isToday: boolean;
  /** Giorno di riferimento agenda (ancla slot dimostrativi). */
  referenceDate: Date;
  doctors: AgendaCrossDoctor[];
  rooms: AgendaCrossRoom[];
};

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/**
 * Incrocia!: indichi prestazione e (opzionale) specialista — risultato = slot potenziali (solo UI, dati dimostrativi).
 */
export default function AgendaCrossView({
  dayLabel,
  isToday,
  referenceDate,
  doctors,
  rooms,
}: AgendaCrossViewProps) {
  const formId = useId();
  const disclaimerId = `${formId}-disclaimer`;
  const [prestazione, setPrestazione] = useState("");
  const [specialistaId, setSpecialistaId] = useState<string>("");
  const [slots, setSlots] = useState<AgendaCrossSlot[] | null>(null);
  const [submittedPrestazione, setSubmittedPrestazione] = useState("");
  const [submittedSpecialist, setSubmittedSpecialist] = useState<string | null>(null);

  const canSubmit = prestazione.trim().length > 0 && doctors.length > 0 && rooms.length > 0;

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      const docId = specialistaId === "" ? null : specialistaId;
      const next = buildDemoSlots(prestazione.trim(), docId, referenceDate, doctors, rooms);
      setSlots(next);
      setSubmittedPrestazione(prestazione.trim());
      setSubmittedSpecialist(docId);
    },
    [canSubmit, prestazione, specialistaId, referenceDate, doctors, rooms],
  );

  const groupedSlots = useMemo(() => {
    if (!slots?.length) return [];
    const map = new Map<string, AgendaCrossSlot[]>();
    for (const s of slots) {
      const key = localDayKey(s.date);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-slate-900">
            <span lang="it" className="font-extrabold tracking-tight">
              Incrocia!
            </span>
            <span className="mx-1.5 font-normal text-slate-300" aria-hidden>
              ·
            </span>
            <span className="capitalize">{dayLabel}</span>
            {isToday ? (
              <span className="ml-1.5 inline-block rounded-md bg-slate-900 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-white">
                Oggi
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Indica la prestazione e, se vuoi, lo specialista: ti mostriamo degli slot potenziali (interfaccia di anteprima).
          </p>
        </div>
        <p
          id={disclaimerId}
          className="flex max-w-md items-start gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-1.5 text-[11px] leading-snug text-amber-950"
        >
          <Info size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
          <span>
            Risultati <strong>dimostrativi</strong>: non sono collegati ancora al calcolo reale di disponibilità.
          </span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-y-contain">
        <div className="mx-auto grid max-w-3xl gap-6 p-3 sm:p-4 lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4 shadow-sm"
            aria-describedby={disclaimerId}
          >
            <div>
              <label htmlFor={`${formId}-prestazione`} className="text-xs font-semibold text-slate-800">
                Prestazione da eseguire
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">Obbligatoria. Puoi scegliere dai suggerimenti o scrivere liberamente.</p>
              <input
                id={`${formId}-prestazione`}
                name="prestazione"
                type="text"
                value={prestazione}
                onChange={(e) => setPrestazione(e.target.value)}
                list={`${formId}-prestazioni-list`}
                autoComplete="off"
                placeholder="es. Visita cardiologica, ECG…"
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
              />
              <datalist id={`${formId}-prestazioni-list`}>
                {PRESTAZIONI_SUGGERIMENTI.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor={`${formId}-specialista`} className="text-xs font-semibold text-slate-800">
                Specialista
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">Opzionale. Se lasci “Nessuna preferenza”, mostriamo più combinazioni possibili.</p>
              <select
                id={`${formId}-specialista`}
                name="specialista"
                value={specialistaId}
                onChange={(e) => setSpecialistaId(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
              >
                <option value="">Nessuna preferenza — tutti gli specialisti idonei</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalendarSearch size={18} strokeWidth={2} aria-hidden />
              Trova slot potenziali
            </button>
            {doctors.length === 0 || rooms.length === 0 ? (
              <p className="text-xs text-red-700">Configurazione demo incompleta (mancano specialisti o sale).</p>
            ) : null}
          </form>

          <div className="min-h-48 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {slots === null ? (
              <div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
                <CalendarSearch className="mb-2 h-10 w-10 text-slate-200" strokeWidth={1.25} aria-hidden />
                <p className="text-sm font-medium text-slate-700">Nessun risultato ancora</p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Compila la prestazione e premi <strong>Trova slot potenziali</strong> per vedere l’anteprima degli slot.
                </p>
              </div>
            ) : (
              <div>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-semibold text-slate-900">Slot potenziali</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">“{submittedPrestazione}”</span>
                    {submittedSpecialist ? (
                      <>
                        {" "}
                        · con{" "}
                        <span className="font-medium text-slate-800">
                          {doctors.find((d) => d.id === submittedSpecialist)?.name ?? "specialista scelto"}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500"> · senza vincolo su uno specialista</span>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{slots.length} proposte (demo)</p>
                </div>

                <ul className="mt-4 space-y-5">
                  {groupedSlots.map(([dayKey, daySlots]) => (
                    <li key={dayKey}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {dateFmt.format(daySlots[0]?.date ?? new Date())}
                      </p>
                      <ul className="space-y-2">
                        {daySlots.map((s) => (
                          <li key={s.id}>
                            <article className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition hover:border-slate-200">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                                <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                                  {s.startLabel}–{s.endLabel}
                                </p>
                                {s.scoreLabel ? (
                                  <span className="rounded-md border border-slate-200 bg-white px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    {s.scoreLabel}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: s.doctorColor }}
                                    aria-hidden
                                  />
                                  <span className="font-medium text-slate-800">{s.doctorName}</span>
                                </span>
                                <span className="text-slate-300" aria-hidden>
                                  ·
                                </span>
                                <span>
                                  <span className="font-mono font-semibold text-slate-700">{s.roomCode}</span>
                                  <span className="text-slate-500"> {s.roomName}</span>
                                </span>
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
