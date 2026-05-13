import type { SupabaseClient } from "@supabase/supabase-js";
import { splitProductIdentifierForInsert } from "@/app/magazzino/lib/productIdentifierColumns";
import type { Database, Json } from "@/lib/supabase.types";

function mergeIdentityMetadata(
  prev: Json | undefined,
  patch: { manufacturerLabel: string | null; sku: string | null; metadataEan: string | null },
): Record<string, unknown> {
  const base =
    prev != null && typeof prev === "object" && !Array.isArray(prev) ? { ...(prev as Record<string, unknown>) } : {};
  if (patch.manufacturerLabel) base.manufacturer = patch.manufacturerLabel;
  else delete base.manufacturer;
  if (patch.sku) base.sku = patch.sku;
  else delete base.sku;
  if (patch.metadataEan) base.ean = patch.metadataEan;
  else delete base.ean;
  return base;
}

export async function persistProductIdentityFields(
  supabase: SupabaseClient<Database>,
  args: {
    clinicId: string;
    productId: string;
    name: string;
    manualManufacturer: string;
    manualSku: string;
    manualEan: string;
    manualDescription: string;
    imageUrl?: string | null;
  },
): Promise<{ error: string | null; skipped?: boolean }> {
  const name = args.name.trim();
  if (!name) return { error: null, skipped: true };

  const manufacturerLabel = args.manualManufacturer.trim() || null;
  const skuValRaw = args.manualSku.trim();
  const skuColumn = skuValRaw.length ? skuValRaw : null;

  const identifierRaw = args.manualEan.trim();
  const { ean, udi_di, hibc_primary, metadataEan } = splitProductIdentifierForInsert(identifierRaw || null);

  const { data: row, error: readErr } = await supabase
    .from("products")
    .select("metadata")
    .eq("id", args.productId)
    .eq("clinic_id", args.clinicId)
    .maybeSingle<{ metadata: Json | null }>();

  if (readErr) return { error: readErr.message };

  const metadataMerged = mergeIdentityMetadata(row?.metadata ?? undefined, {
    manufacturerLabel,
    sku: skuColumn,
    metadataEan,
  });

  const description = args.manualDescription.trim() || null;

  const patch: Database["public"]["Tables"]["products"]["Update"] = {
    name,
    category: manufacturerLabel,
    sku: skuColumn,
    ean,
    udi_di,
    hibc_primary,
    description,
    metadata: metadataMerged as Json,
  };

  if (args.imageUrl !== undefined) {
    patch.image_url = args.imageUrl;
  }

  const { error: updateErr } = await supabase
    .from("products")
    .update(patch as never)
    .eq("id", args.productId)
    .eq("clinic_id", args.clinicId);

  if (updateErr) return { error: updateErr.message };
  return { error: null };
}

export async function uploadManualProductIdentityImage(
  supabase: SupabaseClient<Database>,
  file: File,
): Promise<{ publicUrl: string | null; error: string | null }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `manual-products/${fileName}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file, {
    upsert: false,
  });
  if (uploadError) return { publicUrl: null, error: uploadError.message };
  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
  return { publicUrl: data.publicUrl ?? null, error: null };
}
