export default function AgendaPage() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 p-6 text-slate-900">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Agenda in aggiornamento</h1>
        <p className="mt-2 text-sm text-slate-600">
          La vecchia vista agenda era collegata alla rotta `doc` ed e stata rimossa.
        </p>
      </div>
    </div>
  );
}
