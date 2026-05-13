"use client";

import { useCallback, useEffect, useRef } from "react";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import {
  persistProductIdentityFields,
  uploadManualProductIdentityImage,
} from "@/app/magazzino/lib/persistProductIdentityFields";

export function useProductIdentityAutosave(opts: {
  enabled: boolean;
  clinicId: string | null;
  productId: string | null;
  debounceMs?: number;
  /**
   * Quando cambia (es. nuova scansione o dialog), riparte la baseline locale
   * senza riscrivere subito sul DB quanto è appena caricato in form.
   */
  hydrationKey?: string | null;

  manualName: string;
  manualManufacturer: string;
  manualSku: string;
  manualEan: string;
  manualDescription: string;

  uploadedManualImageUrl: string | null;
  catalogImageUrl: string | null;
  manualImageFile: File | null;

  onImageUploaded?: (publicUrl: string) => void;
  onPersistError?: (message: string) => void;
  onAutosaveApplied?: () => void;
}) {
  const {
    enabled,
    clinicId,
    productId,
    debounceMs = 450,
    hydrationKey = null,
    manualName,
    manualManufacturer,
    manualSku,
    manualEan,
    manualDescription,
    uploadedManualImageUrl,
    catalogImageUrl,
    manualImageFile,
    onImageUploaded,
    onPersistError,
    onAutosaveApplied,
  } = opts;

  const lastKnownGoodKeyRef = useRef<string>("__RESET__");

  const snapshotKeyWithImage = useCallback(
    (
      uploaded: string | null | undefined,
      catalog: string | null | undefined,
      imageOverride?: string | null,
    ): string =>
      JSON.stringify({
        name: manualName.trim(),
        manufacturer: manualManufacturer.trim(),
        sku: manualSku.trim(),
        ean: manualEan.trim(),
        desc: manualDescription.trim(),
        imgUrl:
          imageOverride?.trim() ||
          (uploaded ?? "").trim() ||
          (catalog ?? "").trim() ||
          "",
      }),
    [manualName, manualManufacturer, manualSku, manualEan, manualDescription],
  );

  useEffect(() => {
    lastKnownGoodKeyRef.current = "__RESET__";
  }, [productId ?? "", hydrationKey ?? ""]);

  /** Campi di testo e immagine da URL */
  useEffect(() => {
    if (!enabled || !clinicId?.trim() || !productId?.trim()) return undefined;

    const supabase = getSupabaseAuthClient();
    if (!supabase) return undefined;

    const pendingKey = snapshotKeyWithImage(uploadedManualImageUrl, catalogImageUrl);
    const t = window.setTimeout(() => {
      void (async () => {
        if (lastKnownGoodKeyRef.current === "__RESET__") {
          lastKnownGoodKeyRef.current = pendingKey;
          return;
        }
        const nowKey = snapshotKeyWithImage(uploadedManualImageUrl, catalogImageUrl);
        if (nowKey !== pendingKey || nowKey === lastKnownGoodKeyRef.current) return;

        const res = await persistProductIdentityFields(supabase, {
          clinicId,
          productId,
          name: manualName,
          manualManufacturer,
          manualSku,
          manualEan,
          manualDescription,
        });

        if (res.skipped) return;
        if (res.error) {
          onPersistError?.(res.error);
          return;
        }

        const afterKey = snapshotKeyWithImage(uploadedManualImageUrl, catalogImageUrl);
        if (afterKey === nowKey) {
          lastKnownGoodKeyRef.current = nowKey;
          onAutosaveApplied?.();
        }
      })();
    }, debounceMs);

    return () => window.clearTimeout(t);
  }, [
    enabled,
    clinicId,
    productId,
    debounceMs,
    hydrationKey,
    snapshotKeyWithImage,
    manualName,
    manualManufacturer,
    manualSku,
    manualEan,
    manualDescription,
    uploadedManualImageUrl,
    catalogImageUrl,
    onPersistError,
    onAutosaveApplied,
  ]);

  /** Nuova immagine: upload poi persistenza */
  useEffect(() => {
    if (!enabled || !clinicId?.trim() || !productId?.trim() || !manualImageFile) return undefined;

    const supabase = getSupabaseAuthClient();
    if (!supabase) return undefined;

    let cancelled = false;
    void (async () => {
      const { publicUrl, error: upErr } = await uploadManualProductIdentityImage(supabase, manualImageFile);
      if (cancelled) return;
      if (upErr || !publicUrl) {
        onPersistError?.(upErr ?? "Upload immagine non riuscito.");
        return;
      }

      const res = await persistProductIdentityFields(supabase, {
        clinicId,
        productId,
        name: manualName,
        manualManufacturer,
        manualSku,
        manualEan,
        manualDescription,
        imageUrl: publicUrl,
      });

      if (cancelled) return;
      if (res.skipped) return;
      if (res.error) {
        onPersistError?.(res.error);
        return;
      }

      onImageUploaded?.(publicUrl);
      lastKnownGoodKeyRef.current = snapshotKeyWithImage(uploadedManualImageUrl, catalogImageUrl, publicUrl);
      onAutosaveApplied?.();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    clinicId,
    productId,
    manualImageFile,
    snapshotKeyWithImage,
    manualName,
    manualManufacturer,
    manualSku,
    manualEan,
    manualDescription,
    uploadedManualImageUrl,
    catalogImageUrl,
    onImageUploaded,
    onPersistError,
    onAutosaveApplied,
  ]);
}
