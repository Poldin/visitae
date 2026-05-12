import { fmtDateMedium, fmtLotUnitPriceEur } from "./format";
import type { ExistingInventoryLot } from "./types";

export function ExistingLotSummaryBar({ inv }: { inv: ExistingInventoryLot }) {
  const unit = inv.unitPrice;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-700">
      <span>
        <span className="font-semibold tabular-nums">{inv.quantity}</span> in giacenza
      </span>
      {inv.lotCode ? (
        <>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>
            lotto <span className="font-semibold">{inv.lotCode}</span>
          </span>
        </>
      ) : null}
      {inv.expiryDate ? (
        <>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>scade il {fmtDateMedium(inv.expiryDate)}</span>
        </>
      ) : null}
      {inv.location ? (
        <>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>
            pos. <span className="font-semibold">{inv.location}</span>
          </span>
        </>
      ) : null}
      {unit != null ? (
        <>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>
            prezzo <span className="font-semibold tabular-nums">{fmtLotUnitPriceEur(unit)}</span>
          </span>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>
            tot.{" "}
            <span className="font-semibold tabular-nums">
              {fmtLotUnitPriceEur(Math.round(inv.quantity * unit * 100) / 100)}
            </span>
          </span>
        </>
      ) : null}
    </p>
  );
}
