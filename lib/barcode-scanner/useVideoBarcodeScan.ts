"use client";

import { useCallback, useEffect, useRef } from "react";
import { type StableStreakGate, createStableStreakGate } from "./barcodeAcceptance";
import { getBarcodeEnginePreference } from "./engineConfig";
import { loadRxingWasm } from "./loadRxing";
import { startRxingVideoBarcodeScan } from "./rxingVideoScan";
import { startZxingVideoBarcodeScan } from "./zxingVideoScan";

export function useVideoBarcodeScan(options: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  shouldDetect: () => boolean;
  onDetect: (code: string, format: string) => void;
}) {
  const { videoRef, shouldDetect, onDetect } = options;
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streakGateRef = useRef<StableStreakGate | null>(null);
  const shouldDetectRef = useRef(shouldDetect);
  const onDetectRef = useRef(onDetect);

  useEffect(() => {
    shouldDetectRef.current = shouldDetect;
  }, [shouldDetect]);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streakGateRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const resetAcceptanceGate = useCallback(() => {
    streakGateRef.current?.reset();
  }, []);

  const start = useCallback(async () => {
    stop();
    const video = videoRef.current;
    if (!video) return;

    const gate = createStableStreakGate({
      onConfirm: (code, fmt) => onDetectRef.current(code, fmt),
    });
    streakGateRef.current = gate;

    const deliver = (code: string, fmt: string) => {
      if (!shouldDetectRef.current()) return;
      gate.push(code, fmt);
    };

    const pref = getBarcodeEnginePreference();
    const wantRxing = pref === "rxing" || pref === "auto";
    const forceZxing = pref === "zxing";

    if (!forceZxing && wantRxing) {
      const rxing = await loadRxingWasm();
      if (rxing) {
        try {
          controlsRef.current = await startRxingVideoBarcodeScan(
            rxing,
            video,
            deliver,
            () => shouldDetectRef.current(),
          );
          return;
        } catch (e) {
          console.warn("[barcode] rxing scan failed; falling back to zxing", e);
        }
      } else if (pref === "rxing") {
        console.warn("[barcode] NEXT_PUBLIC_BARCODE_ENGINE=rxing but WASM failed to load; using zxing");
      }
    }

    controlsRef.current = await startZxingVideoBarcodeScan(video, deliver, () => shouldDetectRef.current());
  }, [videoRef, stop]);

  return { start, stop, resetAcceptanceGate };
}
