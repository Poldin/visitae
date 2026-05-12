"use client";

import { CalendarClock, TrendingUp } from "lucide-react";
import { useMemo } from "react";

type StatisticsProduct = {
  id: string;
  name: string;
  totalQty: number;
  minStock: number;
  expiringQty: number;
  lots: Array<{ expiryDate: string | null; quantity: number }>;
};

type StatisticsMovement = {
  id: string;
  createdAt: string;
  movementType: string | null;
  quantity: number;
  productId: string;
};

type StatisticsTabProps = {
  products: StatisticsProduct[];
  movements: StatisticsMovement[];
  fmtDate: (iso: string | null) => string;
  fmtMovementType: (value: string | null) => string;
  loading?: boolean;
};

export function StatisticsTab({
  products,
  movements,
  fmtDate,
  fmtMovementType,
  loading = false,
}: StatisticsTabProps) {
  const kpi = useMemo(() => {
    const totalProducts = products.length;
    const totalQty = products.reduce((s, p) => s + p.totalQty, 0);
    const lowStockCount = products.filter((p) => p.totalQty <= p.minStock).length;
    return { totalProducts, totalQty, lowStockCount };
  }, [products]);

  const stats = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in90 = new Date(now);
    in90.setDate(in90.getDate() + 90);
    const since30 = new Date(now);
    since30.setDate(since30.getDate() - 30);

    const expiring30Qty = products.reduce((sum, p) => {
      return (
        sum +
        p.lots.reduce((lotSum, lot) => {
          if (!lot.expiryDate) return lotSum;
          const expiry = new Date(`${lot.expiryDate}T12:00:00`);
          if (Number.isNaN(expiry.getTime())) return lotSum;
          if (expiry >= now && expiry <= in30) return lotSum + lot.quantity;
          return lotSum;
        }, 0)
      );
    }, 0);

    const expiring90Qty = products.reduce((sum, p) => {
      return (
        sum +
        p.lots.reduce((lotSum, lot) => {
          if (!lot.expiryDate) return lotSum;
          const expiry = new Date(`${lot.expiryDate}T12:00:00`);
          if (Number.isNaN(expiry.getTime())) return lotSum;
          if (expiry >= now && expiry <= in90) return lotSum + lot.quantity;
          return lotSum;
        }, 0)
      );
    }, 0);

    const movementsLast30 = movements.filter((m) => {
      const d = new Date(m.createdAt);
      return !Number.isNaN(d.getTime()) && d >= since30;
    });
    const netQtyLast30 = movementsLast30.reduce((sum, m) => sum + m.quantity, 0);
    const usageMovementsLast30 = movementsLast30.filter(
      (m) => (m.movementType === "unload" || m.movementType === "usage") && m.quantity < 0,
    );
    const rotationByProduct = new Map<string, number>();
    for (const movement of usageMovementsLast30) {
      const prev = rotationByProduct.get(movement.productId) ?? 0;
      rotationByProduct.set(movement.productId, prev + Math.abs(movement.quantity));
    }
    const rotationRows = products
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        consumedQty30: rotationByProduct.get(product.id) ?? 0,
      }))
      .sort((a, b) => {
        if (b.consumedQty30 !== a.consumedQty30) return b.consumedQty30 - a.consumedQty30;
        return a.productName.localeCompare(b.productName, "it");
      });
    const topRotationRows = rotationRows.slice(0, 8);
    const dormantProductsCount = rotationRows.filter((row) => row.consumedQty30 === 0).length;
    const totalUsageQty30 = usageMovementsLast30.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);

    const byType = new Map<string, { count: number; qty: number }>();
    for (const m of movements) {
      const key = m.movementType ?? "unknown";
      const prev = byType.get(key) ?? { count: 0, qty: 0 };
      byType.set(key, { count: prev.count + 1, qty: prev.qty + m.quantity });
    }
    const movementTypeRows = Array.from(byType.entries())
      .map(([type, values]) => ({
        type,
        label: fmtMovementType(type),
        count: values.count,
        qty: values.qty,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      expiring30Qty,
      expiring90Qty,
      movementsLast30Count: movementsLast30.length,
      netQtyLast30,
      totalUsageQty30,
      movementTypeRows,
      topRotationRows,
      dormantProductsCount,
    };
  }, [products, movements, fmtMovementType]);

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" aria-busy>
        <div className="flex w-full flex-col gap-3">
          <div className="mb-1">
            <div className="h-7 w-48 max-w-full animate-pulse rounded-full bg-slate-200/80" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="h-3 w-20 rounded bg-slate-200/80" />
                <div className="mt-2 h-8 w-14 rounded bg-slate-200/80" />
              </div>
            ))}
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-3 h-5 w-44 max-w-full rounded bg-slate-200/80" />
                <div className="mb-3 flex flex-wrap gap-2">
                  <div className="h-7 w-28 rounded-full bg-slate-200/80" />
                  <div className="h-7 w-24 rounded-full bg-slate-200/80" />
                  <div className="h-7 w-32 rounded-full bg-slate-200/80" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, j) => (
                    <div key={j} className="h-10 rounded-md bg-slate-100/90" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
      <div className="flex w-full flex-col gap-3">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
            <TrendingUp size={12} />
            Ultimo aggiornamento: {movements[0] ? fmtDate(movements[0].createdAt) : "—"}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"><p className="text-[11px] text-slate-500">Prodotti</p><p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.totalProducts}</p></article>
          <article className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"><p className="text-[11px] text-slate-500">Qty totale</p><p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.totalQty}</p></article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"><p className="text-[11px] text-amber-700">Scadenza 30 gg</p><p className="mt-1 text-2xl font-semibold tabular-nums text-amber-900">{stats.expiring30Qty}</p></article>
          <article className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"><p className="text-[11px] text-rose-700">Sotto scorta</p><p className="mt-1 text-2xl font-semibold tabular-nums text-rose-900">{kpi.lowStockCount}</p></article>
          <article className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5"><p className="text-[11px] text-indigo-700">Consumo 30 gg</p><p className="mt-1 text-2xl font-semibold tabular-nums text-indigo-900">{stats.totalUsageQty30}</p></article>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2"><CalendarClock size={15} className="text-slate-600" /><h3 className="text-sm font-semibold text-slate-800">Trend 30 giorni</h3></div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">Movimenti: {stats.movementsLast30Count}</span>
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">Saldo: {stats.netQtyLast30 >= 0 ? "+" : ""}{stats.netQtyLast30}</span>
              <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">Scadenza 90 gg: {stats.expiring90Qty}</span>
            </div>
            <div className="space-y-1">
              {stats.movementTypeRows.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun movimento registrato.</p>
              ) : (
                stats.movementTypeRows.map((row) => (
                  <div key={row.type} className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5 text-sm">
                    <span className="font-medium text-slate-700">{row.label}</span>
                    <span className="inline-flex w-fit items-center gap-2"><span className="text-xs text-slate-500">{row.count} mov.</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.qty >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{row.qty >= 0 ? "+" : ""}{row.qty}</span></span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">Indice di Rotazione (Velocita di Consumo)</h3>
            </div>
            <p className="mb-2 text-xs text-slate-600">
              Somma delle quantità uscite negli ultimi 30 giorni per movimenti classificati come{' '}
              <span className="font-medium text-slate-800">Scarico</span> nel sistema (tipi{' '}
              <code className="rounded bg-slate-100 px-1 text-[11px]">unload</code>,{' '}
              <code className="rounded bg-slate-100 px-1 text-[11px]">usage</code>). Le{' '}
              <span className="font-medium text-slate-800">Rettifiche inventario</span> (
              <code className="rounded bg-slate-100 px-1 text-[11px]">inventory_adjust</code>) non concorrono a questo
              indice.
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="inline-flex w-fit rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800">
                Consumo totale 30 gg: {stats.totalUsageQty30}
              </span>
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                Prodotti dormienti: {stats.dormantProductsCount}
              </span>
            </div>
            <div className="space-y-1.5">
              {stats.topRotationRows.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun movimento di consumo registrato.</p>
              ) : (
                stats.topRotationRows.map((row) => (
                  <div key={row.productId} className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5 text-sm">
                    <span className="truncate font-medium text-slate-700">{row.productName}</span>
                    <span className={`ml-2 w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${row.consumedQty30 > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                      {row.consumedQty30 > 0 ? row.consumedQty30 : "Dormiente"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
