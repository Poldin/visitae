import { NextRequest, NextResponse } from "next/server";

const MAX_MESSAGES = 24;
const MAX_CONTENT_LEN = 4000;

type ChatMessage = { role: "user" | "assistant"; content: string };

function sanitizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (out.length >= MAX_MESSAGES) break;
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_CONTENT_LEN);
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  return out.length ? out : null;
}

const SYSTEM_PROMPT = `Sei l'assistente prodotto di Visitae, applicazione per studi medici (agenda, pazienti, preventivi/fatture, statistiche, messaggi).
L'utente è dello studio dentistico/medico: raccoglie feedback, segnala attriti d'uso e propone idee.
Rispondi sempre in italiano, in tono professionale e cordiale. Dai suggerimenti mirati e concreti (UX, flussi, priorità).
Se mancano dettagli, fai 1–2 domande brevi. Non inventare funzioni che non esistono: se non sei sicuro, chiedi chiarimenti o parla in termini generici di "potrebbe essere utile".
Non fornire consulenza medica legale o clinica.`;

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Servizio suggerimenti non configurato (manca OPENAI_API_KEY). Contatta l'amministratore.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo richiesta non valido." }, { status: 400 });
  }

  const docId =
    typeof (body as { docId?: unknown }).docId === "string"
      ? (body as { docId: string }).docId.slice(0, 64)
      : "";

  const messages = sanitizeMessages((body as { messages?: unknown }).messages);
  if (!messages) {
    return NextResponse.json({ error: "Messaggi mancanti o non validi." }, { status: 400 });
  }

  const contextLine = docId
    ? `\nContesto: conversazione dallo studio (id documento interno abbreviato: ${docId}).`
    : "";

  const openaiMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT + contextLine },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FEEDBACK_MODEL ?? "gpt-4o-mini",
      messages: openaiMessages,
      max_tokens: 1200,
      temperature: 0.65,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI feedback chat error:", res.status, errText.slice(0, 500));
    return NextResponse.json(
      { error: "Il servizio di suggerimenti non è al momento disponibile. Riprova tra poco." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return NextResponse.json({ error: "Risposta vuota dal modello." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
