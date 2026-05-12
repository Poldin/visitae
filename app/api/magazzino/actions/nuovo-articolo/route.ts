import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

type NuovoArticoloLotInput = {
  quantity: number;
  expiryDate?: string | null;
  lotCode?: string | null;
  price?: number | null;
  /** Percentuale IVA; colonna `inventory_items.VAT`. */
  vat?: number | null;
  location?: string | null;
};

type NuovoArticoloInput = {
  productId?: string;
  masterCatalogueId?: string | null;
  name?: string;
  brand?: string | null;
  sku?: string | null;
  ean?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  minStockLevel?: number | null;
  movementNote?: string | null;
  lots: NuovoArticoloLotInput[];
};

type NuovoArticoloBulkRequest = {
  clinicId: string;
  products: NuovoArticoloInput[];
};

const MAX_PRODUCTS_PER_REQUEST = 200;
const MAX_LOTS_PER_PRODUCT = 500;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function isValidDateOnly(value: string | null): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildDefaultMovementNote(base: string, lot: NuovoArticoloLotInput): string {
  const parts: string[] = [base];
  const priceValue = typeof lot.price === "number" && Number.isFinite(lot.price) ? lot.price : null;
  if (priceValue != null) {
    parts.push(`Prezzo unit. impon.: ${priceValue.toFixed(2).replace(".", ",")} €`);
  }
  const vatValue = typeof lot.vat === "number" && Number.isFinite(lot.vat) ? lot.vat : null;
  if (vatValue != null && vatValue > 0) {
    parts.push(`IVA ${vatValue}%`);
  }
  if (lot.lotCode && lot.lotCode.trim()) {
    parts.push(`Lotto: ${lot.lotCode.trim()}`);
  }
  return parts.join(" · ");
}

async function resolveOrCreateProduct(
  supabase: ReturnType<typeof createClient<Database>>,
  clinicId: string,
  item: NuovoArticoloInput,
): Promise<{ productId: string | null; error: string | null; created: boolean }> {
  const explicitProductId = cleanString(item.productId);
  if (explicitProductId) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("id", explicitProductId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (error) return { productId: null, error: error.message, created: false };
    if (!data?.id) return { productId: null, error: `Prodotto ${explicitProductId} non trovato nella clinica.`, created: false };
    return { productId: data.id, error: null, created: false };
  }

  const masterCatalogueId = cleanString(item.masterCatalogueId);
  if (masterCatalogueId) {
    const { data: existingByMaster, error: existingErr } = await supabase
      .from("products")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("master_catalogue_id", masterCatalogueId)
      .maybeSingle();
    if (existingErr) return { productId: null, error: existingErr.message, created: false };
    if (existingByMaster?.id) return { productId: existingByMaster.id, error: null, created: false };
  }

  const name = cleanString(item.name);
  if (!name) return { productId: null, error: "name obbligatorio quando productId non è fornito.", created: false };

  const { data: existingByName, error: existingByNameErr } = await supabase
    .from("products")
    .select("id")
    .eq("clinic_id", clinicId)
    .ilike("name", name)
    .maybeSingle();
  if (existingByNameErr) return { productId: null, error: existingByNameErr.message, created: false };
  if (existingByName?.id) return { productId: existingByName.id, error: null, created: false };

  const brand = cleanString(item.brand);
  const sku = cleanString(item.sku);
  const ean = cleanString(item.ean);
  const metadata =
    brand || sku || ean
      ? {
          ...(brand ? { brand } : {}),
          ...(sku ? { sku } : {}),
          ...(ean ? { ean } : {}),
        }
      : null;
  const minStockRaw = typeof item.minStockLevel === "number" && Number.isFinite(item.minStockLevel) ? item.minStockLevel : 0;
  const description = cleanString(item.description);
  const imageUrl = cleanString(item.imageUrl);

  const insertPayload: Database["public"]["Tables"]["products"]["Insert"] = {
    clinic_id: clinicId,
    name,
    sku: null,
    category: brand,
    min_stock_level: minStockRaw,
    image_url: imageUrl,
    description,
    metadata,
    master_catalogue_id: masterCatalogueId,
  };

  const { data: created, error: createErr } = await supabase
    .from("products")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();
  if (createErr || !created?.id) {
    return { productId: null, error: createErr?.message ?? "Creazione prodotto non riuscita.", created: false };
  }
  return { productId: created.id, error: null, created: true };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Token mancante." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json({ error: "Configurazione Supabase mancante." }, { status: 500 });
  }

  let body: NuovoArticoloBulkRequest;
  try {
    body = (await req.json()) as NuovoArticoloBulkRequest;
  } catch {
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const clinicId = cleanString(body?.clinicId);
  if (!clinicId) return NextResponse.json({ error: "clinicId obbligatorio." }, { status: 400 });
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json({ error: "products obbligatorio (array non vuoto)." }, { status: 400 });
  }
  if (body.products.length > MAX_PRODUCTS_PER_REQUEST) {
    return NextResponse.json({ error: `products supera il massimo (${MAX_PRODUCTS_PER_REQUEST}).` }, { status: 400 });
  }

  for (let i = 0; i < body.products.length; i += 1) {
    const p = body.products[i];
    if (!Array.isArray(p.lots) || p.lots.length === 0) {
      return NextResponse.json({ error: `products[${i}].lots deve contenere almeno un lotto.` }, { status: 400 });
    }
    if (p.lots.length > MAX_LOTS_PER_PRODUCT) {
      return NextResponse.json({ error: `products[${i}].lots supera il massimo (${MAX_LOTS_PER_PRODUCT}).` }, { status: 400 });
    }
    for (let j = 0; j < p.lots.length; j += 1) {
      const lot = p.lots[j];
      if (!(typeof lot.quantity === "number" && Number.isFinite(lot.quantity) && lot.quantity > 0)) {
        return NextResponse.json({ error: `products[${i}].lots[${j}].quantity deve essere > 0.` }, { status: 400 });
      }
      const expiryDate = cleanString(lot.expiryDate);
      if (!isValidDateOnly(expiryDate)) {
        return NextResponse.json({ error: `products[${i}].lots[${j}].expiryDate non valida (YYYY-MM-DD).` }, { status: 400 });
      }
      if (lot.price != null && !(typeof lot.price === "number" && Number.isFinite(lot.price) && lot.price >= 0)) {
        return NextResponse.json({ error: `products[${i}].lots[${j}].price deve essere >= 0.` }, { status: 400 });
      }
      if (lot.vat != null && !(typeof lot.vat === "number" && Number.isFinite(lot.vat) && lot.vat >= 0 && lot.vat <= 100)) {
        return NextResponse.json(
          { error: `products[${i}].lots[${j}].vat deve essere una percentuale tra 0 e 100.` },
          { status: 400 },
        );
      }
    }
  }

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

  const resolvedProducts: Array<{ index: number; productId: string; created: boolean }> = [];
  const rpcItems: Array<{
    product_id: string;
    movement_note: string;
    lots: Array<{
      quantity: number;
      expiry_date: string | null;
      batch_number: string | null;
      price: number | null;
      location?: string | null;
      VAT: number | null;
    }>;
  }> = [];

  for (let i = 0; i < body.products.length; i += 1) {
    const item = body.products[i];
    const resolved = await resolveOrCreateProduct(supabase, clinicId, item);
    if (resolved.error || !resolved.productId) {
      return NextResponse.json({ error: `products[${i}]: ${resolved.error ?? "Errore risoluzione prodotto."}` }, { status: 400 });
    }

    const fromCatalog = Boolean(cleanString(item.masterCatalogueId));
    const baseNote = fromCatalog ? "Primo carico da catalogo" : "Primo carico manuale";
    const lots = item.lots.map((lot) => {
      const vatVal =
        typeof lot.vat === "number" && Number.isFinite(lot.vat) ? Math.round(lot.vat * 100) / 100 : null;
      const row: {
        quantity: number;
        expiry_date: string | null;
        batch_number: string | null;
        price: number | null;
        location?: string | null;
        VAT: number | null;
      } = {
        quantity: lot.quantity,
        expiry_date: cleanString(lot.expiryDate),
        batch_number: cleanString(lot.lotCode),
        price: typeof lot.price === "number" && Number.isFinite(lot.price) ? lot.price : null,
        VAT: vatVal,
      };
      const loc = cleanString(lot.location);
      if (loc) row.location = loc;
      return row;
    });
    const movementNote =
      cleanString(item.movementNote) ?? (lots.length === 1 ? buildDefaultMovementNote(baseNote, item.lots[0]) : baseNote);

    rpcItems.push({
      product_id: resolved.productId,
      movement_note: movementNote,
      lots,
    });
    resolvedProducts.push({
      index: i,
      productId: resolved.productId,
      created: resolved.created,
    });
  }

  const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("apply_carico_bulk", {
    p_clinic_id: clinicId,
    p_items: rpcItems,
  });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    clinicId,
    productsProcessed: resolvedProducts.length,
    resolvedProducts,
    rpc: rpcData ?? null,
  });
}
