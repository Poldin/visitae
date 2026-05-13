import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

type Source = "clinic" | "catalog";
type SelectedMode = "carico" | "scarico" | "inventario" | "nuovo";
type ResolvedMode = "carico" | "scarico" | "inventario" | "nuovo";

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function getResolvedMode(selectedMode: SelectedMode, hasExistingProduct: boolean): ResolvedMode {
  if (selectedMode === "carico" || selectedMode === "nuovo") {
    return hasExistingProduct ? "carico" : "nuovo";
  }
  if (selectedMode === "scarico") {
    return hasExistingProduct ? "scarico" : "nuovo";
  }
  return hasExistingProduct ? "inventario" : "nuovo";
}

function getManufacturerFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { manufacturer?: unknown; brand?: unknown }).manufacturer;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  // Fallback: read legacy brand field for products created before the migration
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
  const source = clean(req.nextUrl.searchParams.get("source")) as Source;
  const itemId = clean(req.nextUrl.searchParams.get("itemId"));
  const selectedMode = clean(req.nextUrl.searchParams.get("selectedMode")) as SelectedMode;
  if (!clinicId || !itemId || !source || !selectedMode) {
    return NextResponse.json({ error: "clinicId, source, itemId e selectedMode sono obbligatori." }, { status: 400 });
  }
  if (!["clinic", "catalog"].includes(source)) return NextResponse.json({ error: "source non valido." }, { status: 400 });
  if (!["carico", "scarico", "inventario", "nuovo"].includes(selectedMode)) {
    return NextResponse.json({ error: "selectedMode non valido." }, { status: 400 });
  }

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return NextResponse.json({ error: "Sessione non valida." }, { status: 401 });

  if (source === "clinic") {
    const [{ data: product, error: productErr }, { data: invRows, error: invErr }] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name,sku,ean,category,image_url,metadata,description,manufacturer_join:manufacturer_id(full_legal_name)",
        )
        .eq("clinic_id", clinicId)
        .eq("id", itemId)
        .maybeSingle(),
      supabase.from("inventory_items").select("quantity").eq("clinic_id", clinicId).eq("product_id", itemId),
    ]);
    const firstErr = productErr ?? invErr;
    if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 400 });
    if (!product) return NextResponse.json({ error: "Prodotto clinica non trovato." }, { status: 404 });

    const totalQty = (invRows ?? []).reduce((s, r) => s + Number((r as { quantity: number }).quantity ?? 0), 0);
    const manufacturerFromFk = (product as { manufacturer_join?: { full_legal_name: string | null } | null })
      .manufacturer_join?.full_legal_name?.trim() ?? null;
    const manufacturer =
      manufacturerFromFk ?? getManufacturerFromMetadata(product.metadata) ?? product.category ?? null;
    const resolvedMode = getResolvedMode(selectedMode, true);
    const description = clean(product.description) || null;
    return NextResponse.json({
      resolvedMode,
      prefill: {
        masterCatalogueId: null,
        existingProductId: product.id,
        currentStockQty: totalQty,
        name: product.name,
        description,
        manufacturer,
        sku: product.sku?.trim() || getSkuFromMetadata(product.metadata),
        ean: product.ean?.trim() || getEanFromMetadata(product.metadata),
        imageUrl: product.image_url,
        defaultMinStock: 0,
        tags: null,
      },
    });
  }

  const [{ data: master, error: masterErr }, { data: existing, error: existingErr }, { data: invRows, error: invErr }] = await Promise.all([
    supabase
      .from("master_catalog")
      .select(
        "id,name,sku,ean,image_url,tags,default_min_stock,default_description,manufacturer:manufacturer_id(full_legal_name)",
      )
      .eq("id", itemId)
      .maybeSingle(),
    supabase
      .from("products")
      .select(
        "id,name,sku,ean,category,image_url,metadata,description,manufacturer_join:manufacturer_id(full_legal_name)",
      )
      .eq("clinic_id", clinicId)
      .eq("master_catalogue_id", itemId)
      .maybeSingle(),
    supabase.from("inventory_items").select("quantity,product_id").eq("clinic_id", clinicId),
  ]);
  const firstErr = masterErr ?? existingErr ?? invErr;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 400 });
  if (!master) return NextResponse.json({ error: "Articolo catalogo non trovato." }, { status: 404 });

  const mfr = (master as unknown as { manufacturer: { full_legal_name: string | null } | null }).manufacturer;
  const manufacturerName = mfr?.full_legal_name?.trim() ?? null;

  const hasExisting = Boolean(existing?.id);
  const resolvedMode = getResolvedMode(selectedMode, hasExisting);
  const totalQty =
    hasExisting
      ? (invRows ?? [])
          .filter((r) => (r as { product_id?: string }).product_id === existing?.id)
          .reduce((s, r) => s + Number((r as { quantity: number }).quantity ?? 0), 0)
      : null;

  const masterDesc = clean(master.default_description) || null;
  const existingDesc = clean(existing?.description) || null;
  const description = existingDesc || masterDesc;

  return NextResponse.json({
    resolvedMode,
    prefill: {
      masterCatalogueId: master.id,
      existingProductId: existing?.id ?? null,
      currentStockQty: totalQty,
      name: existing?.name ?? master.name,
      description,
      manufacturer:
        manufacturerName ??
        (existing as { manufacturer_join?: { full_legal_name: string | null } | null } | null)?.manufacturer_join
          ?.full_legal_name?.trim() ??
        getManufacturerFromMetadata(existing?.metadata) ??
        existing?.category ??
        null,
      sku: existing?.sku ?? master.sku,
      ean: existing?.ean ?? master.ean,
      imageUrl: existing?.image_url ?? master.image_url,
      defaultMinStock: master.default_min_stock,
      tags: master.tags,
    },
  });
}
