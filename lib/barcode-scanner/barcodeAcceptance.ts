/**
 * GS1 / GTIN modulo-10 check digit (body = all digits except the last).
 */
function gs1CheckDigitValue(bodyDigits: string): number {
  const rev = bodyDigits.split("").map(Number).reverse();
  let sum = 0;
  for (let i = 0; i < rev.length; i++) {
    sum += rev[i]! * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function validateGtinWithCheckDigit(full: string): boolean {
  if (!/^\d+$/.test(full) || full.length < 2) return false;
  const body = full.slice(0, -1);
  const check = Number(full.slice(-1));
  return gs1CheckDigitValue(body) === check;
}

/** Trim; for numeric symbologies keep digits only (handles spaces / soft separators). */
export function normalizeBarcodeCandidate(code: string, format: string): string {
  const t = code.trim();
  const digitsOnlyFormats = new Set([
    "EAN_13",
    "EAN_8",
    "UPC_A",
    "UPC_E",
    "UPC_EAN_EXTENSION",
    "ITF",
    "RSS_14",
    "RSS_EXPANDED",
  ]);
  if (digitsOnlyFormats.has(format)) {
    return t.replace(/\D/g, "");
  }
  return t;
}

/**
 * Reject obvious bad reads for retail barcodes (checksum). Other formats always pass.
 */
export function isRetailChecksumValid(code: string, format: string): boolean {
  switch (format) {
    case "EAN_13":
      return code.length === 13 && validateGtinWithCheckDigit(code);
    case "EAN_8":
      return code.length === 8 && validateGtinWithCheckDigit(code);
    case "UPC_A":
      return code.length === 12 && validateGtinWithCheckDigit(code);
    case "ITF":
      if (code.length === 14) return validateGtinWithCheckDigit(code);
      return code.length >= 6 && /^\d+$/.test(code);
    case "UPC_E":
    case "UPC_EAN_EXTENSION":
      return code.length >= 6 && code.length <= 14 && /^\d+$/.test(code);
    case "RSS_14":
    case "RSS_EXPANDED":
      return code.length > 0;
    default:
      return true;
  }
}

export type StableStreakGate = {
  push: (code: string, format: string) => void;
  reset: () => void;
};

/**
 * Requires `consecutive` identical (format + normalized code) reads, with at most `maxGapMs`
 * between samples, so a single lucky/wrong frame is not enough.
 */
export function createStableStreakGate(options: {
  onConfirm: (code: string, format: string) => void;
  consecutive?: number;
  maxGapMs?: number;
}): StableStreakGate {
  const consecutive = options.consecutive ?? 2;
  const maxGapMs = options.maxGapMs ?? 550;

  let lastKey = "";
  let streak = 0;
  let lastAt = 0;

  const reset = () => {
    lastKey = "";
    streak = 0;
    lastAt = 0;
  };

  const push = (code: string, format: string) => {
    const normalized = normalizeBarcodeCandidate(code, format);
    if (!isRetailChecksumValid(normalized, format)) {
      reset();
      return;
    }

    const key = `${format}\0${normalized}`;
    const now = performance.now();
    if (lastAt > 0 && now - lastAt > maxGapMs) {
      reset();
    }
    lastAt = now;

    if (key === lastKey) {
      streak += 1;
    } else {
      lastKey = key;
      streak = 1;
    }

    if (streak >= consecutive) {
      reset();
      options.onConfirm(normalized, format);
    }
  };

  return { push, reset };
}
