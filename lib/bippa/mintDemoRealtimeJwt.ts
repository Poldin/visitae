import { createHmac, randomUUID } from "crypto";

function base64UrlEncodeJson(obj: object): string {
  return Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * JWT HS256 compatibile con Realtime Supabase (stesso secret del progetto, vedi Dashboard → Settings → API / JWT Signing Keys).
 * Nessun utente in `auth.users`: solo per canali broadcast demo tipo `bippa:<sessionId>`.
 */
export function mintBippaDemoRealtimeJwt(options: {
  supabaseUrl: string;
  jwtSecret: string;
  ttlSec?: number;
}): string {
  const { supabaseUrl, jwtSecret, ttlSec = 3600 } = options;
  const base = supabaseUrl.replace(/\/$/, "");
  const iss = `${base}/auth/v1`;
  const now = Math.floor(Date.now() / 1000);
  const sub = randomUUID();

  const payload = {
    iss,
    sub,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + ttlSec,
  };

  const header = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlEncodeJson(payload);
  const data = `${header}.${body}`;
  const sig = createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${sig}`;
}
