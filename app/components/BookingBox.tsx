"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Building2, Video,
  CheckCircle2, CalendarCheck, Clock, MapPin, RotateCcw, MessageCircle,
} from "lucide-react";
import BookingFlowDialog from "./BookingFlowDialog";

const MONTHS = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const DAYS_FULL = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const FULL_MORNING = ["08:30","09:00","09:30","10:00","10:30","11:00","11:30"];
const FULL_AFTERNOON = ["14:30","15:00","15:30","16:00","16:30","17:00","17:30"];

function getFullSchedule(date: Date): string[] {
  const dow = date.getDay();
  if (dow === 0) return [];
  return dow === 6 ? FULL_MORNING : [...FULL_MORNING, ...FULL_AFTERNOON];
}

function getAvailableSlots(date: Date): string[] {
  const dow = date.getDay();
  if (dow === 0) return [];
  const n = date.getDate() + date.getMonth() * 31 + (date.getFullYear() - 2025) * 366;
  if (n % 7 === 3) return [];
  const slots: string[] = [];
  FULL_MORNING.forEach((s, i) => { if ((n + i * 3) % 5 !== 0) slots.push(s); });
  if (dow !== 6) {
    FULL_AFTERNOON.forEach((s, i) => { if ((n * 2 + i * 3 + 1) % 5 !== 0) slots.push(s); });
  }
  return slots;
}

type Status = "available" | "booked" | "none" | "past";

function slotStatus(date: Date, time: string, now: Date): Status {
  if (date < now) return "past";
  const full = getFullSchedule(date);
  if (!full.includes(time)) return "none";
  return getAvailableSlots(date).includes(time) ? "available" : "booked";
}

function dk(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function fmt(d: Date) { return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }

type VisitType = "studio" | "video";

export default function BookingBox() {
  const now = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const [startDay, setStartDay] = useState(() => new Date(now));
  const [selDate, setSelDate]   = useState<Date | null>(null);
  const [selSlot, setSelSlot]   = useState<string | null>(null);
  const [vtype, setVtype]       = useState<VisitType>("studio");
  const [address, setAddress] = useState("Via Garibaldi 42");
  const [doctor, setDoctor] = useState("Dott.ssa Rossi");
  const [reason, setReason] = useState("Visita generica / Check-up");
  const [firstVisit, setFirstVisit] = useState(true);
  const [confirmed, setConfirmed]   = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [daysSlideDirection, setDaysSlideDirection] = useState<"next" | "prev" | null>(null);

  const openChat = () => {
    window.dispatchEvent(new CustomEvent("openChat"));
  };

  // 4 visible day columns
  const visible = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      return d;
    }), [startDay]);

  const canPrev = startDay.getTime() > now.getTime();

  const prevPage = () => {
    const d = new Date(startDay);
    d.setDate(d.getDate() - 4);
    setDaysSlideDirection("prev");
    if (d < now) setStartDay(new Date(now)); else setStartDay(d);
  };
  const nextPage = () => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + 4);
    setDaysSlideDirection("next");
    setStartDay(d);
  };

  useEffect(() => {
    if (!daysSlideDirection) return;
    const timeoutId = window.setTimeout(() => {
      setDaysSlideDirection(null);
    }, 340);
    return () => window.clearTimeout(timeoutId);
  }, [daysSlideDirection]);

  const onSlot = (date: Date, time: string) => {
    const isSame =
      selSlot === time && selDate !== null && dk(date) === dk(selDate);
    if (isSame) {
      setSelDate(null);
      setSelSlot(null);
      setDialogOpen(false);
    } else {
      setSelDate(date);
      setSelSlot(time);
      setDialogOpen(true);
    }
    setConfirmed(false);
  };


  // ── Confirmed view ─────────────────────────────────────────────
  if (confirmed && selDate && selSlot) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <CheckCircle2 size={30} className="text-slate-700" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-0.5">Prenotazione confermata!</h2>
        <p className="text-xs text-slate-400 mb-5">Riceverai conferma via email e SMS</p>

        <div className="w-full bg-slate-100 rounded-xl p-4 text-left space-y-2.5 mb-5">
          {[
            { Icon: CalendarCheck, label: "Data",    value: fmt(selDate) },
            { Icon: Clock,         label: "Orario",  value: selSlot },
            {
              Icon: vtype === "studio" ? MapPin : Video,
              label: "Modalità",
              value: vtype === "studio" ? "In studio · Via Garibaldi 42" : "Videovisita online",
            },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={14} className="text-slate-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 leading-none">{label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setConfirmed(false); setSelDate(null); setSelSlot(null); setDialogOpen(false); }}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw size={12} /> Modifica prenotazione
        </button>
      </div>
    );
  }

  // ── Booking view ───────────────────────────────────────────────
  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:max-h-[calc(100vh-3.5rem)] lg:flex lg:flex-col">
        {/* Header */}
        <div className="border-slate-100 flex items-center justify-between gap-3 px-5 pt-5">
          <h2 className="text-base font-bold text-slate-800">Prenota</h2>
          <div className="flex items-center gap-2">
            {([
              { v: "studio", label: "In studio", Icon: Building2 },
              { v: "video", label: "Video", Icon: Video },
            ] as const).map(({ v, label, Icon }) => {
              const selected = vtype === v;
              return (
                <button
                  key={v}
                  onClick={() => setVtype(v)}
                  aria-label={label}
                  className={`h-8 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                    selected
                      ? "px-2.5 gap-1.5 bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "w-8 border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={13} />
                  {selected && <span>{label}</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={openChat}
              aria-label="Apri chat"
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
            >
              <MessageCircle size={13} />
            </button>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4 lg:overflow-y-auto">
          {/* Detail selectors */}
          <div className="space-y-2">
            <div className="flex items-center flex-wrap gap-1 text-xs text-slate-600">
              <div className="relative w-fit">
                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-fit appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <option>Via Garibaldi 42</option>
                  <option>Via Mazzini 18</option>
                  <option>Piazza Duomo 7</option>
                  <option>Ambulatorio San Carlo</option>
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
              </div>
              <div className="relative w-fit">
                <select
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  className="w-fit appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <option>Dott.ssa Rossi</option>
                  <option>Dott. Bianchi</option>
                  <option>Dott.ssa Verdi</option>
                  <option>Dott. Neri</option>
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
              </div>
              <div className="relative w-fit">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-fit appearance-none bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <option>Visita generica / Check-up</option>
                  <option>Controllo periodico</option>
                  <option>Dolore acuto</option>
                  <option>Secondo parere</option>
                  <option>Piano terapeutico</option>
                </select>
                <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ── Availability grid ──────────────────────────── */}
          <div className="-mx-5 overflow-hidden">
            {/* Scrollable slot table */}
            <div>
              <table className="w-full border-collapse">
                {/* Sticky day headers */}
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-200">
                    {visible.map((d, i) => {
                      const isSelCol = selDate ? dk(d) === dk(selDate) : false;
                      return (
                        <th key={dk(d)} className={`text-center py-1 px-1 font-normal border-r border-slate-100 last:border-r-0 ${
                          isSelCol ? "bg-slate-100" : ""
                        }`}>
                          <div className="flex items-center justify-between">
                            {i === 0 ? (
                              <button
                                onClick={prevPage}
                                disabled={!canPrev}
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                  canPrev ? "text-slate-500 hover:bg-slate-300 hover:text-slate-800" : "text-slate-200 cursor-default"
                                }`}
                              >
                                <ChevronLeft size={11} />
                              </button>
                            ) : (
                              <span className="w-4 h-4" />
                            )}

                            <p className={`text-[13px] font-medium leading-tight whitespace-nowrap ${
                              isSelCol ? "text-slate-800" : "text-slate-500"
                            }`}>
                              <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                {DAYS_SHORT[d.getDay()]}
                              </span>
                              {d.getDate()} {MONTHS_SHORT[d.getMonth()]}
                            </p>

                            {i === visible.length - 1 ? (
                              <button
                                onClick={nextPage}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                <ChevronRight size={11} />
                              </button>
                            ) : (
                              <span className="w-4 h-4" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody
                  key={`${startDay.toISOString()}-${daysSlideDirection ?? "none"}`}
                  className={`${
                    daysSlideDirection === "next"
                      ? "booking-days-anim-next"
                      : daysSlideDirection === "prev"
                        ? "booking-days-anim-prev"
                        : ""
                  }`}
                >
                  {[...FULL_MORNING, ...FULL_AFTERNOON].map((time) => (
                    <tr key={time} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      {visible.map((d) => {
                        const s = slotStatus(d, time, now);
                        const isSel = selDate && dk(d) === dk(selDate) && selSlot === time;
                        const isSelCol = selDate ? dk(d) === dk(selDate) : false;
                        return (
                          <td key={dk(d)} className={`text-center py-0.5 px-1 border-r border-slate-50 last:border-r-0 ${
                            isSelCol ? "bg-slate-100/60" : ""
                          }`}>
                            {s === "none" || s === "past" ? (
                              <span className="text-[12px] font-light text-slate-200 select-none">—</span>
                            ) : s === "booked" ? (
                              <span className="text-[12px] font-light text-slate-300 line-through select-none">{time}</span>
                            ) : (
                              <button
                                onClick={() => onSlot(d, time)}
                                className={`text-[12px] font-normal px-2.5 py-1 rounded-full transition-all inline-flex items-center justify-center cursor-pointer ${
                                  isSel
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 hover:text-slate-900"
                                }`}
                              >
                                {time}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <BookingFlowDialog
        open={dialogOpen && !!selDate && !!selSlot}
        dateLabel={selDate ? fmt(selDate) : ""}
        slot={selSlot ?? ""}
        visitType={vtype}
        priceLabel={vtype === "video" ? "€ 40" : "€ 60"}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => {
          setConfirmed(true);
          setDialogOpen(false);
        }}
      />
    </>
  );
}
