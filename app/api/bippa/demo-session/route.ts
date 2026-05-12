import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mintBippaDemoRealtimeJwt } from "@/lib/bippa/mintDemoRealtimeJwt";

/**
 * Sessione Bippa “live” per la landing / anteprima senza login.
 * Restituisce un JWT firmato con il JWT secret del progetto (NO anonymous auth in Dashboard).
 */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseUrl?.trim() || !jwtSecret?.trim()) {
    return NextResponse.json(
      {
        error:
          "Configurazione mancante: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_JWT_SECRET sono richiesti per la demo remota.",
      },
      { status: 503 },
    );
  }

  const sessionId = randomUUID();
  const token = mintBippaDemoRealtimeJwt({
    supabaseUrl: supabaseUrl.trim(),
    jwtSecret: jwtSecret.trim(),
    ttlSec: 3600,
  });

  return NextResponse.json({ sessionId, token });
}
