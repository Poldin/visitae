"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { POST_AUTH_REGISTRATION_PATH, safeNextPath } from "@/lib/auth/route-guard";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";

type Props = {
  redirectAfterLogin?: string | null;
};

export default function DemoRegisterForm({ redirectAfterLogin }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otpInput, setOtpInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);

  const [isSendingSignup, setIsSendingSignup] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const passwordErrors = useMemo(() => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("almeno 8 caratteri");
    if (!/[A-Z]/.test(password)) errors.push("almeno una lettera maiuscola");
    if (!/[a-z]/.test(password)) errors.push("almeno una lettera minuscola");
    if (!/[0-9]/.test(password)) errors.push("almeno un numero");
    if (!/[^A-Za-z0-9]/.test(password)) errors.push("almeno un carattere speciale");
    return errors;
  }, [password]);

  const isPasswordValid = passwordErrors.length === 0;
  const canRegister = name.trim().length > 0 && email.trim().length > 0 && isPasswordValid;

  const handlePostAuthRedirect = async (supabase: ReturnType<typeof getSupabaseAuthClient>) => {
    if (!supabase) return;

    const next = safeNextPath(redirectAfterLogin);
    if (next) {
      router.push(next);
      return;
    }

    router.push(POST_AUTH_REGISTRATION_PATH);
  };

  const handleVerifyOtp = async () => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) return;

    const token = otpInput.trim();
    if (!token) {
      setErrorMessage("Inserisci il codice OTP ricevuto via email.");
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage("");

    const emailToUse = submittedEmail || email.trim();

    const otpTypes: EmailOtpType[] = ["signup", "email"];
    let error: { message?: string } | null = null;
    for (const otpType of otpTypes) {
      const response = await supabase.auth.verifyOtp({
        email: emailToUse,
        token,
        type: otpType,
      });
      error = response.error;
      if (!error) break;
    }

    setIsVerifyingOtp(false);

    if (error) {
      setErrorMessage(error.message ?? "Codice OTP non valido o scaduto.");
      return;
    }

    // Aggiorniamo full_name nel caso in cui metadata non sia arrivata come previsto.
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      setErrorMessage(userErr.message ?? "Errore recupero utente.");
      return;
    }
    if (userData.user) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ full_name: name.trim(), role: "admin" })
        .eq("id", userData.user.id);
      if (updErr) {
        setErrorMessage(updErr.message ?? "Errore aggiornamento profilo.");
        return;
      }
    }

    setIsOtpDialogOpen(false);
    setOtpInput("");
    setSuccessMessage("Registrazione completata. In caricamento...");
    await handlePostAuthRedirect(supabase);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!canRegister) {
      setErrorMessage("Compila nome, email e una password valida prima di registrarti.");
      return;
    }

    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setErrorMessage("Configurazione Supabase mancante. Controlla le variabili env.");
      return;
    }

    setIsSendingSignup(true);

    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Il trigger public.handle_new_user() inserisce la profile.
        data: {
          full_name: name.trim(),
          role: "admin",
        },
      },
    });

    setIsSendingSignup(false);

    if (error) {
      setErrorMessage(error.message ?? "Errore durante la registrazione.");
      return;
    }

    // Se la sessione non viene creata subito, mostriamo la UI per inserire l'OTP di conferma.
    if (!data.session) {
      setSubmittedEmail(email.trim());
      setSuccessMessage("Abbiamo inviato un codice OTP via email. Inseriscilo per completare la registrazione.");
      setIsOtpDialogOpen(true);
      return;
    }

    setSuccessMessage("Registrazione completata. In caricamento...");
    await handlePostAuthRedirect(supabase);
  };

  return (
    <>
      <form className="mx-auto w-full max-w-md space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="register-name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nome
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Il tuo nome"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="nome@studio.it"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="Crea una password"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Minimo 8 caratteri, con maiuscola, minuscola, numero e carattere speciale.
          </p>
          {password.length > 0 && !isPasswordValid ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              Password non valida: {passwordErrors.join(", ")}.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          disabled={isSendingSignup}
        >
          {isSendingSignup ? "Registrazione..." : "Registrati"}
        </button>

        {errorMessage ? (
          <p className="text-center text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="text-center text-sm text-green-700 dark:text-green-400">{successMessage}</p>
        ) : null}
      </form>

      {isOtpDialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <h3 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Verifica OTP
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              Inserisci il codice OTP ricevuto via email per completare la registrazione.
            </p>

            <div className="mt-4 space-y-2">
              <label
                htmlFor="register-otp"
                className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
              >
                Codice OTP
              </label>
              <input
                id="register-otp"
                name="otp"
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Inserisci codice OTP"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-0 transition-colors placeholder:text-zinc-500 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              />
            </div>

            {errorMessage ? (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void handleVerifyOtp()}
                disabled={isVerifyingOtp || !otpInput.trim()}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isVerifyingOtp ? "Verifica..." : "Verifica OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOtpDialogOpen(false);
                  setOtpInput("");
                  setErrorMessage("");
                }}
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
