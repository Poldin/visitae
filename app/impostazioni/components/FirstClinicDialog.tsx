"use client";

import { Settings } from "lucide-react";

type FirstClinicDialogProps = {
  open: boolean;
  clinicName: string;
  clinicAddress: string;
  creating: boolean;
  errorMessage: string | null;
  onClinicNameChange: (value: string) => void;
  onClinicAddressChange: (value: string) => void;
  onSubmit: () => void;
};

export function FirstClinicDialog({
  open,
  clinicName,
  clinicAddress,
  creating,
  errorMessage,
  onClinicNameChange,
  onClinicAddressChange,
  onSubmit,
}: FirstClinicDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-140 flex items-center justify-center bg-slate-950/70 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="first-clinic-dialog-title"
      aria-describedby="first-clinic-dialog-desc"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
        <h3
          id="first-clinic-dialog-title"
          className="flex items-center gap-2 text-sm font-semibold text-slate-900"
        >
          Aggiungi la tua prima clinica
        </h3>
        <p id="first-clinic-dialog-desc" className="mt-2 text-sm leading-relaxed text-slate-600">
          Avere una clinica registrata permette di accedere alle funzionalità di Visitae.
          Se gestisci più cliniche, potrai aggiungerne altre in seguito dalle{" "}
          <span className="inline-flex items-center gap-1 align-middle">
            <Settings size={18} strokeWidth={2} className="shrink-0 text-slate-600" aria-hidden />
            impostazioni
          </span>
          .
        </p>
        {errorMessage ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Nome o ragione sociale della clinica</span>
            <input
              value={clinicName}
              onChange={(e) => onClinicNameChange(e.target.value)}
              placeholder="Studio Dentistico Dottor Ludovico Rossi"
              autoComplete="organization"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Indirizzo completo</span>
            <input
              value={clinicAddress}
              onChange={(e) => onClinicAddressChange(e.target.value)}
              placeholder="Via Garibaldi 45, 20121 Milano (MI)"
              autoComplete="street-address"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSubmit}
              disabled={creating}
              className="inline-flex w-fit items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creazione..." : "Crea clinica"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
