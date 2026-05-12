"use client";

import { useEffect, useState } from "react";
import {
  MapPin, Clock, Video, Star, Shield, MessageCircle,
  ChevronLeft, ChevronRight, Languages, Sparkles, ThumbsUp, Phone, Expand,
} from "lucide-react";

const STUDIO_PHONE_DISPLAY = "02 1234567";
const STUDIO_PHONE_TEL = "+39021234567";
const STUDIO_GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
    alt: "Studio medico moderno",
  },
  {
    src: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80",
    alt: "Sala visita",
  },
  {
    src: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=1200&q=80",
    alt: "Accoglienza dello studio",
  },
  {
    src: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    alt: "Dettaglio attrezzature mediche",
  },
];

const REVIEWS = [
  {
    name: "Marco T.",
    date: "2026-03-14",
    stars: 5,
    text: "Professionista eccellente, molto disponibile e attenta alle mie esigenze. Mi ha spiegato tutto con chiarezza e non si è mai fatta aspettare. Consigliatissima.",
    visit: "Visita generica",
  },
  {
    name: "Laura M.",
    date: "2026-02-21",
    stars: 5,
    text: "Finalmente una dottoressa che ascolta davvero. La prenotazione online è stata semplicissima e l'attesa nello studio è stata minima. Tornerò senza dubbio.",
    visit: "Check-up completo",
  },
  {
    name: "Roberto A.",
    date: "2026-01-09",
    stars: 4,
    text: "Studio ben organizzato e personale gentile. La dottoressa è precisa e competente. Tempi di attesa brevi rispetto ad altri studi medici che ho visitato.",
    visit: "Rinnovo prescrizioni",
  },
];

const SERVICE_CARDS = [
  {
    id: "prima-visita",
    name: "Prima visita",
    summary: "Valutazione completa iniziale e piano personalizzato.",
    description:
      "Include anamnesi dettagliata, valutazione clinica completa, raccolta documentazione precedente e definizione del percorso di cura o prevenzione piu adatto.",
    price: "€ 60",
  },
  {
    id: "visita-controllo",
    name: "Visita di controllo",
    summary: "Follow-up periodico per monitorare andamento e terapia.",
    description:
      "Controllo clinico mirato per verificare i progressi, aggiornare eventuale terapia e adattare le indicazioni in base all'evoluzione del quadro.",
    price: "€ 45",
  },
  {
    id: "videovisita",
    name: "Videovisita",
    summary: "Consulto online sicuro senza spostamenti.",
    description:
      "Ideale per chiarimenti, follow-up e gestione di sintomi non urgenti. Si svolge su piattaforma protetta con la stessa attenzione della visita in studio.",
    price: "€ 40",
  },
  {
    id: "rinnovo-prescrizioni",
    name: "Rinnovo prescrizioni",
    summary: "Gestione rapida di farmaci e impegnative.",
    description:
      "Revisione della terapia in corso e rinnovo prescrizioni quando appropriato, con verifica di compatibilita e aderenza al trattamento.",
  },
  {
    id: "certificato-medico",
    name: "Certificato medico",
    summary: "Certificazioni per sport, scuola o lavoro.",
    description:
      "Rilascio certificati medici in base al tipo di richiesta e alla normativa vigente, con eventuale indicazione degli accertamenti necessari.",
    price: "€ 25",
  },
  {
    id: "richiesta-esami",
    name: "Richiesta esami diagnostici",
    summary: "Prescrizione e orientamento sugli accertamenti utili.",
    description:
      "Valutazione dei sintomi e della storia clinica per richiedere esami di laboratorio o strumentali pertinenti, evitando accertamenti non necessari.",
    price: "€ 30",
  },
];

export default function DoctorInfo() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lastReviewDate = REVIEWS.reduce((latest, review) => {
    const reviewDate = new Date(review.date);
    return reviewDate > latest ? reviewDate : latest;
  }, new Date(REVIEWS[0].date));

  const openChat = () => {
    window.dispatchEvent(new CustomEvent("openChat"));
  };

  useEffect(() => {
    if (STUDIO_GALLERY.length < 2) {
      return;
    }

    const sliderTimeout = window.setTimeout(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % STUDIO_GALLERY.length);
    }, 10000);

    return () => {
      window.clearTimeout(sliderTimeout);
    };
  }, [currentPhotoIndex]);

  useEffect(() => {
    if (!isGalleryOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGalleryOpen(false);
        return;
      }

      if (event.key === "ArrowRight") {
        setCurrentPhotoIndex((prev) => (prev + 1) % STUDIO_GALLERY.length);
      }

      if (event.key === "ArrowLeft") {
        setCurrentPhotoIndex((prev) => (prev - 1 + STUDIO_GALLERY.length) % STUDIO_GALLERY.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isGalleryOpen]);

  const currentPhoto = STUDIO_GALLERY[currentPhotoIndex];

  return (
    <div className="space-y-4">
      {/* ── Hero card ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-5">
          <div className="flex gap-4 min-w-0 items-start">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="relative w-36 h-36 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm overflow-hidden cursor-zoom-in"
                aria-label="Apri la galleria dello studio a schermo intero"
              >
                {STUDIO_GALLERY.map((photo, index) => (
                  <img
                    key={`avatar-${photo.src}`}
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                      index === currentPhotoIndex ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
              </button>

            </div>
            <div className="min-w-0 pt-0.5">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">
                Dott.ssa Elena Marchetti
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Medicina generale · Medico chirurgo specialista
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={12} className="text-slate-600" fill="currentColor" />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700">4.9</span>
                <span className="text-xs text-slate-400">127 recensioni</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <ThumbsUp size={11} className="text-slate-600" />
                  97%
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(true)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                  aria-label="Apri la galleria a schermo intero"
                >
                  <Expand size={14} />
                </button>
                <button
                  type="button"
                  onClick={openChat}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>chatta</span>
                  <span className="text-[10px] font-semibold text-slate-200 border border-slate-500/70 bg-slate-800 rounded px-1 py-0.5 leading-none">
                    J
                  </span>
                </button>
                <a
                  href={`tel:${STUDIO_PHONE_TEL}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0"
                >
                  <Phone size={14} />
                  chiama
                </a>
                <a
                  href={`tel:${STUDIO_PHONE_TEL}`}
                  className="text-sm font-semibold text-slate-800 tabular-nums hover:text-slate-600 transition-colors"
                >
                  {STUDIO_PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
              <Shield size={10} className="text-slate-700" />
              Accetta nuovi pazienti
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
              <Sparkles size={10} className="text-slate-600" />
              prenotazione con AI
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
              <Video size={10} className="text-slate-700" />
              Videovisita disponibile
            </span>
          </div>

        </div>
      </div>

      {/* ── About ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-bold text-slate-700 mb-2.5">Chi è la Dott.ssa Marchetti</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          La Dott.ssa Elena Marchetti è medico di medicina generale con oltre 14 anni di
          esperienza clinica. Laureatasi con lode presso l&apos;Università degli Studi di Milano,
          ha conseguito una specializzazione in Medicina Preventiva e del Territorio.
        </p>
        {aboutExpanded && (
          <>
            <p className="text-sm text-slate-500 leading-relaxed mt-2">
              Il suo approccio si fonda sull&apos;ascolto attivo del paziente e sulla medicina
              personalizzata, con particolare attenzione alla prevenzione e alla continuità delle cure.
              Aggiorna costantemente le proprie competenze partecipando a corsi di formazione avanzata.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed mt-2">
              Integra nella pratica clinica strumenti digitali per il monitoraggio dei pazienti cronici,
              favorendo una comunicazione continua con lo studio e una gestione piu tempestiva delle esigenze.
              Collabora inoltre con specialisti del territorio per percorsi multidisciplinari quando necessario.
            </p>
          </>
        )}
        <button
          type="button"
          onClick={() => setAboutExpanded((prev) => !prev)}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-semibold mt-3 transition-colors cursor-pointer"
        >
          {aboutExpanded ? "Mostra meno" : "Leggi di più"}{" "}
          <ChevronRight
            size={12}
            className={`transition-transform ${aboutExpanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {/* ── Servizi e tariffe ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Servizi</h2>
        <p className="text-xs text-slate-400 mb-3">
          Seleziona un servizio per vedere la descrizione completa.
        </p>

        <div className="grid sm:grid-cols-2 gap-2.5">
          {SERVICE_CARDS.map((service) => {
            const isOpen = selectedService === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => setSelectedService((prev) => (prev === service.id ? null : service.id))}
                className={`text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                  isOpen
                    ? "border-slate-500 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{service.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{service.summary}</p>
                  </div>
                  {service.price && (
                    <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                      {service.price}
                    </span>
                  )}
                </div>

                {isOpen && (
                  <p className="text-xs text-slate-600 leading-relaxed mt-2 pt-2 border-t border-slate-200">
                    {service.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recensioni ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-700">Recensioni dei pazienti</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ultima recensione: {dateFormatter.format(lastReviewDate)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Star size={13} className="text-slate-600" fill="currentColor" />
            <span className="text-sm font-bold text-slate-700">4.9</span>
            <span className="text-xs text-slate-400">/ 5 · 127 voti</span>
          </div>
        </div>

        {/* Rating bar summary */}
        <div className="space-y-1.5 mb-5">
          {[
            { stars: 5, pct: 87 },
            { stars: 4, pct: 10 },
            { stars: 3, pct: 2 },
            { stars: 2, pct: 1 },
            { stars: 1, pct: 0 },
          ].map(({ stars, pct }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-5 text-right">{stars}</span>
              <Star size={10} className="text-slate-500 shrink-0" fill="currentColor" />
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-7">{pct}%</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {REVIEWS.map((r) => (
            <div key={`${r.name}-${r.date}`} className="border-t border-slate-50 pt-4 first:border-0 first:pt-0">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-700 text-xs font-bold">
                      {r.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-700">{r.name}</p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full leading-none">
                        Verificata
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{dateFormatter.format(new Date(r.date))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-600">{r.stars}</span>
                  {[...Array(r.stars)].map((_, i) => (
                    <Star key={i} size={11} className="text-slate-600" fill="currentColor" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>

        <button className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-semibold mt-4 transition-colors cursor-pointer">
          Vedi tutte le 127 recensioni <ChevronRight size={12} />
        </button>
      </div>

      {isGalleryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8 flex items-center justify-center"
          onClick={() => setIsGalleryOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              className="absolute -top-10 right-0 text-white/90 hover:text-white text-sm font-semibold cursor-pointer"
            >
              Chiudi
            </button>

            <button
              type="button"
              onClick={() =>
                setCurrentPhotoIndex((prev) => (prev - 1 + STUDIO_GALLERY.length) % STUDIO_GALLERY.length)
              }
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/65 transition-colors cursor-pointer"
              aria-label="Foto precedente"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % STUDIO_GALLERY.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/65 transition-colors cursor-pointer"
              aria-label="Foto successiva"
            >
              <ChevronRight size={20} />
            </button>

            <img
              src={currentPhoto.src}
              alt={currentPhoto.alt}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />

            <div className="mt-4 flex items-center justify-center gap-2">
              {STUDIO_GALLERY.map((photo, index) => (
                <button
                  key={`${photo.src}-fullscreen-dot`}
                  type="button"
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`h-2 w-2 rounded-full transition-colors cursor-pointer ${
                    index === currentPhotoIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Mostra la foto ${index + 1} a schermo intero`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
