"use client";

import { ShoppingBag } from "lucide-react";
import { MenuWorkspaceShell } from "../components/MenuWorkspaceShell";

export default function ShopPage() {
  return (
    <MenuWorkspaceShell
      headerCenter={
        <span className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight sm:text-lg">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white shadow-sm ring-1 ring-fuchsia-300/60"
            style={{
              backgroundImage:
                "linear-gradient(110deg,#f59e0b 0%,#f43f5e 20%,#8b5cf6 40%,#06b6d4 60%,#22c55e 80%,#f59e0b 100%)",
              backgroundSize: "200% 100%",
              backgroundPosition: "0% 50%",
              animation: "shopGradientShift 22s linear infinite",
            }}
          >
            <ShoppingBag size={14} aria-hidden />
          </span>
          <span
            className="inline-block bg-clip-text text-lg leading-none font-extrabold tracking-[0.08em] text-transparent sm:text-xl"
            style={{
              backgroundImage:
                "linear-gradient(110deg,#f59e0b 0%,#f43f5e 20%,#8b5cf6 40%,#06b6d4 60%,#22c55e 80%,#f59e0b 100%)",
              backgroundSize: "200% 100%",
              backgroundPosition: "0% 50%",
              animation: "shopGradientShift 22s linear infinite",
            }}
          >
            SHOP
          </span>
        </span>
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.12),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(6,182,212,0.08),transparent),radial-gradient(ellipse_50%_35%_at_0%_80%,rgba(244,114,182,0.06),transparent)]"
        />
        <div className="relative grid min-h-0 flex-1 place-items-center px-6 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Stiamo sviluppando per voi.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-[17px] leading-8 text-slate-600 sm:text-[19px]">
              Stiamo sviluppando lo shop di Visitae per permettervi di acquistare prodotti rapidamente e al miglior
              prezzo.
            </p>
            <div className="mx-auto mt-4 h-1 w-28 rounded-full bg-linear-to-r from-amber-400 via-fuchsia-500 to-cyan-500" />
          </div>
        </div>
      </div>
    </MenuWorkspaceShell>
  );
}
