import { Bell, CalendarClock, CheckCheck, Clock3, TriangleAlert, X } from "lucide-react";
import type { AppNotification } from "../features/notifications/types";
import { MobileSheet } from "./MobileSheet";

type Props = {
  open: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onOpen: (notification: AppNotification) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
};

function relativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (Math.abs(minutes) < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

const icons = {
  overdue: TriangleAlert,
  "class-soon": CalendarClock,
  "due-today": Clock3,
  "due-tomorrow": Bell,
};

export function NotificationCenter({ open, notifications, onClose, onOpen, onDismiss, onMarkAllRead }: Props) {
  const unread = notifications.filter((notification) => !notification.read).length;
  return (
    <MobileSheet open={open} title="Notifications" description={unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You’re up to date."} onClose={onClose} className="sm:max-w-lg">
      {notifications.length > 0 && (
        <button onClick={onMarkAllRead} className="mb-4 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
          <CheckCheck className="h-4 w-4" />Mark all as read
        </button>
      )}
      <div className="space-y-2">
        {notifications.map((notification) => {
          const Icon = icons[notification.type];
          return (
            <article key={notification.id} className={`relative rounded-2xl border p-4 pr-12 ${notification.read ? "border-zinc-200 bg-white" : "border-indigo-200 bg-indigo-50/70"}`}>
              <button onClick={() => onOpen(notification)} className="flex min-h-12 w-full gap-3 text-left">
                <span className={`mt-0.5 rounded-xl p-2 ${notification.type === "overdue" ? "bg-red-100 text-red-700" : "bg-white text-indigo-700"}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block font-semibold text-zinc-950">{notification.title}</span><span className="mt-1 block text-sm leading-5 text-zinc-600">{notification.body}</span><span className="mt-2 block text-xs font-medium text-zinc-400">{relativeTime(notification.createdAt)}</span></span>
              </button>
              <button onClick={() => onDismiss(notification.id)} className="absolute right-2 top-2 flex min-h-10 min-w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Dismiss ${notification.title}`}><X className="h-4 w-4" /></button>
            </article>
          );
        })}
        {notifications.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center"><Bell className="mx-auto h-8 w-8 text-indigo-500" /><p className="mt-3 font-semibold">No notifications</p><p className="mt-1 text-sm text-zinc-500">Deadlines and class reminders will appear here.</p></div>}
      </div>
    </MobileSheet>
  );
}
