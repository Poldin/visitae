"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Smile, RotateCcw } from "lucide-react";

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  time: string;
}

const QUICK_REPLIES = [
  "Ho una domanda sulla prenotazione",
  "Quali servizi offrite?",
  "Dove si trova lo studio?",
  "Accettate il Servizio Sanitario?",
];

const BOT_RESPONSES: Record<string, string> = {
  "Ho una domanda sulla prenotazione":
    "Certo! Puoi prenotare direttamente online scegliendo data e orario dal calendario. Per assistenza chiama il 02 1234567.",
  "Quali servizi offrite?":
    "Offriamo medicina generale, check-up, rinnovo prescrizioni, richiesta esami diagnostici e certificati medici. Vuoi saperne di più su un servizio specifico?",
  "Dove si trova lo studio?":
    "Siamo in Via Garibaldi 42, Milano. A 5 minuti dalla metropolitana MM2 Garibaldi. Disponibile anche parcheggio nelle vicinanze.",
  "Accettate il Servizio Sanitario?":
    "Sì, la Dott.ssa Marchetti è convenzionata con il SSN. Per alcune prestazioni specialistiche è prevista la partecipazione alla spesa (ticket).",
};

function nowTime() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ChatWidget() {
  const initialMessage: Message = {
    id: 0,
    from: "bot",
    text: "Ciao! 👋 Sono l'assistente dello Studio Marchetti. Come posso aiutarti?",
    time: nowTime(),
  };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openChat", handler);
    return () => window.removeEventListener("openChat", handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (!isTypingContext && event.key.toLowerCase() === "j") {
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: messages.length,
      from: "user",
      text: text.trim(),
      time: nowTime(),
    };
    setMessages((m) => [...m, userMsg]);
    setInputValue("");
    setShowQuickReplies(false);
    setIsTyping(true);

    setTimeout(() => {
      const response =
        BOT_RESPONSES[text.trim()] ||
        "Grazie per il messaggio! Un operatore ti risponderà a breve. Per urgenze chiama il 02 1234567.";
      setIsTyping(false);
      setMessages((m) => [
        ...m,
        { id: m.length, from: "bot", text: response, time: nowTime() },
      ]);
    }, 1200);
  };

  const resetChat = () => {
    setMessages([{ ...initialMessage, time: nowTime() }]);
    setInputValue("");
    setIsTyping(false);
    setShowQuickReplies(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
          style={{ height: "460px" }}>
          {/* Header */}
          <div className="bg-linear-to-r from-slate-700 to-slate-900 px-4 py-3.5 flex items-center justify-between shrink-0">
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                Dott.ssa Elena Marchetti
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Reset chat"
              >
                <RotateCcw size={13} color="white" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[10px] font-semibold text-slate-200 border border-white/30 bg-white/10 rounded px-1.5 py-0.5 leading-none hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Chiudi chat"
              >
                Esc
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-100/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    msg.from === "user"
                      ? "bg-slate-900 text-white rounded-br-sm"
                      : "bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-200"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.from === "user" ? "text-slate-300" : "text-slate-300"
                    }`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-200">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick replies */}
            {showQuickReplies && !isTyping && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    className="text-xs bg-white border border-slate-300 text-slate-700 font-medium px-3 py-1.5 rounded-full hover:bg-slate-100 hover:border-slate-500 transition-colors cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <button className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer shrink-0">
                <Smile size={18} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(inputValue)}
                placeholder="Scrivi un messaggio…"
                className="flex-1 text-sm text-slate-700 placeholder-slate-300 outline-none bg-transparent"
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  inputValue.trim()
                    ? "bg-slate-900 hover:bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-300"
                }`}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-4 sm:right-6 flex items-center gap-2.5 px-5 py-3.5 rounded-full shadow-lg text-white font-semibold text-sm transition-all z-50 cursor-pointer
          ${open ? "bg-slate-600 hover:bg-slate-700" : "bg-slate-900 hover:bg-slate-800 hover:shadow-xl hover:scale-105"}`}
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
        {!open && (
          <>
            <span>chatta</span>
            <span className="text-[11px] font-semibold text-slate-200 border border-slate-500/70 bg-slate-800 rounded-md px-1.5 py-0.5">
              J
            </span>
          </>
        )}
      </button>
    </>
  );
}
