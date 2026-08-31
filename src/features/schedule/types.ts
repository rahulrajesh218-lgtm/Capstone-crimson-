export type ScheduleSource = "manual" | "blackbaud";

export type ScheduleMeeting = {
  id: string;
  userId?: string;
  title: string;
  courseCode?: string;
  teacher?: string;
  room?: string;
  color: string;
  icon: string;
  startTime: string;
  endTime: string;
  days: string[];
  rotationDays: string[];
  notes?: string;
  source: ScheduleSource;
  externalId?: string;
  metadata?: Record<string, unknown>;
};

export type ScheduleMeetingInput = Omit<
  ScheduleMeeting,
  "id" | "userId" | "source" | "externalId" | "metadata"
>;

export type ScheduleProviderStatus = "available" | "coming-soon";

export interface ScheduleProvider<TRaw = unknown> {
  id: ScheduleSource;
  label: string;
  status: ScheduleProviderStatus;
  readOnly: boolean;
  normalize(records: TRaw[]): ScheduleMeeting[];
}

