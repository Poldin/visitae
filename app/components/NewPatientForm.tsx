"use client";

import { useEffect, useId, useRef, useState, useCallback } from "react";
import CodiceFiscale from "codice-fiscale-js";
import type { ICodiceFiscaleObject } from "codice-fiscale-js";
import comuniRaw from "../../lib/comuni.json";

type ComuneEntry = { cc: string; prov: string; nome: string };
const COMUNI = comuniRaw as ComuneEntry[];

function searchComuni(query: string, limit = 8): ComuneEntry[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const starts: ComuneEntry[] = [];
  const contains: ComuneEntry[] = [];
  for (const c of COMUNI) {
    const nome = c.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (nome.startsWith(q)) starts.push(c);
    else if (nome.includes(q)) contains.push(c);
    if (starts.length + contains.length >= limit * 2) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

function computeCF(params: {
  cognome: string;
  nome: string;
  dataNascita: string;
  sesso: "M" | "F";
  comuneNascita: string;
  provinciaNascita: string;
}): string | null {
  const { cognome, nome, dataNascita, sesso, comuneNascita, provinciaNascita } = params;
  if (!cognome.trim() || !nome.trim() || !dataNascita || !comuneNascita.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataNascita.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  try {
    const obj: ICodiceFiscaleObject = {
      name: nome.trim(),
      surname: cognome.trim(),
      gender: sesso,
      day,
      month,
      year,
      birthplace: comuneNascita.trim(),
      birthplaceProvincia: provinciaNascita.trim(),
    };
    const cf = new CodiceFiscale(obj);
    return cf.cf ?? null;
  } catch {
    return null;
  }
}

export type NewPatientFormValues = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  fiscalCode: string;
  dataNascita: string;
  sesso: "M" | "F";
  comuneNascita: string;
  provinciaNascita: string;
  codiceCatastale: string;
  birthYear: number;
  via: string;
  numeroCivico: string;
  cap: string;
  cittaResidenza: string;
  provinciaResidenza: string;
};

type Props = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated: (patient: NewPatientFormValues & { name: string }) => void;
};

const field =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10";

const sel =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10";

const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={label}>
      {children}
    </label>
  );
}

export default function NewPatientForm({ open, onOpenChange, onCreated }: Props) {
  const formId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cfManualRef = useRef(false);

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [sesso, setSesso] = useState<"M" | "F">("M");

  const [comuneNascita, setComuneNascita] = useState("");
  const [provinciaNascita, setProvinciaNascita] = useState("");
  const [codiceCatastale, setCodiceCatastale] = useState("");
  const [comuneQuery, setComuneQuery] = useState("");
  const [comuneSuggestions, setComuneSuggestions] = useState<ComuneEntry[]>([]);
  const [comuneOpen, setComuneOpen] = useState(false);
  const comuneRef = useRef<HTMLDivElement>(null);

  const [fiscalCode, setFiscalCode] = useState("");

  const [via, setVia] = useState("");
  const [numeroCivico, setNumeroCivico] = useState("");
  const [cap, setCap] = useState("");
  const [cittaResidenza, setCittaResidenza] = useState("");
  const [provinciaResidenza, setProvinciaResidenza] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) { if (!el.open) el.showModal(); }
    else if (el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (cfManualRef.current) return;
    const cf = computeCF({ cognome, nome, dataNascita, sesso, comuneNascita, provinciaNascita });
    if (cf) setFiscalCode(cf);
  }, [cognome, nome, dataNascita, sesso, comuneNascita, provinciaNascita]);

  const onComuneQueryChange = useCallback((q: string) => {
    setComuneQuery(q);
    setComuneNascita("");
    setProvinciaNascita("");
    setCodiceCatastale("");
    cfManualRef.current = false;
    const results = searchComuni(q);
    setComuneSuggestions(results);
    setComuneOpen(results.length > 0);
  }, []);

  const selectComune = useCallback((c: ComuneEntry) => {
    const displayName = c.nome.charAt(0) + c.nome.slice(1).toLowerCase();
    setComuneQuery(displayName + " (" + c.prov + ")");
    setComuneNascita(c.nome);
    setProvinciaNascita(c.prov);
    setCodiceCatastale(c.cc);
    setComuneSuggestions([]);
    setComuneOpen(false);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comuneRef.current && !comuneRef.current.contains(e.target as Node)) {
        setComuneOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onCfChange = (raw: string) => {
    const upper = raw.toUpperCase().replace(/\s/g, "");
    setFiscalCode(upper);
    cfManualRef.current = true;
    if (upper.length === 16) {
      try {
        const inv = CodiceFiscale.computeInverse(upper);
        if (inv && CodiceFiscale.check(upper)) {
          const iso = `${inv.year}-${String(inv.month).padStart(2, "0")}-${String(inv.day).padStart(2, "0")}`;
          setDataNascita(iso);
          setSesso(inv.gender as "M" | "F");
          if (inv.birthplace) {
            const nome = inv.birthplace;
            const prov = inv.birthplaceProvincia ?? "";
            const displayName = nome.charAt(0) + nome.slice(1).toLowerCase();
            setComuneQuery(displayName + (prov ? ` (${prov})` : ""));
            setComuneNascita(nome);
            setProvinciaNascita(prov);
            const entry = COMUNI.find(c => c.nome === nome && (prov ? c.prov === prov : true));
            if (entry) setCodiceCatastale(entry.cc);
          }
        }
      } catch {
        /* ignore */
      }
    }
  };

  const cfValid = fiscalCode.length === 16 && (() => {
    try { return CodiceFiscale.check(fiscalCode); } catch { return false; }
  })();
  const cfError = fiscalCode.length === 16 && !cfValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nt = nome.trim();
    const ct = cognome.trim();
    if (!nt || !ct) { setSubmitError("Inserisci nome e cognome."); return; }
    if (!telefono.trim()) { setSubmitError("Inserisci il telefono."); return; }
    if (!via.trim()) { setSubmitError("Inserisci l'indirizzo di residenza."); return; }
    if (!cittaResidenza.trim()) { setSubmitError("Inserisci la città di residenza."); return; }
    if (!cfValid) {
      setSubmitError("Completa i dati anagrafici e il comune di nascita per generare il codice fiscale, oppure incollalo direttamente.");
      return;
    }

    const by = dataNascita ? Number(dataNascita.slice(0, 4)) : NaN;
    const birthYear = Number.isFinite(by) ? by : new Date().getFullYear();

    onCreated({
      nome: nt,
      cognome: ct,
      name: `${ct} ${nt}`,
      email: email.trim(),
      telefono: telefono.trim(),
      fiscalCode: fiscalCode.trim().toUpperCase(),
      dataNascita,
      sesso,
      comuneNascita,
      provinciaNascita,
      codiceCatastale,
      birthYear,
      via: via.trim(),
      numeroCivico: numeroCivico.trim(),
      cap: cap.trim(),
      cittaResidenza: cittaResidenza.trim(),
      provinciaResidenza: provinciaResidenza.trim(),
    });

    onOpenChange?.(false);
    resetForm();
  };

  const resetForm = () => {
    setNome(""); setCognome(""); setEmail(""); setTelefono("");
    setDataNascita(""); setSesso("M");
    setComuneNascita(""); setProvinciaNascita(""); setCodiceCatastale(""); setComuneQuery("");
    setFiscalCode(""); cfManualRef.current = false;
    setVia(""); setNumeroCivico(""); setCap(""); setCittaResidenza(""); setProvinciaResidenza("");
    setSubmitError(null);
  };

  const closeDialog = () => { onOpenChange?.(false); };

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-0 top-0 z-200 box-border h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 shadow-none backdrop:bg-black/40"
      aria-labelledby={`${formId}-title`}
      aria-modal="true"
      onClose={() => onOpenChange?.(false)}
      onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
    >
      <div
        className="mx-auto mt-4 flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 id={`${formId}-title`} className="text-sm font-semibold text-zinc-900">
              Nuovo paziente
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Chiudi"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          noValidate
        >
          <div className="space-y-6 px-5 pb-6 pt-5">

            {/* ── Sezione 1: Codice Fiscale (con nome/cognome) ── */}
            <section className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Codice fiscale</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
                {/* Cognome */}
                <div className="col-span-1 sm:col-span-6">
                  <FieldLabel htmlFor={`${formId}-cognome`}>Cognome</FieldLabel>
                  <input
                    id={`${formId}-cognome`}
                    name="cognome"
                    value={cognome}
                    onChange={(e) => { cfManualRef.current = false; setCognome(e.target.value); }}
                    autoComplete="family-name"
                    className={field}
                    placeholder="Rossi"
                  />
                </div>

                {/* Nome */}
                <div className="col-span-1 sm:col-span-6">
                  <FieldLabel htmlFor={`${formId}-nome`}>Nome</FieldLabel>
                  <input
                    id={`${formId}-nome`}
                    name="nome"
                    value={nome}
                    onChange={(e) => { cfManualRef.current = false; setNome(e.target.value); }}
                    autoComplete="given-name"
                    className={field}
                    placeholder="Mario"
                  />
                </div>

                {/* Data di nascita */}
                <div className="col-span-2 sm:col-span-4">
                  <FieldLabel htmlFor={`${formId}-data`}>Data di nascita</FieldLabel>
                  <input
                    id={`${formId}-data`}
                    name="dataNascita"
                    type="date"
                    value={dataNascita}
                    onChange={(e) => { cfManualRef.current = false; setDataNascita(e.target.value); }}
                    className={field}
                  />
                </div>

                {/* Sesso */}
                <div className="col-span-1 sm:col-span-2">
                  <FieldLabel htmlFor={`${formId}-sesso`}>Sesso</FieldLabel>
                  <select
                    id={`${formId}-sesso`}
                    name="sesso"
                    value={sesso}
                    onChange={(e) => { cfManualRef.current = false; setSesso(e.target.value as "M" | "F"); }}
                    className={sel}
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                {/* Comune di nascita — autocomplete */}
                <div className="col-span-2 sm:col-span-6" ref={comuneRef}>
                  <FieldLabel htmlFor={`${formId}-comune`}>Comune di nascita</FieldLabel>
                  <div className="relative">
                    <input
                      id={`${formId}-comune`}
                      type="text"
                      value={comuneQuery}
                      onChange={(e) => onComuneQueryChange(e.target.value)}
                      onFocus={() => { if (comuneSuggestions.length > 0) setComuneOpen(true); }}
                      autoComplete="off"
                      className={field}
                      placeholder="Cerca comune…"
                      aria-autocomplete="list"
                      aria-expanded={comuneOpen}
                    />
                    {comuneOpen && comuneSuggestions.length > 0 && (
                      <ul
                        role="listbox"
                        className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
                      >
                        {comuneSuggestions.map((c) => {
                          const display = c.nome.charAt(0) + c.nome.slice(1).toLowerCase();
                          return (
                            <li
                              key={c.cc + c.nome}
                              role="option"
                              aria-selected={comuneNascita === c.nome}
                              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                              onMouseDown={(e) => { e.preventDefault(); selectComune(c); }}
                            >
                              <span>{display}</span>
                              <span className="ml-2 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                                {c.prov}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {codiceCatastale && (
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Codice catastale: <span className="font-mono font-semibold text-zinc-600">{codiceCatastale}</span>
                    </p>
                  )}
                </div>

                {/* Codice Fiscale risultante */}
                <div className="col-span-2 sm:col-span-12">
                  <FieldLabel htmlFor={`${formId}-cf`}>
                    Codice fiscale
                    {cfValid && (
                      <span className="ml-2 inline-flex items-center gap-1 font-normal normal-case tracking-normal text-zinc-500">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        valido
                      </span>
                    )}
                    {cfError && (
                      <span className="ml-2 font-normal normal-case tracking-normal text-red-500">non valido</span>
                    )}
                  </FieldLabel>
                  <input
                    id={`${formId}-cf`}
                    name="codiceFiscale"
                    value={fiscalCode}
                    onChange={(e) => onCfChange(e.target.value)}
                    maxLength={16}
                    className={`${field} font-mono uppercase tracking-wider ${cfValid ? "border-zinc-400" : cfError ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}`}
                    placeholder="Calcolato automaticamente — o incolla"
                    spellCheck={false}
                    aria-invalid={cfError ? true : undefined}
                  />
                </div>
              </div>
            </section>

            {/* ── Sezione 2: Contatti e residenza ── */}
            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Contatti e residenza</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <FieldLabel htmlFor={`${formId}-tel`}>Telefono</FieldLabel>
                  <input
                    id={`${formId}-tel`}
                    name="telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    autoComplete="tel"
                    className={field}
                    placeholder="333 123 4567"
                  />
                </div>
                <div className="col-span-6">
                  <FieldLabel htmlFor={`${formId}-email`}>
                    Email <span className="font-normal normal-case tracking-normal text-zinc-400">(opz.)</span>
                  </FieldLabel>
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={field}
                    placeholder="nome@email.it"
                  />
                </div>
                <div className="col-span-9">
                  <FieldLabel htmlFor={`${formId}-via`}>Via / Piazza</FieldLabel>
                  <input
                    id={`${formId}-via`}
                    name="via"
                    value={via}
                    onChange={(e) => setVia(e.target.value)}
                    autoComplete="address-line1"
                    className={field}
                    placeholder="Via Roma"
                  />
                </div>
                <div className="col-span-3">
                  <FieldLabel htmlFor={`${formId}-civico`}>Civico</FieldLabel>
                  <input
                    id={`${formId}-civico`}
                    name="numeroCivico"
                    value={numeroCivico}
                    onChange={(e) => setNumeroCivico(e.target.value)}
                    className={field}
                    placeholder="10"
                  />
                </div>
                <div className="col-span-3">
                  <FieldLabel htmlFor={`${formId}-cap`}>CAP</FieldLabel>
                  <input
                    id={`${formId}-cap`}
                    name="cap"
                    value={cap}
                    onChange={(e) => setCap(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    inputMode="numeric"
                    maxLength={5}
                    className={`${field} font-mono tracking-wider`}
                    placeholder="00100"
                  />
                </div>
                <div className="col-span-7">
                  <FieldLabel htmlFor={`${formId}-citta`}>Città</FieldLabel>
                  <input
                    id={`${formId}-citta`}
                    name="cittaResidenza"
                    value={cittaResidenza}
                    onChange={(e) => setCittaResidenza(e.target.value)}
                    autoComplete="address-level2"
                    className={field}
                    placeholder="Roma"
                  />
                </div>
                <div className="col-span-2">
                  <FieldLabel htmlFor={`${formId}-prov`}>Prov.</FieldLabel>
                  <input
                    id={`${formId}-prov`}
                    name="provinciaResidenza"
                    value={provinciaResidenza}
                    onChange={(e) => setProvinciaResidenza(e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                    className={`${field} font-mono uppercase tracking-widest`}
                    placeholder="RM"
                  />
                </div>
              </div>
            </section>

            {/* Error + Submit */}
            <div>
              {submitError && (
                <p className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700" role="alert">
                  {submitError}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  Aggiungi paziente
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  );
}
