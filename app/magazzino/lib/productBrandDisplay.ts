/** Stessa semantica di `app/api/magazzino/products/route.ts` per label brand in UI magazzino. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

export function getBrandFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const rawBrand = (metadata as { brand?: unknown }).brand;
  if (typeof rawBrand !== "string") return null;
  const normalized = rawBrand.trim();
  return normalized || null;
}

export function resolveProductBrandLabel(params: {
  metadata: unknown;
  category?: string | null;
  joinedBrand?: { name?: string | null } | null;
}): string {
  const meta = getBrandFromMetadata(params.metadata);
  if (meta) return meta;
  const cat = params.category?.trim();
  if (cat) return cat;
  const j = params.joinedBrand?.name?.trim();
  if (j) return j;
  return "";
}

/** Logo dalla tabella `brands` se esiste una riga con nome uguale (case insensitive) al label. */
export async function lookupBrandLogoByLabel(
  supabase: SupabaseClient<Database>,
  label: string,
): Promise<string | null> {
  const bn = label.trim();
  if (!bn) return null;
  const esc = bn.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  const { data, error } = await supabase
    .from("brands")
    .select("name,image_url")
    .ilike("name", `%${esc}%`)
    .limit(24);

  if (error) return null;
  const rows = (data ?? []) as Array<{ name: string | null; image_url: string | null }>;
  const low = bn.toLowerCase();
  const hit =
    rows.find((d) => typeof d?.name === "string" && d.name.trim().toLowerCase() === low) ?? null;
  return hit?.image_url?.trim() || null;
}
