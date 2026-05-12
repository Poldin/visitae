"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { POST_AUTH_REGISTRATION_PATH, safeNextPath } from "@/lib/auth/route-guard";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";

type Props = {
  redirectAfterLogin?: string | null;
};

export default function DemoLoginForm({ redirectAfterLogin }: Props) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();

  const handlePostAuthRedirect = async (supabase: ReturnType<typeof getSupabaseAuthClient>) => {
    if (!supabase) return;

    const next = safeNextPath(redirectAfterLogin);
    if (next) {
      router.push(next);
      return;
    }

    const { data: clinicId, error: clinicErr } = await supabase.rpc("get_my_clinic_id");
    if (clinicErr) {
      setMessage(clinicErr.message ?? "Errore durante il recupero della clinica.");
      return;
    }

    if (!clinicId) router.push(POST_AUTH_REGISTRATION_PATH);
    else router.push("/magazzino");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setMessage("Configurazione Supabase mancante. Controlla le variabili env.");
      return;
    }

    const emailToUse = String(email ?? "").trim();
    if (!emailToUse) {
      setMessage("Inserisci un'email valida.");
      return;
    }
    if (!password) {
      setMessage("Inserisci la password.");
      return;
    }

    setMessage("");
    setIsSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    setIsSigningIn(false);

    if (error) {
      setMessage(error.message ?? "Errore durante l'accesso.");
      return;
    }

    await handlePostAuthRedirect(supabase);
  };

  return (
    <form className="mx-auto mt-6 w-full max-w-md space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nome@studio.it"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Inserisci la password"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        disabled={isSigningIn}
      >
        {isSigningIn ? "Accesso..." : "Accedi"}
      </button>

      {message ? <p className="text-center text-sm text-green-700 dark:text-green-400">{message}</p> : null}
    </form>
  );
}
