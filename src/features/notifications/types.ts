export type NotificationType = "due-today" | "due-tomorrow" | "overdue" | "class-soon";

export type NotificationTarget = "tasks" | "schedule" | "planner";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  target: NotificationTarget;
  entityId?: string;
  read: boolean;
  dismissed: boolean;
};

export type NotificationPreferences = {
  browserEnabled: boolean;
  dueToday: boolean;
  dueTomorrow: boolean;
  overdue: boolean;
  classReminders: boolean;
  classReminderMinutes: number;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  browserEnabled: false,
  dueToday: true,
  dueTomorrow: true,
  overdue: true,
  classReminders: true,
  classReminderMinutes: 10,
};
