"use client";

import { useEffect, useMemo, useState } from "react";

const WORDS = [
  "la tua clinica",
  "il tuo studio",
  "il tuo centro dentale",
  "il tuo poliambulatorio",
];
const ROTATION_MS = 5000;
const CHAR_MS = 70;

export default function AiTypedSegment() {
  const [wordIndex, setWordIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(0);
  const word = useMemo(() => WORDS[wordIndex], [wordIndex]);

  useEffect(() => {
    const charTimer = window.setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= word.length) {
          window.clearInterval(charTimer);
          return prev;
        }
        return prev + 1;
      });
    }, CHAR_MS);

    const rotateTimer = window.setTimeout(() => {
      setWordIndex((prev) => {
        setTypedLength(0);
        return (prev + 1) % WORDS.length;
      });
    }, ROTATION_MS);

    return () => {
      window.clearInterval(charTimer);
      window.clearTimeout(rotateTimer);
    };
  }, [word]);

  return (
    <span className="inline-flex items-center">
      <span className="min-w-[13ch]">{word.slice(0, typedLength)}</span>
      <span
        aria-hidden="true"
        className="ml-1 h-[1.1em] w-[2px] animate-pulse bg-zinc-900 dark:bg-zinc-100"
      />
    </span>
  );
}
