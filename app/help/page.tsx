"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Plus,
  ScanBarcode,
  Truck,
} from "lucide-react";
import HelpSideNav from "./components/HelpSideNav";

type WarehouseTopicId = "carico" | "scarico" | "nuovo" | "inventario" | "ddt" | "bippa";

const WAREHOUSE_TOPICS: Array<{
  id: WarehouseTopicId;
  label: string;
  Icon: typeof ArrowDownRight;
  iconClass: string;
  title: string;
  body: string[];
}> = [
  {
    id: "carico",
    label: "Carico",
    Icon: ArrowDownRight,
    iconClass: "text-emerald-600",
    title: "Carico merce",
    body: [
      "Il carico serve quando la merce entra in clinica: consegne dal fornitore, ordini ricevuti o correzioni dopo un errore di registrazione. Da Magazzino puoi registrare quantità, lotto e scadenza quando necessario, così la giacenza e le scadenze restano allineate alla realtà degli scaffali.",
      "È il momento giusto dopo aver controllato fisicamente il pacco o la bolla: prima confermi cosa è arrivato, poi aggiorni Visitae così statistiche e alert sulle scadenze hanno senso.",
    ],
  },
  {
    id: "scarico",
    label: "Scarico",
    Icon: ArrowUpRight,
    iconClass: "text-rose-600",
    title: "Scarico merce",
    body: [
      "Lo scarico registra l’uscita di materiale: consumo in sede, uso durante una visita o cessione al paziente. Ogni scarico riduce la quantità disponibile e lascia una traccia nei movimenti, utile per audit e per capire cosa si consuma di più nel tempo.",
      "Convieni usarlo con regolarità (fine giornata o a fine trattamento), così non accumuli differenze tra quello che pensi di avere e quello che trovi al prossimo inventario.",
    ],
  },
  {
    id: "nuovo",
    label: "Nuovo articolo",
    Icon: Plus,
    iconClass: "text-slate-700",
    title: "Nuovo articolo",
    body: [
      "«Nuovo articolo» crea una scheda prodotto nel magazzino della clinica quando quel codice non esiste ancora nel tuo elenco. Compilerai nome, SKU, eventuali codici a barre (EAN, UDI, HIBC), scorta minima e puoi subito associare il primo lotto.",
      "Usalo quando introduci un brand nuovo o un riferimento che non hai mai movimentato in Visitae; per articoli già presenti preferisci carico o scarico sulla riga esistente.",
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    Icon: ClipboardCheck,
    iconClass: "text-slate-700",
    title: "Inventario fisico",
    body: [
      "L’inventario confronta le quantità che hai contato fisicamente con quelle memorizzate nell’app e ti permette di rettificare le differenze. È pensato per inventari periodici, dopo traslochi o quando noti incongruenze ripetute.",
      "Prima controlli gli scaffali e gli armadietti, poi aggiorni i numeri in Visitae: così riallinei il sistema senza dover ricostruire la storia movimento per movimento.",
    ],
  },
  {
    id: "ddt",
    label: "DDT",
    Icon: Truck,
    iconClass: "text-amber-700",
    title: "Import da DDT",
    body: [
      "Il flusso DDT ti aiuta quando ricevi un documento di trasporto con molte righe: puoi importare i dati in blocco invece di digitare ogni voce a mano. Riduce errori di trascrizione e accelera il giorno in cui arrivano molti pacchi insieme.",
      "Controlla sempre che le righe importate corrispondano a ciò che hai effettivamente ricevuto prima di confermare definitivamente i carichi.",
    ],
  },
  {
    id: "bippa",
    label: "Bippa",
    Icon: ScanBarcode,
    iconClass: "text-slate-700",
    title: "Bippa (lettura codice)",
    body: [
      "Bippa usa fotocamera o lettore per leggere il codice a barre e aprire il prodotto corretto: meno errori di battitura e ricerca più veloce in corsia o in reception.",
      "È particolarmente utile con confezioni che già portano EAN stampato o quando devi passare rapidamente da un articolo all’altro.",
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white text-slate-900 md:min-h-0 md:flex-row md:overflow-hidden">
      <HelpSideNav />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 lg:px-12 sm:py-10">
          <div className="mb-2 md:hidden">
            <Link href="/" className="text-sm font-bold text-slate-800 hover:text-slate-950">
              Visitae
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-600">Assistenza</span>
          </div>

          <header className="mb-10 scroll-mt-8 border-b border-slate-100 pb-8" id="intro">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Centro assistenza</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Una sola pagina con tutti gli argomenti: usa il menu per aprire le macrosezioni (Magazzino, Profilo, Cliniche) e i link con{" "}
              <span className="font-medium text-slate-800">#nell&apos;URL</span> per saltare al paragrafo giusto.
            </p>
          </header>

          {/* ——— Magazzino ——— */}
          <section id="magazzino" className="scroll-mt-8 border-b border-slate-100 pb-10 mb-10">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Magazzino</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Il magazzino della clinica è il punto in cui registri entrate, uscite, nuovi articoli e inventari. Le voci qui sotto corrispondono alle azioni che trovi in app;
              ogni blocco ha il suo ancoraggio (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/help#…</code>) così puoi condividere il link diretto.
            </p>

            <div className="mt-10 space-y-14">
              {WAREHOUSE_TOPICS.map(({ id, title, body }) => (
                <section key={id} id={id} className="scroll-mt-8">
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                    {body.map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}

              <section id="movimenti" className="scroll-mt-8">
                <h3 className="text-lg font-semibold text-slate-900">Movimenti</h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    La cronologia movimenti raccoglie carichi, scarichi e rettifiche nel tempo: è utile per ricostruire cosa è successo su un lotto, rispondere a richieste
                    interne o verificare un consumo anomalo. Da qui puoi filtrare per periodo, articolo o operatore quando la clinica ha più persone che aggiornano il magazzino.
                  </p>
                  <p>
                    Prima di correggere una giacenza «a mano», conviene controllare i movimenti: spesso la discrepanza nasce da uno scarico dimenticato o da un carico confermato due volte.
                  </p>
                </div>
              </section>

              <section id="statistiche" className="scroll-mt-8">
                <h3 className="text-lg font-semibold text-slate-900">Statistiche</h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    Le statistiche sintetizzano consumi, articoli più movimentati e andamenti nel tempo: servono a ordinare meglio, ridurre rotture di stock e anticipare scadenze.
                  </p>
                  <p>
                    Usale come quadro di sintesi mensile o trimestrale; affiancale comunque al controllo fisico periodico (inventario) perché numeri e scaffale restino allineati.
                  </p>
                </div>
              </section>
            </div>
          </section>

          {/* ——— Profilo ——— */}
          <section id="profilo" className="scroll-mt-8 border-b border-slate-100 pb-10 mb-10">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Profilo</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                Nel profilo gestisci i dati del tuo account medico e le preferenze base dell&apos;esperienza in Visitae. Mantieni aggiornati nome da mostrare ai colleghi,
                recapiti utili alla clinica e le impostazioni che influenzano come compaiono le informazioni nella giornata tipo.
              </p>
              <p>
                Per sicurezza e coerenza dei log, alcuni campi sensibili potrebbero essere limitati o richiedere conferma: è comportamento voluto quando il dato è legato a fatturazione o audit.
              </p>
            </div>
          </section>

          {/* ——— Cliniche ——— */}
          <section id="cliniche" className="scroll-mt-8 border-b border-slate-100 pb-10 mb-10">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Cliniche</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Visitae ragiona per clinica: magazzino, utenti e configurazioni sono legati al luogo in cui lavori. Qui sotto trovi i due ambiti principali; ogni voce ha il proprio{" "}
              <span className="font-medium text-slate-800">#</span> nel URL.
            </p>

            <div className="mt-10 space-y-14">
              <section id="cliniche-configura" className="scroll-mt-8">
                <h3 className="text-lg font-semibold text-slate-900">Configura clinica</h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    Da Configura imposti dati anagrafici della sede, parametri operativi del magazzino e le opzioni che valgono per tutta la clinica selezionata. È il posto giusto
                    quando cambiano orari, ragione sociale visibile in documentazione interna o regole condivise prima che il team continui a lavorare sullo stesso database.
                  </p>
                  <p>
                    Se gestisci più sedi, ricorda di aver selezionato la clinica corretta in alto prima di modificare impostazioni che non devono propagarsi altrove.
                  </p>
                </div>
              </section>

              <section id="cliniche-utenti" className="scroll-mt-8">
                <h3 className="text-lg font-semibold text-slate-900">Utenti della clinica</h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    La gestione utenti ti permette di invitare colleghi, assegnare ruoli coerenti con chi deve solo consultare e chi può registrare movimenti o modificare anagrafiche sensibili.
                  </p>
                  <p>
                    Principio utile: concedi il permesso minimo necessario; per il magazzino, limita chi può confermare carichi o chiudere inventari se vuoi tenere ordine nei processi interni.
                  </p>
                </div>
              </section>
            </div>
          </section>

          <footer className="mt-14 border-t border-slate-100 pt-8">
            <p className="text-sm text-slate-600">
              Torna al{" "}
              <Link href="/magazzino" className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                magazzino
              </Link>{" "}
              o alla{" "}
              <Link href="/" className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                home
              </Link>
              .
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
