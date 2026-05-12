"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ProductSortField = "name" | "totalQty" | "expiringQty" | "nextExpiry" | "lastMovementAt" | "lowStockFirst";
export type ProductSortDir = "asc" | "desc";
export type ProductFilterField =
  | "name"
  | "sku"
  | "category"
  | "totalQty"
  | "expiringQty"
  | "nonExpiringQty"
  | "minStock"
  | "nextExpiry"
  | "lastMovementAt"
  | "lowStock";
export type ProductFilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "not_null"
  | "is_true"
  | "is_false";
export type ProductFilterRow = {
  id: string;
  field: ProductFilterField;
  op: ProductFilterOp;
  value: string;
};

type FieldType = "text" | "number" | "date" | "boolean";

const SORT_FIELD_OPTIONS: Array<{ id: ProductSortField; label: string }> = [
  { id: "name", label: "Nome" },
  { id: "totalQty", label: "Quantita totale" },
  { id: "expiringQty", label: "Quantita in scadenza" },
  { id: "nextExpiry", label: "Prossima scadenza" },
  { id: "lastMovementAt", label: "Ultimo movimento" },
  { id: "lowStockFirst", label: "Sotto scorta prima" },
];

const FILTER_FIELD_OPTIONS: Array<{ id: ProductFilterField; label: string; type: FieldType }> = [
  { id: "name", label: "Nome", type: "text" },
  { id: "sku", label: "SKU", type: "text" },
  { id: "category", label: "Categoria", type: "text" },
  { id: "totalQty", label: "Quantita totale", type: "number" },
  { id: "expiringQty", label: "Quantita in scadenza", type: "number" },
  { id: "nonExpiringQty", label: "Quantita non in scadenza", type: "number" },
  { id: "minStock", label: "Scorta minima", type: "number" },
  { id: "nextExpiry", label: "Prossima scadenza", type: "date" },
  { id: "lastMovementAt", label: "Ultimo movimento", type: "date" },
  { id: "lowStock", label: "Sotto scorta", type: "boolean" },
];

const OPS_BY_TYPE: Record<FieldType, Array<{ id: ProductFilterOp; label: string }>> = {
  text: [
    { id: "contains", label: "contiene" },
    { id: "eq", label: "uguale a" },
    { id: "neq", label: "diverso da" },
    { id: "starts_with", label: "inizia con" },
    { id: "ends_with", label: "finisce con" },
    { id: "is_null", label: "e assente" },
    { id: "not_null", label: "non e assente" },
  ],
  number: [
    { id: "eq", label: "=" },
    { id: "neq", label: "!=" },
    { id: "gt", label: ">" },
    { id: "gte", label: ">=" },
    { id: "lt", label: "<" },
    { id: "lte", label: "<=" },
    { id: "is_null", label: "e assente" },
    { id: "not_null", label: "non e assente" },
  ],
  date: [
    { id: "eq", label: "il giorno" },
    { id: "gt", label: "dopo" },
    { id: "gte", label: "dal giorno" },
    { id: "lt", label: "prima" },
    { id: "lte", label: "fino al giorno" },
    { id: "is_null", label: "e assente" },
    { id: "not_null", label: "non e assente" },
  ],
  boolean: [
    { id: "is_true", label: "vero" },
    { id: "is_false", label: "falso" },
  ],
};

const SIMPLE_FILTER_PRESETS: Array<{
  id: string;
  label: string;
  rows?: ProductFilterRow[];
  buildRows?: () => ProductFilterRow[];
}> = [
  {
    id: "low-stock",
    label: "Sotto scorta",
    rows: [{ id: "low-stock-1", field: "lowStock", op: "is_true", value: "" }],
  },
  {
    id: "expiring-soon",
    label: "In scadenza (1 mese)",
    buildRows: () => {
      const today = new Date();
      const inOneMonth = new Date(today);
      inOneMonth.setMonth(inOneMonth.getMonth() + 1);
      const todayIso = today.toISOString().slice(0, 10);
      const oneMonthIso = inOneMonth.toISOString().slice(0, 10);
      return [
        { id: "expiring-soon-start", field: "nextExpiry", op: "gte", value: todayIso },
        { id: "expiring-soon-end", field: "nextExpiry", op: "lte", value: oneMonthIso },
      ];
    },
  },
  {
    id: "out-of-stock",
    label: "Esauriti",
    rows: [{ id: "out-of-stock-1", field: "totalQty", op: "eq", value: "0" }],
  },
  {
    id: "stock-healthy",
    label: "Scorta in salute",
    rows: [{ id: "stock-healthy-1", field: "lowStock", op: "is_false", value: "" }],
  },
];

export type ProductFilters = {
  query: string;
  sortField: ProductSortField;
  sortDir: ProductSortDir;
  filterRows: ProductFilterRow[];
};

type ProductsListControlsProps = {
  value: ProductFilters;
  onChange: (next: ProductFilters) => void;
};

export function ProductsListControls({ value, onChange }: ProductsListControlsProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortFieldMenuOpen, setSortFieldMenuOpen] = useState(false);
  const [activeOpMenuRowId, setActiveOpMenuRowId] = useState<string | null>(null);
  const sortWrapRef = useRef<HTMLDivElement>(null);
  const filtersWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen && !filtersOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (sortOpen && !sortWrapRef.current?.contains(target)) {
        setSortOpen(false);
        setSortFieldMenuOpen(false);
      }

      if (filtersOpen && !filtersWrapRef.current?.contains(target)) {
        setFiltersOpen(false);
        setActiveOpMenuRowId(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [sortOpen, filtersOpen]);

  const updateFilterRow = (id: string, patch: Partial<ProductFilterRow>) => {
    onChange({
      ...value,
      filterRows: value.filterRows.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.field) {
          const fieldType = FILTER_FIELD_OPTIONS.find((f) => f.id === patch.field)?.type ?? "text";
          next.op = OPS_BY_TYPE[fieldType][0].id;
          if (fieldType === "boolean") next.value = "";
        }
        return next;
      }),
    });
  };

  const addFilterRow = () => {
    onChange({
      ...value,
      filterRows: [
        ...value.filterRows,
        {
          id: crypto.randomUUID(),
          field: "name",
          op: "contains",
          value: "",
        },
      ],
    });
  };

  const removeFilterRow = (id: string) => {
    onChange({
      ...value,
      filterRows: value.filterRows.filter((row) => row.id !== id),
    });
  };

  const applySimplePreset = (preset: (typeof SIMPLE_FILTER_PRESETS)[number]) => {
    const presetRows = preset.buildRows ? preset.buildRows() : (preset.rows ?? []);
    onChange({
      ...value,
      filterRows: presetRows.map((row) => ({ ...row, id: crypto.randomUUID() })),
    });
  };

  return (
    <>
      <input
        type="search"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        placeholder="Cerca per SKU, nome, categoria..."
        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/80 sm:max-w-[18rem]"
      />
      <div ref={sortWrapRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setFiltersOpen(false);
            setSortFieldMenuOpen(false);
            setSortOpen((v) => !v);
          }}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Ordina
          <ChevronDown size={15} className={`${sortOpen ? "rotate-180" : ""}`} />
        </button>
        {sortOpen ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setSortFieldMenuOpen((v) => !v)}
                  className="inline-flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
                  aria-haspopup="listbox"
                  aria-expanded={sortFieldMenuOpen}
                >
                  <span className="truncate">
                    {SORT_FIELD_OPTIONS.find((opt) => opt.id === value.sortField)?.label ?? "Nome"}
                  </span>
                  <ChevronDown size={14} className={`${sortFieldMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {sortFieldMenuOpen ? (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                    {SORT_FIELD_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChange({ ...value, sortField: opt.id });
                          setSortFieldMenuOpen(false);
                        }}
                        className={`block w-full rounded px-2 py-1 text-left text-xs ${
                          value.sortField === opt.id ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                        }`}
                        role="option"
                        aria-selected={value.sortField === opt.id}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...value, sortDir: value.sortDir === "asc" ? "desc" : "asc" })}
                className="inline-flex h-8 min-w-16 items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                aria-label={`Ordinamento ${value.sortDir === "asc" ? "ascendente" : "discendente"}`}
                title={`Ordinamento ${value.sortDir === "asc" ? "ascendente" : "discendente"}`}
              >
                {value.sortDir === "asc" ? "ASC" : "DESC"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div ref={filtersWrapRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setSortOpen(false);
            setSortFieldMenuOpen(false);
            setActiveOpMenuRowId(null);
            setFiltersOpen((v) => !v);
          }}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Filtri
          <ChevronDown size={15} className={`${filtersOpen ? "rotate-180" : ""}`} />
        </button>
        {filtersOpen ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-88 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="space-y-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-slate-500">Filtri semplici</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIMPLE_FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applySimplePreset(preset)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {value.filterRows.length === 0 ? (
                <p className="text-xs text-slate-500">Nessun filtro attivo.</p>
              ) : (
                <ul className="space-y-2">
                  {value.filterRows.map((row) => {
                    const field = FILTER_FIELD_OPTIONS.find((f) => f.id === row.field) ?? FILTER_FIELD_OPTIONS[0];
                    const ops = OPS_BY_TYPE[field.type];
                    const requiresValue = !["is_null", "not_null", "is_true", "is_false"].includes(row.op);
                    return (
                      <li key={row.id} className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-center gap-1.5">
                          <select
                            value={row.field}
                            onChange={(e) => updateFilterRow(row.id, { field: e.target.value as ProductFilterField })}
                            className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                          >
                            {FILTER_FIELD_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveOpMenuRowId((prev) => (prev === row.id ? null : row.id))}
                              className="inline-flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
                              aria-haspopup="listbox"
                              aria-expanded={activeOpMenuRowId === row.id}
                            >
                              <span className="truncate">{ops.find((op) => op.id === row.op)?.label ?? "="}</span>
                              <ChevronDown size={14} className={activeOpMenuRowId === row.id ? "rotate-180" : ""} />
                            </button>
                            {activeOpMenuRowId === row.id ? (
                              <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                                {ops.map((op) => (
                                  <button
                                    key={op.id}
                                    type="button"
                                    onClick={() => {
                                      updateFilterRow(row.id, { op: op.id });
                                      setActiveOpMenuRowId(null);
                                    }}
                                    className={`block w-full rounded px-2 py-1 text-left text-xs ${
                                      row.op === op.id ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                    role="option"
                                    aria-selected={row.op === op.id}
                                  >
                                    {op.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFilterRow(row.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50"
                            aria-label="Rimuovi filtro"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {requiresValue ? (
                          <input
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            value={row.value}
                            onChange={(e) => updateFilterRow(row.id, { value: e.target.value })}
                            placeholder={field.type === "number" ? "0" : field.type === "date" ? "YYYY-MM-DD" : "Valore"}
                            className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={addFilterRow} className="rounded bg-slate-100 px-2 py-1 text-xs">
                  Aggiungi filtro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveOpMenuRowId(null);
                    onChange({ ...value, filterRows: [] });
                  }}
                  className="rounded bg-slate-100 px-2 py-1 text-xs"
                >
                  Reimposta
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
