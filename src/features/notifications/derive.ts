import type { ScheduleMeeting } from "../schedule/types";
import type { AppNotification, NotificationPreferences } from "./types";

type NotificationTask = {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  dueTime?: string;
  status: string;
  archived?: boolean;
};

type NotificationState = Pick<AppNotification, "read" | "dismissed">;

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateTime(date: string, time = "23:59") {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0);
}

function withState(notification: Omit<AppNotification, "read" | "dismissed">, states: Record<string, NotificationState>): AppNotification {
  return { ...notification, read: states[notification.id]?.read ?? false, dismissed: states[notification.id]?.dismissed ?? false };
}

export function deriveNotifications(
  tasks: NotificationTask[],
  meetings: ScheduleMeeting[],
  preferences: NotificationPreferences,
  states: Record<string, NotificationState>,
  now = new Date(),
) {
  const notifications: AppNotification[] = [];
  const today = dateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);

  tasks.filter((task) => task.status !== "completed" && !task.archived).forEach((task) => {
    const dueAt = localDateTime(task.dueDate, task.dueTime);
    const details = task.subject ? ` for ${task.subject}` : "";
    if (preferences.overdue && dueAt.getTime() < now.getTime()) {
      notifications.push(withState({
        id: `overdue:${task.id}:${task.dueDate}:${task.dueTime ?? "23:59"}`,
        type: "overdue",
        title: `Missing: ${task.title}`,
        body: `This assignment${details} was due ${dueAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
        createdAt: dueAt.toISOString(), target: "tasks", entityId: String(task.id),
      }, states));
    } else if (preferences.dueToday && task.dueDate === today) {
      notifications.push(withState({
        id: `today:${task.id}:${task.dueDate}:${task.dueTime ?? "23:59"}`,
        type: "due-today", title: `Due today: ${task.title}`,
        body: `Due${details} at ${dueAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), target: "tasks", entityId: String(task.id),
      }, states));
    } else if (preferences.dueTomorrow && task.dueDate === tomorrow) {
      notifications.push(withState({
        id: `tomorrow:${task.id}:${task.dueDate}:${task.dueTime ?? "23:59"}`,
        type: "due-tomorrow", title: `Due tomorrow: ${task.title}`,
        body: `Due${details} tomorrow at ${dueAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
        createdAt: now.toISOString(), target: "tasks", entityId: String(task.id),
      }, states));
    }
  });

  if (preferences.classReminders) {
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    meetings.filter((meeting) => meeting.days.includes(weekday)).forEach((meeting) => {
      const start = localDateTime(today, meeting.startTime);
      const minutesUntil = Math.ceil((start.getTime() - now.getTime()) / 60000);
      if (minutesUntil >= 0 && minutesUntil <= preferences.classReminderMinutes) {
        notifications.push(withState({
          id: `class:${meeting.id}:${today}:${meeting.startTime}`,
          type: "class-soon", title: `${meeting.title} starts soon`,
          body: `${minutesUntil <= 0 ? "Starting now" : `Starts in ${minutesUntil} min`}${meeting.room ? ` · ${meeting.room}` : ""}.`,
          createdAt: now.toISOString(), target: "schedule", entityId: meeting.id,
        }, states));
      }
    });
  }

  return notifications.filter((notification) => !notification.dismissed).sort((a, b) => {
    const priority = { overdue: 0, "class-soon": 1, "due-today": 2, "due-tomorrow": 3 };
    return priority[a.type] - priority[b.type] || b.createdAt.localeCompare(a.createdAt);
  });
}
