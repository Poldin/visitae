"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type ClinicOption = {
  id: string;
  name: string;
};

type ClinicSwitcherProps = {
  clinics: ClinicOption[];
  value: string | null;
  onChange: (clinicId: string) => void;
  disabled?: boolean;
};

export function ClinicSwitcher({ clinics, value, onChange, disabled = false }: ClinicSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedId = value ?? clinics[0]?.id ?? "";
  const selectedClinic = clinics.find((clinic) => clinic.id === selectedId) ?? clinics[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (clinics.length === 0) setOpen(false);
  }, [clinics.length]);

  if (clinics.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative ml-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 min-w-52 max-w-72 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="max-w-40 truncate text-xs font-semibold text-slate-700">{selectedClinic?.name}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-40 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {clinics.map((clinic) => {
              const active = clinic.id === selectedId;
              return (
                <button
                  key={clinic.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!active) onChange(clinic.id);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-800 hover:text-slate-100"
                >
                  <span className="truncate">{clinic.name}</span>
                  {active ? <Check size={13} className="shrink-0 text-current" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
