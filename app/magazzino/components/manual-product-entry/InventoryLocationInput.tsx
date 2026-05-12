"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { sanitizeInventoryLocationTyping } from "@/lib/inventoryLocation";

export type InventoryLocationInputProps = {
  clinicId: string | null;
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
  disabled?: boolean;
};

async function fetchSuggestionLocations(clinicId: string, q: string): Promise<string[]> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";
  if (!token) return [];

  const params = new URLSearchParams({ clinicId, q, limit: "30" });
  const res = await fetch(`/api/magazzino/inventory-locations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const payload = (await res.json().catch(() => null)) as
    | { suggestions?: { location: string; frequency: number }[] }
    | null;
  const rows = payload?.suggestions ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const loc = row.location;
    if (!seen.has(loc)) {
      seen.add(loc);
      out.push(loc);
    }
  }
  return out;
}

export function InventoryLocationInput({
  clinicId,
  value,
  onChange,
  compact = false,
  disabled = false,
}: InventoryLocationInputProps) {
  const reactId = useId().replace(/:/g, "");
  const listboxId = `inv-loc-list-${reactId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clinicId || disabled) {
      setOptions([]);
      setLoading(false);
      return;
    }
    const q = value.trim();
    let ignore = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void fetchSuggestionLocations(clinicId, q).then((next) => {
        if (!ignore) {
          setOptions(next);
          setLoading(false);
        }
      });
    }, 220);
    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [clinicId, disabled, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const inputCls = compact
    ? "h-7 w-full rounded-md border border-slate-200 px-2 text-[11px] text-slate-600"
    : "h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-600";

  const showPanel = Boolean(clinicId && open && !disabled && (options.length > 0 || loading));

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <input
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={disabled || !clinicId}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(sanitizeInventoryLocationTyping(e.target.value));
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder={clinicId ? "es. scaffale a2" : "—"}
        aria-label="Posizione in magazzino"
        className={inputCls}
      />
      {showPanel ? (
        <ul
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-md ${
            compact ? "text-[11px]" : "text-sm"
          }`}
        >
          {loading && options.length === 0 ? (
            <li className={`px-3 py-2 text-slate-500 ${compact ? "py-1.5" : ""}`}>Ricerca…</li>
          ) : null}
          {options.map((loc) => (
            <li key={loc} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value.trim() === loc}
                className={`flex w-full cursor-pointer select-none text-left text-slate-700 hover:bg-slate-50 ${
                  compact ? "px-2 py-1.5" : "px-3 py-2"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(sanitizeInventoryLocationTyping(loc));
                  setOpen(false);
                }}
              >
                {loc}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
