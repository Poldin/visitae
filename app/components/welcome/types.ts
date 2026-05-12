export type SpecialistSetupData = {
  firstName: string;
  lastName: string;
  professionalTitle: string;
  code: string;
};

export type RoomSetupData = {
  name: string;
  code: string;
  addressId: string;
};

export type ToolSetupData = {
  name: string;
  code: string;
};

export type SpecialistServiceAssignment = {
  specialistCode: string;
  services: string[];
};

export type WeeklyScheduleDay = {
  dayKey: string;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type FacilitySetupData = {
  name: string;
  streetAddress: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
  weeklySchedule: WeeklyScheduleDay[];
};

export type WelcomeSetupData = {
  facilities: FacilitySetupData[];
  facilityName: string;
  streetAddress: string;
  weeklySchedule: WeeklyScheduleDay[];
  specialists: SpecialistSetupData[];
  services: string[];
  specialistServiceAssignments: SpecialistServiceAssignment[];
  rooms: RoomSetupData[];
  tools: ToolSetupData[];
};
