"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Code2,
  Menu,
  ShoppingBag,
  Settings,
  Phone,
  Warehouse,
  X,
} from "lucide-react";
import { DocFeedbackChatNavItem } from "./DocFeedbackChat";
import { docRailLinkMotionStyle } from "./docRailLinkMotionStyle";

const railBtnBase =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-600 hover:border-slate-600 hover:!bg-slate-800 hover:!text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";

/** Stessa curva / durata usata per il pannello laterale agenda (collasso). */
export const DOC_PANEL_MS = 320;
export const DOC_PANEL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const railEase = DOC_PANEL_EASE;
const RAIL_MS = DOC_PANEL_MS;
const LINK_MS = 280;

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function DocIconNavMenuButton({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-slate-600 transition-[color,background-color,box-shadow,transform] duration-200 ease-out hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 motion-reduce:active:scale-100"
      aria-expanded={open}
      aria-controls="doc-workspace-icon-rail"
      onClick={() => onOpenChange(!open)}
      aria-label={open ? "Chiudi menu navigazione" : "Apri menu navigazione"}
    >
      <span className="relative grid h-[18px] w-[18px] place-items-center" aria-hidden>
        <Menu
          size={18}
          strokeWidth={2}
          className={`col-start-1 row-start-1 ${
            reduced
              ? open
                ? "pointer-events-none opacity-0"
                : "opacity-100"
              : `transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open
                    ? "pointer-events-none scale-75 rotate-45 opacity-0 duration-200"
                    : "scale-100 rotate-0 opacity-100 duration-260"
                }`
          }`}
        />
        <X
          size={18}
          strokeWidth={2}
          className={`col-start-1 row-start-1 ${
            reduced
              ? open
                ? "opacity-100"
                : "pointer-events-none opacity-0"
              : `transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open
                    ? "scale-100 rotate-0 opacity-100 duration-260"
                    : "pointer-events-none scale-75 -rotate-45 opacity-0 duration-200"
                }`
          }`}
        />
      </span>
    </button>
  );
}

export function DocIconNavRail({
  open,
  docId,
  onNavigate,
}: {
  open: boolean;
  docId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const safeDocId = docId || "123";
  const reduced = usePrefersReducedMotion();
  const ms = reduced ? 0 : RAIL_MS;
  const linkMs = reduced ? 0 : LINK_MS;

  const magazzinoActive = pathname === "/magazzino" || /\/doc\/[^/]+\/magazzino(?:\/|$)/.test(pathname);
  const shopActive = pathname === "/shop";
  const notificheActive = pathname.includes("/notifiche");
  const impostazioniActive = pathname.includes("/impostazioni");
  const devActive = /\/doc\/[^/]+\/dev(?:\/|$)/.test(pathname);

  const shellTransition = reduced ? "none" : `width ${ms}ms ${railEase}, border-color ${ms}ms ${railEase}`;
  const navTransition = reduced
    ? "none"
    : `opacity ${ms}ms ${railEase}, transform ${ms}ms ${railEase}`;

  return (
    <div
      className="z-30 min-h-0 shrink-0 self-stretch overflow-hidden bg-white"
      style={{
        width: open ? "2.75rem" : 0,
        borderRightWidth: open ? 1 : 0,
        borderRightColor: open ? "rgb(226 232 240)" : "transparent",
        borderRightStyle: "solid",
        transition: shellTransition,
      }}
    >
      <nav
        id="doc-workspace-icon-rail"
        inert={!open}
        aria-label="Sezioni studio"
        className="hide-scrollbar flex h-full min-h-0 w-11 flex-col items-center gap-1.5 overflow-y-auto overscroll-y-contain py-2"
        style={{
          opacity: open ? 1 : 0,
          transform: reduced ? "none" : open ? "translateX(0)" : "translateX(-0.5rem)",
          transition: navTransition,
        }}
      >
        <Link
          href="/magazzino"
          onClick={() => onNavigate?.()}
          className={`${railBtnBase} ${magazzinoActive ? "border-blue-200 bg-blue-50 text-blue-700" : ""}`}
          style={docRailLinkMotionStyle(45, open, reduced, linkMs, railEase)}
          aria-current={magazzinoActive ? "page" : undefined}
          title="Magazzino"
          aria-label="Magazzino"
        >
          <Warehouse size={18} strokeWidth={2} aria-hidden />
        </Link>
        <Link
          href="/impostazioni"
          onClick={() => onNavigate?.()}
          className={`${railBtnBase} ${impostazioniActive ? "border-blue-200 bg-blue-50 text-blue-700" : ""}`}
          style={docRailLinkMotionStyle(80, open, reduced, linkMs, railEase)}
          aria-current={impostazioniActive ? "page" : undefined}
          title="Impostazioni"
          aria-label="Impostazioni"
        >
          <Settings size={18} strokeWidth={2} aria-hidden />
        </Link>
        <Link
          href="/shop"
          onClick={() => onNavigate?.()}
          className={`shop-button shop-button--icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 ${
            shopActive ? "ring-2 ring-white/90 ring-offset-2 ring-offset-white" : ""
          }`}
          style={docRailLinkMotionStyle(115, open, reduced, linkMs, railEase)}
          aria-current={shopActive ? "page" : undefined}
          title="Shop fornitori"
          aria-label="Shop fornitori"
        >
          <ShoppingBag size={16} strokeWidth={2.1} aria-hidden />
        </Link>
        <div className="mt-1 flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-slate-200 pt-1.5">
          <Link
            href={`/doc/${safeDocId}/notifiche`}
            onClick={() => onNavigate?.()}
            className={`${railBtnBase} ${notificheActive ? "border-blue-200 bg-blue-50 text-blue-700" : ""}`}
            style={docRailLinkMotionStyle(430, open, reduced, linkMs, railEase)}
            aria-current={notificheActive ? "page" : undefined}
            title="Notifiche"
            aria-label="Notifiche"
          >
            <Bell size={18} strokeWidth={2} aria-hidden />
          </Link>
          <Link
            href={`/doc/${safeDocId}/dev`}
            onClick={() => onNavigate?.()}
            className={`${railBtnBase} ${devActive ? "border-blue-200 bg-blue-50 text-blue-700" : ""}`}
            style={docRailLinkMotionStyle(465, open, reduced, linkMs, railEase)}
            aria-current={devActive ? "page" : undefined}
            title="Dev — API e documentazione"
            aria-label="Dev, API e documentazione"
          >
            <Code2 size={18} strokeWidth={2} aria-hidden />
          </Link>
          <DocFeedbackChatNavItem
            railOpen={open}
            reduced={reduced}
            linkMs={linkMs}
            docId={safeDocId}
            railEase={railEase}
          />
          <Link
            href="/impostazioni?tab=profilo"
            onClick={() => onNavigate?.()}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold uppercase leading-none tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
              impostazioniActive
                ? "border-blue-200 bg-blue-100 text-blue-800 hover:border-slate-600! hover:bg-slate-800! hover:text-slate-100!"
                : "border-slate-200 bg-linear-to-br from-slate-100 to-slate-200/90 text-slate-700 hover:border-slate-600! hover:from-slate-800! hover:to-slate-800! hover:text-slate-100!"
            }`}
            style={docRailLinkMotionStyle(500, open, reduced, linkMs, railEase)}
            aria-current={impostazioniActive ? "page" : undefined}
            title="Profilo"
            aria-label="Profilo utente"
          >
            <span aria-hidden>PP</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
