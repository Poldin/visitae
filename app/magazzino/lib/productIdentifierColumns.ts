/**
 * Distribuisce il valore “codice a barre / identificativo” inviato dal client
 * (oggi spesso nel campo `ean`) sulle colonne native `products.ean`, `udi_di`, `hibc_primary`.
 *
 * Euristica (ordine):
 * - GS1 human-readable (contiene parentesi per AI) → `udi_di`
 * - Prefisso HIBC standard `+` → `hibc_primary`
 * - Solo cifre, lunghezza GTIN (8–14) → `ean`
 * - Solo cifre, lunghezza > 14 → spesso UDI concatenato → `udi_di`
 * - Altro → non valorizza colonne; va in `metadata.ean` come fallback (legacy).
 */

export type ProductIdentifierKind = "ean" | "udi_di" | "hibc" | "unknown";

export function classifyProductIdentifier(raw: string | null | undefined): {
  kind: ProductIdentifierKind;
  normalized: string | null;
} {
  if (raw == null) return { kind: "unknown", normalized: null };
  const t = raw.replace(/\s+/g, "").trim();
  if (!t) return { kind: "unknown", normalized: null };

  if (t.includes("(") && t.includes(")")) {
    return { kind: "udi_di", normalized: t };
  }

  if (t.startsWith("+")) {
    return { kind: "hibc", normalized: t };
  }

  if (/^\d+$/.test(t)) {
    if (t.length >= 8 && t.length <= 14) return { kind: "ean", normalized: t };
    if (t.length > 14) return { kind: "udi_di", normalized: t };
  }

  return { kind: "unknown", normalized: t };
}

/** Campi DB + eventuale `metadata.ean` solo se non mappabile su colonne. */
export function splitProductIdentifierForInsert(raw: string | null | undefined): {
  ean: string | null;
  udi_di: string | null;
  hibc_primary: string | null;
  metadataEan: string | null;
} {
  const { kind, normalized } = classifyProductIdentifier(raw);
  if (!normalized) {
    return { ean: null, udi_di: null, hibc_primary: null, metadataEan: null };
  }
  switch (kind) {
    case "ean":
      return { ean: normalized, udi_di: null, hibc_primary: null, metadataEan: null };
    case "udi_di":
      return { ean: null, udi_di: normalized, hibc_primary: null, metadataEan: null };
    case "hibc":
      return { ean: null, udi_di: null, hibc_primary: normalized, metadataEan: null };
    default:
      return { ean: null, udi_di: null, hibc_primary: null, metadataEan: normalized };
  }
}
