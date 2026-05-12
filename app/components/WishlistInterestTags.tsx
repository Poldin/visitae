"use client";

import { useState } from "react";

const INTEREST_OPTIONS = [
  { value: "provare-ai", label: "Voglio provare l'AI" },
  { value: "strumento-innovativo", label: "Strumento innovativo" },
  { value: "automatizzare-processi", label: "Automatizzare i processi" },
  { value: "prezzo-ragionevole", label: "Prezzo ragionevole" },
  { value: "supporto-segreteria", label: "Supportare la segreteria" },
  { value: "ridurre-chiamate-perse", label: "Ridurre chiamate perse" },
  { value: "copertura-h24-weekend", label: "Copertura H24 / weekend" },
  { value: "aumentare-prenotazioni", label: "Aumentare prenotazioni" },
  { value: "gestire-picchi", label: "Gestire picchi di chiamate" },
  { value: "esperienza-paziente", label: "Migliorare esperienza paziente" },
  {
    value: "ridurre-attese-telefono",
    label: "Ridurre tempi di attesa al telefono",
  },
  { value: "filtrare-urgenze", label: "Filtrare urgenze rapidamente" },
  {
    value: "integrazione-agenda-gestionale",
    label: "Integrazione con agenda/gestionale",
  },
  { value: "meno-carico-team", label: "Meno carico operativo sul team" },
  { value: "valutare-roi", label: "Valutare ROI prima di decidere" },
];

function shuffleOptions<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function WishlistInterestTags() {
  const [selected, setSelected] = useState<string[]>([]);
  const [options] = useState(() => shuffleOptions(INTEREST_OPTIONS));

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  return (
    <fieldset className="space-y-2 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <legend className="px-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Perche ti interessa Visitae? (selezione multipla)
      </legend>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              aria-pressed={isActive}
              className={`inline-flex rounded-full border px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        required
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        value={selected.join(",")}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Seleziona almeno un motivo prima di iscriverti.
      </p>

      {selected.map((value) => (
        <input key={value} type="hidden" name="interestReasons" value={value} />
      ))}
    </fieldset>
  );
}
