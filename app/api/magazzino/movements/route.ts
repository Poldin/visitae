import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 100;

type MovementApiRow = {
  id: string;
  createdAt: string;
  movementType: string | null;
  quantity: number;
  notes: string | null;
  productId: string;
  sku: string;
  productName: string;
  brand: string | null;
  brandImageUrl: string | null;
};

type MovementDbRow = {
  id: string;
  created_at: string;
  movement_type: string | null;
  quantity: number;
  notes: string | null;
  product_id: string;
};

type ProductDbRow = {
  id: string;
  name: string | null;
  sku: string | null;
  category: string | null;
  metadata: unknown;
};

type BrandDbRow = {
  name: string | null;
  image_url: string | null;
};

function getBrandFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const rawBrand = (metadata as { brand?: unknown }).brand;
  if (typeof rawBrand !== "string") return null;
  const normalized = rawBrand.trim();
  return normalized || null;
}

function getSkuFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const rawSku = (metadata as { sku?: unknown }).sku;
  if (typeof rawSku !== "string") return null;
  const normalized = rawSku.trim();
  return normalized || null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Token mancante." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json({ error: "Configurazione Supabase mancante." }, { status: 500 });
  }

  const clinicId = req.nextUrl.searchParams.get("clinicId")?.trim() ?? "";
  if (!clinicId) {
    return NextResponse.json({ error: "clinicId mancante." }, { status: 400 });
  }

  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE)));
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0));

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    return NextResponse.json({ error: "Sessione non valida." }, { status: 401 });
  }

  const [{ count, error: countErr }, { data: pageData, error: pageErr }, { data: productsData, error: productsErr }, { data: brandsData, error: brandsErr }] =
    await Promise.all([
      supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
      supabase
        .from("stock_movements")
        .select("id,created_at,movement_type,quantity,notes,product_id")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase.from("products").select("id,name,sku,category,metadata").eq("clinic_id", clinicId),
      supabase.from("brands").select("name,image_url"),
    ]);

  if (countErr || pageErr || productsErr || brandsErr) {
    const message =
      countErr?.message ?? pageErr?.message ?? productsErr?.message ?? brandsErr?.message ?? "Errore caricamento movimenti.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const brandImageByName = new Map<string, string>();
  for (const brandRow of (brandsData ?? []) as BrandDbRow[]) {
    const name = brandRow.name?.trim().toLowerCase();
    if (!name || !brandRow.image_url) continue;
    brandImageByName.set(name, brandRow.image_url);
  }

  const productMap = new Map<
    string,
    {
      sku: string;
      productName: string;
      brand: string | null;
      brandImageUrl: string | null;
    }
  >();
  for (const product of (productsData ?? []) as ProductDbRow[]) {
    const brand = getBrandFromMetadata(product.metadata) ?? product.category ?? null;
    const key = (brand ?? "").trim().toLowerCase();
    productMap.set(product.id, {
      sku: product.sku?.trim() || getSkuFromMetadata(product.metadata) || "",
      productName: product.name ?? "Prodotto",
      brand,
      brandImageUrl: key ? brandImageByName.get(key) ?? null : null,
    });
  }

  const items: MovementApiRow[] = ((pageData ?? []) as MovementDbRow[]).map((m) => {
    const p = productMap.get(m.product_id);
    return {
      id: m.id,
      createdAt: m.created_at,
      movementType: m.movement_type,
      quantity: Number(m.quantity ?? 0),
      notes: m.notes,
      productId: m.product_id,
      sku: p?.sku ?? "",
      productName: p?.productName ?? "Prodotto",
      brand: p?.brand ?? null,
      brandImageUrl: p?.brandImageUrl ?? null,
    };
  });

  const total = Number(count ?? 0);
  return NextResponse.json({
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  });
}
