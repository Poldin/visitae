"use client";

import { useMemo } from "react";
import type { ParsedBarcode } from "@/lib/barcode-scanner";

// ── Nomi leggibili per i formati fisici (ZXing-style) ────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  DATA_MATRIX: "DataMatrix",
  QR_CODE: "QR Code",
  MICRO_QR_CODE: "Micro QR",
  RMQR: "rMQR",
  CODE_128: "Code 128",
  CODE_39: "Code 39",
  CODE_93: "Code 93",
  CODABAR: "Codabar",
  ITF: "ITF",
  PDF_417: "PDF 417",
  AZTEC: "Aztec",
  MAXICODE: "MaxiCode",
  RSS_14: "GS1 Databar",
  RSS_EXPANDED: "GS1 Databar Exp.",
  UPC_EAN_EXTENSION: "EAN Extension",
  TELEPEN: "Telepen",
  MANUAL: "Manuale",
};

// ── Helper: formatta data YYMMDD → "MM/YYYY" o "DD/MM/YYYY" ─────────────────

function formatExpiry(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const year = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
  if (dd === "00") return `${mm}/${year}`;
  return `${dd}/${mm}/${year}`;
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeProps = {
  parsed: ParsedBarcode;
  format: string;
  variant: "default" | "showcase";
};

export function BarcodeKindBadge({ parsed, format, variant }: BadgeProps) {
  const isShowcase = variant === "showcase";

  const { label, cls } = useMemo((): { label: string; cls: string } => {
    if (format === "MANUAL") {
      return {
        label: "Manuale",
        cls: isShowcase
          ? "bg-zinc-700/60 text-zinc-300 ring-1 ring-zinc-600/50"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
      };
    }
    switch (parsed.kind) {
      case "ean":
        return {
          label: parsed.symbology,
          cls: isShowcase
            ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30"
            : "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
        };
      case "gs1":
        return {
          label: "GS1",
          cls: isShowcase
            ? "bg-zinc-700/60 text-zinc-200 ring-1 ring-zinc-600/50"
            : "bg-slate-100 text-slate-700 ring-1 ring-slate-300",
        };
      case "hibc":
        return {
          label: "HIBC",
          cls: isShowcase
            ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        };
      case "farmindustria":
        return {
          label: FORMAT_LABELS["DATA_MATRIX"] ?? "DataMatrix",
          cls: isShowcase
            ? "bg-zinc-700/60 text-zinc-400 ring-1 ring-zinc-600/50"
            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
        };
      default:
        return {
          label: FORMAT_LABELS[format] ?? format.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          cls: isShowcase
            ? "bg-zinc-700/60 text-zinc-400 ring-1 ring-zinc-600/50"
            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
        };
    }
  }, [parsed.kind, format, isShowcase]);

  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// ── Pannello decodifica espanso ───────────────────────────────────────────────

type DecodePanelProps = {
  parsed: ParsedBarcode;
  variant: "default" | "showcase";
};

type RowItem = { label: string; value: string; mono?: boolean; highlight?: boolean };

function buildRows(parsed: ParsedBarcode): RowItem[] {
  if (parsed.kind === "gs1") {
    const rows: RowItem[] = [];
    if (parsed.gtin) rows.push({ label: "GTIN (UDI-DI)", value: parsed.gtin, mono: true, highlight: true });
    if (parsed.aicAifa) {
      const fromAi716 = parsed.elements.some((e) => e.ai === "716");
      rows.push({ label: `AIC AIFA${fromAi716 ? " (AI 716)" : ""}`, value: parsed.aicAifa, mono: true });
    }
    if (parsed.lot) rows.push({ label: "Lotto (UDI-PI)", value: parsed.lot, mono: true });
    if (parsed.expiry) rows.push({ label: "Scadenza", value: formatExpiry(parsed.expiry) });
    if (parsed.serial) rows.push({ label: "Seriale", value: parsed.serial, mono: true });
    // AI rimanenti non già mostrati
    const shown = new Set(["01", "10", "17", "15", "11", "21", "716"]);
    for (const e of parsed.elements) {
      if (!shown.has(e.ai)) rows.push({ label: `AI ${e.ai} · ${e.label}`, value: e.value, mono: true });
    }
    return rows;
  }
  if (parsed.kind === "hibc") {
    return [
      { label: "LIC (Labeler ID)", value: parsed.lic, mono: true, highlight: true },
      { label: "PCN (Product)", value: parsed.pcn, mono: true },
      { label: "UoM", value: parsed.uom },
    ];
  }
  if (parsed.kind === "farmindustria") {
    return [
      { label: "AIC AIFA", value: parsed.aic, mono: true, highlight: true },
      { label: "Lotto", value: parsed.lot, mono: true },
    ];
  }
  return [];
}

export function BarcodeDecodePanel({ parsed, variant }: DecodePanelProps) {
  const isShowcase = variant === "showcase";

  const rows = useMemo(() => buildRows(parsed), [parsed]);

  if (parsed.kind === "ean" || parsed.kind === "unknown" || rows.length === 0) return null;

  const borderCls = isShowcase
    ? "border-white/10 bg-zinc-900/60"
    : "border-slate-100 bg-slate-50/80";
  const labelCls = isShowcase ? "text-zinc-500" : "text-slate-400";
  const valueCls = isShowcase ? "text-zinc-200" : "text-slate-700";
  const highlightCls = isShowcase ? "text-zinc-50" : "text-slate-900";

  return (
    <div className={`mt-1.5 rounded-lg border px-3 py-2 text-xs ${borderCls}`}>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-2">
            <dt className={`w-32 shrink-0 ${labelCls}`}>{row.label}</dt>
            <dd
              className={`min-w-0 truncate font-semibold ${row.mono ? "font-mono" : ""} ${
                row.highlight ? highlightCls : valueCls
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
