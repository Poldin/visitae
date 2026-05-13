import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

/** `master_catalog.manufacturer_id` per propagarlo su `products.manufacturer_id` in creazione. */
export async function fetchManufacturerIdByMasterCatalogId(
  supabase: SupabaseClient<Database>,
  masterCatalogId: string | null | undefined,
): Promise<string | null> {
  const id = typeof masterCatalogId === "string" ? masterCatalogId.trim() : "";
  if (!id) return null;
  const { data } = await supabase
    .from("master_catalog")
    .select("manufacturer_id")
    .eq("id", id)
    .maybeSingle();
  const mid = data?.manufacturer_id;
  return typeof mid === "string" && mid.length > 0 ? mid : null;
}
