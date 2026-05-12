/**
 * Calcolo e parsing codice fiscale italiano (16 caratteri, algoritmo standard).
 */

const MONTH_LETTERS = ["A", "B", "C", "D", "E", "H", "L", "M", "P", "R", "S", "T"] as const;

/** Valore per posizioni dispari (1ª, 3ª, …) — indice 0-based: i % 2 === 0 */
const ODD_MAP: Record<string, number> = {
  "0": 1,
  "1": 0,
  "2": 5,
  "3": 7,
  "4": 9,
  "5": 13,
  "6": 15,
  "7": 17,
  "8": 19,
  "9": 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
};

const CHECK_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function evenValue(c: string): number {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  return c.charCodeAt(0) - 65;
}

function normalizeCfInput(s: string): string {
  return s
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function isVowel(c: string): boolean {
  return "AEIOU".includes(c);
}

function isConsonant(c: string): boolean {
  return /[A-Z]/.test(c) && !isVowel(c);
}

function normalizeNamePart(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");
}

function codeSurname(surname: string): string | null {
  const up = normalizeNamePart(surname);
  if (!up) return null;
  const cons = [...up].filter(isConsonant);
  const vows = [...up].filter(isVowel);
  const merged = (cons.join("") + vows.join("")).slice(0, 3);
  return merged.padEnd(3, "X");
}

function codeFirstName(firstName: string): string | null {
  const up = normalizeNamePart(firstName);
  if (!up) return null;
  const cons = [...up].filter(isConsonant);
  let pick: string;
  if (cons.length >= 4) {
    pick = cons[0]! + cons[2]! + cons[3]!;
  } else if (cons.length === 3) {
    pick = cons.join("");
  } else if (cons.length === 2) {
    const vows = [...up].filter(isVowel);
    pick = (cons.join("") + vows.join("")).slice(0, 3);
  } else if (cons.length === 1) {
    const vows = [...up].filter(isVowel);
    pick = (cons[0]! + vows.join("")).slice(0, 3);
  } else {
    pick = [...up].slice(0, 3).join("");
  }
  return pick.padEnd(3, "X");
}

function checkCharFor15(base15: string): string | null {
  if (base15.length !== 15) return null;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = base15[i]!;
    const v = i % 2 === 0 ? ODD_MAP[c] : evenValue(c);
    if (v === undefined && i % 2 === 0) return null;
    sum += v ?? 0;
  }
  return CHECK_ALPHABET[sum % 26] ?? null;
}

export function validateCodiceFiscale(cf: string): boolean {
  const n = normalizeCfInput(cf);
  if (n.length !== 16) return false;
  const expected = checkCharFor15(n.slice(0, 15));
  return expected !== null && expected === n[15];
}

export function computeCodiceFiscale(params: {
  cognome: string;
  nome: string;
  /** ISO date YYYY-MM-DD */
  dataNascita: string;
  sesso: "M" | "F";
  /** Codice catastale (es. F205) o Stato estero (es. Z100) */
  codiceCatastale: string;
}): string | null {
  const { cognome, nome, dataNascita, sesso, codiceCatastale } = params;
  const sc = codeSurname(cognome);
  const nc = codeFirstName(nome);
  if (!sc || !nc) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataNascita.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const yy = String(year % 100).padStart(2, "0");
  const monthLetter = MONTH_LETTERS[month - 1];
  if (!monthLetter) return null;

  let dayEnc = day;
  if (sesso === "F") dayEnc += 40;
  if (dayEnc < 1 || dayEnc > 71) return null;
  const dd = String(dayEnc).padStart(2, "0");

  const place = normalizeCfInput(codiceCatastale);
  if (place.length !== 4) return null;

  const base15 = `${sc}${nc}${yy}${monthLetter}${dd}${place}`;
  if (base15.length !== 15) return null;

  const chk = checkCharFor15(base15);
  if (!chk) return null;
  return `${base15}${chk}`;
}

export type ParsedCodiceFiscale = {
  dataNascita: string;
  sesso: "M" | "F";
  codiceCatastale: string;
};

/** Interpreta anno a 2 cifre rispetto all'anno corrente (stessa logica di molti gestionali). */
function centuryForTwoDigitYear(yy: number): number {
  const nowY = new Date().getFullYear();
  const nowYy = nowY % 100;
  return yy <= nowYy ? 2000 + yy : 1900 + yy;
}

export function parseCodiceFiscale(cf: string): ParsedCodiceFiscale | null {
  const n = normalizeCfInput(cf);
  if (n.length !== 16) return null;
  if (!validateCodiceFiscale(n)) return null;

  const yy = Number(n.slice(6, 8));
  const monthLetter = n[8]!;
  const dayEnc = Number(n.slice(9, 11));
  const monthIdx = MONTH_LETTERS.indexOf(monthLetter as (typeof MONTH_LETTERS)[number]);
  if (monthIdx < 0 || Number.isNaN(dayEnc)) return null;

  const sesso: "M" | "F" = dayEnc > 40 ? "F" : "M";
  const day = sesso === "F" ? dayEnc - 40 : dayEnc;
  if (day < 1 || day > 31) return null;

  const year = centuryForTwoDigitYear(yy);
  const month = monthIdx + 1;
  const dataNascita = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const codiceCatastale = n.slice(11, 15);

  return { dataNascita, sesso, codiceCatastale };
}

export { normalizeCfInput };
