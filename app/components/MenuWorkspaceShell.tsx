"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { DocIconNavMenuButton, DocIconNavRail } from "./DocIconNav";

type MenuWorkspaceShellProps = {
  children: ReactNode;
  headerCenter?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
};

export function MenuWorkspaceShell({ children, headerCenter, headerLeft, headerRight }: MenuWorkspaceShellProps) {
  const [docIconNavOpen, setDocIconNavOpen] = useState(false);

  return (
    <main
      className="flex min-h-0 flex-1 flex-col bg-white px-2 py-2 text-slate-900 sm:px-3 sm:py-3"
      style={{ colorScheme: "light" }}
    >
      <div className="flex min-h-0 w-full max-w-none flex-1 flex-col">
        <div className="relative flex shrink-0 items-center gap-2 border-b border-slate-200 pb-2">
          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <DocIconNavMenuButton open={docIconNavOpen} onOpenChange={setDocIconNavOpen} />
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-800 hover:text-slate-950">
              Visitae
            </Link>
            {headerLeft}
          </div>
          <div className="hidden min-w-0 items-center justify-center md:absolute md:left-1/2 md:flex md:-translate-x-1/2">
            {headerCenter}
          </div>
          <div className="ml-auto hidden min-w-0 items-center md:flex">{headerRight}</div>
        </div>

        <div className="flex min-h-0 flex-1 gap-0">
          <DocIconNavRail open={docIconNavOpen} onNavigate={() => setDocIconNavOpen(false)} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </div>
      <style jsx global>{`
        .shop-button {
          background: linear-gradient(
            110deg,
            #f59e0b 0%,
            #f43f5e 20%,
            #8b5cf6 40%,
            #06b6d4 60%,
            #22c55e 80%,
            #f59e0b 100%
          );
          background-size: 200% 100%;
          background-position: 0% 50%;
          animation: shopGradientShift 22s linear infinite;
          will-change: background-position;
        }

        .shop-button--icon {
          border: 1px solid rgba(217, 70, 239, 0.35);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.16);
        }

        @keyframes shopGradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </main>
  );
}
