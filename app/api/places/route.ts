import { NextRequest, NextResponse } from "next/server";

const GOOGLE_MAPS_API_BASE = "https://maps.googleapis.com/maps/api/place";

const DEMO_PREDICTIONS = [
  { placeId: "demo-1", description: "Via Roma 12, Milano, Italia", lat: 45.4642, lng: 9.19 },
  { placeId: "demo-2", description: "Corso Buenos Aires 48, Milano, Italia", lat: 45.4789, lng: 9.2057 },
  { placeId: "demo-3", description: "Via Toledo 156, Napoli, Italia", lat: 40.838, lng: 14.2488 },
  { placeId: "demo-4", description: "Via del Corso 320, Roma, Italia", lat: 41.9029, lng: 12.4798 },
  { placeId: "demo-5", description: "Via Indipendenza 24, Bologna, Italia", lat: 44.4987, lng: 11.3426 },
  { placeId: "demo-6", description: "Via Etnea 210, Catania, Italia", lat: 37.5119, lng: 15.0872 },
] as const;

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY ?? "";
}

function getDemoPredictions(input: string) {
  const query = input.trim().toLowerCase();
  const filtered = query
    ? DEMO_PREDICTIONS.filter((item) => item.description.toLowerCase().includes(query))
    : DEMO_PREDICTIONS;
  return filtered.slice(0, 6).map((item) => ({
    placeId: item.placeId,
    description: item.description,
  }));
}

function getDemoDetails(placeId: string) {
  const match = DEMO_PREDICTIONS.find((item) => item.placeId === placeId);
  if (!match) return null;
  return {
    placeId: match.placeId,
    formattedAddress: match.description,
    lat: match.lat,
    lng: match.lng,
  };
}

export async function GET(req: NextRequest) {
  const apiKey = getApiKey();
  const hasGoogleConfig = apiKey.length > 0;

  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("mode");

  if (mode === "autocomplete") {
    const input = searchParams.get("input")?.trim() ?? "";
    if (input.length < 1) {
      return NextResponse.json({ predictions: [] });
    }

    const token = searchParams.get("sessionToken")?.trim() ?? "";
    const url = new URL(`${GOOGLE_MAPS_API_BASE}/autocomplete/json`);
    url.searchParams.set("input", input);
    url.searchParams.set("types", "address");
    url.searchParams.set("language", "it");
    url.searchParams.set("components", "country:it");
    url.searchParams.set("key", apiKey);
    if (token) {
      url.searchParams.set("sessiontoken", token);
    }

    if (!hasGoogleConfig) {
      return NextResponse.json({ predictions: getDemoPredictions(input), source: "demo" });
    }

    const response = await fetch(url, { method: "GET", cache: "no-store" }).catch(() => null);
    if (!response || !response.ok) {
      const text = response ? await response.text().catch(() => "") : "";
      console.error("Google Places autocomplete error:", response?.status ?? "network", text.slice(0, 500));
      return NextResponse.json({ predictions: getDemoPredictions(input), source: "demo" });
    }

    const data = (await response.json()) as {
      predictions?: Array<{ description?: string; place_id?: string }>;
    };
    const predictions = (data.predictions ?? [])
      .map((prediction) => ({
        description: prediction.description ?? "",
        placeId: prediction.place_id ?? "",
      }))
      .filter((prediction) => prediction.description.length > 0 && prediction.placeId.length > 0);

    if (predictions.length === 0) {
      return NextResponse.json({ predictions: getDemoPredictions(input), source: "demo" });
    }

    return NextResponse.json({ predictions, source: "google" });
  }

  if (mode === "details") {
    const placeId = searchParams.get("placeId")?.trim() ?? "";
    if (!placeId) {
      return NextResponse.json({ error: "placeId mancante." }, { status: 400 });
    }

    const token = searchParams.get("sessionToken")?.trim() ?? "";
    if (!hasGoogleConfig || placeId.startsWith("demo-")) {
      const demoDetails = getDemoDetails(placeId);
      if (!demoDetails) {
        return NextResponse.json({ error: "Dettagli indirizzo non trovati." }, { status: 404 });
      }
      return NextResponse.json({ ...demoDetails, source: "demo" });
    }

    const url = new URL(`${GOOGLE_MAPS_API_BASE}/details/json`);
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "formatted_address,place_id,geometry");
    url.searchParams.set("language", "it");
    url.searchParams.set("key", apiKey);
    if (token) {
      url.searchParams.set("sessiontoken", token);
    }

    const response = await fetch(url, { method: "GET", cache: "no-store" }).catch(() => null);
    if (!response || !response.ok) {
      const demoDetails = getDemoDetails(placeId);
      if (demoDetails) {
        return NextResponse.json({ ...demoDetails, source: "demo" });
      }
      const text = response ? await response.text().catch(() => "") : "";
      console.error("Google Places details error:", response?.status ?? "network", text.slice(0, 500));
      return NextResponse.json({ error: "Dettagli indirizzo non disponibili al momento." }, { status: 502 });
    }

    const data = (await response.json()) as {
      result?: {
        formatted_address?: string;
        place_id?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      };
    };

    const result = data.result;
    if (!result?.place_id || !result.formatted_address) {
      return NextResponse.json({ error: "Dettagli indirizzo non trovati." }, { status: 404 });
    }

    return NextResponse.json({
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
      lat: result.geometry?.location?.lat ?? null,
      lng: result.geometry?.location?.lng ?? null,
      source: "google",
    });
  }

  return NextResponse.json({ error: "Parametro mode non valido." }, { status: 400 });
}
