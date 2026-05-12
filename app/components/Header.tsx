"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import SearchOverlay from "./SearchOverlay";

const LOGO_TEXT = "Visitae";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTypingContext) return;
      if (event.key.toLowerCase() === "k") setSearchOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-transparent bg-transparent">
        <div className="flex h-12 w-full items-center gap-3 px-3 sm:gap-4 sm:px-4">
          <Link
            href="/"
            className="shrink-0 text-lg font-bold tracking-tight text-slate-800 transition-colors hover:text-slate-950"
          >
            {LOGO_TEXT}
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="w-full max-w-md">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between gap-2.5 bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1 hover:border-slate-500 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Search size={14} className="text-slate-500 shrink-0" />
                <span className="text-slate-400 text-sm truncate">
                  Cerca medici, specialisti, cliniche...
                </span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500 border border-slate-300 bg-white rounded-md px-1.5 py-0.5">
                K
              </span>
            </button>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="md:hidden w-8 h-8 rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Apri ricerca"
            >
              <Search size={14} />
            </button>
            <button className="text-slate-700 font-medium text-sm hover:text-slate-900 transition-colors hidden sm:block">
              Accedi
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
