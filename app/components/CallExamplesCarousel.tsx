"use client";

import { useEffect, useState } from "react";

type Message = { role: "patient" | "ai"; text: string };
type Example = { title: string; messages: Message[] };

const EXAMPLES: Example[] = [
  {
    title: "Nuovo paziente: prenotazione igiene e costi",
    messages: [
      {
        role: "patient",
        text: "Buongiorno, sono un nuovo paziente. Vorrei prenotare un'igiene e sapere i costi.",
      },
      {
        role: "ai",
        text: "Certo. L'igiene parte da 90 euro. Posso proporti lunedi alle 10:30 o martedi alle 18:00.",
      },
      {
        role: "patient",
        text: "Perfetto, martedi alle 18:00 va bene.",
      },
    ],
  },
  {
    title: "Paziente attuale: spostamento con codice appuntamento",
    messages: [
      {
        role: "patient",
        text: "Ciao, devo spostare la mia visita di controllo.",
      },
      {
        role: "ai",
        text: "Nessun problema. Mi indica il codice appuntamento per modificarlo in modo rapido?",
      },
      {
        role: "patient",
        text: "Si, il codice e APT-4821.",
      },
    ],
  },
  {
    title: "Richiesta interno: trasferimento chiamata",
    messages: [
      {
        role: "patient",
        text: "Buongiorno, posso parlare con l'interno amministrazione?",
      },
      {
        role: "ai",
        text: "Certo, la metto subito in comunicazione con l'interno amministrazione.",
      },
    ],
  },
  {
    title: "Spostamento senza codice appuntamento",
    messages: [
      {
        role: "patient",
        text: "Vorrei spostare l'appuntamento ma non trovo il codice.",
      },
      {
        role: "ai",
        text: "Va bene, nessun problema. Per procedere in sicurezza mi servono data e ora dell'appuntamento, codice fiscale, nome e cognome.",
      },
      {
        role: "patient",
        text: "Certo: appuntamento il 14 maggio alle 17:30, codice fiscale BNCMRC88E12F205X, Marco Bianchi.",
      },
    ],
  },
  {
    title: "Urgenza dentale fuori orario",
    messages: [
      {
        role: "patient",
        text: "Ho un forte dolore al dente e lo studio e chiuso. Cosa posso fare?",
      },
      {
        role: "ai",
        text: "Raccolgo subito i dati e inoltro la richiesta urgente al medico reperibile. Le arriva un SMS di conferma.",
      },
    ],
  },
];

const ROTATE_MS = 12000;
const TRANSITION_MS = 350;

export default function CallExamplesCarousel() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isSlidingOut, setIsSlidingOut] = useState(false);

  const goToIndex = (nextIndex: number) => {
    if (nextIndex === index) return;
    setIsSlidingOut(nextIndex > index);
    setIsVisible(false);
    window.setTimeout(() => {
      setIndex(nextIndex);
      setIsSlidingOut(false);
      setIsVisible(true);
    }, TRANSITION_MS);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextIndex = (index + 1) % EXAMPLES.length;
      goToIndex(nextIndex);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [index]);

  const active = EXAMPLES[index];

  return (
    <div className="mt-5 flex h-[410px] flex-col space-y-4">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        Chiama il +39 02 1234 5678 e metti l&apos;AI alla prova
      </p>
      <p
        className={`text-xs font-medium text-zinc-500 transition-all duration-350 dark:text-zinc-400 ${
          isVisible
            ? "translate-x-0 opacity-100"
            : isSlidingOut
              ? "-translate-x-2 opacity-0"
              : "translate-x-2 opacity-0"
        }`}
      >
        {active.title}
      </p>
      <div
        className={`flex-1 space-y-4 overflow-y-auto pr-1 transition-all duration-350 ${
          isVisible
            ? "translate-x-0 opacity-100"
            : isSlidingOut
              ? "-translate-x-3 opacity-0"
              : "translate-x-3 opacity-0"
        }`}
      >
        {active.messages.map((message, i) => (
          <div
            key={`${index}-${i}`}
            className={
              message.role === "ai"
                ? "ml-auto w-[90%] rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-2xl bg-white p-4 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        {EXAMPLES.map((_, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            aria-label={`Vai all'esempio ${dotIndex + 1}`}
            onClick={() => goToIndex(dotIndex)}
            className={
              dotIndex === index
                ? "h-2.5 w-6 rounded-full bg-zinc-900 dark:bg-zinc-100"
                : "h-2.5 w-2.5 rounded-full bg-zinc-300 transition-colors hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-500"
            }
          />
        ))}
      </div>
    </div>
  );
}
