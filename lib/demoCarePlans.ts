export type DemoCarePlanPhase = {
  phase: string;
  detail: string;
  status: string;
  date: string;
};

/** Stato workflow (badge lista studio / editor). */
export type CarePlanStatus = "bozza" | "firmato" | "archiviato" | "in_corso" | "completato";

export type DemoCarePlan = {
  id: string;
  patientId: string;
  /** Titolo mostrato in elenchi e scheda. */
  label: string;
  code: string;
  status: CarePlanStatus;
  createdAtIso: string;
  startedAt: string;
  totalEuro: number;
  notes: string;
  phases: DemoCarePlanPhase[];
};

/** Piani di cura demo (stessi contenuti clinici per ogni paziente in scheda). */
export const DEMO_CARE_PLANS: DemoCarePlan[] = [
  {
    id: "pc-2026-001",
    patientId: "p-1",
    label: "Piano conservativo — I° stralcio",
    code: "PC-2026-001",
    status: "in_corso",
    createdAtIso: "2026-02-10",
    startedAt: "2026-02-10",
    totalEuro: 420,
    notes:
      "Priorità: settori posteriori; successivo appuntamento per igiene professionale e controllo. Dati dimostrativi condivisi tra le schede.",
    phases: [
      { phase: "1. Valutazione e radiografie", detail: "OPG, stato clinico", status: "Completato", date: "2026-02-10" },
      { phase: "2. Terapia conservativa", detail: "Otturazioni 16–17", status: "In corso", date: "2026-03-18" },
      { phase: "3. Igiene e mantenimento", detail: "Detartrasi + motivazione", status: "Programmato", date: "2026-05-06" },
      { phase: "4. Controllo parodontale", detail: "Sondaggio e cartella", status: "Programmato", date: "2026-06-12" },
    ],
  },
  {
    id: "pc-2025-088",
    patientId: "p-2",
    label: "Parodontologia — mantenimento",
    code: "PC-2025-088",
    status: "completato",
    createdAtIso: "2025-06-04",
    startedAt: "2025-06-04",
    totalEuro: 890,
    notes:
      "Ciclo di mantenimento semestrale completato. Recall programmato. Contenuto dimostrativo uguale per tutti i pazienti.",
    phases: [
      { phase: "1. Sondaggio iniziale", detail: "Indici e sanguinamento", status: "Completato", date: "2025-06-04" },
      { phase: "2. RSR localizzata", detail: "Settore 34–36", status: "Completato", date: "2025-07-22" },
      { phase: "3. Controllo 90 gg", detail: "Stabilizzazione", status: "Completato", date: "2025-10-02" },
    ],
  },
  {
    id: "pc-2024-201",
    patientId: "p-3",
    label: "Endodonzia — elemento 16",
    code: "PC-2024-201",
    status: "completato",
    createdAtIso: "2024-09-12",
    startedAt: "2024-09-12",
    totalEuro: 1150,
    notes: "Terapia canalare e ricostruzione provvisoria; follow-up radiografico a 12 mesi (demo).",
    phases: [
      { phase: "1. Diagnosi e apertura", detail: "RX endorale", status: "Completato", date: "2024-09-12" },
      { phase: "2. Terapia canalare", detail: "Otturazione definitiva", status: "Completato", date: "2024-10-03" },
      { phase: "3. Ricostruzione", detail: "Core + corona (pianificato)", status: "Completato", date: "2024-11-18" },
    ],
  },
  {
    id: "pc-2026-040",
    patientId: "p-4",
    label: "Ortodonzia — allineamento (valutazione)",
    code: "PC-2026-040",
    status: "bozza",
    createdAtIso: "2026-04-02",
    startedAt: "2026-04-02",
    totalEuro: 0,
    notes: "Bozza non ancora condivisa con il paziente. Step successivo: approvazione economica e consensi (demo).",
    phases: [
      { phase: "1. Impronta / scan", detail: "Documentazione", status: "Programmato", date: "2026-04-20" },
      { phase: "2. Setup clinico", detail: "Revisione specialistica", status: "Programmato", date: "2026-05-04" },
    ],
  },
];

export function getDemoCarePlanById(planId: string): DemoCarePlan | undefined {
  return DEMO_CARE_PLANS.find((p) => p.id === planId);
}

/** Etichetta stato per UI (lista studio, scheda paziente). */
export function carePlanStatusDisplay(status: CarePlanStatus): string {
  switch (status) {
    case "bozza":
      return "Bozza";
    case "firmato":
      return "Firmato";
    case "archiviato":
      return "Archiviato";
    case "in_corso":
      return "In corso";
    case "completato":
      return "Completato";
    default:
      return status;
  }
}
