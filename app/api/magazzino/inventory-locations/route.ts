import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

const MAX_LIMIT = 100;

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

  const prefix = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitRaw) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw))) : 25;

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

  const { data, error } = await supabase.rpc("search_inventory_locations", {
    p_clinic_id: clinicId,
    p_prefix: prefix,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const suggestions = (data ?? []).map((row) => ({
    location: row.location,
    frequency: row.frequency,
  }));

  return NextResponse.json({ suggestions });
}
