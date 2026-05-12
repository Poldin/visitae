/**
 * Route pubblici (nessun redirect verso /login dalla proxy).
 * Aggiungi qui /privacy e /terms quando le pagine sono pronte.
 */
export const PUBLIC_ROUTES = new Set(["/", "/login", "/privacy", "/terms"]);

/**
 * Prefissi pubblici: qualunque pathname che inizia con uno di questi
 * viene considerato pubblico (es. /bippa/<sessionId> per lo scanner remoto).
 */
export const PUBLIC_PREFIXES = ["/bippa/"];

/** Dopo registrazione (senza `?next` sicuro): onboarding clinica in impostazioni. */
export const POST_AUTH_REGISTRATION_PATH = "/impostazioni?tab=cliniche";

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Accetta solo path relativi same-origin per ?next (previene open redirect). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const decoded = decodeURIComponent(String(raw).trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  if (decoded.startsWith("/login")) return null;
  return decoded;
}
