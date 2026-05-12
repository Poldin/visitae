import { useEffect, useMemo, useRef, useState } from "react";
import {
  type FacilitySetupData,
  type RoomSetupData,
  type SpecialistSetupData,
  type ToolSetupData,
} from "./types";

type FacilitySlideProps = {
  facilities: FacilitySetupData[];
  onAddFacility: () => void;
  onRemoveFacility: (facilityIndex: number) => void;
  onUpdateFacility: (facilityIndex: number, patch: Partial<FacilitySetupData>) => void;
  onWeeklyScheduleChange: (
    facilityIndex: number,
    dayIndex: number,
    field: "enabled" | "startTime" | "endTime",
    value: string | boolean,
  ) => void;
  fieldClass: string;
};

type AddressPrediction = {
  placeId: string;
  description: string;
};

type AddressAutocompleteInputProps = {
  id: string;
  value: string;
  onChangeAddress: (nextAddress: string) => void;
  onSelectAddress: (address: { streetAddress: string; placeId: string; lat: number | null; lng: number | null }) => void;
  className: string;
};

function AddressAutocompleteInput({
  id,
  value,
  onChangeAddress,
  onSelectAddress,
  className,
}: AddressAutocompleteInputProps) {
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipNextLookupRef = useRef(false);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  useEffect(() => {
    if (skipNextLookupRef.current) {
      skipNextLookupRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < 1) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          mode: "autocomplete",
          input: query,
          sessionToken,
        });
        const response = await fetch(`/api/places?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          setPredictions([]);
          return;
        }
        const data = (await response.json()) as { predictions?: AddressPrediction[] };
        setPredictions(data.predictions ?? []);
        setIsOpen(true);
      } catch {
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [value, sessionToken]);

  const handleSelect = async (prediction: AddressPrediction) => {
    try {
      const params = new URLSearchParams({
        mode: "details",
        placeId: prediction.placeId,
        sessionToken,
      });
      const response = await fetch(`/api/places?${params.toString()}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        formattedAddress: string;
        placeId: string;
        lat: number | null;
        lng: number | null;
      };
      skipNextLookupRef.current = true;
      onSelectAddress({
        streetAddress: data.formattedAddress,
        placeId: data.placeId,
        lat: data.lat,
        lng: data.lng,
      });
      setPredictions([]);
      setIsOpen(false);
    } catch {
      // noop
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(event) => {
          skipNextLookupRef.current = false;
          onChangeAddress(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        type="text"
        required
        placeholder="Es. Via Roma 12, Milano"
        className={className}
      />
      {isOpen && (predictions.length > 0 || isLoading) ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-slate-500">Ricerca indirizzi...</p>
          ) : (
            predictions.map((prediction) => (
              <button
                key={prediction.placeId}
                type="button"
                onClick={() => handleSelect(prediction)}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
              >
                {prediction.description}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

type SpecialistsSlideProps = {
  specialists: SpecialistSetupData[];
  services: string[];
  assignments: string[][];
  onAddCustomService: (service: string) => void;
  onAddSpecialist: () => void;
  onRemoveSpecialist: (index: number) => void;
  onUpdateSpecialist: (
    index: number,
    field: keyof SpecialistSetupData,
    value: string,
  ) => void;
  onToggleAssignment: (specialistIndex: number, service: string) => void;
  fieldClass: string;
};

type ServicesSlideProps = {
  selectedServices: string[];
  availableServices: string[];
  onToggleService: (service: string) => void;
  onAddCustomService: (service: string) => void;
};

type RoomsSlideProps = {
  rooms: RoomSetupData[];
  addressOptions: Array<{ id: string; label: string }>;
  onAddRoom: () => void;
  onRemoveRoom: (index: number) => void;
  onUpdateRoom: (index: number, field: keyof RoomSetupData, value: string) => void;
  fieldClass: string;
};

type ToolsSlideProps = {
  tools: ToolSetupData[];
  onAddTool: () => void;
  onRemoveTool: (index: number) => void;
  onUpdateTool: (index: number, field: keyof ToolSetupData, value: string) => void;
  fieldClass: string;
};

export function WelcomeFacilitySlide({
  facilities,
  onAddFacility,
  onRemoveFacility,
  onUpdateFacility,
  onWeeklyScheduleChange,
  fieldClass,
}: FacilitySlideProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {facilities.map((facility, facilityIndex) => (
        <div
          key={`facility-${facilityIndex}`}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">Struttura {facilityIndex + 1}</p>
            {facilities.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemoveFacility(facilityIndex)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Rimuovi
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`welcome-facility-name-${facilityIndex}`} className="text-sm font-medium text-zinc-700">
                Nome dello studio / clinica / poliambulatorio
              </label>
              <input
                id={`welcome-facility-name-${facilityIndex}`}
                value={facility.name}
                onChange={(event) => onUpdateFacility(facilityIndex, { name: event.target.value })}
                type="text"
                required
                placeholder="Es. Studio Dentistico Rossi"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`welcome-street-address-${facilityIndex}`} className="text-sm font-medium text-zinc-700">
                Via
              </label>
              <AddressAutocompleteInput
                id={`welcome-street-address-${facilityIndex}`}
                value={facility.streetAddress}
                onChangeAddress={(streetAddress) =>
                  onUpdateFacility(facilityIndex, { streetAddress, placeId: "", lat: null, lng: null })
                }
                onSelectAddress={(selection) => onUpdateFacility(facilityIndex, selection)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">Orari standard settimana</p>
            <p className="text-xs text-slate-500">
              Questi orari sono solo una base iniziale: potrai modificarli sempre in seguito.
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium"></th>
                    {facility.weeklySchedule.map((day, dayIndex) => (
                      <th key={`weekly-header-${facilityIndex}-${day.dayKey}`} className="px-2 py-2 text-center font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <span>{day.label.slice(0, 3)}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={day.enabled}
                            aria-label={`Attiva ${day.label}`}
                            onClick={() =>
                              onWeeklyScheduleChange(facilityIndex, dayIndex, "enabled", !day.enabled)
                            }
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                              day.enabled ? "bg-slate-900" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                                day.enabled ? "translate-x-3.5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700">Inizio</td>
                    {facility.weeklySchedule.map((day, dayIndex) => (
                      <td key={`weekly-start-${facilityIndex}-${day.dayKey}`} className="px-2 py-2">
                        {day.enabled ? (
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(event) =>
                              onWeeklyScheduleChange(facilityIndex, dayIndex, "startTime", event.target.value)
                            }
                            className="w-full min-w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                          />
                        ) : (
                          <span className="inline-block w-full rounded-lg bg-slate-100 px-2 py-1.5 text-center text-slate-400">
                            -
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700">Fine</td>
                    {facility.weeklySchedule.map((day, dayIndex) => (
                      <td key={`weekly-end-${facilityIndex}-${day.dayKey}`} className="px-2 py-2">
                        {day.enabled ? (
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(event) =>
                              onWeeklyScheduleChange(facilityIndex, dayIndex, "endTime", event.target.value)
                            }
                            className="w-full min-w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                          />
                        ) : (
                          <span className="inline-block w-full rounded-lg bg-slate-100 px-2 py-1.5 text-center text-slate-400">
                            -
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddFacility}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        + Aggiungi struttura
      </button>
    </div>
  );
}

export function WelcomeSpecialistsSlide({
  specialists,
  services,
  assignments,
  onAddCustomService,
  onAddSpecialist,
  onRemoveSpecialist,
  onUpdateSpecialist,
  onToggleAssignment,
  fieldClass,
}: SpecialistsSlideProps) {
  const [activeSpecialistDialog, setActiveSpecialistDialog] = useState<number | null>(null);
  const [serviceQuery, setServiceQuery] = useState("");

  const normalizedServiceQuery = serviceQuery.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    if (!normalizedServiceQuery) return services;
    return services.filter((service) => service.toLowerCase().includes(normalizedServiceQuery));
  }, [services, normalizedServiceQuery]);
  const exactServiceMatchExists = useMemo(
    () => services.some((service) => service.toLowerCase() === normalizedServiceQuery),
    [services, normalizedServiceQuery],
  );
  const canAddCustomService = normalizedServiceQuery.length > 0 && !exactServiceMatchExists;

  const handleAddCustomServiceFromDialog = () => {
    if (!canAddCustomService || activeSpecialistDialog === null) return;
    const normalized = serviceQuery.trim();
    if (!normalized) return;
    onAddCustomService(normalized);
    onToggleAssignment(activeSpecialistDialog, normalized);
    setServiceQuery("");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {specialists.map((specialist, index) => (
        <div key={`specialist-${index}`} className="space-y-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Specialista {index + 1}</p>
            {specialists.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemoveSpecialist(index)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Rimuovi
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor={`welcome-specialist-first-name-${index}`} className="text-sm font-medium text-zinc-700">
                Nome
              </label>
              <input
                id={`welcome-specialist-first-name-${index}`}
                value={specialist.firstName}
                onChange={(event) => onUpdateSpecialist(index, "firstName", event.target.value)}
                type="text"
                placeholder="Es. Mario"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`welcome-specialist-last-name-${index}`} className="text-sm font-medium text-zinc-700">
                Cognome
              </label>
              <input
                id={`welcome-specialist-last-name-${index}`}
                value={specialist.lastName}
                onChange={(event) => onUpdateSpecialist(index, "lastName", event.target.value)}
                type="text"
                placeholder="Es. Rossi"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`welcome-specialist-professional-title-${index}`}
                className="text-sm font-medium text-zinc-700"
              >
                Specializzazione
              </label>
              <input
                id={`welcome-specialist-professional-title-${index}`}
                value={specialist.professionalTitle}
                onChange={(event) => onUpdateSpecialist(index, "professionalTitle", event.target.value)}
                type="text"
                placeholder="Es. Ortodonzia"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`welcome-specialist-code-${index}`} className="text-sm font-medium text-zinc-700">
                Codice (3 caratteri)
              </label>
              <input
                id={`welcome-specialist-code-${index}`}
                value={specialist.code}
                type="text"
                placeholder="Auto"
                readOnly
                className={`${fieldClass} bg-slate-100 text-slate-700`}
              />
            </div>
          </div>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="flex min-h-7 flex-1 flex-wrap gap-1.5">
              {(assignments[index] ?? []).length > 0 ? (
                (assignments[index] ?? []).map((service) => (
                  <span
                    key={`specialist-service-badge-${index}-${service}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700"
                  >
                    <span className="max-w-44 truncate">{service}</span>
                    <button
                      type="button"
                      onClick={() => onToggleAssignment(index, service)}
                      aria-label={`Rimuovi prestazione ${service}`}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                    >
                      X
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-xs text-slate-500">Nessuna prestazione associata</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setServiceQuery("");
                setActiveSpecialistDialog(index);
              }}
              className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Associa prestazioni
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddSpecialist}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        + Aggiungi specialista
      </button>

      {activeSpecialistDialog !== null ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="min-h-[95vh] w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">
                Associa prestazioni a{" "}
                {specialists[activeSpecialistDialog]?.firstName} {specialists[activeSpecialistDialog]?.lastName}
              </p>
              <button
                type="button"
                onClick={() => {
                  setServiceQuery("");
                  setActiveSpecialistDialog(null);
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Chiudi
              </button>
            </div>
            {services.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Nessuna prestazione disponibile. Aggiungile prima nella slide Prestazioni.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-start">
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <input
                      id={`specialist-services-search-${activeSpecialistDialog}`}
                      type="text"
                      value={serviceQuery}
                      onChange={(event) => setServiceQuery(event.target.value)}
                      placeholder="Cerca o aggiungi prestazione..."
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 sm:w-[420px]"
                    />
                    {canAddCustomService ? (
                      <button
                        type="button"
                        onClick={handleAddCustomServiceFromDialog}
                        className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                      >
                        aggiungi
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-7">
                  {(assignments[activeSpecialistDialog] ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(assignments[activeSpecialistDialog] ?? []).map((service) => (
                        <span
                          key={`dialog-selected-service-${activeSpecialistDialog}-${service}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700"
                        >
                          <span className="max-w-44 truncate">{service}</span>
                          <button
                            type="button"
                            onClick={() => onToggleAssignment(activeSpecialistDialog, service)}
                            aria-label={`Rimuovi prestazione ${service}`}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                          >
                            X
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Nessuna prestazione associata</p>
                  )}
                </div>

                <div className="flex max-h-80 flex-wrap gap-2 overflow-y-auto">
                  {filteredServices.map((service) => {
                  const selected = (assignments[activeSpecialistDialog] ?? []).includes(service);
                  return (
                    <button
                      key={`assignment-${activeSpecialistDialog}-${service}`}
                      type="button"
                      onClick={() => onToggleAssignment(activeSpecialistDialog, service)}
                      aria-pressed={selected}
                      className={`w-fit rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {service}
                    </button>
                  );
                  })}
                </div>

                {filteredServices.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nessuna prestazione trovata.
                    {canAddCustomService ? (
                      <button
                        type="button"
                        onClick={handleAddCustomServiceFromDialog}
                        className="ml-2 font-semibold text-slate-900 underline underline-offset-2"
                      >
                        Aggiungi "{serviceQuery.trim()}"
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WelcomeServicesSlide({
  selectedServices,
  availableServices,
  onToggleService,
  onAddCustomService,
}: ServicesSlideProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    if (!normalizedQuery) return availableServices;
    return availableServices.filter((service) => service.toLowerCase().includes(normalizedQuery));
  }, [availableServices, normalizedQuery]);

  const exactMatchExists = useMemo(
    () => availableServices.some((service) => service.toLowerCase() === normalizedQuery),
    [availableServices, normalizedQuery],
  );

  const canAddCustomService = normalizedQuery.length > 0 && !exactMatchExists;

  const handleAddCustomService = () => {
    if (!canAddCustomService) return;
    onAddCustomService(query);
    setQuery("");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <p className="text-sm text-zinc-600">
        Seleziona almeno una prestazione. Puoi sceglierne quante ne vuoi e modificarle in seguito.
      </p>
      <label htmlFor="welcome-services-search" className="block text-sm font-medium text-zinc-700">
        Cerca o aggiungi prestazione
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="welcome-services-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Es. Invisalign, Rx endorale, ... "
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500 sm:w-[420px]"
        />
        {canAddCustomService ? (
          <button
            type="button"
            onClick={handleAddCustomService}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            aggiungi
          </button>
        ) : null}
      </div>

      <div className="min-h-7">
        {selectedServices.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedServices.map((service) => (
              <span
                key={`selected-service-${service}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                <span className="max-w-44 truncate">{service}</span>
                <button
                  type="button"
                  onClick={() => onToggleService(service)}
                  aria-label={`Rimuovi prestazione ${service}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                >
                  X
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Nessuna prestazione selezionata</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filteredServices.map((service) => {
          const selected = selectedServices.includes(service);
          return (
            <button
              key={service}
              type="button"
              onClick={() => onToggleService(service)}
              aria-pressed={selected}
              className={`w-fit rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {service}
            </button>
          );
        })}
      </div>
      {filteredServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Nessuna prestazione trovata.
          {canAddCustomService ? (
            <button
              type="button"
              onClick={handleAddCustomService}
              className="ml-2 font-semibold text-slate-900 underline underline-offset-2"
            >
              Aggiungi "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function WelcomeRoomsSlide({
  rooms,
  addressOptions,
  onAddRoom,
  onRemoveRoom,
  onUpdateRoom,
  fieldClass,
}: RoomsSlideProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      {rooms.map((room, index) => (
        <div key={`room-${index}`} className="space-y-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Sala {index + 1}</p>
            {rooms.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemoveRoom(index)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Rimuovi
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
            <div className="space-y-1.5">
              <label htmlFor={`welcome-room-name-${index}`} className="text-sm font-medium text-zinc-700">
                Nome sala
              </label>
              <input
                id={`welcome-room-name-${index}`}
                value={room.name}
                onChange={(event) => onUpdateRoom(index, "name", event.target.value)}
                type="text"
                placeholder="Es. Ambulatorio 1"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`welcome-room-code-${index}`} className="text-sm font-medium text-zinc-700">
                Codice (3 caratteri)
              </label>
              <input
                id={`welcome-room-code-${index}`}
                value={room.code}
                onChange={(event) => onUpdateRoom(index, "code", event.target.value)}
                type="text"
                maxLength={3}
                placeholder="Es. A01"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`welcome-room-address-${index}`} className="text-sm font-medium text-zinc-700">
                Sede
              </label>
              <select
                id={`welcome-room-address-${index}`}
                value={room.addressId}
                onChange={(event) => onUpdateRoom(index, "addressId", event.target.value)}
                className={fieldClass}
              >
                {addressOptions.length > 1 ? <option value="">Seleziona sede</option> : null}
                {addressOptions.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddRoom}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        + Aggiungi sala
      </button>
    </div>
  );
}

export function WelcomeToolsSlide({
  tools,
  onAddTool,
  onRemoveTool,
  onUpdateTool,
  fieldClass,
}: ToolsSlideProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <p className="text-sm text-zinc-600">
        Strumentazione mobile da calendarizzare per evitare sovrapposizioni. Step opzionale.
      </p>
      {tools.map((tool, index) => (
        <div key={`tool-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Strumento {index + 1}</p>
            <button
              type="button"
              onClick={() => onRemoveTool(index)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Rimuovi
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <label htmlFor={`welcome-tool-name-${index}`} className="text-sm font-medium text-zinc-700">
                Nome strumento
              </label>
              <input
                id={`welcome-tool-name-${index}`}
                value={tool.name}
                onChange={(event) => onUpdateTool(index, "name", event.target.value)}
                type="text"
                placeholder="Es. Ecografo mobile"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`welcome-tool-code-${index}`} className="text-sm font-medium text-zinc-700">
                Codice (3 caratteri)
              </label>
              <input
                id={`welcome-tool-code-${index}`}
                value={tool.code}
                onChange={(event) => onUpdateTool(index, "code", event.target.value)}
                type="text"
                maxLength={3}
                placeholder="Es. E01"
                className={fieldClass}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddTool}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        + Aggiungi strumento
      </button>
    </div>
  );
}
