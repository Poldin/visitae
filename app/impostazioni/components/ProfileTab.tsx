"use client";

import { Check } from "lucide-react";

type ProfileTabProps = {
  fullName: string;
  email: string;
  saving: boolean;
  showNameSavedCheck: boolean;
  onFullNameChange: (value: string) => void;
  onOpenLogoutDialog: () => void;
  onOpenDeleteProfileDialog: () => void;
};

export function ProfileTab({
  fullName,
  email,
  saving,
  showNameSavedCheck,
  onFullNameChange,
  onOpenLogoutDialog,
  onOpenDeleteProfileDialog,
}: ProfileTabProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:rounded-b-lg sm:border sm:border-t-0 sm:border-slate-200 sm:bg-white sm:shadow-sm">
      <div className="border-b border-slate-100 px-3 py-3 sm:px-4">
        <h2 className="text-sm font-semibold text-slate-900">Profilo</h2>
        <p className="text-xs text-slate-500">Gestisci i tuoi dati personali e la sicurezza del tuo account.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="max-w-lg space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Nome</span>
            <div className="relative">
              <input
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                placeholder="Inserisci il tuo nome"
                aria-busy={saving}
                aria-describedby={showNameSavedCheck ? "profile-name-saved" : undefined}
                className={`w-full rounded-md border border-slate-300 bg-white py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 ${showNameSavedCheck ? "pr-10 pl-3" : "px-3"}`}
              />
              {showNameSavedCheck ? (
                <span
                  id="profile-name-saved"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600"
                  role="status"
                  aria-live="polite"
                >
                  <Check size={18} strokeWidth={2.5} aria-hidden />
                </span>
              ) : null}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
            <input
              value={email}
              disabled
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onOpenLogoutDialog}
              className="inline-flex w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={onOpenDeleteProfileDialog}
              className="inline-flex w-fit items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-100"
            >
              Elimina profilo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
