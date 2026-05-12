import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

const PAGE_SIZE_MAX = 100;

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

type BrandRow = {
  name: string | null;
  image_url: string | null;
};

type MasterCatalogRow = {
  id: string;
  name: string;
  sku: string | null;
  ean: string | null;
  image_url: string | null;
  tags: string[] | null;
  default_min_stock: number | null;
  brand_id: string | null;
};

type MasterExistingRow = {
  master_catalogue_id: string | null;
};

type BrandCatalogRow = {
  id: string;
  name: string | null;
  image_url: string | null;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function lower(value: string | null | undefined): string {
  return clean(value).toLowerCase();
}

function getBrandFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { brand?: unknown }).brand;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
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

  const [{ data: productsData, error: productsErr }, { data: invData, error: invErr }, { data: brandsData, error: brandsErr }, { data: existingData, error: existingErr }, { data: catalogBrandsData, error: catalogBrandsErr }] =
    await Promise.all([
      productsQuery,
      supabase.from("inventory_items").select("product_id,quantity").eq("clinic_id", clinicId),
      supabase.from("brands").select("name,image_url"),
      supabase.from("products").select("master_catalogue_id").eq("clinic_id", clinicId).not("master_catalogue_id", "is", null),
      supabase.from("brands").select("id,name,image_url"),
    ]);

  const firstErr = productsErr ?? invErr ?? brandsErr ?? existingErr ?? catalogBrandsErr;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 400 });

  const qtyByProduct = new Map<string, number>();
  for (const row of (invData ?? []) as InventoryQtyRow[]) {
    qtyByProduct.set(row.product_id, (qtyByProduct.get(row.product_id) ?? 0) + Number(row.quantity ?? 0));
  }
  const brandImageByName = new Map<string, string>();
  for (const row of (brandsData ?? []) as BrandRow[]) {
    const k = lower(row.name);
    if (!k || !row.image_url) continue;
    brandImageByName.set(k, row.image_url);
  }

  const clinicProducts = ((productsData ?? []) as ProductRow[]).map((p) => {
    const brand = getBrandFromMetadata(p.metadata) ?? p.category ?? null;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku?.trim() || getSkuFromMetadata(p.metadata) || "",
      brand,
      brandImageUrl: brand ? brandImageByName.get(brand.toLowerCase()) ?? null : null,
      imageUrl: p.image_url,
      totalQty: qtyByProduct.get(p.id) ?? 0,
      ean: p.ean?.trim() || getEanFromMetadata(p.metadata),
    };
  });

  const existingMasterIds = new Set<string>(
    ((existingData ?? []) as MasterExistingRow[])
      .map((r) => r.master_catalogue_id)
      .filter((v): v is string => Boolean(v)),
  );
  const brandCatalogById = new Map<string, { name: string | null; image_url: string | null }>();
  for (const row of (catalogBrandsData ?? []) as BrandCatalogRow[]) {
    brandCatalogById.set(row.id, { name: row.name, image_url: row.image_url });
  }

  // Fill a page after removing existing clinic products.
  const masterItems: Array<{
    id: string;
    name: string;
    tags: string[] | null;
    brand: string | null;
    brand_image_url: string | null;
    sku: string | null;
    ean: string | null;
    image_url: string | null;
    default_min_stock: number | null;
  }> = [];
  let hasMoreMasterCatalog = false;
  let fetchOffset = masterOffset;
  const fetchChunk = Math.max(masterLimit * 2, 200);

  while (masterItems.length < masterLimit + 1) {
    let pageQuery = supabase
      .from("master_catalog")
      .select("id,name,sku,ean,image_url,tags,default_min_stock,brand_id")
      .order("name", { ascending: true })
      .range(fetchOffset, fetchOffset + fetchChunk - 1);
    if (query) {
      pageQuery = pageQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%,ean.ilike.%${query}%`);
    }
    const { data: chunkRows, error: chunkErr } = await pageQuery;
    if (chunkErr) {
      return NextResponse.json({ error: chunkErr.message }, { status: 400 });
    }
    const rows = (chunkRows ?? []) as MasterCatalogRow[];
    if (!rows.length) break;

    for (const m of rows) {
      if (existingMasterIds.has(m.id)) continue;
      const brandObj = m.brand_id ? brandCatalogById.get(m.brand_id) : null;
      masterItems.push({
        id: m.id,
        name: m.name,
        tags: m.tags,
        brand: brandObj?.name ?? null,
        brand_image_url: brandObj?.image_url ?? null,
        sku: m.sku,
        ean: m.ean,
        image_url: m.image_url,
        default_min_stock: m.default_min_stock,
      });
      if (masterItems.length >= masterLimit + 1) break;
    }
    fetchOffset += rows.length;
    if (rows.length < fetchChunk) break;
  }

  const hasMoreClinicProducts = (clinicProducts.length ?? 0) > clinicLimit;
  const clinicItems = clinicProducts.slice(0, clinicLimit);
  hasMoreMasterCatalog = masterItems.length > masterLimit;

  return NextResponse.json({
    clinicProducts: clinicItems,
    masterCatalogItems: masterItems.slice(0, masterLimit),
    clinicOffset,
    clinicLimit,
    masterOffset,
    masterLimit,
    hasMoreClinicProducts,
    hasMoreMasterCatalog,
  });
}
