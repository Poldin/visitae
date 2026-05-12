"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, NotFoundException } from "@zxing/library";
import QRCode from "react-qr-code";
import { createBrowserClient } from "@supabase/ssr";
import {
  ScanBarcode,
  X,
  Camera,
  CameraOff,
  Smartphone,
  Keyboard,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

function formatBarcodeName(raw: string): string {
  return raw
    .replace(/_/g, "-")
    .replace(/\b(\w)/g, (c) => c.toUpperCase())
    .replace("Ean", "EAN")
    .replace("Upc", "UPC")
    .replace("Qr", "QR")
    .replace("Hibc", "HIBC")
    .replace("Udi", "UDI")
    .replace("Pdf", "PDF")
    .replace("Manual", "Inserimento manuale");
}
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { BippaScanProductPanel } from "./BippaScanProductPanel";

export type BippaScanDialogProps = {
  open: boolean;
  onClose: () => void;
  onCode?: (code: string, format: string) => void;
  clinicId?: string | null;
  existingProductNames?: string[];
  onCreated?: () => Promise<void> | void;
};

type Tab = "camera" | "phone" | "manual";
type ScanState = "idle" | "scanning" | "success" | "error";

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon size={14} aria-hidden />
      {label}
    </button>
  );
}

export function BippaScanDialog({ open, onClose, onCode, clinicId, existingProductNames = [], onCreated }: BippaScanDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("camera");

  // camera tab state
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scanStateRef = useRef<ScanState>("idle");

  // phone tab state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [phoneSessionReady, setPhoneSessionReady] = useState(false);
  const phoneChannelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  // manual tab state
  const [manualCode, setManualCode] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  // last scanned code (shared across tabs)
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string | null>(null);

  // mount/unmount animation
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

  // keep ref in sync
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  // reset on open
  useEffect(() => {
    if (!open) return;
    setManualCode("");
    setLastCode(null);
    setLastFormat(null);
    setScanState("idle");
    setCamError(null);
    setPhoneConnected(false);
    setPhoneSessionReady(false);
    setSessionId(null);
    setQrToken(null);
  }, [open]);

  // keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key.toLowerCase() === "b" && activeTab === "camera" && scanStateRef.current === "success") {
        e.preventDefault();
        setScanState("scanning");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, activeTab]);

  // init zxing reader once
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  // stop camera when tab changes away from camera or dialog closes
  useEffect(() => {
    if (activeTab !== "camera" || !open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (scanState === "scanning" || scanState === "success") setScanState("idle");
    }
  }, [activeTab, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // focus manual input when switching to manual tab
  useEffect(() => {
    if (activeTab === "manual" && open) {
      const t = window.setTimeout(() => manualInputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [activeTab, open]);

  // disconnect phone channel on tab change or close
  useEffect(() => {
    if (activeTab !== "phone" || !open) {
      phoneChannelRef.current?.unsubscribe();
      phoneChannelRef.current = null;
      setPhoneConnected(false);
      setPhoneSessionReady(false);
    }
  }, [activeTab, open]);

  const handleCode = useCallback(
    (code: string, format: string) => {
      setLastCode(code);
      setLastFormat(format);
      setScanState("success");
      onCode?.(code, format);
    },
    [onCode],
  );

  // ── camera tab ─────────────────────────────────────────────────────────────
  const startCamera = async () => {
    if (!readerRef.current || !videoRef.current) return;
    setCamError(null);
    setScanState("scanning");

    try {
      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result && scanStateRef.current === "scanning") {
            const code = result.getText();
            const format = BarcodeFormat[result.getBarcodeFormat()] ?? result.getBarcodeFormat().toString();
            handleCode(code, format);
          } else if (err && !(err instanceof NotFoundException)) {
            // ignore frame-level errors
          }
        },
      );
      controlsRef.current = controls;
    } catch (e: unknown) {
      setScanState("error");
      if (e instanceof Error) {
        if (e.name === "NotAllowedError") {
          setCamError("Accesso alla fotocamera negato. Abilita la fotocamera nelle impostazioni del browser.");
        } else if (e.name === "NotFoundError") {
          setCamError("Nessuna fotocamera trovata su questo dispositivo.");
        } else {
          setCamError(e.message);
        }
      }
    }
  };

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanState("idle");
  };

  // ── phone tab ───────────────────────────────────────────────────────────────
  const startPhoneSession = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;

    const sid = crypto.randomUUID();
    setSessionId(sid);
    setQrToken(token);
    setPhoneConnected(false);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase2 = createBrowserClient(url, key);
    supabase2.realtime.setAuth(token);

    const ch = supabase2.channel(`bippa:${sid}`);
    phoneChannelRef.current = ch;

    ch.on("broadcast", { event: "scan" }, ({ payload }) => {
      const { code, format } = payload as { code: string; format: string };
      handleCode(code, format);
    });

    ch.on("broadcast", { event: "connected" }, () => {
      setPhoneConnected(true);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") setPhoneSessionReady(true);
    });
  }, [handleCode]);

  useEffect(() => {
    if (activeTab === "phone" && open && !phoneSessionReady) {
      startPhoneSession();
    }
  }, [activeTab, open, phoneSessionReady, startPhoneSession]);

  const qrUrl =
    sessionId && qrToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/bippa/${sessionId}#${qrToken}`
      : null;

  // ── manual tab ──────────────────────────────────────────────────────────────
  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    handleCode(code, "MANUAL");
    setManualCode("");
  };

  if (!mounted) return null;

  const isCameraScanning = scanState === "scanning" || scanState === "success";
  const showProductPanel = Boolean(lastCode && clinicId);
  const panelKey = lastCode ?? "";

  // ── Scanner panel content (shared between narrow and wide layout) ──────────
  const scannerPanelContent = (
    <>
      {/* tab bar */}
      <div className="mx-4 mb-3 flex rounded-xl bg-slate-100 p-1 sm:mx-5">
        <TabButton active={activeTab === "camera"} onClick={() => setActiveTab("camera")} icon={Camera} label="Fotocamera" />
        <TabButton active={activeTab === "phone"} onClick={() => setActiveTab("phone")} icon={Smartphone} label="Telefono" />
        <TabButton active={activeTab === "manual"} onClick={() => setActiveTab("manual")} icon={Keyboard} label="Manuale" />
      </div>

      {/* tab content */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">

        {/* ── camera tab ─────────────────────────────────────────── */}
        {activeTab === "camera" && (
          <div className="space-y-3">
            {/* viewport */}
            <div className="relative overflow-hidden rounded-xl bg-slate-950" style={{ height: 220 }}>
              <video
                ref={videoRef}
                className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-300 ${isCameraScanning ? "opacity-100" : "opacity-0"}`}
                playsInline
                muted
              />

              {isCameraScanning && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className={`relative h-36 w-52 transition-transform duration-200 ${scanState === "success" ? "scale-105" : "scale-100"}`}>
                    <span className="absolute left-0 top-0 h-6 w-6 rounded-tl border-l-2 border-t-2 border-white/70" />
                    <span className="absolute right-0 top-0 h-6 w-6 rounded-tr border-r-2 border-t-2 border-white/70" />
                    <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl border-b-2 border-l-2 border-white/70" />
                    <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br border-b-2 border-r-2 border-white/70" />
                    {scanState === "scanning" && (
                      <span className="bippa-scanner-line absolute left-1 right-1 h-0.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]" />
                    )}
                    {scanState === "success" && (
                      <div className="absolute inset-0 flex items-center justify-center rounded bg-emerald-500/20">
                        <CheckCircle2 size={28} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isCameraScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                  {scanState === "error" ? (
                    <>
                      <AlertTriangle size={28} className="text-red-400" />
                      <p className="px-4 text-center text-xs text-red-300">{camError}</p>
                    </>
                  ) : (
                    <>
                      <Camera size={28} />
                      <p className="text-xs">Fotocamera spenta</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* camera button */}
            {scanState === "idle" || scanState === "error" ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95"
              >
                <Camera size={16} />
                {scanState === "error" ? "Riprova" : "Avvia fotocamera"}
              </button>
            ) : scanState === "success" ? (
              <button
                type="button"
                onClick={() => setScanState("scanning")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
              >
                <RotateCcw size={16} />
                Bippa ancora!
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded border border-emerald-400/50 bg-emerald-700/50 px-1 text-[10px] font-bold leading-none">
                  B
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                <CameraOff size={16} />
                Ferma fotocamera
              </button>
            )}
          </div>
        )}

        {/* ── phone tab ─────────────────────────────────────────── */}
        {activeTab === "phone" && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-slate-500">
              Scansiona questo QR con un altro dispositivo (ad es. il tuo smartphone) per aprire lo scanner remoto già autenticato.
            </p>

            {/* QR code */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                {!phoneSessionReady && (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Loader2 size={24} className="animate-spin" />
                    <p className="text-xs">Generazione sessione…</p>
                  </div>
                )}
                {phoneSessionReady && qrUrl && (
                  <QRCode value={qrUrl} size={180} />
                )}
              </div>

              {/* connection status */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${phoneConnected ? "text-emerald-600" : "text-slate-400"}`}>
                <span className={`h-2 w-2 rounded-full ${phoneConnected ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]" : "bg-slate-300"}`} />
                {phoneConnected ? "Dispositivo connesso" : "In attesa del dispositivo…"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                phoneChannelRef.current?.unsubscribe();
                phoneChannelRef.current = null;
                setPhoneSessionReady(false);
                setPhoneConnected(false);
                setSessionId(null);
                setQrToken(null);
                startPhoneSession();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
            >
              <RefreshCw size={13} />
              Rigenera sessione
            </button>
          </div>
        )}

        {/* ── manual tab ─────────────────────────────────────────── */}
        {activeTab === "manual" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Inserisci manualmente un codice EAN, UDI o HIBC oppure incollalo dal lettore collegato al PC.
            </p>
            <div>
              <label htmlFor="bippa-manual-code" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Codice
              </label>
              <input
                ref={manualInputRef}
                id="bippa-manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManual();
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="EAN, UDI, HIBC…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none ring-slate-400/30 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={submitManual}
              disabled={!manualCode.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ScanBarcode size={16} />
              Conferma codice
            </button>
          </div>
        )}

        {/* last code result — shown only when no product panel */}
        {lastCode && !showProductPanel && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-emerald-800">{lastCode}</p>
              {lastFormat && (
                <p className="text-xs text-emerald-600">{formatBarcodeName(lastFormat)}</p>
              )}
            </div>
          </div>
        )}

        {/* scanned code badge when product panel is shown */}
        {showProductPanel && lastCode && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
            <p className="truncate font-mono text-xs font-medium text-slate-700">{lastCode}</p>
            {lastFormat && (
              <span className="ml-auto shrink-0 text-[10px] text-slate-400">{formatBarcodeName(lastFormat)}</span>
            )}
          </div>
        )}
      </div>
    </>
  );

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
        className={`flex w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition duration-200 ease-out will-change-transform ${
          showProductPanel ? "max-w-4xl" : "max-w-sm"
        } ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bippa-scan-title"
        onClick={(e) => e.stopPropagation()}
        style={showProductPanel ? { height: "min(90vh, 680px)" } : undefined}
      >
        {/* header */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <ScanBarcode size={20} strokeWidth={2} aria-hidden />
            </span>
            <h2 id="bippa-scan-title" className="text-base font-semibold leading-snug text-slate-900">
              Bippa il codice!
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="Chiudi"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {/* body: single column (no code) or two columns (code scanned) */}
        {showProductPanel ? (
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-b-2xl border-t border-slate-100">
            {/* left: scanner */}
            <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-100 py-3">
              {scannerPanelContent}
            </div>
            {/* right: product panel */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <BippaScanProductPanel
                key={panelKey}
                scannedCode={lastCode!}
                clinicId={clinicId ?? null}
                existingProductNames={existingProductNames}
                onCreated={async () => { await onCreated?.(); }}
                onReset={() => {
                  setLastCode(null);
                  setLastFormat(null);
                  setScanState(activeTab === "camera" && (scanState === "success") ? "scanning" : scanState);
                }}
              />
            </div>
          </div>
        ) : (
          <>
            {scannerPanelContent}
          </>
        )}
      </div>
    </div>
  );
}
