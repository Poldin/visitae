"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import DemoLoginForm from "../components/DemoLoginForm";
import DemoRegisterForm from "../components/DemoRegisterForm";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirectAfterLogin = searchParams.get("next");
  const [activeView, setActiveView] = useState<"login" | "register">("login");

  return (
    <main className="min-h-screen overflow-y-auto bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="relative mx-auto w-full max-w-3xl px-6 py-10 md:px-10 md:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-2 w-px bg-zinc-200 dark:bg-zinc-800 md:left-6"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2 w-px bg-zinc-200 dark:bg-zinc-800 md:right-6"
        />

        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xl tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl"
          >
            Visitae
          </Link>
        </header>

        <div
          aria-hidden="true"
          className="relative left-1/2 mb-8 h-px w-screen -translate-x-1/2 bg-[repeating-linear-gradient(to_right,#e4e4e7_0,#e4e4e7_18px,transparent_18px,transparent_30px)] dark:bg-[repeating-linear-gradient(to_right,#27272a_0,#27272a_18px,transparent_18px,transparent_30px)]"
        />

        <section className="pb-2">
          {activeView === "login" ? (
            <>
              <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Accedi
              </h1>
              <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-300">
                Accedi con email e password.
              </p>
              <DemoLoginForm redirectAfterLogin={redirectAfterLogin} />
              <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
                Devi registrarti?{" "}
                <button
                  type="button"
                  onClick={() => setActiveView("register")}
                  className="font-medium text-zinc-900 underline underline-offset-4 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                >
                  Registrati
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Registrazione
              </h2>
              <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-300">
                Registrati per accedere a Visitae.
              </p>
              <div className="mt-6">
                <DemoRegisterForm redirectAfterLogin={redirectAfterLogin} />
              </div>
              <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
                Devi accedere?{" "}
                <button
                  type="button"
                  onClick={() => setActiveView("login")}
                  className="font-medium text-zinc-900 underline underline-offset-4 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                >
                  Accedi
                </button>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <p className="p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">Caricamento…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
