"use client";

import { useMemo, useState } from "react";

const MIN_BUDGET = 99;
const MAX_BUDGET = 999;
const STEP = 10;
const CREDITS_PER_EURO = 62;
const CALL_CREDITS_PER_MINUTE = 35;

function normalizeBudget(value: number): number {
  if (Number.isNaN(value)) return MIN_BUDGET;
  return Math.max(MIN_BUDGET, value);
}

function clampSliderValue(value: number): number {
  if (Number.isNaN(value)) return MIN_BUDGET;
  return Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, value));
}

export default function CustomStudioPlanCard() {
  const [budgetInput, setBudgetInput] = useState("149");

  const parsedBudget = Number(budgetInput);
  const effectiveBudget = normalizeBudget(parsedBudget);
  const sliderValue = clampSliderValue(effectiveBudget);

  const metrics = useMemo(() => {
    const credits = Math.round((effectiveBudget * CREDITS_PER_EURO) / 50) * 50;
    const callHours = credits / CALL_CREDITS_PER_MINUTE / 60;
    return {
      credits,
      callHours: callHours.toFixed(1),
    };
  }, [effectiveBudget]);

  return (
    <article className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        Piano Flex
      </p>
      <h3 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        Scegli il tuo fisso mensile
      </h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Imposta il budget direttamente online, senza richiesta di preventivo.
      </p>

      <p className="mt-4 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        {effectiveBudget}€
        <span className="ml-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          /mese + IVA
        </span>
      </p>

      <div className="mt-4 space-y-3">
        <input
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={STEP}
          value={sliderValue}
          onChange={(event) => setBudgetInput(event.target.value)}
          className="w-full accent-zinc-900 dark:accent-zinc-100"
        />
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            Fisso mensile
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={MIN_BUDGET}
              step={1}
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              className="w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">€</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {metrics.credits.toLocaleString("it-IT")} crediti inclusi (circa{" "}
        {metrics.callHours} ore)
      </p>

      <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
        <li>Tutto il piano Pro, in piu:</li>
        <li>Capacita scalabile in base alla stagionalita dello studio.</li>
        <li>Configura il budget in autonomia quando vuoi.</li>
        <li>Stima immediata delle ore chiamata incluse.</li>
      </ul>
    </article>
  );
}
