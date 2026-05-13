declare module "@point-of-sale/barcode-parser" {
  export interface GS1ParseResult {
    gtin?: string;
    elements: Array<{ ai: string; label: string; value: string }>;
  }

  export interface GS1ParseOptions {
    value: string;
    symbology?: string;
    fnc1?: number;
  }

  export const GS1: {
    parse(opts: GS1ParseOptions): GS1ParseResult | undefined;
  };

  export const Detector: {
    detect(value: string): { symbology: string; guess: boolean } | undefined;
  };
}
