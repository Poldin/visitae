import Link from "next/link";
import { getLandingBrands } from "@/lib/getLandingBrands";
import LandingBrandsMarquee from "./components/LandingBrandsMarquee";
import LandingMagazzinoOperationsDemo from "./components/LandingMagazzinoOperationsDemo";

/** Ricarica i brand a ogni richiesta (evita homepage “graffiata senza marchi”). */
export const dynamic = "force-dynamic";

export default async function Page() {
  const landingBrands = await getLandingBrands();

  return (
    <main className="min-h-screen overflow-y-auto bg-white text-zinc-900 selection:bg-zinc-100 selection:text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:bg-zinc-800 dark:selection:text-zinc-100">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-10 md:px-10 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-2 w-px bg-zinc-200 dark:bg-zinc-800 md:left-6"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2 w-px bg-zinc-200 dark:bg-zinc-800 md:right-6"
        />
        <header className="flex items-center justify-between">
          <div className="flex flex-col">
            <Link
              href="/"
              className="font-mono text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl"
            >
              Visitae
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              [viˈzi.te]
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Accedi
          </Link>
        </header>

        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-300">
              Gestione del magazzino per studi dentistici
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">
              Gestisci i prodotti del tuo studio dentistico. Gratis.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 md:text-lg">
              Articoli, lotti, scadenze e movimenti in un unico posto. Scansioni
              da codice a barre, caricamento DDT e statistiche per avere sempre
              chiaro cosa c&apos;è in giacenza.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Crea account gratuito
              </Link>
              <Link
                href="/magazzino"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Apri magazzino
              </Link>
            </div>
          </div>

          <LandingMagazzinoOperationsDemo />
        </section>

        <div
          aria-hidden="true"
          className="relative left-1/2 h-px w-screen -translate-x-1/2 bg-[repeating-linear-gradient(to_right,#e4e4e7_0,#e4e4e7_18px,transparent_18px,transparent_30px)] dark:bg-[repeating-linear-gradient(to_right,#27272a_0,#27272a_18px,transparent_18px,transparent_30px)]"
        />

        <LandingBrandsMarquee brands={landingBrands} />

        <section className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Piani
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-3xl">
              Scegli come usare Visitae
            </h2>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
              Parti da zero euro con il magazzino completo, oppure aggiungi
              l&apos;AI quando sarà disponibile.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <article className="flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Piano Zero
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums text-zinc-950 md:text-5xl dark:text-zinc-50">
                  €0
                </span>
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  /sempre
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Tutto il magazzino incluso.
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>Articoli e giacenza con lotti</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>Carico, scarico e inventario</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>Scadenze e soglie base</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>Scansione codici a barre</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>Import documenti e movimenti</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>Statistiche e storico operazioni</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Inizia gratis
              </Link>
            </article>

            <article className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 md:p-8 dark:border-zinc-700 dark:bg-zinc-950">
              <span className="absolute right-5 top-5 rounded-full border border-zinc-600/80 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                Arriva presto
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Piano PRO
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums text-white md:text-5xl">
                  €9
                </span>
                <span className="text-sm font-medium text-zinc-400">/mese</span>
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-300">
                Tutto il Piano Zero + intelligenza artificiale.
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-zinc-500">·</span>
                  <span>Include ogni funzione del Piano Zero</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-500">·</span>
                  <span>Chat AI agentica nel prodotto</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-500">·</span>
                  <span>Funzionalità e flussi potenziati dall&apos;AI</span>
                </li>
              </ul>
              <button
                type="button"
                disabled
                className="mt-8 inline-flex cursor-not-allowed items-center justify-center rounded-full bg-zinc-700 px-6 py-3 text-sm font-medium text-zinc-400 opacity-75 dark:bg-zinc-800 dark:text-zinc-500"
              >
                Inizia con PRO
              </button>
            </article>
          </div>

          <div className="w-full space-y-3 pt-4">
            <h3 className="w-full text-lg font-semibold tracking-tight text-zinc-950 md:text-xl dark:text-zinc-50">
              Perché Visitae è gratuito?
            </h3>
            <div className="w-full space-y-3 text-sm font-light leading-relaxed text-zinc-600 dark:text-zinc-300">
              <p>
                La missione di Visitae è mettere a disposizione degli studi
                dentistici{" "}
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  strumenti tecnologici per individuare, confrontare e acquistare
                  prodotti
                </strong>{" "}
                in modo ordinato e verificabile, così da avvicinare qualità,
                esigenze cliniche e prezzo.
              </p>
              <p>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  All&apos;aumentare degli studi che usano la piattaforma la
                  domanda si aggrega
                </strong>
                : questo rafforza la posizione contrattuale complessiva nei
                confronti dei fornitori e favorisce condizioni di acquisto più
                competitive, nell&apos;interesse di chi opera in studio.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800 md:mt-20 md:pt-12">
          <div className="flex max-w-md shrink-0 flex-col gap-8">
            <div className="flex flex-col">
              <span className="font-mono text-base font-normal tracking-tight text-zinc-900 dark:text-zinc-100 md:text-lg">
                Visitae
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                [viˈzi.te]
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Suggerimenti, richieste o segnalazioni? Scrivici su discord.
              </p>
              <a
                href="https://discord.gg/F8Bywfrqe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5865F2] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4752C4]"
              >
                <svg
                  className="size-4.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                apri Discord
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-200 pt-8 text-sm dark:border-zinc-800 md:mt-12 md:pt-10">
            <span className="cursor-default text-zinc-500 underline decoration-zinc-400/70 underline-offset-2 dark:text-zinc-400 dark:decoration-zinc-500/70">
              Privacy
            </span>
            <span className="cursor-default text-zinc-500 underline decoration-zinc-400/70 underline-offset-2 dark:text-zinc-400 dark:decoration-zinc-500/70">
              Termini e condizioni
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
