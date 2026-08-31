import type { ScheduleMeeting, ScheduleProvider } from "./types";

export const manualScheduleProvider: ScheduleProvider<ScheduleMeeting> = {
  id: "manual",
  label: "Manual schedule",
  status: "available",
  readOnly: false,
  normalize(records) {
    return records.map((meeting) => ({ ...meeting, source: "manual" }));
  },
};

export const blackbaudScheduleProvider: ScheduleProvider = {
  id: "blackbaud",
  label: "BBK12 / Blackbaud",
  status: "coming-soon",
  readOnly: true,
  normalize() {
    return [];
  },
};

export const scheduleProviders = {
  manual: manualScheduleProvider,
  blackbaud: blackbaudScheduleProvider,
} satisfies Record<string, ScheduleProvider<never> | ScheduleProvider<ScheduleMeeting>>;

