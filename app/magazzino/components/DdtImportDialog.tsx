"use client";

import { Camera, ChevronDown, Truck, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DdtImportProductsSection, type DdtImportProductRow } from "./DdtImportProductsSection";

export type DdtImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

type DdtFormState = {
  progressiveNumber: string;
  issueDate: string;
  /** Blocco libero: ragione sociale, sede, P.IVA, C.F. cedente */
  cedenteText: string;
  /** Blocco libero: generalità cessionario, indirizzo fatturazione */
  cessionarioText: string;
  /** Blocco libero: vettore/corriere se terzi, altrimenti vuoto o nota */
  trasportatoreText: string;
  optionalDescription: string;
  deliveryAddress: string;
  transportReason: string;
  transportReasonOther: string;
  weightKg: string;
  volumeM3: string;
  pickupDateTime: string;
};

const emptyForm = (): DdtFormState => ({
  progressiveNumber: "",
  issueDate: "",
  cedenteText: "",
  cessionarioText: "",
  trasportatoreText: "",
  optionalDescription: "",
  deliveryAddress: "",
  transportReason: "",
  transportReasonOther: "",
  weightKg: "",
  volumeM3: "",
  pickupDateTime: "",
});

const inputClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/80";
const partyTextareaClass =
  "w-full grow resize-y rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm leading-snug text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/80";
const labelClass = "mb-1 block text-xs font-semibold text-slate-700";
const transportReasonOptions = [
  { value: "", label: "Seleziona..." },
  { value: "vendita", label: "Vendita" },
  { value: "conto_visione", label: "Conto visione" },
  { value: "reso", label: "Reso" },
  { value: "riparazione", label: "Riparazione" },
  { value: "altro", label: "Altro" },
];

export function DdtImportDialog({ open, onClose }: DdtImportDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reasonMenuOpen, setReasonMenuOpen] = useState(false);
  const [ddtDetailsExpanded, setDdtDetailsExpanded] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [form, setForm] = useState<DdtFormState>(emptyForm);
  const [products, setProducts] = useState<DdtImportProductRow[]>([]);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const reasonMenuRef = useRef<HTMLDivElement>(null);

  const patchForm = useCallback((patch: Partial<DdtFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setPickedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    resetForm();
    setReasonMenuOpen(false);
    setDdtDetailsExpanded(false);
    setShowDescription(false);
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!reasonMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!reasonMenuRef.current?.contains(e.target as Node)) {
        setReasonMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [reasonMenuOpen]);

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    setPickedFile(file);
  };

  const canSubmitDdt = useMemo(() => {
    const requiredDataFilled = Boolean(form.progressiveNumber.trim()) && Boolean(form.issueDate);
    const hasValidProduct = products.some((product) => {
      if (!product.name.trim()) return false;
      return product.lots.some((lot) => {
        const q = Number(lot.quantity);
        return Number.isFinite(q) && q > 0;
      });
    });
    return requiredDataFilled && hasValidProduct;
  }, [form.progressiveNumber, form.issueDate, products]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[133] flex items-center justify-center bg-black/40 px-3 py-6 transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />

      <div
        className={`flex h-[95vh] max-h-[95vh] min-h-0 min-w-[70vw] w-[min(95vw,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition duration-200 ease-out will-change-transform ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ddt-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-900">
              <Truck size={20} strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="ddt-import-title" className="text-base font-semibold leading-snug text-slate-900">
                DDT — documento di trasporto
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Carica il DDT (PDF o immagine) o scatta una foto: compileremo automaticamente i campi sottostanti. Puoi anche inserirli a mano secondo i requisiti di legge.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="Chiudi"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-8 pb-4">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} className="text-slate-600" aria-hidden />
                    Carica file
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera size={15} className="text-slate-600" aria-hidden />
                    Scatta foto
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canSubmitDdt}
                  className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  Carica DDT
                </button>
              </div>

              {pickedFile ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900">
                  <span className="font-semibold">File ricevuto:</span> {pickedFile.name}
                  <span className="mt-1 block text-emerald-800/90">
                    L&apos;estrazione automatica dei campi verrà applicata quando il flusso sarà collegato al backend.
                  </span>
                </p>
              ) : null}
            </section>

            <fieldset className="space-y-4">
              <legend className="sr-only">Dati DDT</legend>

              <div className="flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  onClick={() => setDdtDetailsExpanded((v) => !v)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  aria-label={ddtDetailsExpanded ? "Condensa dettagli DDT" : "Espandi dettagli DDT"}
                  title={ddtDetailsExpanded ? "Condensa" : "Espandi"}
                >
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={`transition-transform duration-200 ${ddtDetailsExpanded ? "rotate-180" : "rotate-0"}`}
                  />
                </button>
                <div className="min-w-0 w-full sm:w-1/3 sm:max-w-[min(33.333vw,20rem)]">
                  <label className={labelClass} htmlFor="ddt-numero">
                    Numero progressivo{" "}
                    <span className="font-semibold text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="ddt-numero"
                    type="text"
                    value={form.progressiveNumber}
                    onChange={(e) => patchForm({ progressiveNumber: e.target.value })}
                    autoComplete="off"
                    placeholder="Es. 123/2026"
                    className={inputClass}
                    aria-required="true"
                  />
                </div>
                <div className="w-fit shrink-0">
                  <label className={labelClass} htmlFor="ddt-data-emissione">
                    Data emissione{" "}
                    <span className="font-semibold text-red-600" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="ddt-data-emissione"
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => patchForm({ issueDate: e.target.value })}
                    className={`${inputClass} w-auto min-w-[10.5rem]`}
                    aria-required="true"
                  />
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  ddtDetailsExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="pt-1">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
                    <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
                      <label className={labelClass} htmlFor="ddt-cedente-blocco">
                        Cedente (venditore)
                      </label>
                      <textarea
                        id="ddt-cedente-blocco"
                        value={form.cedenteText}
                        onChange={(e) => patchForm({ cedenteText: e.target.value })}
                        placeholder="Es.: ragione sociale, indirizzo completo della sede, Partita IVA e codice fiscale del venditore…"
                        rows={3}
                        className={partyTextareaClass}
                      />
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
                      <label className={labelClass} htmlFor="ddt-cessionario-blocco">
                        Cessionario (acquirente)
                      </label>
                      <textarea
                        id="ddt-cessionario-blocco"
                        value={form.cessionarioText}
                        onChange={(e) => patchForm({ cessionarioText: e.target.value })}
                        placeholder="Es.: denominazione o nome e cognome, generalità complete, indirizzo di fatturazione (via, CAP, città, provincia)…"
                        rows={3}
                        className={partyTextareaClass}
                      />
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
                      <label className={labelClass} htmlFor="ddt-trasportatore-blocco">
                        Trasportatore
                      </label>
                      <textarea
                        id="ddt-trasportatore-blocco"
                        value={form.trasportatoreText}
                        onChange={(e) => patchForm({ trasportatoreText: e.target.value })}
                        placeholder="Se la merce è affidata a terzi: ragione sociale del vettore/corriere, sede, P.IVA. Se il trasporto è in proprio, lasciare vuoto o indicarlo qui…"
                        rows={3}
                        className={partyTextareaClass}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowDescription((v) => !v)}
                        className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
                      >
                        {showDescription ? "Nascondi descrizione" : "Aggiungi descrizione"}
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-200 ease-out ${
                          showDescription ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <textarea
                          value={form.optionalDescription}
                          onChange={(e) => patchForm({ optionalDescription: e.target.value })}
                          rows={3}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
                          placeholder="Aggiungi una descrizione..."
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-0 w-full sm:w-2/3 sm:max-w-[min(66.666vw,40rem)]">
                        <label className={labelClass} htmlFor="ddt-destinazione">
                          Indirizzo di destinazione
                        </label>
                        <input
                          id="ddt-destinazione"
                          type="text"
                          value={form.deliveryAddress}
                          onChange={(e) => patchForm({ deliveryAddress: e.target.value })}
                          placeholder="Indirizzo di destinazione (es. via, numero civico, CAP, città, provincia)…"
                          autoComplete="street-address"
                          className={inputClass}
                        />
                      </div>
                      <div className="w-fit shrink-0">
                        <label className={labelClass} htmlFor="ddt-peso">
                          Peso
                        </label>
                        <input
                          id="ddt-peso"
                          type="text"
                          value={form.weightKg}
                          onChange={(e) => patchForm({ weightKg: e.target.value })}
                          placeholder="kg"
                          autoComplete="off"
                          className={`${inputClass} !w-12 shrink-0 tabular-nums`}
                        />
                      </div>
                      <div className="w-fit shrink-0">
                        <label className={labelClass} htmlFor="ddt-volume">
                          Volume
                        </label>
                        <input
                          id="ddt-volume"
                          type="text"
                          value={form.volumeM3}
                          onChange={(e) => patchForm({ volumeM3: e.target.value })}
                          placeholder="m³"
                          autoComplete="off"
                          className={`${inputClass} !w-12 shrink-0 tabular-nums`}
                        />
                      </div>
                      <div className="w-fit shrink-0">
                        <label className={labelClass} htmlFor="ddt-ritiro">
                          Ritiro
                        </label>
                        <input
                          id="ddt-ritiro"
                          type="datetime-local"
                          value={form.pickupDateTime}
                          onChange={(e) => patchForm({ pickupDateTime: e.target.value })}
                          title="Data e ora del ritiro"
                          className={`${inputClass} w-auto min-w-[11rem]`}
                        />
                      </div>
                      <div className="w-fit shrink-0">
                        <label className={labelClass} htmlFor="ddt-causale">
                          Causale
                        </label>
                        <div ref={reasonMenuRef} className="relative">
                          <button
                            id="ddt-causale"
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={reasonMenuOpen}
                            className={`${inputClass} min-w-[9.5rem] cursor-pointer pr-8 text-left`}
                            onClick={() => setReasonMenuOpen((prev) => !prev)}
                          >
                            {transportReasonOptions.find((option) => option.value === form.transportReason)?.label ?? "Seleziona..."}
                          </button>
                          <span className="pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-slate-500">
                            <ChevronDown
                              size={14}
                              aria-hidden
                              className={reasonMenuOpen ? "rotate-180 transition-transform" : "transition-transform"}
                            />
                          </span>
                          {reasonMenuOpen ? (
                            <div className="absolute left-0 top-[calc(100%+0.25rem)] z-20 min-w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                              <ul role="listbox" aria-labelledby="ddt-causale" className="py-1">
                                {transportReasonOptions.map((option) => (
                                  <li key={option.value}>
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected={form.transportReason === option.value}
                                      className={`block w-full px-2.5 py-1.5 text-left text-sm ${
                                        form.transportReason === option.value
                                          ? "bg-slate-100 text-slate-900"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                      onClick={() => {
                                        patchForm({ transportReason: option.value });
                                        setReasonMenuOpen(false);
                                      }}
                                    >
                                      {option.label}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {form.transportReason === "altro" ? (
                      <div className="w-full max-w-md">
                        <label className={labelClass} htmlFor="ddt-causale-altro">
                          Specifica causale
                        </label>
                        <input
                          id="ddt-causale-altro"
                          type="text"
                          value={form.transportReasonOther}
                          onChange={(e) => patchForm({ transportReasonOther: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <DdtImportProductsSection onProductsChange={setProducts} />
            </fieldset>
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            disabled={!canSubmitDdt}
            className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            Carica DDT
          </button>
        </div>
      </div>
    </div>
  );
}
