"use client";

import { Barcode, X } from "lucide-react";

type EanScannerOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function EanScannerOverlay({ open, onClose }: EanScannerOverlayProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-140 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Scannerizza codice a barre</h3>
              <p className="mt-1 text-xs text-slate-600">
                Inquadra il codice a barre: acquisiremo automaticamente il valore EAN del prodotto.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Chiudi"
              aria-label="Chiudi"
            >
              <X size={14} />
            </button>
          </div>
          <div className="relative mx-auto mt-4 h-40 max-w-[240px] overflow-hidden rounded-md border border-slate-200 bg-white px-4 py-5">
            <div className="flex h-full items-center justify-center">
              <Barcode size={136} strokeWidth={1.5} className="text-slate-800" />
            </div>
            <div className="absolute inset-x-3 top-3 h-[2px] bg-red-500/90 scanner-line" />
          </div>
        </div>
      </div>
      <style jsx>{`
        .scanner-line {
          animation: scannerY 1.8s ease-in-out infinite alternate;
        }
        @keyframes scannerY {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(120px);
          }
        }
      `}</style>
    </>
  );
}
