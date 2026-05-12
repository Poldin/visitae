"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBarcodeLabel, useVideoBarcodeScan } from "@/lib/barcode-scanner";
import { ScanBarcode, Camera, CameraOff, CheckCircle2, AlertTriangle } from "lucide-react";

type ScanState = "idle" | "scanning" | "success" | "error";

/**
 * Demo pubblica sul telefono: niente sessione, niente Realtime, niente PC collegato.
 * Dopo la scansione l’utente vede tutto solo su questo dispositivo.
 */
export default function BippaDemoPage() {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanStateRef = useRef<ScanState>("idle");

  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  const handleScan = useCallback((code: string, format: string) => {
    setLastCode(code);
    setLastFormat(format);
    setScanState("success");
    setTimeout(() => {
      setScanState("scanning");
    }, 2000);
  }, []);

  const { start: startVideoScan, stop: stopVideoScan } = useVideoBarcodeScan({
    videoRef,
    shouldDetect: () => scanStateRef.current === "scanning",
    onDetect: handleScan,
  });

  const startScanning = async () => {
    if (!videoRef.current) return;
    setError(null);
    setScanState("scanning");
    try {
      await startVideoScan();
    } catch (e: unknown) {
      setScanState("error");
      if (e instanceof Error) {
        if (e.name === "NotAllowedError") {
          setError("Accesso alla fotocamera negato. Abilita la fotocamera nelle impostazioni del browser.");
        } else if (e.name === "NotFoundError") {
          setError("Nessuna fotocamera trovata su questo dispositivo.");
        } else {
          setError(e.message);
        }
      }
    }
  };

  const stopScanning = () => {
    stopVideoScan();
    setScanState("idle");
  };

  const isScanning = scanState === "scanning" || scanState === "success";

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
          <ScanBarcode size={20} strokeWidth={2} />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">Bippa — prova sul telefono</p>
          <p className="text-xs text-slate-400">Demo: la lettura resta su questo dispositivo</p>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-opacity duration-300 ${isScanning ? "opacity-100" : "opacity-0"}`}
          playsInline
          muted
        />

        {isScanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`relative h-56 w-72 transition-all duration-300 ${scanState === "success" ? "scale-105" : "scale-100"}`}
            >
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-white/80" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-white/80" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-white/80" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-white/80" />
              {scanState === "scanning" && (
                <span className="bippa-scanner-line absolute left-2 right-2 h-0.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" />
              )}
              {scanState === "success" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle2 size={40} className="text-emerald-400" />
                  <p className="max-w-[220px] truncate text-center text-sm font-mono font-semibold text-emerald-300">
                    {lastCode}
                  </p>
                  {lastFormat ? (
                    <p className="text-xs text-emerald-400/80">{formatBarcodeLabel(lastFormat)}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
            {scanState === "error" ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-red-300">Fotocamera non disponibile</p>
                  <p className="text-sm text-slate-400">{error}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                  <Camera size={32} />
                </div>
                <div>
                  <p className="mb-1 font-semibold text-white">Pronto per scansionare</p>
                  <p className="text-sm text-slate-400">
                    Avvia la fotocamera e inquadra un codice: EAN, Data Matrix e altri formati supportati da Bippa.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 bg-slate-950 px-4 py-4">
        {!isScanning ? (
          <button
            type="button"
            onClick={startScanning}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 active:scale-95"
          >
            <Camera size={18} />
            {scanState === "error" ? "Riprova" : "Avvia fotocamera"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanning}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-95"
          >
            <CameraOff size={18} />
            Ferma fotocamera
          </button>
        )}

        {lastCode && (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <p className="mb-0.5 text-xs text-slate-400">Ultimo codice letto</p>
            <p className="truncate font-mono text-sm font-semibold text-emerald-300">{lastCode}</p>
            {lastFormat ? (
              <p className="mt-0.5 text-xs text-slate-500">{formatBarcodeLabel(lastFormat)}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
