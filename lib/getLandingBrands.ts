import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

export type LandingBrand = {
  id: string;
  name: string;
  image_url: string | null;
};

/**
 * Brand per la landing: legge `public.brands`.
 *
 * In produzione usa `SUPABASE_SERVICE_ROLE_KEY` (solo server, mai `NEXT_PUBLIC_`)
 * se le policy RLS non concedono SELECT ad `anon` sulla tabella `brands`.
 *
 * In alternativa: policy SELECT su `brands` per ruolo `anon` (solo lettura),
 * così basta la publishable key.
 */
export async function getLandingBrands(): Promise<LandingBrand[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  const key = serviceKey ?? publishableKey;
  if (!url || !key) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[getLandingBrands] Manca NEXT_PUBLIC_SUPABASE_URL o una chiave (publishable o service role).",
      );
    }
    return [];
  }

  const supabase = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, image_url")
    .order("name", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getLandingBrands]", error.code, error.message);
    }
    return [];
  }

  if (!data) return [];

  return data
    .filter((b): b is typeof b & { name: string } => Boolean(b?.name?.trim()))
    .map((b) => ({
      id: b.id,
      name: b.name.trim(),
      image_url: b.image_url ?? null,
    }));
}
