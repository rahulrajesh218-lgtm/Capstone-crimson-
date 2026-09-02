import { Bell, BellOff } from "lucide-react";
import type { NotificationPreferences } from "../features/notifications/types";

type Props = {
  preferences: NotificationPreferences;
  permission: NotificationPermission | "unsupported";
  onChange: (preferences: NotificationPreferences) => void;
  onEnableBrowser: () => void;
};

const rows: Array<{ key: keyof Pick<NotificationPreferences, "dueToday" | "dueTomorrow" | "overdue" | "classReminders">; label: string; detail: string }> = [
  { key: "dueToday", label: "Due today", detail: "Assignments that need attention today" },
  { key: "dueTomorrow", label: "Due tomorrow", detail: "A useful heads-up before tomorrow" },
  { key: "overdue", label: "Missing assignments", detail: "Incomplete work past its deadline" },
  { key: "classReminders", label: "Class reminders", detail: "Notify 10 minutes before class" },
];

export function NotificationSettings({ preferences, permission, onChange, onEnableBrowser }: Props) {
  const permissionText = permission === "unsupported" ? "Not supported by this browser" : permission === "denied" ? "Blocked in browser settings" : permission === "granted" ? "Enabled on this device" : "Off until you choose to enable it";
  return (
    <div className="rounded-2xl border border-zinc-200 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="rounded-xl bg-indigo-100 p-3 text-indigo-700">{permission === "denied" ? <BellOff className="h-6 w-6" /> : <Bell className="h-6 w-6" />}</span><div><h3 className="text-2xl font-semibold">Notifications</h3><p className="mt-1 text-zinc-500">In-app alerts always work while Zentaskra is open.</p></div></div>
        <button onClick={onEnableBrowser} disabled={permission === "unsupported" || permission === "denied" || permission === "granted"} className="min-h-11 rounded-xl bg-indigo-600 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500">{permission === "granted" ? "Browser alerts enabled" : "Enable browser alerts"}</button>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{permissionText}. Browser alerts currently require the app to be open; true background push is not enabled.</p>
      <div className="mt-5 divide-y divide-zinc-200">
        {rows.map((row) => (
          <label key={row.key} className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-3">
            <span><span className="block font-semibold">{row.label}</span><span className="mt-0.5 block text-sm text-zinc-500">{row.detail}</span></span>
            <input type="checkbox" checked={preferences[row.key]} onChange={(event) => onChange({ ...preferences, [row.key]: event.target.checked })} className="h-5 w-5 accent-indigo-600" />
          </label>
        ))}
      </div>
    </div>
  );
}
