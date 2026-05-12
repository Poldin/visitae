import { fmtDateMedium, fmtLotUnitPriceEur, lotLineGrossTotal } from "./format";
import type { ExistingInventoryLot } from "./types";

export function ExistingLotSummaryBar({ inv }: { inv: ExistingInventoryLot }) {
  const unit = inv.unitPrice;
  const vatPct = inv.vatPct;

  const showMoney = unit != null && unit > 0;
  const netLine =
    showMoney ? Math.round(inv.quantity * unit * 100) / 100 : null;
  const gross =
    showMoney && netLine != null ? lotLineGrossTotal(inv.quantity, unit, vatPct) : null;
  const vatEuro =
    gross != null && netLine != null
      ? Math.round(Math.max(0, gross - netLine) * 100) / 100
      : null;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-700">
      <span>
        Quantità <span className="font-semibold tabular-nums">{inv.quantity}</span> in giacenza
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
      {showMoney ? (
        <>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>
            Imponibile (€){" "}
            <span className="font-semibold tabular-nums">{fmtLotUnitPriceEur(unit)}</span>
          </span>
          <span className="select-none text-[10px] text-slate-400" aria-hidden>
            •
          </span>
          <span>
            IVA %{" "}
            {vatPct == null ? (
              <span className="text-slate-400">—</span>
            ) : (
              <span className="font-semibold tabular-nums">
                {vatPct.toLocaleString("it-IT", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </span>
          {gross != null ? (
            <>
              <span className="select-none text-[10px] text-slate-400" aria-hidden>
                •
              </span>
              <span className="flex flex-wrap items-center gap-x-1">
                <span className="whitespace-nowrap">
                  tot.{" "}
                  <span className="font-semibold tabular-nums">{fmtLotUnitPriceEur(gross)}</span>
                </span>
                <span className="font-normal text-slate-500">
                  IVA incl.
                  {vatPct != null && vatPct > 0 && vatEuro != null ? (
                    <span className="tabular-nums">
                      {" "}
                      ({vatPct.toLocaleString("it-IT", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                      % · {fmtLotUnitPriceEur(vatEuro)})
                    </span>
                  ) : null}
                </span>
              </span>
            </>
          ) : null}
        </>
      ) : null}
    </p>
  );
}
