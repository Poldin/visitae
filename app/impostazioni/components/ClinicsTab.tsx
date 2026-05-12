"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Copy, Pencil, Plus, Trash2, X } from "lucide-react";

type ClinicsTabProps = {
  clinics: Array<{
    id: string;
    name: string;
    addressText: string;
  }>;
  onOpenAddClinicDialog: () => void;
  onSaveClinic: (payload: { clinicId: string; name: string; address: string }) => Promise<void>;
  onDeleteClinic: (clinicId: string) => Promise<void>;
  savingClinicId: string | null;
  deletingClinicId: string | null;
};

export function ClinicsTab({
  clinics,
  onOpenAddClinicDialog,
  onSaveClinic,
  onDeleteClinic,
  savingClinicId,
  deletingClinicId,
}: ClinicsTabProps) {
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAddress, setEditingAddress] = useState("");
  const [confirmDeleteClinicId, setConfirmDeleteClinicId] = useState<string | null>(null);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [clinicDeletePhraseCopied, setClinicDeletePhraseCopied] = useState(false);

  const editingClinic = useMemo(
    () => clinics.find((clinic) => clinic.id === editingClinicId) ?? null,
    [clinics, editingClinicId],
  );

  const openEditDialog = (clinic: { id: string; name: string; addressText: string }) => {
    setEditingClinicId(clinic.id);
    setEditingName(clinic.name);
    setEditingAddress(clinic.addressText);
  };

  const closeEditDialog = () => {
    setEditingClinicId(null);
    setEditingName("");
    setEditingAddress("");
  };

  const deletingClinic = useMemo(
    () => clinics.find((clinic) => clinic.id === confirmDeleteClinicId) ?? null,
    [clinics, confirmDeleteClinicId],
  );

  const closeDeleteDialog = () => {
    setConfirmDeleteClinicId(null);
    setConfirmDeleteText("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:rounded-b-lg sm:border sm:border-t-0 sm:border-slate-200 sm:bg-white sm:shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Le tue cliniche</h2>
          <p className="text-xs text-slate-500">Cliniche associate al tuo account e configurazione della clinica attiva.</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddClinicDialog}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          <Plus size={14} />
          Aggiungi clinica
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {clinics.length === 0 ? (
          <div className="flex min-h-[min(22rem,calc(100vh-14rem))] flex-col items-center justify-center px-4 py-10 text-center sm:py-14">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
              <Building2 size={28} strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Aggiungi la tua prima clinica</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Non hai ancora una clinica collegata al tuo account. Creane una per iniziare a usare magazzino e impostazioni per il tuo studio.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <button
                type="button"
                onClick={onOpenAddClinicDialog}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10 transition-colors hover:bg-slate-800"
              >
                <Plus size={18} aria-hidden />
                Aggiungi clinica
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-2">
            {clinics.map((clinic) => (
              <article key={clinic.id} className="min-w-[350px] w-fit rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{clinic.name}</p>
                  <button
                    type="button"
                    onClick={() => openEditDialog(clinic)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Pencil size={12} />
                    Modifica
                  </button>
                </div>
                <p className="text-xs text-slate-600">{clinic.addressText || "Via non specificata"}</p>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteClinicId(clinic.id)}
                  className="mt-3 inline-flex w-fit items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:border-red-300 hover:bg-red-100"
                >
                  <Trash2 size={12} />
                  Elimina
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {editingClinic ? (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/70 p-4" onClick={closeEditDialog}>
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Modifica clinica</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Nome clinica</span>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Studio Dentistico Dottor Ludovico Rossi"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Via</span>
                <input
                  value={editingAddress}
                  onChange={(e) => setEditingAddress(e.target.value)}
                  placeholder="Via Roma 12, 12156 Milano (MI)"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onSaveClinic({
                      clinicId: editingClinic.id,
                      name: editingName,
                      address: editingAddress,
                    })
                      .then(closeEditDialog)
                      .catch(() => {
                        // L'errore viene gestito dalla pagina padre.
                      });
                  }}
                  disabled={savingClinicId === editingClinic.id}
                  className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingClinicId === editingClinic.id ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deletingClinic ? (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/70 p-4" onClick={closeDeleteDialog}>
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Elimina clinica</h3>
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-slate-700">
              Questa azione e' irreversibile. Per confermare, scrivi <span className="font-semibold">Elimina clinica</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText("Elimina clinica");
                  setClinicDeletePhraseCopied(true);
                  window.setTimeout(() => setClinicDeletePhraseCopied(false), 2000);
                }}
                className="ml-1 inline-flex h-5 w-5 translate-y-px items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                title="Copia frase"
                aria-label="Copia frase di conferma"
              >
                {clinicDeletePhraseCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              .
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Frase di conferma</span>
              <input
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="Elimina clinica"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
              />
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="inline-flex w-fit items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteText.trim() !== "Elimina clinica") return;
                  void onDeleteClinic(deletingClinic.id)
                    .then(closeDeleteDialog)
                    .catch(() => {
                      // L'errore viene gestito dalla pagina padre.
                    });
                }}
                disabled={deletingClinicId === deletingClinic.id || confirmDeleteText.trim() !== "Elimina clinica"}
                className="inline-flex w-fit items-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingClinicId === deletingClinic.id ? "Eliminazione..." : "Conferma eliminazione"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
