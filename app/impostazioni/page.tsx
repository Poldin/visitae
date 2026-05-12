"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, Copy, User, Users, X } from "lucide-react";
import { MenuWorkspaceShell } from "../components/MenuWorkspaceShell";
import { ClinicSwitcher } from "../components/ClinicSwitcher";
import { getSupabaseAuthClient } from "@/lib/supabaseAuthClient";
import { UsersRolesTab } from "./components/UsersRolesTab";
import { ClinicsTab } from "./components/ClinicsTab";
import { ProfileTab } from "./components/ProfileTab";
import { NewClinicAdminDialog } from "./components/NewClinicAdminDialog";
import { NewClinicDialog } from "./components/NewClinicDialog";
import { FirstClinicDialog } from "./components/FirstClinicDialog";
import { MagazzinoFeaturesOnboardingDialog } from "./components/MagazzinoFeaturesOnboardingDialog";

type SectionId = "profilo" | "utenti-ruoli" | "cliniche";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

type ClinicMembershipProfileRow = {
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

type ClinicMembershipRow = {
  user_id: string;
  role: string | null;
  created_at: string | null;
  profiles: ClinicMembershipProfileRow | ClinicMembershipProfileRow[] | null;
};

type ClinicRow = {
  id: string;
  name: string;
  location_address: unknown | null;
};

type MyClinicRpcRow = {
  clinic_id: string;
  clinic_name: string;
  location_address: unknown | null;
  role: string | null;
  joined_at: string;
  is_current: boolean;
};

type NewAdminDraft = {
  fullName: string;
  email: string;
};

function isSectionId(value: string | null): value is SectionId {
  return value === "profilo" || value === "utenti-ruoli" || value === "cliniche";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(d);
}

function getAddressText(input: unknown): string {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    const source = input as Record<string, unknown>;
    if (typeof source.text === "string") return source.text;
    if (typeof source.address === "string") return source.address;
    if (typeof source.via === "string") return source.via;
    if (typeof source.full_text === "string") return source.full_text;
  }
  return "";
}

const rowBtn =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50";

export default function ImpostazioniPage() {
  const [section, setSection] = useState<SectionId>("profilo");
  const [tabSyncReady, setTabSyncReady] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingClinicId, setSavingClinicId] = useState<string | null>(null);
  const [deletingClinicId, setDeletingClinicId] = useState<string | null>(null);
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savedProfileName, setSavedProfileName] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showNameSavedCheck, setShowNameSavedCheck] = useState(false);
  const nameSavedCheckHideRef = useRef<number | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [profileDeletePhraseCopied, setProfileDeletePhraseCopied] = useState(false);

  const [clinicId, setClinicId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [myClinics, setMyClinics] = useState<ClinicRow[]>([]);

  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicAddress, setNewClinicAddress] = useState("");
  const [firstClinicFormError, setFirstClinicFormError] = useState<string | null>(null);
  const [magazzinoFeaturesOnboardingOpen, setMagazzinoFeaturesOnboardingOpen] = useState(false);

  const [newAdminDialogOpen, setNewAdminDialogOpen] = useState(false);
  const [newClinicDialogOpen, setNewClinicDialogOpen] = useState(false);
  const [newAdminDraft, setNewAdminDraft] = useState<NewAdminDraft>({ fullName: "", email: "" });

  const refreshClinicMembersProfiles = useCallback(async (targetClinicId: string | null): Promise<boolean> => {
    if (!targetClinicId) {
      setProfiles([]);
      return true;
    }

    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setError("Configurazione Supabase mancante.");
      return false;
    }

    const { data: membershipRows, error: membersErr } = await supabase
      .from("clinic_memberships")
      .select(
        `
          user_id,
          role,
          created_at,
          profiles (
            full_name,
            role,
            created_at
          )
        `,
      )
      .eq("clinic_id", targetClinicId)
      .order("created_at", { ascending: true });

    if (membersErr) {
      setError(membersErr.message);
      return false;
    }

    const profilesData = ((membershipRows ?? []) as ClinicMembershipRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.user_id,
        full_name: profile?.full_name ?? null,
        role: row.role ?? profile?.role ?? null,
        created_at: profile?.created_at ?? row.created_at ?? null,
      };
    });

    setProfiles(profilesData);
    return true;
  }, []);

  const loadData = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    setIsRefreshing(true);
    if (!supabase) {
      setError("Configurazione Supabase mancante.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    setError(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      setError(userErr?.message ?? "Utente non autenticato.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }
    setProfileUserId(userData.user.id);
    setProfileEmail(userData.user.email ?? "");

    const { data: myProfile, error: myProfileErr } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (myProfileErr) {
      setError(myProfileErr.message);
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    const initialFullName = myProfile?.full_name ?? "";
    setProfileName(initialFullName);
    setSavedProfileName(initialFullName);

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session?.access_token) {
      setError(sessionErr?.message ?? "Sessione non valida.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    const clinicsRes = await fetch("/api/clinics", {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    let membershipsPayload: unknown;
    try {
      membershipsPayload = await clinicsRes.json();
    } catch {
      membershipsPayload = {};
    }
    if (!clinicsRes.ok) {
      const msg =
        membershipsPayload && typeof membershipsPayload === "object" && "error" in membershipsPayload
          ? String((membershipsPayload as { error?: unknown }).error ?? "")
          : "";
      setError(msg || "Errore caricamento cliniche.");
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    const membershipsData =
      membershipsPayload &&
      typeof membershipsPayload === "object" &&
      "clinics" in membershipsPayload &&
      Array.isArray((membershipsPayload as { clinics: unknown }).clinics)
        ? (membershipsPayload as { clinics: MyClinicRpcRow[] }).clinics
        : [];

    const typedClinics: ClinicRow[] = (membershipsData ?? []).map((row) => ({
      id: row.clinic_id,
      name: row.clinic_name,
      location_address: row.location_address,
    }));

    const selectedClinicId =
      typedClinics.find((clinic) => clinic.id === clinicId)?.id ??
      membershipsData.find((row) => row.is_current)?.clinic_id ??
      typedClinics[0]?.id ??
      null;

    setClinicId(selectedClinicId);
    const membersRefreshOk = await refreshClinicMembersProfiles(selectedClinicId);
    if (!membersRefreshOk) {
      setHasLoadedOnce(true);
      setIsRefreshing(false);
      return;
    }

    setMyClinics(typedClinics);
    setHasLoadedOnce(true);
    setIsRefreshing(false);
  }, [clinicId, refreshClinicMembersProfiles]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadData]);

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
    if (isSectionId(tabFromUrl) && tabFromUrl !== section) {
      window.setTimeout(() => setSection(tabFromUrl), 0);
    }
    window.setTimeout(() => setTabSyncReady(true), 0);
  }, []);

  useEffect(() => {
    if (!tabSyncReady || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === section) return;
    params.set("tab", section);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [section, tabSyncReady]);

  useEffect(() => {
    if (section !== "utenti-ruoli" || !hasLoadedOnce) return;
    void refreshClinicMembersProfiles(clinicId);
  }, [section, hasLoadedOnce, clinicId, refreshClinicMembersProfiles]);

  const clinicsCards = useMemo(
    () =>
      myClinics.map((clinic) => ({
        id: clinic.id,
        name: clinic.name,
        addressText: getAddressText(clinic.location_address),
      })),
    [myClinics],
  );

  const performCreateClinic = useCallback(
    async (fromFirstOnboarding: boolean) => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        const msg = "Configurazione Supabase mancante.";
        setError(msg);
        if (fromFirstOnboarding) setFirstClinicFormError(msg);
        return;
      }

      const name = newClinicName.trim();
      if (!name) {
        const msg = "Inserisci il nome della nuova clinica.";
        setError(msg);
        if (fromFirstOnboarding) setFirstClinicFormError(msg);
        return;
      }

      setCreatingClinic(true);
      setError(null);
      if (fromFirstOnboarding) setFirstClinicFormError(null);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session?.access_token) {
        const msg = sessionErr?.message ?? "Sessione non valida.";
        setError(msg);
        if (fromFirstOnboarding) setFirstClinicFormError(msg);
        setCreatingClinic(false);
        return;
      }

      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          address: newClinicAddress.trim(),
        }),
      });

      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }

      if (!res.ok) {
        const msg =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "")
            : "";
        const fallback = "Errore durante la creazione della clinica.";
        setError(msg || fallback);
        if (fromFirstOnboarding) setFirstClinicFormError(msg || fallback);
        setCreatingClinic(false);
        return;
      }

      setNewClinicName("");
      setNewClinicAddress("");
      if (!fromFirstOnboarding) {
        setNewClinicDialogOpen(false);
      }
      await loadData();
      setCreatingClinic(false);

      if (fromFirstOnboarding) {
        setSection("cliniche");
        setMagazzinoFeaturesOnboardingOpen(true);
      }
    },
    [loadData, newClinicAddress, newClinicName],
  );

  const handleSaveClinic = useCallback(
    async ({ clinicId: targetClinicId, name, address }: { clinicId: string; name: string; address: string }) => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setError("Configurazione Supabase mancante.");
        throw new Error("Supabase client mancante");
      }

      const nextName = name.trim();
      if (!nextName) {
        setError("Inserisci un nome clinica valido.");
        throw new Error("Nome clinica mancante");
      }

      setSavingClinicId(targetClinicId);
      setError(null);

      const { error: updateErr } = await supabase.rpc("update_my_clinic", {
        target_clinic_id: targetClinicId,
        clinic_name: nextName,
        clinic_address_text: address.trim(),
      });

      if (updateErr) {
        setError(updateErr.message);
        setSavingClinicId(null);
        throw updateErr;
      }

      await loadData();
      setSavingClinicId(null);
    },
    [loadData],
  );

  const handleClinicSwitch = useCallback(
    async (nextClinicId: string) => {
      if (nextClinicId === clinicId) return;
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setError("Configurazione Supabase mancante.");
        return;
      }
      setError(null);
      const { error: rpcErr } = await supabase.rpc("set_my_active_clinic", {
        target_clinic_id: nextClinicId,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      setClinicId(nextClinicId);
    },
    [clinicId],
  );

  const handleDeleteClinic = useCallback(
    async (targetClinicId: string) => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setError("Configurazione Supabase mancante.");
        throw new Error("Supabase client mancante");
      }

      setDeletingClinicId(targetClinicId);
      setError(null);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session?.access_token) {
        setError(sessionErr?.message ?? "Sessione non valida.");
        setDeletingClinicId(null);
        throw new Error(sessionErr?.message ?? "Sessione non valida");
      }

      const res = await fetch(`/api/clinics/${encodeURIComponent(targetClinicId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      let payload: unknown;
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }

      if (!res.ok) {
        const msg =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "")
            : "";
        setError(msg || "Errore durante l'eliminazione della clinica.");
        setDeletingClinicId(null);
        throw new Error(msg);
      }

      await loadData();
      setDeletingClinicId(null);
    },
    [loadData],
  );

  useEffect(() => {
    return () => {
      if (nameSavedCheckHideRef.current) window.clearTimeout(nameSavedCheckHideRef.current);
    };
  }, []);

  useEffect(() => {
    if (profileName !== savedProfileName) {
      setShowNameSavedCheck(false);
      if (nameSavedCheckHideRef.current) {
        window.clearTimeout(nameSavedCheckHideRef.current);
        nameSavedCheckHideRef.current = null;
      }
    }
  }, [profileName, savedProfileName]);

  useEffect(() => {
    if (!profileUserId) return;
    if (profileName === savedProfileName) return;

    const timeoutId = window.setTimeout(async () => {
      const supabase = getSupabaseAuthClient();
      if (!supabase) {
        setError("Configurazione Supabase mancante.");
        return;
      }

      setSavingProfile(true);
      setError(null);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ full_name: profileName.trim() || null })
        .eq("id", profileUserId);

      if (updateErr) {
        setError(updateErr.message);
        setSavingProfile(false);
        return;
      }

      setSavedProfileName(profileName);
      setSavingProfile(false);
      if (nameSavedCheckHideRef.current) {
        window.clearTimeout(nameSavedCheckHideRef.current);
      }
      setShowNameSavedCheck(true);
      nameSavedCheckHideRef.current = window.setTimeout(() => {
        setShowNameSavedCheck(false);
        nameSavedCheckHideRef.current = null;
      }, 3000);
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [profileName, profileUserId, savedProfileName]);

  const handleLogout = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setError("Configurazione Supabase mancante.");
      return;
    }
    setError(null);
    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      setError(signOutErr.message);
      return;
    }
    setLogoutDialogOpen(false);
    window.location.href = "/";
  }, []);

  const handleDeleteProfile = useCallback(async () => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      setError("Configurazione Supabase mancante.");
      return;
    }
    if (!profileUserId) {
      setError("Utente non autenticato.");
      return;
    }
    if (deleteConfirmText.trim() !== "Elimina il mio profilo") {
      setError('Inserisci esattamente la frase "Elimina il mio profilo".');
      return;
    }

    setDeletingProfile(true);
    setError(null);

    const { error: deleteErr } = await supabase.from("profiles").delete().eq("id", profileUserId);
    if (deleteErr) {
      setError(deleteErr.message);
      setDeletingProfile(false);
      return;
    }

    const { error: signOutErr } = await supabase.auth.signOut();
    if (signOutErr) {
      setError(signOutErr.message);
      setDeletingProfile(false);
      return;
    }

    setDeletingProfile(false);
    setDeleteDialogOpen(false);
    window.location.href = "/";
  }, [deleteConfirmText, profileUserId]);

  return (
    <>
      <MenuWorkspaceShell
        headerLeft={
          <ClinicSwitcher
            clinics={myClinics.map((clinic) => ({ id: clinic.id, name: clinic.name }))}
            value={clinicId}
            onChange={(id) => void handleClinicSwitch(id)}
            disabled={isRefreshing}
          />
        }
        headerCenter={
          <div role="tablist" className="-mx-0.5 flex min-w-0 items-center gap-1.5 overflow-x-auto px-0.5 py-0.5">
            {[
              { id: "profilo", label: "Profilo", Icon: User },
              { id: "utenti-ruoli", label: "Utenti e ruoli", Icon: Users },
              { id: "cliniche", label: "Le tue cliniche", Icon: Building2 },
            ].map(({ id, label, Icon }) => {
              const selected = section === (id as SectionId);
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSection(id as SectionId)}
                  className={`${rowBtn} h-8 gap-1.5 whitespace-nowrap px-2.5 text-xs ${
                    selected
                      ? "border-slate-900! bg-slate-900! text-white! shadow-sm ring-1 ring-slate-900/10 hover:border-slate-900! hover:bg-slate-900! hover:text-white!"
                      : ""
                  }`}
                >
                  <Icon size={15} aria-hidden />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        }
      >
        {!hasLoadedOnce && isRefreshing ? (
          <div className="p-4 text-sm text-slate-600">Caricamento dati...</div>
        ) : section === "profilo" ? (
          <>
            {error ? <div className="p-4 pb-0 text-sm text-red-600">{error}</div> : null}
            <ProfileTab
              fullName={profileName}
              email={profileEmail}
              saving={savingProfile}
              showNameSavedCheck={showNameSavedCheck}
              onFullNameChange={setProfileName}
              onOpenLogoutDialog={() => setLogoutDialogOpen(true)}
              onOpenDeleteProfileDialog={() => setDeleteDialogOpen(true)}
            />
          </>
        ) : section === "utenti-ruoli" ? (
          <>
            {error ? <div className="p-4 pb-0 text-sm text-red-600">{error}</div> : null}
            <UsersRolesTab
              profiles={profiles}
              clinicName={myClinics.find((clinic) => clinic.id === clinicId)?.name ?? ""}
              fmtDate={fmtDate}
              onOpenNewAdminDialog={() => setNewAdminDialogOpen(true)}
            />
          </>
        ) : (
          <>
            {error ? <div className="p-4 pb-0 text-sm text-red-600">{error}</div> : null}
            <ClinicsTab
              clinics={clinicsCards}
              onOpenAddClinicDialog={() => setNewClinicDialogOpen(true)}
              onSaveClinic={handleSaveClinic}
              onDeleteClinic={handleDeleteClinic}
              savingClinicId={savingClinicId}
              deletingClinicId={deletingClinicId}
            />
          </>
        )}
      </MenuWorkspaceShell>

      <NewClinicAdminDialog
        open={newAdminDialogOpen}
        draft={newAdminDraft}
        onDraftChange={setNewAdminDraft}
        onClose={() => setNewAdminDialogOpen(false)}
      />
      <NewClinicDialog
        open={newClinicDialogOpen && myClinics.length > 0}
        clinicName={newClinicName}
        clinicAddress={newClinicAddress}
        creating={creatingClinic}
        onClinicNameChange={setNewClinicName}
        onClinicAddressChange={setNewClinicAddress}
        onClose={() => setNewClinicDialogOpen(false)}
        onSubmit={() => void performCreateClinic(false)}
      />

      <FirstClinicDialog
        open={hasLoadedOnce && !!profileUserId && myClinics.length === 0}
        clinicName={newClinicName}
        clinicAddress={newClinicAddress}
        creating={creatingClinic}
        errorMessage={firstClinicFormError}
        onClinicNameChange={setNewClinicName}
        onClinicAddressChange={setNewClinicAddress}
        onSubmit={() => void performCreateClinic(true)}
      />

      <MagazzinoFeaturesOnboardingDialog
        open={magazzinoFeaturesOnboardingOpen}
        onClose={() => setMagazzinoFeaturesOnboardingOpen(false)}
      />

      {logoutDialogOpen ? (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setLogoutDialogOpen(false)}>
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Conferma logout</h3>
              <button
                type="button"
                onClick={() => setLogoutDialogOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-slate-700">Vuoi davvero uscire dal tuo account?</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogoutDialogOpen(false)}
                className="inline-flex w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex w-fit items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Conferma logout
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setDeleteDialogOpen(false)}>
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Elimina profilo</h3>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-slate-700">
              Azione irreversibile. Per confermare, scrivi <span className="font-semibold">Elimina il mio profilo</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText("Elimina il mio profilo");
                  setProfileDeletePhraseCopied(true);
                  window.setTimeout(() => setProfileDeletePhraseCopied(false), 2000);
                }}
                className="ml-1 inline-flex h-5 w-5 translate-y-px items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                title="Copia frase"
                aria-label="Copia frase di conferma"
              >
                {profileDeletePhraseCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              .
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Frase di conferma</span>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Elimina il mio profilo"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
              />
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="inline-flex w-fit items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteProfile()}
                disabled={deletingProfile}
                className="inline-flex w-fit items-center justify-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingProfile ? "Eliminazione..." : "Conferma eliminazione"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
