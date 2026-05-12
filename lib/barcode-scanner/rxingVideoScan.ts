import { applyDentalDecodeHints } from "./dentalRxingHints";
import { rxingFormatEnumToZxingName } from "./rxingFormatMap";

/** Sharper canvas = more stable 1D (EAN); still capped for latency. */
const MAX_LONG_EDGE = 960;
const MIN_DECODE_INTERVAL_MS = 55;

type RxingModule = typeof import("rxing-wasm");

export async function startRxingVideoBarcodeScan(
  rxing: RxingModule,
  video: HTMLVideoElement,
  onResult: (code: string, format: string) => void,
  shouldAccept: () => boolean,
): Promise<{ stop: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  video.srcObject = stream;
  video.muted = true;
  await video.play();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("Canvas 2D not available");
  }

  const hints = new rxing.DecodeHintDictionary();
  applyDentalDecodeHints(rxing, hints);

  let raf = 0;
  let stopped = false;
  let decoding = false;
  let lastDecodeAt = 0;

  const computeDrawSize = (vw: number, vh: number) => {
    const long = Math.max(vw, vh);
    const scale = long > MAX_LONG_EDGE ? MAX_LONG_EDGE / long : 1;
    const w = Math.max(1, Math.round(vw * scale));
    const h = Math.max(1, Math.round(vh * scale));
    return { w, h };
  };

  const tick = () => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);

    if (!shouldAccept() || decoding) return;
    const now = performance.now();
    if (now - lastDecodeAt < MIN_DECODE_INTERVAL_MS) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw < 2 || vh < 2) return;

    const { w, h } = computeDrawSize(vw, vh);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.drawImage(video, 0, 0, w, h);

    decoding = true;
    lastDecodeAt = now;

    let result: { free(): void; text(): string; format(): number } | null = null;
    try {
      const luma = rxing.convert_canvas_to_luma(canvas);
      result = rxing.decode_barcode_with_hints(luma, w, h, hints, false);
      if (result && shouldAccept()) {
        const text = result.text();
        const fmt = rxingFormatEnumToZxingName(result.format());
        onResult(text, fmt);
      }
    } catch {
      // No barcode found — normal for most frames
    } finally {
      result?.free();
      decoding = false;
    }
  };

  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      hints.free();
      stream.getTracks().forEach((t) => t.stop());
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    },
  };
}
