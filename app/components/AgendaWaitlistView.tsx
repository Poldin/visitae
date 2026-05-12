"use client";

import { Mail, Phone, Users } from "lucide-react";

export type WaitlistRowStatus = "waiting" | "called" | "no_show";

export type WaitlistPriority = "normal" | "medium" | "high" | "urgent";

export type AgendaWaitlistRow = {
  id: string;
  patient: string;
  /** Data e ora in cui il paziente è stato messo in lista (testo dimostrativo). */
  insertedAt: string;
  /**
   * Solo la data di inserimento (`YYYY-MM-DD`, calendario locale) per il conteggio giorni fino a oggi.
   */
  insertedOn: string;
  /**
   * Data e ora dell’appuntamento già confermato.
   * La lista d’attesa serve a cercare un anticipo se si libera un posto prima.
   */
  currentVisitAt: string;
  priority: WaitlistPriority;
  prestazione: string;
  doctorName: string;
  doctorColor: string;
  status: WaitlistRowStatus;
  /** Numero mostrato (es. con spazi); per `tel:` si normalizza con prefisso +39. */
  phone: string;
  email: string;
};

const STATUS_LABEL: Record<WaitlistRowStatus, string> = {
  waiting: "In attesa",
  called: "Chiamato",
  no_show: "Non presentato",
};

const PRIORITY_LABEL: Record<WaitlistPriority, string> = {
  normal: "Normale",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_PILL: Record<WaitlistPriority, string> = {
  normal: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-orange-100 text-orange-900",
  urgent: "bg-red-100 text-red-900",
};

const PRIORITY_ORDER: Record<WaitlistPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  normal: 3,
};

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Giorni di calendario dalla data di inserimento (inizio giorno) a `today` (inizio giorno). */
export function calendarDaysFromInsertedOnToToday(insertedOnYmd: string, today: Date): number {
  const parts = insertedOnYmd.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const inserted = new Date(y, m - 1, day);
  return Math.round((startOfLocalDay(today) - startOfLocalDay(inserted)) / 86400000);
}

/** Etichetta breve: giorni trascorsi dall’inserimento fino a oggi. */
function formatDaysUntilTodayLabel(days: number): string {
  if (days < 0) return "—";
  if (days === 0) return "oggi";
  if (days === 1) return "da 1 giorno";
  return `da ${days} giorni`;
}

const dateTimeFormatterIt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatItDateTime(d: Date): string {
  return dateTimeFormatterIt.format(d);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `dayOffset`: giorni rispetto al calendario di `today` (0 = oggi, -1 = ieri, +3 = tra 3 giorni). */
function dateAtCalendarOffset(today: Date, dayOffset: number, hour: number, minute: number): Date {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, hour, minute, 0, 0);
  return base;
}

/** Link `tel:` per numeri italiani in visualizzazione umana. */
function phoneToTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("39")) return `+${digits}`;
  return `+39${digits}`;
}

type WaitlistDemoSpec = {
  id: string;
  patient: string;
  /** Giorni prima di oggi (0 = inserito oggi). */
  insertedDaysAgo: number;
  insertedHour: number;
  insertedMinute: number;
  /** Giorni dopo oggi per l’appuntamento già fissato (0 = visita oggi). */
  visitDaysFromToday: number;
  visitHour: number;
  visitMinute: number;
  priority: WaitlistPriority;
  prestazione: string;
  doctorName: string;
  doctorColor: string;
  status: WaitlistRowStatus;
  phone: string;
  email: string;
};

function rowFromSpec(today: Date, spec: WaitlistDemoSpec): AgendaWaitlistRow {
  const ins = dateAtCalendarOffset(today, -spec.insertedDaysAgo, spec.insertedHour, spec.insertedMinute);
  const vis = dateAtCalendarOffset(today, spec.visitDaysFromToday, spec.visitHour, spec.visitMinute);
  return {
    id: spec.id,
    patient: spec.patient,
    insertedAt: formatItDateTime(ins),
    insertedOn: toYmd(ins),
    currentVisitAt: formatItDateTime(vis),
    priority: spec.priority,
    prestazione: spec.prestazione,
    doctorName: spec.doctorName,
    doctorColor: spec.doctorColor,
    status: spec.status,
    phone: spec.phone,
    email: spec.email,
  };
}

/**
 * Dati demo ancorati al calendario reale (`today`): stessi scenari clinici, date sempre coerenti.
 * Esempi: inserito ieri con visita tra due settimane; inserito stamattina con slot pomeriggio; urgenza con visita tra pochi giorni.
 */
const WAITLIST_DEMO_SPECS: WaitlistDemoSpec[] = [
  {
    id: "w-a",
    patient: "Marini Luca",
    insertedDaysAgo: 0,
    insertedHour: 7,
    insertedMinute: 58,
    visitDaysFromToday: 0,
    visitHour: 11,
    visitMinute: 30,
    priority: "medium",
    prestazione: "Prima visita ortopedia",
    doctorName: "Dr. Bianchi",
    doctorColor: "#34a853",
    status: "called",
    phone: "333 842 1190",
    email: "luca.marini@email.it",
  },
  {
    id: "w-b",
    patient: "Ferretti Giada",
    insertedDaysAgo: 1,
    insertedHour: 14,
    insertedMinute: 25,
    visitDaysFromToday: 12,
    visitHour: 9,
    visitMinute: 15,
    priority: "normal",
    prestazione: "Controllo dermatologico",
    doctorName: "Dr.ssa Rossi",
    doctorColor: "#1a73e8",
    status: "waiting",
    phone: "348 201 7744",
    email: "giada.ferretti@gmail.com",
  },
  {
    id: "w-c",
    patient: "Santoro Enzo",
    insertedDaysAgo: 4,
    insertedHour: 18,
    insertedMinute: 42,
    visitDaysFromToday: 10,
    visitHour: 8,
    visitMinute: 0,
    priority: "high",
    prestazione: "ECG + cardiologo",
    doctorName: "Dr.ssa Rossi",
    doctorColor: "#1a73e8",
    status: "waiting",
    phone: "320 556 9021",
    email: "enzo.santoro@libero.it",
  },
  {
    id: "w-d",
    patient: "Costa Valentina",
    insertedDaysAgo: 2,
    insertedHour: 10,
    insertedMinute: 12,
    visitDaysFromToday: 8,
    visitHour: 14,
    visitMinute: 30,
    priority: "normal",
    prestazione: "Follow-up neurologico",
    doctorName: "Dr.ssa Verdi",
    doctorColor: "#fbbc04",
    status: "waiting",
    phone: "392 118 6630",
    email: "v.costa@icloud.com",
  },
  {
    id: "w-e",
    patient: "Ibba Simone",
    insertedDaysAgo: 0,
    insertedHour: 7,
    insertedMinute: 20,
    visitDaysFromToday: 2,
    visitHour: 10,
    visitMinute: 0,
    priority: "urgent",
    prestazione: "Infiltrazione ginocchio",
    doctorName: "Dr. Neri",
    doctorColor: "#ea4335",
    status: "no_show",
    phone: "347 990 4412",
    email: "simone.ibba@outlook.it",
  },
  {
    id: "w-f",
    patient: "Piras Monica",
    insertedDaysAgo: 0,
    insertedHour: 9,
    insertedMinute: 28,
    visitDaysFromToday: 18,
    visitHour: 16,
    visitMinute: 45,
    priority: "medium",
    prestazione: "Visita oculistica",
    doctorName: "Dr.ssa Verdi",
    doctorColor: "#fbbc04",
    status: "waiting",
    phone: "366 445 2288",
    email: "monica.piras@yahoo.it",
  },
];

function demoRowsForWeekday(weekdayIndex: number, today: Date): AgendaWaitlistRow[] {
  const start = weekdayIndex % 3;
  return WAITLIST_DEMO_SPECS.slice(start, start + 5)
    .map((spec) => rowFromSpec(today, spec))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

type AgendaWaitlistViewProps = {
  dayLabel: string;
  isToday: boolean;
  /** 0 = lunedì (come nella griglia agenda) */
  weekdayIndex: number;
  /** Data “di oggi” per il conteggio giorni dall’inserimento (di solito `new Date()` dall’agenda). */
  today: Date;
};

/**
 * Lista d’attesa in studio: persone in coda per il giorno selezionato (dati demo).
 */
export default function AgendaWaitlistView({ dayLabel, isToday, weekdayIndex, today }: AgendaWaitlistViewProps) {
  const rows = demoRowsForWeekday(weekdayIndex, today);
  const inQueue = rows.filter((r) => r.status === "waiting").length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-3 py-2.5 sm:px-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Users size={16} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Lista d&apos;attesa</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              <span className="capitalize">{dayLabel}</span>
              {isToday ? (
                <span className="ml-1.5 rounded-md bg-slate-900 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
                  Oggi
                </span>
              ) : null}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold tabular-nums text-slate-900">{inQueue}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">in coda</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-y-contain p-3 sm:p-4">
        <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full min-w-[320px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 font-semibold text-slate-600">Paziente</th>
                <th className="hidden px-2 py-2 font-semibold text-slate-600 sm:table-cell">Priorità</th>
                <th
                  className="hidden px-2 py-2 font-semibold text-slate-600 md:table-cell"
                  title="Data e ora di inserimento in lista e giorni trascorsi fino a oggi"
                >
                  Inserito il
                </th>
                <th
                  className="hidden px-2 py-2 font-semibold text-slate-600 lg:table-cell"
                  title="Appuntamento già confermato; in lista per un possibile anticipo"
                >
                  Visita attuale
                </th>
                <th className="hidden px-2 py-2 font-semibold text-slate-600 xl:table-cell">Prestazione</th>
                <th className="hidden px-2 py-2 font-semibold text-slate-600 2xl:table-cell">Specialista</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const daysInList = calendarDaysFromInsertedOnToToday(row.insertedOn, today);
                const daysLabel = formatDaysUntilTodayLabel(daysInList);
                return (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-slate-900">{row.patient}</span>
                    <div className="mt-1 space-y-0.5 text-[10px] leading-snug">
                      <a
                        href={`tel:${phoneToTelHref(row.phone)}`}
                        className="flex items-center gap-1 text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        <Phone size={11} strokeWidth={2} className="shrink-0 text-slate-400" aria-hidden />
                        <span className="tabular-nums">{row.phone}</span>
                      </a>
                      <a
                        href={`mailto:${row.email}`}
                        className="flex items-start gap-1 break-all text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        <Mail size={11} strokeWidth={2} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                        <span>{row.email}</span>
                      </a>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-snug text-slate-500 sm:hidden">
                      <span className="font-medium text-slate-600">{PRIORITY_LABEL[row.priority]}</span>
                      <span className="text-slate-400"> · </span>
                      <span className="tabular-nums">inserito {row.insertedAt}</span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-slate-600">{daysLabel}</span>
                      <br />
                      <span className="tabular-nums text-slate-600">visita {row.currentVisitAt}</span>
                      <span className="text-slate-400"> · </span>
                      {row.prestazione}
                    </p>
                  </td>
                  <td className="hidden px-2 py-2.5 sm:table-cell">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_PILL[row.priority]}`}
                    >
                      {PRIORITY_LABEL[row.priority]}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2.5 md:table-cell">
                    <div className="leading-tight">
                      <div className="tabular-nums text-slate-700">{row.insertedAt}</div>
                      <div className="mt-0.5 text-[10px] font-medium tabular-nums text-slate-500">
                        {daysLabel}
                      </div>
                    </div>
                  </td>
                  <td
                    className="hidden whitespace-nowrap px-2 py-2.5 tabular-nums text-slate-800 lg:table-cell"
                    title="Appuntamento confermato"
                  >
                    {row.currentVisitAt}
                  </td>
                  <td className="hidden min-w-40 truncate px-2 py-2.5 text-slate-700 xl:table-cell" title={row.prestazione}>
                    {row.prestazione}
                  </td>
                  <td className="hidden px-2 py-2.5 2xl:table-cell">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.doctorColor }} aria-hidden />
                      <span className="text-slate-800">{row.doctorName}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.status === "waiting"
                          ? "bg-slate-200 text-slate-800"
                          : row.status === "called"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-rose-100 text-rose-900"
                      }`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
