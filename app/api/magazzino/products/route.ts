import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inventoryVatFromDb } from "@/app/magazzino/components/manual-product-entry/format";
import { getManufacturerFromMetadata } from "@/app/magazzino/lib/productBrandDisplay";
import type { Database } from "@/lib/supabase.types";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 100;

type ProductSortField = "name" | "totalQty" | "expiringQty" | "nextExpiry" | "lastMovementAt" | "lowStockFirst";
type ProductSortDir = "asc" | "desc";
type ProductFilterField =
  | "name"
  | "sku"
  | "category"
  | "totalQty"
  | "expiringQty"
  | "nonExpiringQty"
  | "minStock"
  | "nextExpiry"
  | "lastMovementAt"
  | "lowStock";
type ProductFilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "not_null"
  | "is_true"
  | "is_false";
type ProductFilterRow = {
  id: string;
  field: ProductFilterField;
  op: ProductFilterOp;
  value: string;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  udi: string | null;
  hibc: string | null;
  manufacturer: string | null;
  manufacturerImageUrl: string | null;
  imageUrl: string | null;
  category: string | null;
  minStock: number;
  totalQty: number;
  expiringQty: number;
  nonExpiringQty: number;
  nextExpiry: string | null;
  nextExpiryQty: number;
  lastUpdated: string | null;
  lastMovementAt: string | null;
  lots: Array<{
    inventoryItemId: string;
    expiryDate: string | null;
    quantity: number;
    lotCode: string | null;
    price: number | null;
    /** `inventory_items.VAT` */
    vatPct: number | null;
    location: string | null;
  }>;
};

type ProductDbRow = {
  id: string;
  name: string | null;
  sku: string | null;
  ean: string | null;
  udi_di: string | null;
  hibc_primary: string | null;
  metadata: unknown;
  category: string | null;
  min_stock_level: number | null;
  image_url: string | null;
};

type InventoryDbRow = {
  id: string;
  product_id: string;
  quantity: number;
  expiry_date: string | null;
  batch_number: string | null;
  last_updated: string | null;
  price: number | string | null;
  location: string | null;
  VAT: number | null;
};

function inventoryPriceToNumberOrNull(raw: InventoryDbRow["price"]): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

type MovementDbRow = {
  product_id: string;
  created_at: string;
};

type BrandDbRow = {
  name: string | null;
  image_url: string | null;
};

function getSkuFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const rawSku = (metadata as { sku?: unknown }).sku;
  if (typeof rawSku !== "string") return null;
  const normalized = rawSku.trim();
  return normalized || null;
}

function getEanFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { ean?: unknown }).ean;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  return normalized || null;
}

function getUdiFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { udi?: unknown }).udi;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  return normalized || null;
}

function getHibcFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as { hibc?: unknown }).hibc;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  return normalized || null;
}

function parseFilters(raw: string | null): ProductFilterRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is ProductFilterRow => Boolean(row && typeof row === "object"))
      .map((row) => ({
        id: String(row.id ?? crypto.randomUUID()),
        field: row.field,
        op: row.op,
        value: typeof row.value === "string" ? row.value : "",
      }))
      .filter((row) => Boolean(row.field && row.op));
  } catch {
    return [];
  }
}

function applyFiltersAndSort(rows: ProductRow[], query: string, sortField: ProductSortField, sortDir: ProductSortDir, filterRows: ProductFilterRow[]) {
  const q = query.trim().toLowerCase();
  const isDateField = (field: string) => field === "nextExpiry" || field === "lastMovementAt";
  const isNumericField = (field: string) =>
    field === "totalQty" || field === "expiringQty" || field === "nonExpiringQty" || field === "minStock";
  const isTextField = (field: string) => field === "name" || field === "sku" || field === "category";

  const matchesAdvancedFilters = (p: ProductRow) =>
    filterRows.every((row) => {
      const lowStock = p.totalQty <= p.minStock;
      const fieldValue: string | number | boolean | null =
        row.field === "name"
          ? p.name
          : row.field === "sku"
            ? p.sku
            : row.field === "category"
              ? p.category
              : row.field === "totalQty"
                ? p.totalQty
                : row.field === "expiringQty"
                  ? p.expiringQty
                  : row.field === "nonExpiringQty"
                    ? p.nonExpiringQty
                    : row.field === "minStock"
                      ? p.minStock
                      : row.field === "nextExpiry"
                        ? p.nextExpiry
                        : row.field === "lastMovementAt"
                          ? p.lastMovementAt
                          : lowStock;

      if (row.op === "is_null") return fieldValue === null || fieldValue === "";
      if (row.op === "not_null") return fieldValue !== null && fieldValue !== "";
      if (row.op === "is_true") return Boolean(fieldValue) === true;
      if (row.op === "is_false") return Boolean(fieldValue) === false;

      if (isTextField(row.field)) {
        const source = String(fieldValue ?? "").toLowerCase();
        const target = row.value.trim().toLowerCase();
        if (!target) return true;
        if (row.op === "contains") return source.includes(target);
        if (row.op === "starts_with") return source.startsWith(target);
        if (row.op === "ends_with") return source.endsWith(target);
        if (row.op === "eq") return source === target;
        if (row.op === "neq") return source !== target;
        return true;
      }

      if (isNumericField(row.field)) {
        const source = Number(fieldValue ?? 0);
        const target = Number(row.value);
        if (Number.isNaN(target)) return true;
        if (row.op === "eq") return source === target;
        if (row.op === "neq") return source !== target;
        if (row.op === "gt") return source > target;
        if (row.op === "gte") return source >= target;
        if (row.op === "lt") return source < target;
        if (row.op === "lte") return source <= target;
        return true;
      }

      if (isDateField(row.field)) {
        if (!fieldValue) return false;
        const source = new Date(String(fieldValue)).getTime();
        const target = new Date(row.value).getTime();
        if (Number.isNaN(source) || Number.isNaN(target)) return true;
        if (row.op === "eq") return source === target;
        if (row.op === "gt") return source > target;
        if (row.op === "gte") return source >= target;
        if (row.op === "lt") return source < target;
        if (row.op === "lte") return source <= target;
        return true;
      }

      return true;
    });

  const list = rows.filter((p) => {
    const baseMatch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q) ||
      (p.manufacturer ?? "").toLowerCase().includes(q) ||
      (p.ean ?? "").toLowerCase().includes(q) ||
      (p.udi ?? "").toLowerCase().includes(q) ||
      (p.hibc ?? "").toLowerCase().includes(q);
    if (!baseMatch) return false;
    if (!matchesAdvancedFilters(p)) return false;
    return true;
  });

  list.sort((a, b) => {
    const aOut = a.totalQty <= 0 ? 1 : 0;
    const bOut = b.totalQty <= 0 ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;

    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return a.name.localeCompare(b.name, "it") * dir;
    if (sortField === "totalQty") return (a.totalQty - b.totalQty) * dir;
    if (sortField === "nextExpiry") {
      const aTime = a.nextExpiry ? new Date(`${a.nextExpiry}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.nextExpiry ? new Date(`${b.nextExpiry}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return (aTime - bTime) * dir;
      return a.name.localeCompare(b.name, "it");
    }
    if (sortField === "lastMovementAt") {
      const aTime = a.lastMovementAt ? new Date(a.lastMovementAt).getTime() : Number.NEGATIVE_INFINITY;
      const bTime = b.lastMovementAt ? new Date(b.lastMovementAt).getTime() : Number.NEGATIVE_INFINITY;
      if (aTime !== bTime) return (aTime - bTime) * dir;
      return a.name.localeCompare(b.name, "it");
    }
    if (sortField === "lowStockFirst") {
      const aLow = a.totalQty <= a.minStock ? 1 : 0;
      const bLow = b.totalQty <= b.minStock ? 1 : 0;
      if (aLow !== bLow) return (aLow - bLow) * dir;
      return (a.totalQty - b.totalQty) * dir;
    }
    return (a.expiringQty - b.expiringQty) * dir;
  });

  return list;
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

  const query = req.nextUrl.searchParams.get("query") ?? "";
  const sortField = (req.nextUrl.searchParams.get("sortField") as ProductSortField | null) ?? "name";
  const sortDir = (req.nextUrl.searchParams.get("sortDir") as ProductSortDir | null) ?? "asc";
  const filterRows = parseFilters(req.nextUrl.searchParams.get("filters"));
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

  const [{ data: pData, error: pErr }, { data: brandData, error: brandErr }, { data: iData, error: iErr }, { data: mData, error: mErr }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id,name,sku,ean,udi_di,hibc_primary,metadata,category,min_stock_level,image_url")
        .eq("clinic_id", clinicId),
      supabase.from("brands").select("name,image_url"),
      supabase
        .from("inventory_items")
        .select("id,product_id,quantity,expiry_date,batch_number,last_updated,price,location,VAT")
        .eq("clinic_id", clinicId)
        .gt("quantity", 0),
      supabase
        .from("stock_movements")
        .select("product_id,created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false }),
    ]);

  if (pErr || brandErr || iErr || mErr) {
    const message = pErr?.message ?? brandErr?.message ?? iErr?.message ?? mErr?.message ?? "Errore caricamento dati.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 6);
  const now = new Date();

  const byProduct = new Map<string, InventoryDbRow[]>();
  for (const row of (iData ?? []) as InventoryDbRow[]) {
    const arr = byProduct.get(row.product_id) ?? [];
    arr.push(row);
    byProduct.set(row.product_id, arr);
  }

  const lastMovementByProduct = new Map<string, string>();
  for (const m of (mData ?? []) as MovementDbRow[]) {
    if (!m.product_id || !m.created_at) continue;
    if (!lastMovementByProduct.has(m.product_id)) {
      lastMovementByProduct.set(m.product_id, m.created_at);
    }
  }

  const brandImageByName = new Map<string, string>();
  for (const brandRow of (brandData ?? []) as BrandDbRow[]) {
    const name = brandRow.name?.trim().toLowerCase();
    if (!name || !brandRow.image_url) continue;
    brandImageByName.set(name, brandRow.image_url);
  }

  const rows: ProductRow[] = ((pData ?? []) as ProductDbRow[]).map((p) => {
    const inv = byProduct.get(p.id) ?? [];
    const totalQty = inv.reduce((s, x) => s + Number(x.quantity ?? 0), 0);
    const expiringQty = inv.reduce((s, x) => {
      if (!x.expiry_date) return s;
      const d = new Date(`${x.expiry_date}T12:00:00`);
      if (d >= now && d <= horizon) return s + Number(x.quantity ?? 0);
      return s;
    }, 0);
    const expiryRows = inv
      .filter((x): x is InventoryDbRow & { expiry_date: string } => Boolean(x.expiry_date))
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
    const nextExpiry = expiryRows[0]?.expiry_date ?? null;
    const nextExpiryQty = nextExpiry
      ? expiryRows
          .filter((x) => x.expiry_date === nextExpiry)
          .reduce((sum, x) => sum + Number(x.quantity ?? 0), 0)
      : 0;
    const lots = inv
      .map((lot) => ({
        inventoryItemId: lot.id,
        expiryDate: lot.expiry_date,
        quantity: Number(lot.quantity ?? 0),
        lotCode: lot.batch_number ?? null,
        price: inventoryPriceToNumberOrNull(lot.price),
        vatPct: inventoryVatFromDb(lot.VAT),
        location: lot.location ?? null,
      }))
      .sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      });
    const lastUpdated =
      inv
        .map((x) => x.last_updated)
        .filter((x): x is string => Boolean(x))
        .sort()
        .reverse()[0] ?? null;

    const mfrLabel = getManufacturerFromMetadata(p.metadata) ?? p.category ?? null;
    const mfrKey = (mfrLabel ?? "").trim().toLowerCase();
    return {
      id: p.id,
      sku: p.sku?.trim() || getSkuFromMetadata(p.metadata) || "",
      name: p.name ?? "—",
      ean: p.ean?.trim() || getEanFromMetadata(p.metadata),
      udi: p.udi_di?.trim() || getUdiFromMetadata(p.metadata),
      hibc: p.hibc_primary?.trim() || getHibcFromMetadata(p.metadata),
      manufacturer: mfrLabel,
      manufacturerImageUrl: mfrKey ? brandImageByName.get(mfrKey) ?? null : null,
      imageUrl: p.image_url ?? null,
      category: p.category ?? null,
      minStock: Number(p.min_stock_level ?? 0),
      totalQty,
      expiringQty,
      nonExpiringQty: Math.max(0, totalQty - expiringQty),
      nextExpiry,
      nextExpiryQty,
      lastUpdated,
      lastMovementAt: lastMovementByProduct.get(p.id) ?? null,
      lots,
    };
  });

  const filtered = applyFiltersAndSort(rows, query, sortField, sortDir, filterRows);
  const items = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    items,
    total: filtered.length,
    limit,
    offset,
    hasMore: offset + limit < filtered.length,
  });
}
