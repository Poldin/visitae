"use client";

import { useEffect, useState } from "react";
import { ScanBarcode, X } from "lucide-react";
import { BippaScanExperience } from "./BippaScanExperience";

export type BippaScanDialogProps = {
  open: boolean;
  onClose: () => void;
  onCode?: (code: string, format: string) => void;
  clinicId?: string | null;
  existingProductNames?: string[];
  onCreated?: () => Promise<void> | void;
};

export function BippaScanDialog({
  open,
  onClose,
  onCode,
  clinicId,
  existingProductNames = [],
  onCreated,
}: BippaScanDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-132 flex items-end justify-center bg-black/40 px-3 pb-4 pt-6 transition-opacity duration-200 ease-out sm:items-center sm:pb-6 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full transition duration-200 ease-out will-change-transform ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bippa-scan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <BippaScanExperience
          active={open}
          clinicId={clinicId}
          existingProductNames={existingProductNames}
          onCreated={onCreated}
          onCode={onCode}
          variant="default"
          initialTab="phone"
          enableKeyboardShortcuts
          onKeyboardClose={onClose}
          header={
            <div className="flex shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white px-4 pt-4 pb-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/80 text-slate-800 ring-1 ring-slate-200/80">
                  <ScanBarcode size={20} strokeWidth={2} aria-hidden />
                </span>
                <h2 id="bippa-scan-title" className="text-base font-semibold leading-snug text-slate-900">
                  Bippa il codice!
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                title="Chiudi"
                onClick={onClose}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
