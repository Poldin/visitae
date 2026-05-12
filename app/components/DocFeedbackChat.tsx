"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Lightbulb, Loader2, Send, X } from "lucide-react";
import { docRailLinkMotionStyle } from "./docRailLinkMotionStyle";

const railBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-600 hover:border-slate-600 hover:!bg-slate-800 hover:!text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";

type ChatTurn = { role: "user" | "assistant"; content: string };

const INTRO_ASSISTANT: ChatTurn = {
  role: "assistant",
  content:
    "Ciao! Racconta cosa vorresti migliorare in Visitae (agenda, pazienti, fatture, statistiche…). Ti rispondo con idee e priorità concrete.",
};

function useAnchorRect(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return rect;
}

export function DocFeedbackChatNavItem({
  railOpen,
  reduced,
  linkMs,
  docId,
  railEase,
}: {
  railOpen: boolean;
  reduced: boolean;
  linkMs: number;
  docId: string;
  railEase: string;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (railOpen) return;
    const t = window.setTimeout(() => setPanelOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [railOpen]);

  const toggle = () => {
    setPanelOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          toggle();
        }}
        className={`${railBtnClass} ${panelOpen ? "border-amber-200 bg-amber-50 text-amber-800" : ""}`}
        style={docRailLinkMotionStyle(465, railOpen, reduced, linkMs, railEase)}
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
        aria-controls="doc-feedback-chat-panel"
        title="Aiutaci a migliorare"
        aria-label="Aiutaci a migliorare — apri chat suggerimenti"
      >
        <Lightbulb size={18} strokeWidth={2} aria-hidden />
      </button>
      {panelOpen && typeof document !== "undefined"
        ? createPortal(
            <DocFeedbackChatPanel
              anchorRef={anchorRef}
              panelRef={panelRef}
              docId={docId}
              onClose={() => setPanelOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function DocFeedbackChatPanel({
  anchorRef,
  panelRef,
  docId,
  onClose,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  docId: string;
  onClose: () => void;
}) {
  const rect = useAnchorRect(true, anchorRef);
  const [messages, setMessages] = useState<ChatTurn[]>([INTRO_ASSISTANT]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const panel = panelRef.current;
      const anchor = anchorRef.current;
      const t = e.target as Node;
      if (panel?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [anchorRef, onClose, panelRef]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const nextUser: ChatTurn = { role: "user", content: text };
    const history = [...messages, nextUser];
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch("/api/product-feedback-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Errore di rete.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (!data.reply) {
        setError("Risposta non valida.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
    } catch {
      setError("Impossibile contattare il server.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const panelW = 360;
  const margin = 12;
  const maxH =
    typeof window !== "undefined" ? Math.min(480, window.innerHeight - margin * 2) : 480;
  let top = 120;
  let left = margin;
  if (rect && typeof window !== "undefined") {
    top = rect.top + rect.height / 2;
    left = rect.right + 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + panelW + margin > vw) {
      left = Math.max(margin, rect.left - panelW - 10);
    }
    left = Math.max(margin, Math.min(left, vw - panelW - margin));
    const half = Math.min(maxH / 2, (vh - 2 * margin) / 2);
    top = Math.max(margin + half, Math.min(top, vh - margin - half));
  }

  return (
    <div
      ref={panelRef}
      id="doc-feedback-chat-panel"
      role="dialog"
      aria-label="Chat suggerimenti per Visitae"
      className="fixed flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: "translateY(-50%)",
        width: panelW,
        maxHeight: maxH,
        zIndex: 100,
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">Migliora Visitae</p>
          <p className="truncate text-xs text-slate-500">Suggerimenti mirati sull’uso del prodotto</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          aria-label="Chiudi"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-100 bg-slate-50 text-slate-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sto pensando…
            </div>
          </div>
        ) : null}
        <div ref={listEndRef} />
      </div>

      {error ? (
        <p className="shrink-0 border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      <div className="shrink-0 border-t border-slate-100 p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Descrivi un miglioramento o un problema…"
            rows={2}
            disabled={loading}
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label="Invia"
          >
            <Send size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-slate-400">
          Invio con Invio · nuova riga con Maiusc+Invio. La chat non sostituisce il supporto ufficiale.
        </p>
      </div>
    </div>
  );
}
