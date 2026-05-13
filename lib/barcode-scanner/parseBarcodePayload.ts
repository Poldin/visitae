/**
 * parseBarcodePayload — decodifica strutturata di un codice barre letto dal motore.
 *
 * Principio: restituisce dati strutturati SOLO quando la certezza è garantita dal formato.
 * Se non c'è evidenza esplicita (AIM prefix, GS separator, check HIBC Mod43, formato EAN),
 * il risultato è `kind: 'unknown'`. Nessuna euristica sui contenuti.
 *
 * Formati gestiti:
 *  - EAN-8 / EAN-13 / UPC-A / UPC-E / ITF-14  → kind: 'ean'
 *  - GS1 composito (DataMatrix, Code128, QR…)  → kind: 'gs1'
 *  - HIBC primary (check Mod43 verificato)     → kind: 'hibc'
 *  - Tutto il resto                            → kind: 'unknown'
 */

import { GS1 } from "@point-of-sale/barcode-parser";

// ── Tipi esportati ────────────────────────────────────────────────────────────

export type GS1Element = { ai: string; label: string; value: string };

/** EAN puro: il formato del lettore è già la fonte di verità. */
export type ParsedBarcodeEan = {
  kind: "ean";
  raw: string;
  code: string;
  symbology: "EAN-8" | "EAN-13" | "UPC-A" | "UPC-E" | "ITF-14";
};

/**
 * GS1 composito (DataMatrix con FNC1, Code 128 GS1, QR GS1, GS1 Databar, ecc.).
 * UDI-DI = gtin (AI 01), UDI-PI = lot + expiry + serial.
 */
export type ParsedBarcodeGs1 = {
  kind: "gs1";
  raw: string;
  /** GTIN a 14 cifre (AI 01) — coincide con UDI-DI per dispositivi medici. */
  gtin: string | null;
  /** Numero di lotto (AI 10). */
  lot: string | null;
  /**
   * Data di scadenza come stringa YYMMDD.
   * Priorità: AI 17 (USE BY/EXPIRY) > AI 15 (BEST BEFORE) > AI 11 (PROD DATE).
   */
  expiry: string | null;
  /** Numero seriale per track & trace (AI 21). */
  serial: string | null;
  /**
   * AIC AIFA (9 cifre) estratto dal GTIN se company prefix = 08 (farmaci italiani).
   * null se non riconoscibile come prodotto farmaceutico italiano.
   */
  aicAifa: string | null;
  /** Tutti gli Application Identifiers trovati, nell'ordine di scansione. */
  elements: GS1Element[];
};

/** HIBC primary verificato con check Mod43. */
export type ParsedBarcodeHibc = {
  kind: "hibc";
  raw: string;
  /** Labeler Identification Code (4 char alfanumerici, registrati da HIBCC). */
  lic: string;
  /** Product / Catalogue Number. */
  pcn: string;
  /** Unit of Measure indicator (cifra 0-9). */
  uom: string;
};

/**
 * DataMatrix farmaceutico italiano in formato Farmindustria legacy (pre-GS1 FMD).
 * Struttura riconoscibile in modo deterministico: AIC fisso 9 cifre + lotto alfanumerico.
 * Simbology fisica sempre DATA_MATRIX.
 */
export type ParsedBarcodeFarmindustria = {
  kind: "farmindustria";
  raw: string;
  /** AIC AIFA: 9 cifre fisse, posizione 0-8 della stringa. */
  aic: string;
  /** Numero di lotto: parte variabile alfanumerica, posizione 9+. */
  lot: string;
};

export type ParsedBarcodeUnknown = { kind: "unknown"; raw: string };

export type ParsedBarcode =
  | ParsedBarcodeEan
  | ParsedBarcodeGs1
  | ParsedBarcodeHibc
  | ParsedBarcodeFarmindustria
  | ParsedBarcodeUnknown;

// ── Mapping formati ZXing → @point-of-sale symbology ─────────────────────────

const EAN_FMT_MAP: Record<string, ParsedBarcodeEan["symbology"]> = {
  EAN_13: "EAN-13",
  EAN_8: "EAN-8",
  UPC_A: "UPC-A",
  UPC_E: "UPC-E",
  ITF: "ITF-14",
  UPC_EAN_EXTENSION: "EAN-13",
};

const ZXING_TO_POS: Record<string, string> = {
  DATA_MATRIX: "data-matrix",
  QR_CODE: "qr-code",
  CODE_128: "code-128",
  RSS_14: "gs1-databar-omni",
  RSS_EXPANDED: "gs1-databar-expanded",
  PDF_417: "pdf417",
  AZTEC: "aztec-code",
  CODE_93: "code93",
  CODABAR: "codabar",
};

// ── GS1 content detection (solo indicatori espliciti) ────────────────────────

/** GS character (U+001D): separatore di campo GS1 in DataMatrix e QR con FNC1. */
const GS = "\x1d";

/**
 * Prefissi AIM che indicano GS1 con FNC1 in prima posizione.
 * Fonte: ISO/IEC 15424 "Data Carrier Identifiers (including Symbology Identifiers)".
 */
const AIM_GS1_FNC1 = new Set([
  "]d2", // GS1 DataMatrix
  "]d5", // GS1 DataMatrix (ECC 200 variante)
  "]C1", // GS1-128
  "]Q3", // GS1 QR Code
  "]Q4", // GS1 QR Code (modello 2, associato)
  "]e0", // GS1 Databar
]);

type Gs1Detected = { detected: true; value: string; hasFnc1: boolean; posSym: string };
type Gs1NotDetected = { detected: false };

function detectGs1(raw: string, format: string): Gs1Detected | Gs1NotDetected {
  const posSym = ZXING_TO_POS[format] ?? "data-matrix";

  // Caso 1: GS character esplicito — il lettore ha già trasformato FNC1 in GS
  if (raw.includes(GS)) {
    return { detected: true, value: raw, hasFnc1: true, posSym };
  }

  // Caso 2: prefisso AIM riconosciuto — evidenza certa di GS1 con FNC1
  const aim = raw.slice(0, 3);
  if (AIM_GS1_FNC1.has(aim)) {
    return { detected: true, value: raw.slice(3), hasFnc1: true, posSym };
  }

  // Caso 3: notazione human-readable con parentesi AI "(01)VALUE(17)VALUE…"
  // Riconoscimento: inizia con "(XX)" dove XX sono 2 cifre decimali.
  // Convertiamo in formato macchina aggiungendo GS prima di ogni AI.
  if (/^\(\d{2}\)/.test(raw)) {
    const machine = raw.replace(/\((\d{2,4})\)/g, `${GS}$1`);
    return { detected: true, value: machine, hasFnc1: true, posSym };
  }

  return { detected: false };
}

// ── HIBC Mod43 ────────────────────────────────────────────────────────────────

const MOD43_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

function hibcVerifyCheck(inner: string): boolean {
  if (inner.length < 2) return false;
  const data = inner.slice(0, -1);
  const checkChar = inner[inner.length - 1]!;
  let sum = 0;
  for (const c of data) {
    const pos = MOD43_CHARS.indexOf(c);
    if (pos === -1) return false; // carattere fuori dall'alfabeto HIBC → non è HIBC
    sum += pos;
  }
  return MOD43_CHARS[sum % 43] === checkChar;
}

function parseHibc(raw: string): ParsedBarcodeHibc | null {
  if (!raw.startsWith("+")) return null;
  const inner = raw.slice(1);
  // Minimo: LIC(4) + PCN(≥1) + UoM(1) + Check(1) = 7 caratteri dopo '+'
  if (inner.length < 7) return null;
  if (!hibcVerifyCheck(inner)) return null;

  const body = inner.slice(0, -1); // rimuovi check char verificato
  const lic = body.slice(0, 4);
  const uom = body[body.length - 1]!;
  if (!/^\d$/.test(uom)) return null; // UoM deve essere una singola cifra
  const pcn = body.slice(4, -1);
  if (!pcn) return null;

  return { kind: "hibc", raw, lic, pcn, uom };
}

// ── AIC AIFA ──────────────────────────────────────────────────────────────────

/**
 * Tenta di estrarre il codice AIC AIFA da un GTIN-14.
 * Struttura italiana farmaceutica: 0 + 8 + AIC(9 cifre) + check digit.
 * Restituisce null se il GTIN non ha questa struttura.
 */
function extractAicAifa(gtin14: string): string | null {
  if (gtin14.length === 14 && gtin14.startsWith("08")) {
    return gtin14.slice(2, 11);
  }
  return null;
}

// ── Parser principale ─────────────────────────────────────────────────────────

export function parseBarcodePayload(raw: string, format: string): ParsedBarcode {
  // ── 1. EAN / UPC / ITF: il formato dichiarato dal motore è la fonte di verità ─
  const eanSym = EAN_FMT_MAP[format];
  if (eanSym) {
    return { kind: "ean", raw, code: raw, symbology: eanSym };
  }

  // ── 2. HIBC: verifica check Mod43, nessuna ambiguità residua ─────────────────
  if (raw.startsWith("+")) {
    const hibc = parseHibc(raw);
    if (hibc) return hibc;
  }

  // ── 3. GS1 composito: solo se ci sono indicatori espliciti nel contenuto ──────
  const gs1Detection = detectGs1(raw, format);
  if (gs1Detection.detected) {
    try {
      const result = GS1.parse({
        value: gs1Detection.value,
        symbology: gs1Detection.posSym,
        fnc1: gs1Detection.hasFnc1 ? 1 : undefined,
      });

      if (result?.elements?.length) {
        // Post-processing: la libreria @point-of-sale/barcode-parser v1.0.4 non include
        // AI 716 (NHRN Italy / AIC AIFA, introdotto ~2025). Gli elementi non riconosciuti
        // mantengono il valore grezzo incluso il prefisso AI. Li normalizziamo qui.
        const elements: GS1Element[] = result.elements.map((e) => {
          const rawVal = String(e.value ?? "");
          // AI non riconosciuto dalla libreria: e.ai è undefined, e.value contiene "716XXXXXXXXX"
          if (!e.ai && rawVal.startsWith("716") && /^716\d{9}/.test(rawVal)) {
            return { ai: "716", label: "AIC (Italia)", value: rawVal.slice(3) };
          }
          return { ai: e.ai ?? "", label: e.label ?? e.ai ?? "", value: rawVal };
        }).filter((e) => e.ai !== "");

        const find = (ai: string) => elements.find((e) => e.ai === ai)?.value ?? null;
        const gtin = result.gtin ?? null;

        // AIC: preferisce AI 716 esplicito, altrimenti estrae dal GTIN se company prefix 08
        const aicFromAi716 = find("716");
        const aicAifa = aicFromAi716 ?? (gtin ? extractAicAifa(gtin) : null);

        return {
          kind: "gs1",
          raw,
          gtin,
          lot: find("10"),
          expiry: find("17") ?? find("15") ?? find("11"),
          serial: find("21"),
          aicAifa,
          elements,
        };
      }
    } catch {
      // Il parser GS1 ha fallito — non tentiamo inferenze
    }
  }

  // ── 4. Farmindustria legacy DataMatrix: AIC (9 cifre fisse) + lotto (variabile) ──
  // Struttura deterministica: il formato fisico è sempre DATA_MATRIX, la posizione
  // dell'AIC è fissa a 9 cifre, il lotto occupa il resto della stringa.
  if (format === "DATA_MATRIX" || format === "CODE_128") {
    const m = /^(\d{9})([A-Z0-9]{1,30})$/.exec(raw);
    if (m) {
      return { kind: "farmindustria", raw, aic: m[1]!, lot: m[2]! };
    }
  }

  // ── 5. Niente di riconoscibile con certezza ───────────────────────────────────
  return { kind: "unknown", raw };
}
