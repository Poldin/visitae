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
    const [{ data: product, error: productErr }, { data: invRows, error: invErr }, { data: brandsData, error: brandsErr }] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,sku,ean,category,image_url,metadata")
        .eq("clinic_id", clinicId)
        .eq("id", itemId)
        .maybeSingle(),
      supabase.from("inventory_items").select("quantity").eq("clinic_id", clinicId).eq("product_id", itemId),
      supabase.from("brands").select("name,image_url"),
    ]);
    const firstErr = productErr ?? invErr ?? brandsErr;
    if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 400 });
    if (!product) return NextResponse.json({ error: "Prodotto clinica non trovato." }, { status: 404 });

    const totalQty = (invRows ?? []).reduce((s, r) => s + Number((r as { quantity: number }).quantity ?? 0), 0);
    const brand = getBrandFromMetadata(product.metadata) ?? product.category ?? null;
    const brandImage =
      (brandsData ?? []).find((b) => b.name?.trim().toLowerCase() === (brand ?? "").trim().toLowerCase())?.image_url ?? null;
    const resolvedMode = getResolvedMode(selectedMode, true);
    return NextResponse.json({
      resolvedMode,
      prefill: {
        masterCatalogueId: null,
        existingProductId: product.id,
        currentStockQty: totalQty,
        name: product.name,
        brand,
        brandImageUrl: brandImage,
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
      .select("id,name,sku,ean,image_url,tags,default_min_stock,brand_id")
      .eq("id", itemId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id,name,sku,ean,category,image_url,metadata")
      .eq("clinic_id", clinicId)
      .eq("master_catalogue_id", itemId)
      .maybeSingle(),
    supabase.from("inventory_items").select("quantity,product_id").eq("clinic_id", clinicId),
  ]);
  const brandId = (master as any)?.brand_id as string | null | undefined;
  const { data: brand } = brandId ? await supabase.from("brands").select("name,image_url").eq("id", brandId).maybeSingle() : { data: null };
  const firstErr = masterErr ?? existingErr ?? invErr;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 400 });
  if (!master) return NextResponse.json({ error: "Articolo catalogo non trovato." }, { status: 404 });

  const hasExisting = Boolean(existing?.id);
  const resolvedMode = getResolvedMode(selectedMode, hasExisting);
  const totalQty =
    hasExisting
      ? (invRows ?? [])
          .filter((r) => (r as { product_id?: string }).product_id === existing?.id)
          .reduce((s, r) => s + Number((r as { quantity: number }).quantity ?? 0), 0)
      : null;

  return NextResponse.json({
    resolvedMode,
    prefill: {
      masterCatalogueId: master.id,
      existingProductId: existing?.id ?? null,
      currentStockQty: totalQty,
      name: existing?.name ?? master.name,
      brand: brand?.name ?? existing?.category ?? null,
      brandImageUrl: brand?.image_url ?? null,
      sku: existing?.sku ?? master.sku,
      ean: existing?.ean ?? master.ean,
      imageUrl: existing?.image_url ?? master.image_url,
      defaultMinStock: master.default_min_stock,
      tags: master.tags,
    },
  });
}
