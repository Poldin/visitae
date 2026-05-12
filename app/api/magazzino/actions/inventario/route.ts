import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

type InventarioProductInput = {
  productId: string;
  inventoryItemId?: string;
  targetQuantity: number;
  movementNote?: string | null;
  /** Aggiorna memo posizione sul lotto (chiave opzionale per compatibilità). */
  location?: string;
};

type InventarioBulkRequest = {
  clinicId: string;
  products: InventarioProductInput[];
};

const MAX_PRODUCTS_PER_REQUEST = 200;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID();
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  console.info("[magazzino:inventario] request:start", { reqId, hasBearer: authHeader.startsWith("Bearer "), hasToken: Boolean(token) });
  if (!token) return NextResponse.json({ error: "Token mancante." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    console.error("[magazzino:inventario] request:missing-supabase-config", { reqId });
    return NextResponse.json({ error: "Configurazione Supabase mancante." }, { status: 500 });
  }

  let body: InventarioBulkRequest;
  try {
    body = (await req.json()) as InventarioBulkRequest;
  } catch {
    console.warn("[magazzino:inventario] request:invalid-json-body", { reqId });
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const clinicId = cleanString(body?.clinicId);
  console.info("[magazzino:inventario] request:parsed", {
    reqId,
    clinicId,
    productsCount: Array.isArray(body?.products) ? body.products.length : null,
  });
  if (!clinicId) return NextResponse.json({ error: "clinicId obbligatorio." }, { status: 400 });
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json({ error: "products obbligatorio (array non vuoto)." }, { status: 400 });
  }
  if (body.products.length > MAX_PRODUCTS_PER_REQUEST) {
    return NextResponse.json({ error: `products supera il massimo (${MAX_PRODUCTS_PER_REQUEST}).` }, { status: 400 });
  }

  for (let i = 0; i < body.products.length; i += 1) {
    const p = body.products[i];
    const productId = cleanString(p.productId);
    if (!productId) {
      return NextResponse.json({ error: `products[${i}].productId obbligatorio.` }, { status: 400 });
    }
    if (!(typeof p.targetQuantity === "number" && Number.isFinite(p.targetQuantity) && p.targetQuantity >= 0 && Number.isInteger(p.targetQuantity))) {
      return NextResponse.json({ error: `products[${i}].targetQuantity deve essere intero >= 0.` }, { status: 400 });
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
  console.info("[magazzino:inventario] auth:user", { reqId, clinicId, userId: userData.user.id });

  const rpcItems = body.products.map((input) => {
    const row: Record<string, unknown> = {
      product_id: input.productId.trim(),
      inventory_item_id: cleanString(input.inventoryItemId),
      target_quantity: input.targetQuantity,
      movement_note: cleanString(input.movementNote) ?? "Rettifica inventario",
    };
    if (typeof input.location === "string") {
      row.location = input.location;
    }
    return row;
  });
  console.info("[magazzino:inventario] rpc:prepare", {
    reqId,
    clinicId,
    userId: userData.user.id,
    itemsCount: rpcItems.length,
  });

  const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("apply_inventario_bulk", {
    p_clinic_id: clinicId,
    p_items: rpcItems,
  });
  if (rpcErr) {
    console.error("[magazzino:inventario] rpc:error", {
      reqId,
      clinicId,
      userId: userData.user.id,
      message: rpcErr.message,
      details: (rpcErr as { details?: string | null }).details ?? null,
      hint: (rpcErr as { hint?: string | null }).hint ?? null,
      code: (rpcErr as { code?: string | null }).code ?? null,
    });
    return NextResponse.json({ error: rpcErr.message }, { status: 400 });
  }
  console.info("[magazzino:inventario] rpc:ok", {
    reqId,
    clinicId,
    userId: userData.user.id,
    itemsCount: rpcItems.length,
  });

  return NextResponse.json({
    ok: true,
    clinicId,
    productsProcessed: rpcItems.length,
    rpc: rpcData ?? null,
  });
}
