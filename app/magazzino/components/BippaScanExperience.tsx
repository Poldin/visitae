"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { formatBarcodeLabel, useVideoBarcodeScan } from "@/lib/barcode-scanner";
import { createBrowserClient } from "@supabase/ssr";
import {
  ScanBarcode,
  Camera,
  CameraOff,
  Smartphone,
  Keyboard,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { BippaScanProductPanel } from "./BippaScanProductPanel";

export type BippaTab = "camera" | "phone" | "manual";
const DEFAULT_BIPPA_TABS: readonly BippaTab[] = ["camera", "phone", "manual"];
type ScanState = "idle" | "scanning" | "success" | "error";

const TAB_UI: Record<BippaTab, { icon: React.ElementType; label: string; badge?: string }> = {
  camera: { icon: Camera, label: "Fotocamera" },
  phone: { icon: Smartphone, label: "Telefono", badge: "Consigliato" },
  manual: { icon: Keyboard, label: "Manuale" },
};

export type BippaScanExperienceProps = {
  /** When false, tear down scanners / channels (e.g. dialog closed). */
  active: boolean;
  clinicId?: string | null;
  existingProductNames?: string[];
  onCreated?: () => Promise<void> | void;
  onCode?: (code: string, format: string) => void;
  variant?: "default" | "showcase";
  initialTab?: BippaTab;
  /** Default: camera, phone, manual. Omitted tabs are hidden. */
  visibleTabs?: readonly BippaTab[];
  /**
   * If true, ensures an auth session (via `signInAnonymously` when non è già loggato)
   * prima di aprire il canale Realtime per il QR “telefono”. Serve per la home senza login.
   * Richiede Anonymous sign-ins abilitato nel progetto Supabase.
   */
  bootstrapAnonymousForRemoteScan?: boolean;
  /** Top row (e.g. dialog title + close). Omit for embedded landing demos. */
  header?: React.ReactNode;
  enableKeyboardShortcuts?: boolean;
  onKeyboardClose?: () => void;
};

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: string;
  variant: "default" | "showcase";
}) {
  const activeC =
    variant === "showcase"
      ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-400/40 shadow-[0_0_24px_-6px_rgba(16,185,129,0.55)]"
      : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80";
  const idleC =
    variant === "showcase"
      ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
      : "text-slate-500 hover:bg-white/60 hover:text-slate-700";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all sm:flex-row sm:gap-1 sm:px-2 sm:text-xs ${
        active ? activeC : idleC
      }`}
    >
      <span className="inline-flex items-center gap-1">
        <Icon size={14} className="shrink-0 opacity-90" aria-hidden />
        <span className="leading-tight">{label}</span>
      </span>
      {badge ? (
        <span
          className={
            variant === "showcase"
              ? "inline-flex items-center gap-0.5 rounded-full bg-emerald-400/25 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/30 sm:absolute sm:-top-1 sm:right-1 sm:px-2"
              : "inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white shadow-sm sm:absolute sm:-top-1 sm:right-0.5 sm:px-2"
          }
        >
          <Sparkles size={9} className="opacity-90" aria-hidden />
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function BippaScanExperience({
  active,
  clinicId = null,
  existingProductNames = [],
  onCreated,
  onCode,
  variant = "default",
  initialTab = "phone",
  visibleTabs,
  bootstrapAnonymousForRemoteScan = false,
  header,
  enableKeyboardShortcuts = false,
  onKeyboardClose,
}: BippaScanExperienceProps) {
  const visibleTabsKey =
    visibleTabs === undefined || visibleTabs.length === 0 ? "__all__" : visibleTabs.join("|");
  const resolvedTabs = useMemo(() => {
    if (visibleTabsKey === "__all__") return DEFAULT_BIPPA_TABS;
    const keys = visibleTabsKey.split("|") as BippaTab[];
    return DEFAULT_BIPPA_TABS.filter((t) => keys.includes(t));
  }, [visibleTabsKey]);

  const [activeTab, setActiveTab] = useState<BippaTab>(() => {
    const first = resolvedTabs[0] ?? "phone";
    return resolvedTabs.includes(initialTab!) ? initialTab! : first;
  });
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanStateRef = useRef<ScanState>("idle");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [phoneSessionReady, setPhoneSessionReady] = useState(false);
  const phoneChannelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  const [anonAuthStatus, setAnonAuthStatus] = useState<"pending" | "ready" | "error">(
    () => (bootstrapAnonymousForRemoteScan ? "pending" : "ready"),
  );
  const [anonAuthMessage, setAnonAuthMessage] = useState<string | null>(null);
  const [anonBootNonce, setAnonBootNonce] = useState(0);

  const [manualCode, setManualCode] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);
  const manualFieldId = useId();

  const [lastCode, setLastCode] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string | null>(null);

  const prevActiveRef = useRef(false);

  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  useEffect(() => {
    if (!resolvedTabs.includes(activeTab)) {
      setActiveTab(resolvedTabs[0] ?? "phone");
    }
  }, [resolvedTabs, activeTab]);

  useEffect(() => {
    if (!bootstrapAnonymousForRemoteScan || !active) return;

    let cancelled = false;
    setAnonAuthStatus("pending");
    setAnonAuthMessage(null);

    (async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        if (!cancelled) {
          setAnonAuthStatus("error");
          setAnonAuthMessage("Supabase non configurato.");
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        setAnonAuthStatus("ready");
        return;
      }

      const { error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (error) {
        setAnonAuthStatus("error");
        setAnonAuthMessage(error.message);
      } else {
        setAnonAuthStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, bootstrapAnonymousForRemoteScan, anonBootNonce]);

  useEffect(() => {
    if (active && !prevActiveRef.current) {
      setManualCode("");
      setLastCode(null);
      setLastFormat(null);
      setScanState("idle");
      setCamError(null);
      setPhoneConnected(false);
      setPhoneSessionReady(false);
      setSessionId(null);
      setQrToken(null);
      const tab = resolvedTabs.includes(initialTab) ? initialTab : (resolvedTabs[0] ?? "phone");
      setActiveTab(tab);
    }
    prevActiveRef.current = active;
  }, [active, initialTab, resolvedTabs]);

  useEffect(() => {
    if (!enableKeyboardShortcuts || !active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onKeyboardClose) {
        e.preventDefault();
        onKeyboardClose();
        return;
      }
      if (e.key.toLowerCase() === "b" && activeTab === "camera" && scanStateRef.current === "success") {
        e.preventDefault();
        setScanState("scanning");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableKeyboardShortcuts, active, onKeyboardClose, activeTab]);

  const handleCode = useCallback(
    (code: string, format: string) => {
      setLastCode(code);
      setLastFormat(format);
      setScanState("success");
      onCode?.(code, format);
    },
    [onCode],
  );

  const { start: startVideoScan, stop: stopVideoScan } = useVideoBarcodeScan({
    videoRef,
    shouldDetect: () => scanStateRef.current === "scanning",
    onDetect: handleCode,
  });

  useEffect(() => {
    if (activeTab !== "camera" || !active) {
      stopVideoScan();
      setScanState((s) => (s === "scanning" || s === "success" ? "idle" : s));
    }
  }, [activeTab, active, stopVideoScan]);

  useEffect(() => {
    if (activeTab === "manual" && active) {
      const t = window.setTimeout(() => manualInputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [activeTab, active]);

  useEffect(() => {
    if (activeTab !== "phone" || !active) {
      phoneChannelRef.current?.unsubscribe();
      phoneChannelRef.current = null;
      setPhoneConnected(false);
      setPhoneSessionReady(false);
    }
  }, [activeTab, active]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    setCamError(null);
    setScanState("scanning");
    try {
      await startVideoScan();
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
    stopVideoScan();
    setScanState("idle");
  };

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
    if (activeTab !== "phone" || !active) return;
    if (bootstrapAnonymousForRemoteScan && anonAuthStatus !== "ready") return;
    if (anonAuthStatus === "error") return;
    if (!phoneSessionReady) {
      startPhoneSession();
    }
  }, [
    activeTab,
    active,
    phoneSessionReady,
    startPhoneSession,
    bootstrapAnonymousForRemoteScan,
    anonAuthStatus,
  ]);

  const qrUrl =
    sessionId && qrToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/bippa/${sessionId}#${qrToken}`
      : null;

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    handleCode(code, "MANUAL");
    setManualCode("");
  };

  const isCameraScanning = scanState === "scanning" || scanState === "success";
  const showProductPanel = Boolean(lastCode && clinicId);
  const panelKey = lastCode ?? "";

  const tabBarWrap =
    variant === "showcase"
      ? "mx-0 mb-4 flex rounded-2xl border border-white/10 bg-zinc-900/90 p-1 shadow-inner shadow-black/40 sm:mx-0"
      : "mx-4 mb-3 flex rounded-xl bg-slate-100 p-1 sm:mx-5";

  const viewportClass =
    variant === "showcase"
      ? "relative overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-emerald-500/25 shadow-[inset_0_0_40px_rgba(16,185,129,0.08)]"
      : "relative overflow-hidden rounded-xl bg-slate-950";

  const bodyText = variant === "showcase" ? "text-zinc-400" : "text-slate-500";
  const labelText = variant === "showcase" ? "text-zinc-300" : "text-slate-700";
  const inputClass =
    variant === "showcase"
      ? "w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 font-mono text-sm text-zinc-100 shadow-inner outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2"
      : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none ring-slate-400/30 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2";

  const shellClass =
    variant === "showcase"
      ? "flex w-full flex-col"
      : `flex w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl ${showProductPanel ? "max-w-4xl" : "max-w-sm"}`;

  const successBanner =
    variant === "showcase"
      ? "mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5"
      : "mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2";

  const scannerPanelContent = (
    <>
      <div className={tabBarWrap}>
        {resolvedTabs.map((tab) => {
          const cfg = TAB_UI[tab];
          return (
            <TabButton
              key={tab}
              variant={variant}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              icon={cfg.icon}
              label={cfg.label}
              badge={cfg.badge}
            />
          );
        })}
      </div>

      <div
        className={`flex h-[420px] flex-col overflow-y-auto overflow-x-hidden overscroll-contain ${
          variant === "showcase" ? "px-0 pb-0 sm:px-0" : "px-4 pb-4 sm:px-5 sm:pb-5"
        }`}
      >
        {activeTab === "camera" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className={viewportClass} style={{ height: 220 }}>
              <video
                ref={videoRef}
                className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-300 ${isCameraScanning ? "opacity-100" : "opacity-0"}`}
                playsInline
                muted
              />

              {isCameraScanning && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={`relative h-36 w-52 transition-transform duration-200 ${scanState === "success" ? "scale-105" : "scale-100"}`}
                  >
                    <span className="absolute left-0 top-0 h-6 w-6 rounded-tl border-l-2 border-t-2 border-emerald-300/80" />
                    <span className="absolute right-0 top-0 h-6 w-6 rounded-tr border-r-2 border-t-2 border-emerald-300/80" />
                    <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl border-b-2 border-l-2 border-emerald-300/80" />
                    <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br border-b-2 border-r-2 border-emerald-300/80" />
                    {scanState === "scanning" && (
                      <span className="bippa-scanner-line absolute left-1 right-1 h-0.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_2px_rgba(52,211,153,0.45)]" />
                    )}
                    {scanState === "success" && (
                      <div className="absolute inset-0 flex items-center justify-center rounded bg-emerald-500/25">
                        <CheckCircle2 size={28} className="text-emerald-300" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isCameraScanning && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${variant === "showcase" ? "text-zinc-500" : "text-slate-400"}`}>
                  {scanState === "error" ? (
                    <>
                      <AlertTriangle size={28} className="text-red-400" />
                      <p className="px-4 text-center text-xs text-red-300">{camError}</p>
                    </>
                  ) : (
                    <>
                      <Camera size={28} className={variant === "showcase" ? "text-emerald-500/50" : undefined} />
                      <p className="text-xs">Fotocamera spenta</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {scanState === "idle" || scanState === "error" ? (
              <button
                type="button"
                onClick={startCamera}
                className={
                  variant === "showcase"
                    ? "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]"
                    : "flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95"
                }
              >
                <Camera size={16} />
                {scanState === "error" ? "Riprova" : "Avvia fotocamera"}
              </button>
            ) : scanState === "success" ? (
              <button
                type="button"
                onClick={() => setScanState("scanning")}
                className={
                  variant === "showcase"
                    ? "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 active:scale-[0.98]"
                    : "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
                }
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
                className={
                  variant === "showcase"
                    ? "flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-800/80 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
                    : "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                }
              >
                <CameraOff size={16} />
                Ferma fotocamera
              </button>
            )}
          </div>
        )}

        {activeTab === "phone" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <p className={`text-xs leading-relaxed ${bodyText}`}>
              {bootstrapAnonymousForRemoteScan ? (
                <>
                  Scansiona questo QR con il telefono: si apre lo scanner remoto collegato a questa anteprima. Se non sei
                  connesso, usiamo una sessione temporanea sul browser solo per questo collegamento.
                </>
              ) : (
                <>
                  Scansiona questo QR con un altro dispositivo (ad es. il tuo smartphone) per aprire lo scanner remoto già
                  autenticato.
                </>
              )}
            </p>

            {anonAuthStatus === "error" && (
              <div
                className={
                  variant === "showcase"
                    ? "rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-xs text-red-200"
                    : "rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
                }
              >
                <p className="font-medium">Accesso anonimo non disponibile</p>
                <p className="mt-1 leading-relaxed opacity-90">{anonAuthMessage}</p>
                <button
                  type="button"
                  onClick={() => setAnonBootNonce((n) => n + 1)}
                  className={
                    variant === "showcase"
                      ? "mt-2 text-xs font-semibold text-red-100 underline-offset-2 hover:underline"
                      : "mt-2 text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
                  }
                >
                  Riprova
                </button>
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <div
                className={
                  variant === "showcase"
                    ? "relative flex h-52 w-52 items-center justify-center rounded-2xl border border-emerald-500/30 bg-white p-3 shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)]"
                    : "relative flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                }
              >
                {anonAuthStatus !== "error" &&
                (anonAuthStatus === "pending" || !phoneSessionReady) ? (
                  <div className={`flex flex-col items-center gap-2 ${variant === "showcase" ? "text-zinc-500" : "text-slate-400"}`}>
                    <Loader2 size={24} className="animate-spin" />
                    <p className="text-xs">
                      {bootstrapAnonymousForRemoteScan && anonAuthStatus === "pending"
                        ? "Preparazione accesso…"
                        : "Generazione sessione…"}
                    </p>
                  </div>
                ) : null}
                {anonAuthStatus === "ready" && phoneSessionReady && qrUrl && <QRCode value={qrUrl} size={180} />}
              </div>

              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  phoneConnected ? (variant === "showcase" ? "text-emerald-400" : "text-emerald-600") : bodyText
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    phoneConnected ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]" : "bg-slate-300 dark:bg-zinc-600"
                  }`}
                />
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
              disabled={anonAuthStatus === "pending" || anonAuthStatus === "error"}
              className={
                variant === "showcase"
                  ? "flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  : "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              }
            >
              <RefreshCw size={13} />
              Rigenera sessione
            </button>
          </div>
        )}

        {activeTab === "manual" && (
          <div className="space-y-3">
            <p className={`text-xs ${bodyText}`}>
              Inserisci manualmente un codice EAN, UDI o HIBC oppure incollalo dal lettore collegato al PC.
            </p>
            <div>
              <label htmlFor={manualFieldId} className={`mb-1.5 block text-xs font-semibold ${labelText}`}>
                Codice
              </label>
              <input
                ref={manualInputRef}
                id={manualFieldId}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManual();
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="EAN, UDI, HIBC…"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={submitManual}
              disabled={!manualCode.trim()}
              className={
                variant === "showcase"
                  ? "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-40"
                  : "flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              }
            >
              <ScanBarcode size={16} />
              Conferma codice
            </button>
          </div>
        )}

        {lastCode && !showProductPanel && (
          <div className={successBanner}>
            <CheckCircle2 size={16} className={`shrink-0 ${variant === "showcase" ? "text-emerald-400" : "text-emerald-500"}`} />
            <div className="min-w-0">
              <p
                className={`truncate font-mono text-sm font-semibold ${variant === "showcase" ? "text-emerald-100" : "text-emerald-800"}`}
              >
                {lastCode}
              </p>
              {lastFormat && (
                <p className={`text-xs ${variant === "showcase" ? "text-emerald-300/90" : "text-emerald-600"}`}>
                  {formatBarcodeLabel(lastFormat)}
                </p>
              )}
            </div>
          </div>
        )}

        {showProductPanel && lastCode && (
          <div
            className={
              variant === "showcase"
                ? "mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2"
                : "mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            }
          >
            <CheckCircle2 size={14} className={`shrink-0 ${variant === "showcase" ? "text-emerald-400" : "text-emerald-500"}`} />
            <p
              className={`truncate font-mono text-xs font-medium ${variant === "showcase" ? "text-zinc-200" : "text-slate-700"}`}
            >
              {lastCode}
            </p>
            {lastFormat && (
              <span className={`ml-auto shrink-0 text-[10px] ${variant === "showcase" ? "text-zinc-500" : "text-slate-400"}`}>
                {formatBarcodeLabel(lastFormat)}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={shellClass}
      style={variant === "default" && showProductPanel ? { height: "min(90vh, 680px)" } : undefined}
    >
      {header}
      {showProductPanel ? (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-b-2xl border-t border-slate-100">
          <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-100 py-3">
            {scannerPanelContent}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <BippaScanProductPanel
              key={panelKey}
              scannedCode={lastCode!}
              clinicId={clinicId ?? null}
              existingProductNames={existingProductNames}
              onCreated={async () => {
                await onCreated?.();
              }}
              onReset={() => {
                setLastCode(null);
                setLastFormat(null);
                setScanState(activeTab === "camera" && scanState === "success" ? "scanning" : scanState);
              }}
            />
          </div>
        </div>
      ) : (
        scannerPanelContent
      )}
    </div>
  );
}
