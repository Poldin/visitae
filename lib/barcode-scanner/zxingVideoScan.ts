import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, NotFoundException } from "@zxing/library";

export async function startZxingVideoBarcodeScan(
  video: HTMLVideoElement,
  onResult: (code: string, format: string) => void,
  shouldAccept: () => boolean,
): Promise<{ stop: () => void }> {
  const reader = new BrowserMultiFormatReader();
  const controls = await reader.decodeFromVideoDevice(undefined, video, (result, err) => {
    if (!shouldAccept()) return;
    if (result) {
      const code = result.getText();
      const fmt = BarcodeFormat[result.getBarcodeFormat()] ?? result.getBarcodeFormat().toString();
      onResult(code, fmt);
    } else if (err && !(err instanceof NotFoundException)) {
      // no barcode this frame — ignore
    }
  });
  return {
    stop: () => {
      controls.stop();
    },
  };
}
