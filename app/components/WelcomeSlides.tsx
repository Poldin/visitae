"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WelcomeFacilitySlide,
  WelcomeRoomsSlide,
  WelcomeSpecialistsSlide,
  WelcomeToolsSlide,
} from "./welcome/WelcomeSlidesSections";
import {
  type FacilitySetupData,
  type RoomSetupData,
  type SpecialistSetupData,
  type ToolSetupData,
  type WeeklyScheduleDay,
  type WelcomeSetupData,
} from "./welcome/types";
export type { WelcomeSetupData } from "./welcome/types";

type Props = {
  onFinish?: (data: WelcomeSetupData) => void;
};

const fieldClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500";

const availableServices = [
  "Prima visita",
  "Visita di controllo",
  "Igiene dentale",
  "Sbiancamento dentale",
  "Ortodonzia",
  "Implantologia",
  "Chirurgia orale",
  "Conservativa",
  "Endodonzia",
  "Protesi dentaria",
  "Parodontologia",
  "Pedodonzia",
];

const slideMeta = [
  {
    title: "Sede",
    description: "Inserisci i dati essenziali della sede per completare la configurazione iniziale.",
  },
  {
    title: "Specialisti",
    description:
      "Aggiungi uno o piu specialisti, scegli la specializzazione e associa le prestazioni direttamente dal dialog.",
  },
  {
    title: "Sale",
    description: "Aggiungi almeno una sala. Ogni sala richiede nome e codice alfanumerico di 3 caratteri.",
  },
  {
    title: "Strumenti",
    description: "Aggiungi strumenti mobili da calendarizzare. Step opzionale.",
  },
] as const;

function toAlphanumericUpper(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function buildAutoRoomCode(roomName: string, roomIndex: number) {
  const fromName = toAlphanumericUpper(roomName).slice(0, 3);
  if (fromName.length === 3) return fromName;
  const fallback = `R${String(roomIndex + 1).padStart(2, "0")}`;
  return `${fromName}${fallback}`.slice(0, 3);
}

function buildAutoSpecialistCode(specialist: SpecialistSetupData, specialistIndex: number) {
  const base = `${specialist.firstName}${specialist.lastName}${specialist.professionalTitle}`;
  const fromFields = toAlphanumericUpper(base).slice(0, 3);
  if (fromFields.length === 3) return fromFields;
  const fallback = `S${String(specialistIndex + 1).padStart(2, "0")}`;
  return `${fromFields}${fallback}`.slice(0, 3);
}

function buildAutoToolCode(toolName: string, toolIndex: number) {
  const fromName = toAlphanumericUpper(toolName).slice(0, 3);
  if (fromName.length === 3) return fromName;
  const fallback = `T${String(toolIndex + 1).padStart(2, "0")}`;
  return `${fromName}${fallback}`.slice(0, 3);
}

const defaultWeeklySchedule: WeeklyScheduleDay[] = [
  { dayKey: "mon", label: "Lunedi", enabled: true, startTime: "09:00", endTime: "18:00" },
  { dayKey: "tue", label: "Martedi", enabled: true, startTime: "09:00", endTime: "18:00" },
  { dayKey: "wed", label: "Mercoledi", enabled: true, startTime: "09:00", endTime: "18:00" },
  { dayKey: "thu", label: "Giovedi", enabled: true, startTime: "09:00", endTime: "18:00" },
  { dayKey: "fri", label: "Venerdi", enabled: true, startTime: "09:00", endTime: "18:00" },
  { dayKey: "sat", label: "Sabato", enabled: true, startTime: "09:00", endTime: "13:00" },
  { dayKey: "sun", label: "Domenica", enabled: false, startTime: "09:00", endTime: "13:00" },
];

export default function WelcomeSlides({ onFinish }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [facilities, setFacilities] = useState<FacilitySetupData[]>([
    {
      name: "",
      streetAddress: "",
      placeId: "",
      lat: null,
      lng: null,
      weeklySchedule: defaultWeeklySchedule.map((day) => ({ ...day })),
    },
  ]);
  const [specialists, setSpecialists] = useState<SpecialistSetupData[]>([
    { firstName: "", lastName: "", professionalTitle: "", code: "" },
  ]);
  const [specialistServices, setSpecialistServices] = useState<string[][]>([[]]);
  const [rooms, setRooms] = useState<RoomSetupData[]>([{ name: "", code: "", addressId: "" }]);
  const [tools, setTools] = useState<ToolSetupData[]>([]);

  const [services, setServices] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>(availableServices);

  const addressOptions = useMemo(
    () =>
      facilities.map((facility, facilityIndex) => {
        const name = facility.name.trim();
        const streetAddress = facility.streetAddress.trim();
        const fallbackLabel = `Sede ${facilityIndex + 1}`;
        const labelParts = [name, streetAddress].filter((part) => part.length > 0);
        return {
          id: `addr-${facilityIndex}`,
          label: labelParts.length > 0 ? labelParts.join(" - ") : fallbackLabel,
        };
      }),
    [facilities],
  );
  const defaultAddressId = addressOptions.length === 1 ? addressOptions[0]?.id ?? "" : "";
  const totalSlides = 4;
  const isLastSlide = currentSlide === totalSlides - 1;
  const estimatedTimeBySlide: string[] = [
    "~2 min rimanenti",
    "~1 min rimanente",
    "~1 min rimanente",
    "<1 min rimanente",
  ];
  const estimatedTimeLabel = estimatedTimeBySlide[currentSlide] ?? "<1 min rimanente";

  const isCurrentSlideValid = useMemo(() => {
    if (currentSlide === 0) {
      return (
        facilities.length > 0 &&
        facilities.every((facility) => {
          const hasAtLeastOneActiveDay = facility.weeklySchedule.some(
            (day) => day.enabled && day.startTime < day.endTime,
          );
          return (
            facility.name.trim().length > 0 &&
            facility.streetAddress.trim().length > 0 &&
            hasAtLeastOneActiveDay
          );
        })
      );
    }
    if (currentSlide === 1) {
      return specialists.some(
        (specialist, specialistIndex) =>
          specialist.firstName.trim().length > 0 &&
          specialist.lastName.trim().length > 0 &&
          specialist.professionalTitle.trim().length > 0 &&
          /^[A-Z0-9]{3}$/.test(buildAutoSpecialistCode(specialist, specialistIndex)) &&
          (specialistServices[specialistIndex] ?? []).length > 0,
      );
    }
    if (currentSlide === 2) {
      return rooms.some((room, roomIndex) => {
        if (room.name.trim().length === 0) return false;
        const resolvedCode = room.code.trim() || buildAutoRoomCode(room.name, roomIndex);
        const resolvedAddressId = room.addressId || defaultAddressId;
        return /^[A-Z0-9]{3}$/.test(toAlphanumericUpper(resolvedCode)) && resolvedAddressId.length > 0;
      });
    }
    if (currentSlide === 3) {
      return true;
    }
    return true;
  }, [
    currentSlide,
    facilities,
    specialists,
    specialistServices,
    rooms,
    defaultAddressId,
  ]);

  const updateWeeklySchedule = (
    facilityIndex: number,
    dayIndex: number,
    field: "enabled" | "startTime" | "endTime",
    value: string | boolean,
  ) => {
    setFacilities((current) =>
      current.map((facility, idx) => {
        if (idx !== facilityIndex) return facility;
        return {
          ...facility,
          weeklySchedule: facility.weeklySchedule.map((day, weeklyDayIndex) =>
            weeklyDayIndex === dayIndex ? { ...day, [field]: value } : day,
          ),
        };
      }),
    );
  };

  const updateFacility = (facilityIndex: number, patch: Partial<FacilitySetupData>) => {
    setFacilities((current) =>
      current.map((facility, idx) => (idx === facilityIndex ? { ...facility, ...patch } : facility)),
    );
  };

  const addFacility = () => {
    setFacilities((current) => [
      ...current,
      {
        name: "",
        streetAddress: "",
        placeId: "",
        lat: null,
        lng: null,
        weeklySchedule: defaultWeeklySchedule.map((day) => ({ ...day })),
      },
    ]);
  };

  const removeFacility = (facilityIndex: number) => {
    setFacilities((current) => current.filter((_, idx) => idx !== facilityIndex));
    setRooms((current) =>
      current.map((room) => {
        if (!room.addressId) return room;
        const currentIndex = Number.parseInt(room.addressId.replace("addr-", ""), 10);
        if (Number.isNaN(currentIndex)) return room;
        if (currentIndex === facilityIndex) return { ...room, addressId: "" };
        if (currentIndex > facilityIndex) return { ...room, addressId: `addr-${currentIndex - 1}` };
        return room;
      }),
    );
  };

  useEffect(() => {
    if (!defaultAddressId) return;
    const t = window.setTimeout(() => {
      setRooms((current) =>
        current.map((room) => (room.addressId ? room : { ...room, addressId: defaultAddressId })),
      );
    }, 0);
    return () => window.clearTimeout(t);
  }, [defaultAddressId]);

  const updateSpecialist = (
    index: number,
    field: keyof SpecialistSetupData,
    value: string,
  ) => {
    setSpecialists((current) =>
      current.map((specialist, specialistIndex) => {
        if (specialistIndex !== index) return specialist;
        if (field === "code") return specialist;
        const nextSpecialist = { ...specialist, [field]: value };
        const canComputeCode =
          nextSpecialist.firstName.trim().length > 0 &&
          nextSpecialist.lastName.trim().length > 0 &&
          nextSpecialist.professionalTitle.trim().length > 0;
        return {
          ...nextSpecialist,
          code: canComputeCode ? buildAutoSpecialistCode(nextSpecialist, specialistIndex) : "",
        };
      }),
    );
  };

  const addSpecialist = () => {
    setSpecialists((current) => [
      ...current,
      { firstName: "", lastName: "", professionalTitle: "", code: "" },
    ]);
    setSpecialistServices((current) => [...current, []]);
  };

  const removeSpecialist = (index: number) => {
    setSpecialists((current) => current.filter((_, specialistIndex) => specialistIndex !== index));
    setSpecialistServices((current) =>
      current.filter((_, specialistIndex) => specialistIndex !== index),
    );
  };

  const updateRoom = (index: number, field: keyof RoomSetupData, value: string) => {
    setRooms((current) =>
      current.map((room, roomIndex) => {
        if (roomIndex !== index) return room;
        if (field === "code") {
          const normalizedCode = toAlphanumericUpper(value).slice(0, 3);
          return { ...room, code: normalizedCode };
        }
        if (field === "name") {
          const nextName = value;
          const nextCode = room.code.trim().length === 0 ? buildAutoRoomCode(nextName, roomIndex) : room.code;
          return { ...room, name: nextName, code: nextCode };
        }
        return { ...room, [field]: value };
      }),
    );
  };

  const addRoom = () => {
    setRooms((current) => [...current, { name: "", code: "", addressId: defaultAddressId }]);
  };

  const removeRoom = (index: number) => {
    setRooms((current) => current.filter((_, roomIndex) => roomIndex !== index));
  };

  const updateTool = (index: number, field: keyof ToolSetupData, value: string) => {
    setTools((current) =>
      current.map((tool, toolIndex) => {
        if (toolIndex !== index) return tool;
        if (field === "code") {
          const normalizedCode = toAlphanumericUpper(value).slice(0, 3);
          return { ...tool, code: normalizedCode };
        }
        if (field === "name") {
          const nextName = value;
          const nextCode = tool.code.trim().length === 0 ? buildAutoToolCode(nextName, toolIndex) : tool.code;
          return { ...tool, name: nextName, code: nextCode };
        }
        return { ...tool, [field]: value };
      }),
    );
  };

  const addTool = () => {
    setTools((current) => [...current, { name: "", code: "" }]);
  };

  const removeTool = (index: number) => {
    setTools((current) => current.filter((_, toolIndex) => toolIndex !== index));
  };

  const addCustomService = (service: string) => {
    const normalized = service.trim();
    if (!normalized) return;
    setServiceOptions((current) => {
      if (current.some((item) => item.toLowerCase() === normalized.toLowerCase())) return current;
      return [...current, normalized];
    });
    setServices((current) => {
      if (current.some((item) => item.toLowerCase() === normalized.toLowerCase())) return current;
      return [...current, normalized];
    });
  };

  const toggleSpecialistServiceAssignment = (specialistIndex: number, service: string) => {
    setSpecialistServices((current) =>
      current.map((items, idx) => {
        if (idx !== specialistIndex) return items;
        return items.includes(service) ? items.filter((item) => item !== service) : [...items, service];
      }),
    );
    setServices((current) => (current.includes(service) ? current : [...current, service]));
  };

  const handleNext = () => {
    if (!isCurrentSlideValid) return;

    if (isLastSlide) {
      const cleanSpecialistsWithIndex = specialists
        .map((specialist, specialistIndex) => {
          const firstName = specialist.firstName.trim();
          const lastName = specialist.lastName.trim();
          const professionalTitle = specialist.professionalTitle.trim();
          const code = buildAutoSpecialistCode(
            { ...specialist, firstName, lastName, professionalTitle },
            specialistIndex,
          );
          return { firstName, lastName, professionalTitle, code, specialistIndex };
        })
        .filter(
          (specialist) =>
            specialist.firstName.length > 0 &&
            specialist.lastName.length > 0 &&
            specialist.professionalTitle.length > 0 &&
            /^[A-Z0-9]{3}$/.test(specialist.code),
        );
      const cleanSpecialists = cleanSpecialistsWithIndex.map((specialist) => ({
        firstName: specialist.firstName,
        lastName: specialist.lastName,
        professionalTitle: specialist.professionalTitle,
        code: specialist.code,
      }));

      onFinish?.({
        facilities: facilities.map((facility) => ({
          name: facility.name.trim(),
          streetAddress: facility.streetAddress.trim(),
          placeId: facility.placeId,
          lat: facility.lat,
          lng: facility.lng,
          weeklySchedule: facility.weeklySchedule.map((day) => ({ ...day })),
        })),
        facilityName: facilities[0]?.name.trim() ?? "",
        streetAddress: facilities[0]?.streetAddress.trim() ?? "",
        weeklySchedule: facilities[0]?.weeklySchedule.map((day) => ({ ...day })) ?? [],
        specialists: cleanSpecialists,
        services,
        specialistServiceAssignments: cleanSpecialistsWithIndex.map((specialist) => ({
          specialistCode: specialist.code,
          services: (specialistServices[specialist.specialistIndex] ?? []).filter((service) =>
            services.includes(service),
          ),
        })),
        rooms: rooms
          .map((room, roomIndex) => {
            const name = room.name.trim();
            const explicitCode = toAlphanumericUpper(room.code.trim()).slice(0, 3);
            const code = explicitCode.length > 0 ? explicitCode : buildAutoRoomCode(name, roomIndex);
            const addressId = room.addressId || defaultAddressId;
            return { name, code, addressId };
          })
          .filter((room) => room.name.length > 0 && /^[A-Z0-9]{3}$/.test(room.code) && room.addressId.length > 0),
        tools: tools
          .map((tool, toolIndex) => {
            const name = tool.name.trim();
            const explicitCode = toAlphanumericUpper(tool.code.trim()).slice(0, 3);
            const code = explicitCode.length > 0 ? explicitCode : buildAutoToolCode(name, toolIndex);
            return { name, code };
          })
          .filter((tool) => tool.name.length > 0 && /^[A-Z0-9]{3}$/.test(tool.code)),
      });
      return;
    }

    setCurrentSlide((value) => value + 1);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-slate-50 text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-6 py-8 md:px-10 md:py-10">
        <header className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Configurazione • {currentSlide + 1}/{totalSlides}
                {" • "}
                {estimatedTimeLabel}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{slideMeta[currentSlide].title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{slideMeta[currentSlide].description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {currentSlide > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentSlide((value) => Math.max(0, value - 1))}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  Indietro
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentSlideValid}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLastSlide ? "Completa setup" : "Prosegui"}
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto py-8">
          {currentSlide === 0 ? (
            <WelcomeFacilitySlide
              facilities={facilities}
              onAddFacility={addFacility}
              onRemoveFacility={removeFacility}
              onUpdateFacility={updateFacility}
              onWeeklyScheduleChange={updateWeeklySchedule}
              fieldClass={fieldClass}
            />
          ) : null}
          {currentSlide === 1 ? (
            <WelcomeSpecialistsSlide
              specialists={specialists}
              services={serviceOptions}
              assignments={specialistServices}
              onAddCustomService={addCustomService}
              onAddSpecialist={addSpecialist}
              onRemoveSpecialist={removeSpecialist}
              onUpdateSpecialist={updateSpecialist}
              onToggleAssignment={toggleSpecialistServiceAssignment}
              fieldClass={fieldClass}
            />
          ) : null}
          {currentSlide === 2 ? (
            <WelcomeRoomsSlide
              rooms={rooms}
              addressOptions={addressOptions}
              onAddRoom={addRoom}
              onRemoveRoom={removeRoom}
              onUpdateRoom={updateRoom}
              fieldClass={fieldClass}
            />
          ) : null}
          {currentSlide === 3 ? (
            <WelcomeToolsSlide
              tools={tools}
              onAddTool={addTool}
              onRemoveTool={removeTool}
              onUpdateTool={updateTool}
              fieldClass={fieldClass}
            />
          ) : null}
        </section>

      </div>
    </div>
  );
}
