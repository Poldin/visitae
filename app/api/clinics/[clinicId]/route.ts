import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase.types";

type RouteContext = { params: Promise<{ clinicId: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Token mancante." }, { status: 401 });
  }

  const { clinicId: rawClinicId } = await context.params;
  const clinicId = rawClinicId?.trim() ?? "";
  if (!clinicId) {
    return NextResponse.json({ error: "clinicId non valido." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json({ error: "Configurazione Supabase mancante." }, { status: 500 });
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

  const { data: myClinics, error: listErr } = await supabase.rpc("get_my_clinics");
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 400 });
  }

  const allowed = (myClinics ?? []).some((row) => row.clinic_id === clinicId);
  if (!allowed) {
    return NextResponse.json({ error: "Non hai permesso di eliminare questa clinica." }, { status: 403 });
  }

  const { error: deleteErr } = await supabase.from("clinics").delete().eq("id", clinicId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
