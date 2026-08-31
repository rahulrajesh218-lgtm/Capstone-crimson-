import { ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3, MapPin, Plus, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { MobileDashboardClass, MobileDashboardTask } from "./MobileDashboard";
import type { ScheduleMeeting } from "../features/schedule/types";

type Props = {
  nextClass: MobileDashboardClass | null;
  dueToday: MobileDashboardTask[];
  missing: MobileDashboardTask[];
  upcoming: MobileDashboardTask[];
  todayClasses: ScheduleMeeting[];
  completedCount: number;
  onTasks: () => void;
  onSchedule: () => void;
  onAddTask: () => void;
  onEditTask: (id: number) => void;
};

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours || 0, minutes || 0).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center">{icon}<p className="mt-3 font-semibold text-zinc-900">{title}</p><p className="mt-1 text-sm text-zinc-500">{detail}</p></div>;
}

function TaskRow({ task, missing = false, onClick }: { task: MobileDashboardTask; missing?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${missing ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white"}`}><div className="min-w-0"><p className="truncate font-semibold text-zinc-950">{task.title}</p><p className="mt-1 truncate text-sm text-zinc-500">{task.subject}{task.categoryName ? ` · ${task.categoryName}` : ""}</p></div><p className={`shrink-0 text-sm font-medium ${missing ? "text-red-700" : "text-zinc-500"}`}>{task.dueLabel}</p></button>;
}

export function DesktopDashboard({ nextClass, dueToday, missing, upcoming, todayClasses, completedCount, onTasks, onSchedule, onAddTask, onEditTask }: Props) {
  const dateLabel = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="hidden space-y-5 md:block">
      <header className="flex items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-indigo-600">{dateLabel}</p><h2 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 xl:text-4xl">Here’s what matters today</h2></div>
        <button onClick={onAddTask} className="flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-5 w-5" />Add task</button>
      </header>

      <div className="grid gap-3 lg:grid-cols-4">
        <section className="rounded-3xl bg-[#05051f] p-5 text-white shadow-lg shadow-indigo-950/10">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">{nextClass?.status === "current" ? "Current class" : "Next class"}</p><CalendarDays className="h-5 w-5 text-indigo-200" /></div>
          <h3 className="mt-5 line-clamp-2 text-2xl font-semibold">{nextClass?.title ?? "No class coming up"}</h3>
          <p className="mt-2 text-sm text-zinc-300">{nextClass?.timeLabel ?? "Add your timetable to see what’s next."}</p>
          {nextClass?.room && <p className="mt-1 flex items-center gap-2 text-sm text-zinc-300"><MapPin className="h-4 w-4" />{nextClass.room}</p>}
          <button onClick={onSchedule} className="mt-5 min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">Open schedule</button>
        </section>
        <button onClick={onTasks} className="rounded-3xl border border-indigo-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Due today</p><Clock3 className="h-5 w-5 text-indigo-600" /></div><p className="mt-5 text-4xl font-semibold text-zinc-950">{dueToday.length}</p><p className="mt-2 text-sm text-zinc-500">{dueToday.length ? "Assignments need your attention" : "No tasks due today"}</p><p className="mt-5 flex items-center gap-2 text-sm font-semibold text-indigo-600">View tasks <ArrowRight className="h-4 w-4" /></p></button>
        <button onClick={onTasks} className="rounded-3xl border border-red-100 bg-red-50/60 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-red-600">Missing</p><TriangleAlert className="h-5 w-5 text-red-500" /></div><p className="mt-5 text-4xl font-semibold text-zinc-950">{missing.length}</p><p className="mt-2 text-sm text-zinc-500">{missing.length ? "Review overdue assignments" : "You’re all caught up"}</p><p className="mt-5 flex items-center gap-2 text-sm font-semibold text-red-600">View missing <ArrowRight className="h-4 w-4" /></p></button>
        <button onClick={onTasks} className="rounded-3xl border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Completed</p><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><p className="mt-5 text-4xl font-semibold text-zinc-950">{completedCount}</p><p className="mt-2 text-sm text-zinc-500">Great job staying consistent</p><p className="mt-5 flex items-center gap-2 text-sm font-semibold text-emerald-600">View completed <ArrowRight className="h-4 w-4" /></p></button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-xl font-semibold"><Clock3 className="h-5 w-5 text-indigo-600" />Due today</h3><button onClick={onTasks} className="min-h-11 px-2 text-sm font-semibold text-indigo-600">See all</button></div>{dueToday.length ? <div className="space-y-2">{dueToday.slice(0, 3).map(task => <TaskRow key={task.id} task={task} onClick={() => onEditTask(task.id)} />)}</div> : <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />} title="Nothing due today" detail="You’re all caught up." />}<div className="mb-3 mt-5 flex items-center justify-between"><h3 className="font-semibold">Coming up</h3><button onClick={onTasks} className="min-h-11 px-2 text-sm font-semibold text-indigo-600">See all</button></div>{upcoming.length ? <div className="space-y-2">{upcoming.slice(0, 2).map(task => <TaskRow key={task.id} task={task} onClick={() => onEditTask(task.id)} />)}</div> : <EmptyState icon={<CalendarDays className="h-7 w-7 text-zinc-400" />} title="No upcoming assignments" detail="You’re good for now." />}</section>
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5 text-indigo-600" />Today’s schedule</h3><button onClick={onSchedule} className="min-h-11 px-2 text-sm font-semibold text-indigo-600">View full schedule</button></div>{todayClasses.length ? <div className="space-y-3">{todayClasses.slice(0, 5).map(meeting => <div key={meeting.id} className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-4"><div className="w-20 shrink-0 text-sm font-semibold text-zinc-500">{formatTime(meeting.startTime)}</div><div className="min-w-0"><p className="truncate font-semibold text-zinc-950">{meeting.title}</p><p className="mt-1 truncate text-sm text-zinc-500">{[meeting.room, meeting.teacher].filter(Boolean).join(" · ") || formatTime(meeting.endTime)}</p></div></div>)}</div> : <EmptyState icon={<CalendarDays className="h-10 w-10 text-indigo-500" />} title="No classes on the schedule" detail="Add your classes to see your day here." />}</section>
      </div>

      {missing.length > 0 && <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-red-600" /><h3 className="text-xl font-semibold text-red-800">Missing assignments</h3></div><div className="grid gap-3 lg:grid-cols-2">{missing.slice(0, 4).map(task => <TaskRow key={task.id} task={task} missing onClick={() => onEditTask(task.id)} />)}</div></section>}
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 text-xl font-semibold"><Bell className="h-5 w-5 text-indigo-600" />Assignment check</h3><p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 text-center text-sm text-zinc-500">Open Tasks and select an assignment to manage progress and reminders.</p></section>
    </div>
  );
}
