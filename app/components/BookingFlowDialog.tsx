"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck, CheckCircle2, Clock, Mail, MapPin, ShieldCheck, Video } from "lucide-react";

type VisitType = "studio" | "video";

type BookingFlowDialogProps = {
  open: boolean;
  dateLabel: string;
  slot: string;
  visitType: VisitType;
  priceLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

type Step = 1 | 2 | 3;

export default function BookingFlowDialog({
  open,
  dateLabel,
  slot,
  visitType,
  priceLabel,
  onClose,
  onConfirm,
}: BookingFlowDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [error, setError] = useState("");
  const [mounted] = useState(true);

  const canGoToReview = firstName.trim() && lastName.trim() && email.trim() && phone.trim() && emailVerified;
  const stepLabels: Record<Step, string> = {
    1: "Riepilogo",
    2: "Dati",
    3: "Informazioni",
  };

  const otpHint = useMemo(() => {
    if (!generatedOtp) return "";
    return `Codice inviato. (demo: ${generatedOtp})`;
  }, [generatedOtp]);

  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setStep(1);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setOtp("");
        setGeneratedOtp("");
        setOtpSent(false);
        setEmailVerified(false);
        setError("");
      }, 0);
      return () => window.clearTimeout(t);
    }

    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const sendOtp = () => {
    if (!email.trim()) {
      setError("Inserisci una mail valida prima di inviare il codice.");
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpSent(true);
    setEmailVerified(false);
    setOtp("");
    setError("");
  };

  const verifyOtp = () => {
    if (!otpSent) return;
    if (otp.trim() === generatedOtp) {
      setEmailVerified(true);
      setError("");
      return;
    }
    setEmailVerified(false);
    setError("OTP non valido. Riprova.");
  };

  const proceedToStepThree = () => {
    if (!canGoToReview) {
      setError("Completa i dati e verifica la mail prima di continuare.");
      return;
    }
    setError("");
    setStep(3);
  };

  return createPortal(
    <div className="fixed inset-0 z-100 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prenotazione visita"
        className="h-full w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-full overflow-y-auto bg-white">
          <button
            type="button"
            onClick={onClose}
            className="fixed right-4 top-4 z-10 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Esc
          </button>
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((idx) => {
                const active = step === idx;
                const completed = step > idx;
                return (
                  <div
                    key={idx}
                    aria-label={`Passaggio ${idx}`}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      active
                        ? "bg-slate-900"
                        : completed
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                    }`}
                  />
                );
              })}
              <span className="ml-1 text-sm font-bold text-slate-700">{stepLabels[step]}</span>
            </div>

            {step === 1 && (
              <div className="mt-6 space-y-4 motion-safe:animate-[stepFadeIn_220ms_ease-out]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <CalendarCheck size={14} className="text-slate-600" />
                      <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-600" />
                      <span>{slot}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {visitType === "studio" ? (
                        <MapPin size={14} className="text-slate-600" />
                      ) : (
                        <Video size={14} className="text-slate-600" />
                      )}
                      <span>{visitType === "studio" ? "In studio" : "Videovisita"}</span>
                    </div>
                    <div className="pt-1 text-base font-bold text-slate-900">{priceLabel}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-fit text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-fit rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Prosegui
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-4 motion-safe:animate-[stepFadeIn_220ms_ease-out]">
                <h3 className="text-sm font-bold text-slate-700">Raccolta dati</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Nome"
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                  />
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Cognome"
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email (obbligatoria)"
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={sendOtp}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Invia OTP
                    </button>
                  </div>

                  {otpSent && (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        placeholder="Inserisci OTP"
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                      />
                      <button
                        type="button"
                        onClick={verifyOtp}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                      >
                        Verifica
                      </button>
                    </div>
                  )}

                  {otpHint && <p className="mt-2 text-[11px] text-slate-500">{otpHint}</p>}
                  {emailVerified && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={12} />
                      Email verificata
                    </p>
                  )}
                </div>

                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Numero di telefono"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
                />

                {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-fit text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={proceedToStepThree}
                    className="w-fit rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Continua
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-6 space-y-4 motion-safe:animate-[stepFadeIn_220ms_ease-out]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <h3 className="text-sm font-bold text-slate-700">Messaggio dello studio</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Riceverai una conferma immediata via email e un promemoria automatico 24 ore prima della visita.
                    In caso di necessità, puoi modificare o annullare l&apos;appuntamento fino a 12 ore prima.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-fit text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="w-fit rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={15} />
                    Accetta e conferma prenotazione
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
