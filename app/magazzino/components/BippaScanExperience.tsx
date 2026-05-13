"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { parseBarcodePayload, useVideoBarcodeScan } from "@/lib/barcode-scanner";
import { BarcodeDecodePanel, BarcodeKindBadge } from "./BippaScanDecodePanel";
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

/** Dopo "Bippa ancora": silenzio lettura così il codice ancora inquadrato non si ri-accetta subito. */
const RESUME_CAMERA_SUPPRESS_MS = 750;

const TAB_UI: Record<BippaTab, { icon: React.ElementType; label: string; badge?: string }> = {
  camera: { icon: Camera, label: "Fotocamera" },
  phone: { icon: Smartphone, label: "Telefono" },
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
   * Se impostato (es. `"/bippa/demo"` per la home), la tab Telefono mostra solo un QR che apre quell’URL sul dispositivo,
   * senza Realtime o sessioni — la scansione avviene tutta sul telefono.
   */
  phoneQrStaticPath?: string;
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
      className={`relative flex h-6 min-h-0 flex-1 flex-row items-center justify-center gap-px rounded-sm px-0.5 py-0 text-[9px] font-medium leading-none transition-all sm:h-8 sm:gap-0.5 sm:rounded-xl sm:px-1.5 sm:py-0.5 sm:text-[11px] sm:font-semibold ${
        active ? activeC : idleC
      }`}
    >
      <span className="inline-flex items-center gap-px sm:gap-1">
        <Icon className="size-2.5 shrink-0 opacity-90 sm:size-3.5" strokeWidth={2.25} aria-hidden />
        <span className="truncate leading-none">{label}</span>
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
  phoneQrStaticPath,
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
  /** Dopo "Bippa ancora" ignora i frame per un attimo: altrimenti lo stesso codice inquadrato si rilegge e il pannello rifà la query. */
  const resumeDetectNotBeforeRef = useRef(0);
  /**
   * Quando si torna da "success" a "scanning" il layout cambia (showProductPanel: true→false) e il
   * <video> viene rimontato. Salviamo qui il timestamp "suppress-until" e riavviamo lo stream in un
   * effect, dopo che React ha stabilizzato il DOM.
   */
  const pendingCameraRestartRef = useRef<number | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [phoneSessionReady, setPhoneSessionReady] = useState(false);
  const phoneChannelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);

  const phoneLinkOnly = Boolean(phoneQrStaticPath?.length);

  const [staticPhoneQrUrl, setStaticPhoneQrUrl] = useState<string | null>(null);

  const [manualCode, setManualCode] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);
  const manualFieldId = useId();

  const [lastCode, setLastCode] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string | null>(null);

  const prevActiveRef = useRef(false);

  useEffect(() => {
    if (!phoneQrStaticPath || typeof window === "undefined") {
      setStaticPhoneQrUrl(null);
      return;
    }
    const path = phoneQrStaticPath.startsWith("/") ? phoneQrStaticPath : `/${phoneQrStaticPath}`;
    setStaticPhoneQrUrl(`${window.location.origin}${path}`);
  }, [phoneQrStaticPath]);

  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  useEffect(() => {
    if (!resolvedTabs.includes(activeTab)) {
      setActiveTab(resolvedTabs[0] ?? "phone");
    }
  }, [resolvedTabs, activeTab]);

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
      resumeDetectNotBeforeRef.current = 0;
    }
    prevActiveRef.current = active;
  }, [active, initialTab, resolvedTabs]);

  const handleCode = useCallback(
    (code: string, format: string) => {
      if (performance.now() < resumeDetectNotBeforeRef.current) return;
      setLastCode(code);
      setLastFormat(format);
      setScanState("success");
      onCode?.(code, format);
    },
    [onCode],
  );

  const shouldDetectBarcode = useCallback(
    () => scanStateRef.current === "scanning" && performance.now() >= resumeDetectNotBeforeRef.current,
    [],
  );

  const { start: startVideoScan, stop: stopVideoScan } = useVideoBarcodeScan({
    videoRef,
    shouldDetect: shouldDetectBarcode,
    onDetect: handleCode,
  });

  const resumeCameraAfterSuccess = useCallback(() => {
    // Ferma subito lo stream: il <video> verrà rimontato se il layout cambia
    // (showProductPanel: true → false). Il restart avviene nell'effect qui sotto,
    // dopo che React ha stabilizzato il DOM.
    stopVideoScan();
    pendingCameraRestartRef.current = performance.now() + RESUME_CAMERA_SUPPRESS_MS;
    scanStateRef.current = "idle";
    setLastCode(null);
    setLastFormat(null);
    setScanState("idle");
  }, [stopVideoScan]);

  // Restart dello stream fotocamera dopo che il layout si è stabilizzato.
  useEffect(() => {
    if (scanState !== "idle" || pendingCameraRestartRef.current === null) return;
    if (activeTab !== "camera" || !active) {
      pendingCameraRestartRef.current = null;
      return;
    }
    const suppressUntil = pendingCameraRestartRef.current;
    pendingCameraRestartRef.current = null;
    let cancelled = false;
    // Piccolo delay per lasciare a React il tempo di committare il nuovo DOM
    const t = window.setTimeout(async () => {
      if (cancelled || !videoRef.current) return;
      setCamError(null);
      scanStateRef.current = "scanning";
      setScanState("scanning");
      resumeDetectNotBeforeRef.current = suppressUntil;
      try {
        await startVideoScan();
      } catch (e: unknown) {
        if (cancelled) return;
        scanStateRef.current = "idle";
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
    }, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [scanState, activeTab, active, startVideoScan]);

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
        resumeCameraAfterSuccess();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableKeyboardShortcuts, active, activeTab, onKeyboardClose, resumeCameraAfterSuccess]);

  useEffect(() => {
    if (activeTab !== "camera" || !active) {
      stopVideoScan();
      resumeDetectNotBeforeRef.current = 0;
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
    if (phoneLinkOnly && activeTab === "phone") return;
    if (activeTab !== "phone" || !active) {
      phoneChannelRef.current?.unsubscribe();
      phoneChannelRef.current = null;
      setPhoneConnected(false);
      setPhoneSessionReady(false);
    }
  }, [activeTab, active, phoneLinkOnly]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    setCamError(null);
    resumeDetectNotBeforeRef.current = 0;
    scanStateRef.current = "scanning";
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
    resumeDetectNotBeforeRef.current = 0;
    scanStateRef.current = "idle";
    setScanState("idle");
  };

  const startPhoneSession = useCallback(async () => {
    if (phoneLinkOnly) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    phoneChannelRef.current?.unsubscribe();
    phoneChannelRef.current = null;
    setPhoneSessionReady(false);
    setPhoneConnected(false);

    const supabase = getSupabaseAuthClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return;

    const sid = crypto.randomUUID();
    setSessionId(sid);
    setQrToken(token);

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
  }, [handleCode, phoneLinkOnly]);

  useEffect(() => {
    if (phoneLinkOnly) return;
    if (activeTab !== "phone" || !active) return;
    if (!phoneSessionReady) {
      void startPhoneSession();
    }
  }, [activeTab, active, phoneSessionReady, startPhoneSession, phoneLinkOnly]);

  const qrUrl =
    !phoneLinkOnly && sessionId && qrToken
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
  const [panelHeroImageUrl, setPanelHeroImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setPanelHeroImageUrl(null);
  }, [panelKey]);

  const handleProductHeroImageUrl = useCallback((url: string | null) => {
    setPanelHeroImageUrl(url);
  }, []);

  const parsedCode = useMemo(
    () => (lastCode && lastFormat ? parseBarcodePayload(lastCode, lastFormat) : null),
    [lastCode, lastFormat],
  );

  const tabBarWrap =
    variant === "showcase"
      ? "mx-0 mb-1.5 flex rounded-lg border border-white/10 bg-zinc-900/90 p-px shadow-inner shadow-black/40 sm:mx-0 sm:mb-4 sm:rounded-2xl sm:p-1"
      : "mx-4 mb-1 flex rounded-sm bg-slate-100 p-px sm:mx-5 sm:mb-3 sm:rounded-xl sm:p-1";

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
      : `mx-auto flex w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          showProductPanel
            ? panelHeroImageUrl
              ? "max-w-[min(96vw,1240px)]"
              : "max-w-4xl"
            : "max-w-sm"
        }`;

  const successBanner =
    variant === "showcase"
      ? "mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5"
      : "mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2";

  /** Stesso banner successo, senza margine top (il `gap-3` del blocco fotocamera basta). */
  const successBannerFlush =
    variant === "showcase"
      ? "flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5"
      : "flex shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2";

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
          <div className="flex shrink-0 flex-col gap-3">
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
                onClick={resumeCameraAfterSuccess}
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

            {lastCode && !showProductPanel && (
              <div className="flex flex-col gap-1">
                <div className={successBannerFlush}>
                  <CheckCircle2 size={16} className={`shrink-0 ${variant === "showcase" ? "text-emerald-400" : "text-emerald-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-mono text-sm font-semibold ${variant === "showcase" ? "text-emerald-100" : "text-emerald-800"}`}>
                      {lastCode}
                    </p>
                  </div>
                  {parsedCode && lastFormat && (
                    <BarcodeKindBadge parsed={parsedCode} format={lastFormat} variant={variant} />
                  )}
                </div>
                {parsedCode && <BarcodeDecodePanel parsed={parsedCode} variant={variant} />}
              </div>
            )}

            {showProductPanel && lastCode && (
              <div className="flex flex-col gap-1">
                <div
                  className={
                    variant === "showcase"
                      ? "flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2"
                      : "flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  }
                >
                  <CheckCircle2 size={14} className={`shrink-0 ${variant === "showcase" ? "text-emerald-400" : "text-emerald-500"}`} />
                  <p
                    className={`truncate font-mono text-xs font-medium ${variant === "showcase" ? "text-zinc-200" : "text-slate-700"}`}
                  >
                    {lastCode}
                  </p>
                  {parsedCode && lastFormat && (
                    <span className="ml-auto shrink-0">
                      <BarcodeKindBadge parsed={parsedCode} format={lastFormat} variant={variant} />
                    </span>
                  )}
                </div>
                {parsedCode && <BarcodeDecodePanel parsed={parsedCode} variant={variant} />}
              </div>
            )}
          </div>
        )}

        {activeTab === "phone" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {phoneLinkOnly ? (
              <>
                <p className={`text-xs leading-relaxed ${bodyText}`}>
                  Scansiona il QR con il telefono: si apre una pagina demo dove puoi usare la fotocamera e leggere i codici.
                  Tutto resta sul dispositivo — niente collegamento con questa finestra.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={
                      variant === "showcase"
                        ? "relative flex h-52 w-52 items-center justify-center rounded-2xl border border-emerald-500/30 bg-white p-3 shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)]"
                        : "relative flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    }
                  >
                    {staticPhoneQrUrl ? (
                      <QRCode value={staticPhoneQrUrl} size={180} />
                    ) : (
                      <div className={`flex flex-col items-center gap-2 ${variant === "showcase" ? "text-zinc-500" : "text-slate-400"}`}>
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-xs">Preparazione QR…</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className={`text-xs leading-relaxed ${bodyText}`}>
                  Scansiona questo QR con un altro dispositivo (ad es. il tuo smartphone) per aprire lo scanner remoto già
                  autenticato col tuo account. Le letture compaiono qui.
                </p>

                <div className="flex flex-col items-center gap-3">
                  <div
                    className={
                      variant === "showcase"
                        ? "relative flex h-52 w-52 items-center justify-center rounded-2xl border border-emerald-500/30 bg-white p-3 shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)]"
                        : "relative flex h-52 w-52 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    }
                  >
                    {!phoneSessionReady ? (
                      <div className={`flex flex-col items-center gap-2 ${variant === "showcase" ? "text-zinc-500" : "text-slate-400"}`}>
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-xs">Generazione sessione…</p>
                      </div>
                    ) : null}
                    {phoneSessionReady && qrUrl && <QRCode value={qrUrl} size={180} />}
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
                    void startPhoneSession();
                  }}
                  className={
                    variant === "showcase"
                      ? "flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-800/60 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
                      : "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
                  }
                >
                  <RefreshCw size={13} />
                  Rigenera sessione
                </button>
              </>
            )}
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

        {lastCode && !showProductPanel && activeTab !== "camera" && (
          <div className="flex flex-col gap-1">
            <div className={successBanner}>
              <CheckCircle2 size={16} className={`shrink-0 ${variant === "showcase" ? "text-emerald-400" : "text-emerald-500"}`} />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-mono text-sm font-semibold ${variant === "showcase" ? "text-emerald-100" : "text-emerald-800"}`}>
                  {lastCode}
                </p>
              </div>
              {parsedCode && lastFormat && (
                <BarcodeKindBadge parsed={parsedCode} format={lastFormat} variant={variant} />
              )}
            </div>
            {parsedCode && <BarcodeDecodePanel parsed={parsedCode} variant={variant} />}
          </div>
        )}

        {showProductPanel && lastCode && activeTab !== "camera" && (
          <div className="mt-3 flex flex-col gap-1">
            <div
              className={
                variant === "showcase"
                  ? "flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800/50 px-3 py-2"
                  : "flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              }
            >
              <CheckCircle2 size={14} className={`shrink-0 ${variant === "showcase" ? "text-emerald-400" : "text-emerald-500"}`} />
              <p
                className={`truncate font-mono text-xs font-medium ${variant === "showcase" ? "text-zinc-200" : "text-slate-700"}`}
              >
                {lastCode}
              </p>
              {parsedCode && lastFormat && (
                <span className="ml-auto shrink-0">
                  <BarcodeKindBadge parsed={parsedCode} format={lastFormat} variant={variant} />
                </span>
              )}
            </div>
            {parsedCode && <BarcodeDecodePanel parsed={parsedCode} variant={variant} />}
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
              onProductHeroImageUrlChange={variant === "default" ? handleProductHeroImageUrl : undefined}
              onCreated={async () => {
                await onCreated?.();
              }}
              onReset={() => {
                if (activeTab === "camera" && scanStateRef.current === "success") {
                  resumeCameraAfterSuccess();
                  return;
                }
                setLastCode(null);
                setLastFormat(null);
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
