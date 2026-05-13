import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

const PAGE_SIZE_MAX = 20;

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  ean: string | null;
  category: string | null;
  image_url: string | null;
  metadata: unknown;
};

type InventoryQtyRow = {
  product_id: string;
  quantity: number;
};


type SearchMasterCatalogRow = Database["public"]["Functions"]["search_master_catalog"]["Returns"][number];

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}


function getManufacturerFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { manufacturer?: unknown; brand?: unknown }).manufacturer;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  // Fallback: legacy brand field for products created before the migration
  const legacy = (metadata as { brand?: unknown }).brand;
  return typeof legacy === "string" && legacy.trim() ? legacy.trim() : null;
}

function getSkuFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { sku?: unknown }).sku;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function getEanFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { ean?: unknown }).ean;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Token mancante." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json({ error: "Configurazione Supabase mancante." }, { status: 500 });
  }

  const clinicId = clean(req.nextUrl.searchParams.get("clinicId"));
  if (!clinicId) return NextResponse.json({ error: "clinicId obbligatorio." }, { status: 400 });
  const query = clean(req.nextUrl.searchParams.get("query"));
  const clinicOffset = Math.max(0, Number(req.nextUrl.searchParams.get("clinicOffset") ?? 0));
  const clinicLimit = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(req.nextUrl.searchParams.get("clinicLimit") ?? PAGE_SIZE_MAX)));
  const masterOffset = Math.max(0, Number(req.nextUrl.searchParams.get("masterOffset") ?? 0));
  const masterLimit = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(req.nextUrl.searchParams.get("masterLimit") ?? PAGE_SIZE_MAX)));

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return NextResponse.json({ error: "Sessione non valida." }, { status: 401 });

  let productsQuery = supabase
    .from("products")
    .select("id,name,sku,ean,category,image_url,metadata")
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true })
    .range(clinicOffset, clinicOffset + clinicLimit);
  if (query) {
    productsQuery = productsQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%,ean.ilike.%${query}%,category.ilike.%${query}%`);
  }

  const [{ data: productsData, error: productsErr }, { data: invData, error: invErr }] =
    await Promise.all([
      productsQuery,
      supabase.from("inventory_items").select("product_id,quantity").eq("clinic_id", clinicId),
    ]);

  const firstErr = productsErr ?? invErr;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 400 });

  const qtyByProduct = new Map<string, number>();
  for (const row of (invData ?? []) as InventoryQtyRow[]) {
    qtyByProduct.set(row.product_id, (qtyByProduct.get(row.product_id) ?? 0) + Number(row.quantity ?? 0));
  }

  const clinicProducts = ((productsData ?? []) as ProductRow[]).map((p) => {
    const manufacturer = getManufacturerFromMetadata(p.metadata) ?? p.category ?? null;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku?.trim() || getSkuFromMetadata(p.metadata) || "",
      manufacturer,
      imageUrl: p.image_url,
      totalQty: qtyByProduct.get(p.id) ?? 0,
      ean: p.ean?.trim() || getEanFromMetadata(p.metadata),
    };
  });

  const rpcPageLimit = masterLimit + 1;
  const { data: catalogRpcData, error: catalogRpcErr } = await supabase.rpc("search_master_catalog", {
    search_text: query || undefined,
    page_limit: rpcPageLimit,
    page_offset: masterOffset,
    target_clinic_id: clinicId,
  });
  if (catalogRpcErr) return NextResponse.json({ error: catalogRpcErr.message }, { status: 400 });

  const catalogRpcRows = (catalogRpcData ?? []) as SearchMasterCatalogRow[];
  const hasMoreMasterCatalog = catalogRpcRows.length > masterLimit;
  const masterCatalogItems = catalogRpcRows.slice(0, masterLimit).map((m) => ({
    id: m.id,
    name: m.name,
    tags: m.tags ?? null,
    sku: m.sku ?? null,
    ean: m.ean ?? null,
    image_url: m.image_url ?? null,
    default_min_stock: m.default_min_stock != null ? Number(m.default_min_stock) : null,
    manufacturer: m.manufacturer?.trim() ? m.manufacturer.trim() : null,
    default_description: m.default_description?.trim() ? m.default_description.trim() : null,
  }));

  const hasMoreClinicProducts = (clinicProducts.length ?? 0) > clinicLimit;
  const clinicItems = clinicProducts.slice(0, clinicLimit);

  return NextResponse.json({
    clinicProducts: clinicItems,
    masterCatalogItems,
    clinicOffset,
    clinicLimit,
    masterOffset,
    masterLimit,
    hasMoreClinicProducts,
    hasMoreMasterCatalog,
  });
}
