"use client";

import { X } from "lucide-react";

type NewAdminDraft = {
  fullName: string;
  email: string;
};

type NewClinicAdminDialogProps = {
  open: boolean;
  draft: NewAdminDraft;
  onDraftChange: (draft: NewAdminDraft) => void;
  onClose: () => void;
};

export function NewClinicAdminDialog({ open, draft, onDraftChange, onClose }: NewClinicAdminDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Nuovo admin clinica</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Nome</span>
            <input
              value={draft.fullName}
              onChange={(e) => onDraftChange({ ...draft, fullName: e.target.value })}
              placeholder="Es. Marco Bianchi"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
              placeholder="nome@clinica.it"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
          <button
            type="button"
            className="inline-flex w-fit items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Prosegui e invita
          </button>
          <p className="text-[11px] text-slate-500">
            Solo UI per ora: nella prossima iterazione colleghiamo la logica reale di invito/creazione account.
          </p>
        </div>
      </div>
    </div>
  );
}
