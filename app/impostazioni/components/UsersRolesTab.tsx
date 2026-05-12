"use client";

import { Plus, Shield } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

type UsersRolesTabProps = {
  profiles: ProfileRow[];
  clinicName: string;
  fmtDate: (iso: string | null) => string;
  onOpenNewAdminDialog: () => void;
};

export function UsersRolesTab({ profiles, clinicName, fmtDate, onOpenNewAdminDialog }: UsersRolesTabProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:rounded-b-lg sm:border sm:border-t-0 sm:border-slate-200 sm:bg-white sm:shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Profili clinica</h2>
          <p className="text-xs text-slate-500">Elenco utenti collegati alla tua clinica e relativo ruolo.</p>
        </div>
        <button
          type="button"
          onClick={onOpenNewAdminDialog}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          <Plus size={14} />
          aggiungi utente
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Nome</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Ruolo</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Clinica</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-slate-600">Creato il</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((profile) => (
              <tr key={profile.id} className="transition-colors hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{profile.full_name ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                    <Shield size={12} />
                    {profile.role ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{clinicName || "—"}</td>
                <td className="px-3 py-2 text-slate-700">{fmtDate(profile.created_at)}</td>
              </tr>
            ))}
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                  Nessun profilo trovato per la clinica corrente.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
