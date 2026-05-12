/** Dataset dimostrativo condiviso (anagrafica pazienti). */

export type DemoPatient = {
  id: string;
  name: string;
  fiscalCode: string;
  phone: string;
  email: string;
  lastVisit: string;
  lastVisitIso: string;
  city: string;
  registeredAt: string;
  birthYear: number;
  gender: "M" | "F";
  /** Indirizzo completo (form nuovo paziente) */
  address?: string;
};

export const DEMO_PATIENTS: DemoPatient[] = [
  {
    id: "p-1",
    name: "Mario Bianchi",
    fiscalCode: "BNCMRA85M15F205X",
    phone: "02 8341 902",
    email: "mario.bianchi@email.it",
    lastVisit: "3 apr 2026",
    lastVisitIso: "2026-04-03",
    city: "Milano",
    registeredAt: "2019-03-12",
    birthYear: 1985,
    gender: "M",
  },
  {
    id: "p-2",
    name: "Laura Conti",
    fiscalCode: "CNTLRA92H50L219Y",
    phone: "347 112 8890",
    email: "laura.conti@gmail.com",
    lastVisit: "8 apr 2026",
    lastVisitIso: "2026-04-08",
    city: "Monza",
    registeredAt: "2021-07-22",
    birthYear: 1992,
    gender: "F",
  },
  {
    id: "p-3",
    name: "Giuseppe Ferri",
    fiscalCode: "FRRGPP78P12H501Z",
    phone: "333 901 4422",
    email: "g.ferri@pec.it",
    lastVisit: "1 mar 2026",
    lastVisitIso: "2026-03-01",
    city: "Bergamo",
    registeredAt: "2018-11-03",
    birthYear: 1978,
    gender: "M",
  },
  {
    id: "p-4",
    name: "Anna Ricci",
    fiscalCode: "RCCNNA01A41F205K",
    phone: "02 6690 2211",
    email: "anna.ricci@libero.it",
    lastVisit: "18 nov 2025",
    lastVisitIso: "2025-11-18",
    city: "Milano",
    registeredAt: "2015-01-20",
    birthYear: 2001,
    gender: "F",
  },
  {
    id: "p-5",
    name: "Paolo Galli",
    fiscalCode: "GLLPLA88T22Z110Q",
    phone: "348 200 7711",
    email: "paolo.galli@email.it",
    lastVisit: "9 apr 2026",
    lastVisitIso: "2026-04-09",
    city: "Sesto San Giovanni",
    registeredAt: "2022-09-05",
    birthYear: 1988,
    gender: "M",
  },
  {
    id: "p-6",
    name: "Elena Serra",
    fiscalCode: "SRRLNE91D63A662T",
    phone: "339 445 0098",
    email: "elena.serra@gmail.com",
    lastVisit: "5 feb 2026",
    lastVisitIso: "2026-02-05",
    city: "Milano",
    registeredAt: "2020-04-18",
    birthYear: 1991,
    gender: "F",
  },
  {
    id: "p-7",
    name: "Roberto Costa",
    fiscalCode: "CSTBRT76C15H501U",
    phone: "02 5501 883",
    email: "r.costa@email.it",
    lastVisit: "28 mar 2026",
    lastVisitIso: "2026-03-28",
    city: "Rho",
    registeredAt: "2017-06-01",
    birthYear: 1976,
    gender: "M",
  },
  {
    id: "p-8",
    name: "Silvia Marini",
    fiscalCode: "MRNSLV83E52F205V",
    phone: "392 118 3344",
    email: "silvia.marini@pec.it",
    lastVisit: "4 apr 2026",
    lastVisitIso: "2026-04-04",
    city: "Como",
    registeredAt: "2023-02-14",
    birthYear: 1983,
    gender: "F",
  },
  {
    id: "p-9",
    name: "Francesco Leone",
    fiscalCode: "LNEFNC69H03L219P",
    phone: "335 667 2210",
    email: "f.leone@email.it",
    lastVisit: "10 gen 2026",
    lastVisitIso: "2026-01-10",
    city: "Milano",
    registeredAt: "2016-10-30",
    birthYear: 1969,
    gender: "M",
  },
  {
    id: "p-10",
    name: "Chiara Fontana",
    fiscalCode: "FNTCHR95L71Z404W",
    phone: "348 990 1122",
    email: "chiara.fontana@gmail.com",
    lastVisit: "7 apr 2026",
    lastVisitIso: "2026-04-07",
    city: "Legnano",
    registeredAt: "2024-01-08",
    birthYear: 1995,
    gender: "F",
  },
  {
    id: "p-11",
    name: "Andrea Pellegrini",
    fiscalCode: "PLLRND82M28H501S",
    phone: "02 8944 1200",
    email: "andrea.pellegrini@email.it",
    lastVisit: "22 feb 2026",
    lastVisitIso: "2026-02-22",
    city: "Busto Arsizio",
    registeredAt: "2019-12-01",
    birthYear: 1982,
    gender: "M",
  },
];

const PATIENTS_STORAGE_PREFIX = "visitae-doc-patients";

export function patientsStorageKey(docId: string): string {
  return `${PATIENTS_STORAGE_PREFIX}-${docId}`;
}

/** Lista pazienti per studio: demo + eventuale sessionStorage (solo client). */
export function getPatientsForDoc(docId: string): DemoPatient[] {
  if (typeof window === "undefined") return DEMO_PATIENTS;
  try {
    const raw = sessionStorage.getItem(patientsStorageKey(docId));
    if (raw) {
      const parsed = JSON.parse(raw) as DemoPatient[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEMO_PATIENTS;
}

export function findPatientById(docId: string, patientId: string): DemoPatient | undefined {
  return getPatientsForDoc(docId).find((p) => p.id === patientId);
}
