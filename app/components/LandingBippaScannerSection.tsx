"use client";

import { BippaScanExperience } from "@/app/magazzino/components/BippaScanExperience";

export default function LandingBippaScannerSection() {
  return (
    <section className="scroll-mt-8">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:gap-12 xl:gap-14">
        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400/90">
              Come funziona
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-3xl">
              Bippa! è immediato.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 md:text-base">
              Scansiona i codici dei prodotti e modifica la giacenza: tutto è pensato per darti la massima velocità.
              Prova Fotocamera o Telefono nell&apos;anteprima qui accanto.
            </p>
          </div>

          <ul className="grid gap-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li className="flex gap-3">
              <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                1.
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Scegli come leggere il codice</p>
                <p className="mt-1 leading-relaxed">
                  La tab <strong className="text-zinc-800 dark:text-zinc-200">Telefono</strong> offre un QR che apre la
                  demo sul cellulare: scansioni e risultato restano sul telefono, senza collegamento al PC.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                2.
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Scansiona EAN, Data Matrix e altro</p>
                <p className="mt-1 leading-relaxed">
                  Lettura ottimizzata per i codici tipici dei consumabili e dispositivi in ambito dentistico.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                3.
              </span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Carico o scheda prodotto</p>
                <p className="mt-1 leading-relaxed">
                  In magazzino con il tuo account, il codice letto si collega ad articolo, lotti e giacenza.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div className="relative w-full max-w-md shrink-0 justify-self-center lg:max-w-none lg:justify-self-stretch lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-3xl bg-zinc-950 shadow-2xl shadow-zinc-950/40">
            <div className="p-5 sm:p-6">
              <BippaScanExperience
                active
                variant="showcase"
                initialTab="phone"
                visibleTabs={["camera", "phone"]}
                phoneQrStaticPath="/bippa/demo"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative left-1/2 mt-16 h-px w-screen -translate-x-1/2 bg-[repeating-linear-gradient(to_right,#e4e4e7_0,#e4e4e7_18px,transparent_18px,transparent_30px)] md:mt-20 dark:bg-[repeating-linear-gradient(to_right,#27272a_0,#27272a_18px,transparent_18px,transparent_30px)]"
      />
    </section>
  );
}
