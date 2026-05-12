"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Search, Stethoscope, UserRound, X } from "lucide-react";

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  category: "Servizi" | "Profilo" | "Recensioni" | "Prenotazione";
};

const SEARCH_ITEMS: SearchItem[] = [
  { id: "doctor-name", title: "Dott.ssa Elena Marchetti", subtitle: "Medicina generale · Medico chirurgo specialista", category: "Profilo" },
  { id: "doctor-location", title: "Via Garibaldi 42, Milano", subtitle: "Studio principale", category: "Profilo" },
  { id: "doctor-languages", title: "Lingue: Italiano, Inglese, Francese", subtitle: "Comunicazione in piu lingue", category: "Profilo" },
  { id: "service-first", title: "Prima visita", subtitle: "Valutazione completa iniziale", category: "Servizi" },
  { id: "service-control", title: "Visita di controllo", subtitle: "Follow-up periodico", category: "Servizi" },
  { id: "service-video", title: "Videovisita", subtitle: "Consulto online sicuro", category: "Servizi" },
  { id: "service-prescription", title: "Rinnovo prescrizioni", subtitle: "Gestione farmaci e impegnative", category: "Servizi" },
  { id: "service-certificate", title: "Certificato medico", subtitle: "Sport, scuola o lavoro", category: "Servizi" },
  { id: "service-exams", title: "Richiesta esami diagnostici", subtitle: "Prescrizione accertamenti utili", category: "Servizi" },
  { id: "review-score", title: "Valutazione media 4.9/5", subtitle: "127 recensioni pazienti", category: "Recensioni" },
  { id: "booking-open", title: "Apre oggi alle 9:00", subtitle: "Lun-Ven 9-18 · Sab 9-13", category: "Prenotazione" },
  { id: "booking-type", title: "Prenota in studio o videovisita", subtitle: "Slot disponibili in calendario", category: "Prenotazione" },
];

const POPULAR_QUERIES = [
  "prima visita",
  "videovisita",
  "rinnovo prescrizioni",
  "recensioni",
  "via garibaldi",
];

const CATEGORY_STYLES: Record<SearchItem["category"], string> = {
  Servizi: "bg-sky-50 text-sky-700 border-sky-200",
  Profilo: "bg-slate-100 text-slate-700 border-slate-200",
  Recensioni: "bg-amber-50 text-amber-700 border-amber-200",
  Prenotazione: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setQuery(""), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) =>
      `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ricerca completa"
        className="h-full w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-full bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center gap-2 sm:gap-3 bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-3">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca medici, servizi, orari, recensioni..."
                className="flex-1 text-sm sm:text-base text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Esc</span>
                <X size={16} className="sm:hidden" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock3 size={12} />
                Ricerche veloci
              </span>
              {POPULAR_QUERIES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <Stethoscope size={12} />
                {filteredItems.length} risultati
              </div>

              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{item.subtitle}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${CATEGORY_STYLES[item.category]}`}
                      >
                        {item.category}
                      </span>
                    </div>
                  </button>
                ))}

                {filteredItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                    <UserRound size={18} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Nessun risultato trovato</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Prova con termini piu generali come servizio, visita o posizione.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
