import { ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3, MapPin, Plus, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { ScheduleMeeting } from "../features/schedule/types";
import type { MobileDashboardClass, MobileDashboardTask } from "./MobileDashboard";

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
  return <div className="desktop-empty-state flex min-h-56 flex-col items-center justify-center rounded-3xl bg-zinc-50 p-8 text-center">{icon}<p className="mt-4 text-lg font-semibold text-zinc-950">{title}</p><p className="mt-1 text-base text-zinc-500">{detail}</p></div>;
}

function TaskRow({ task, missing = false, onClick }: { task: MobileDashboardTask; missing?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`desktop-task-row flex min-h-20 w-full items-center justify-between gap-5 rounded-2xl bg-zinc-50 px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${missing ? "desktop-missing-row" : ""}`}><div className="min-w-0"><p className="truncate text-lg font-semibold text-zinc-950">{task.title}</p><p className="mt-1 truncate text-base text-zinc-500">{task.subject}{task.categoryName ? ` · ${task.categoryName}` : ""}</p></div><p className={`shrink-0 text-base font-semibold ${missing ? "text-red-600" : "text-zinc-500"}`}>{task.dueLabel}</p></button>;
}

export function DesktopDashboard({ nextClass, dueToday, missing, upcoming, todayClasses, completedCount, onTasks, onSchedule, onAddTask, onEditTask }: Props) {
  const dateLabel = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="desktop-dashboard hidden space-y-8 md:block">
      <header className="flex items-end justify-between gap-8">
        <div><p className="text-base font-semibold text-indigo-600">{dateLabel}</p><h2 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950 2xl:text-5xl">Here’s what matters today</h2></div>
        <button onClick={onAddTask} className="flex min-h-14 items-center gap-2 rounded-2xl bg-indigo-600 px-7 text-lg font-semibold text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-700"><Plus className="h-6 w-6" />Add task</button>
      </header>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <section className="min-h-60 rounded-[30px] bg-[#05051f] p-7 text-white shadow-xl shadow-indigo-950/15"><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">{nextClass?.status === "current" ? "Current class" : "Next class"}</p><CalendarDays className="h-6 w-6 text-indigo-200" /></div><h3 className="mt-7 line-clamp-2 text-3xl font-semibold">{nextClass?.title ?? "No class coming up"}</h3><p className="mt-3 text-base leading-6 text-zinc-300">{nextClass?.timeLabel ?? "Add your timetable to see what’s next at a glance."}</p>{nextClass?.room && <p className="mt-2 flex items-center gap-2 text-base text-zinc-300"><MapPin className="h-5 w-5" />{nextClass.room}</p>}<button onClick={onSchedule} className="mt-6 min-h-12 rounded-xl bg-white/10 px-5 text-base font-semibold hover:bg-white/15">Open schedule</button></section>
        <button onClick={onTasks} className="desktop-summary-card min-h-60 rounded-[30px] bg-white p-7 text-left shadow-lg shadow-zinc-950/5 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Due today</p><Clock3 className="h-6 w-6 text-indigo-600" /></div><p className="mt-7 text-5xl font-semibold text-zinc-950">{dueToday.length}</p><p className="mt-3 text-base text-zinc-500">{dueToday.length ? "Assignments need your attention" : "No tasks due today"}</p><p className="mt-6 flex items-center gap-2 text-base font-semibold text-indigo-600">View tasks <ArrowRight className="h-5 w-5" /></p></button>
        <button onClick={onTasks} className="desktop-missing-summary min-h-60 rounded-[30px] bg-red-50 p-7 text-left shadow-lg shadow-red-950/5 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-wide text-red-600">Missing</p><TriangleAlert className="h-6 w-6 text-red-500" /></div><p className="mt-7 text-5xl font-semibold text-zinc-950">{missing.length}</p><p className="mt-3 text-base text-zinc-600">{missing.length ? "Review overdue assignments" : "You’re all caught up"}</p><p className="mt-6 flex items-center gap-2 text-base font-semibold text-red-600">View missing <ArrowRight className="h-5 w-5" /></p></button>
        <button onClick={onTasks} className="desktop-summary-card min-h-60 rounded-[30px] bg-white p-7 text-left shadow-lg shadow-zinc-950/5 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Completed</p><CheckCircle2 className="h-6 w-6 text-emerald-500" /></div><p className="mt-7 text-5xl font-semibold text-zinc-950">{completedCount}</p><p className="mt-3 text-base text-zinc-500">Great job staying consistent</p><p className="mt-6 flex items-center gap-2 text-base font-semibold text-emerald-600">View completed <ArrowRight className="h-5 w-5" /></p></button>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="desktop-surface rounded-[30px] bg-white p-7 shadow-lg shadow-zinc-950/5"><div className="mb-5 flex items-center justify-between"><h3 className="flex items-center gap-3 text-2xl font-semibold"><Clock3 className="h-6 w-6 text-indigo-600" />Due today</h3><button onClick={onTasks} className="min-h-12 px-3 text-base font-semibold text-indigo-600">See all</button></div>{dueToday.length ? <div className="space-y-3">{dueToday.slice(0, 3).map(task => <TaskRow key={task.id} task={task} onClick={() => onEditTask(task.id)} />)}</div> : <EmptyState icon={<CheckCircle2 className="h-10 w-10 text-emerald-500" />} title="Nothing due today" detail="You’re all caught up." />}<div className="mb-4 mt-7 flex items-center justify-between"><h3 className="text-xl font-semibold">Coming up</h3><button onClick={onTasks} className="min-h-12 px-3 text-base font-semibold text-indigo-600">See all</button></div>{upcoming.length ? <div className="space-y-3">{upcoming.slice(0, 2).map(task => <TaskRow key={task.id} task={task} onClick={() => onEditTask(task.id)} />)}</div> : <EmptyState icon={<CalendarDays className="h-9 w-9 text-indigo-400" />} title="No upcoming assignments" detail="You’re good for now." />}</section>
        <section className="desktop-surface rounded-[30px] bg-white p-7 shadow-lg shadow-zinc-950/5"><div className="mb-5 flex items-center justify-between"><h3 className="flex items-center gap-3 text-2xl font-semibold"><CalendarDays className="h-6 w-6 text-indigo-600" />Today’s schedule</h3><button onClick={onSchedule} className="min-h-12 px-3 text-base font-semibold text-indigo-600">View full schedule</button></div>{todayClasses.length ? <div className="space-y-3">{todayClasses.slice(0, 6).map(meeting => <div key={meeting.id} className="desktop-task-row flex min-h-20 items-center gap-5 rounded-2xl bg-zinc-50 px-5 py-4"><div className="w-24 shrink-0 text-base font-semibold text-zinc-500">{formatTime(meeting.startTime)}</div><div className="min-w-0"><p className="truncate text-lg font-semibold text-zinc-950">{meeting.title}</p><p className="mt-1 truncate text-base text-zinc-500">{[meeting.room, meeting.teacher].filter(Boolean).join(" · ") || formatTime(meeting.endTime)}</p></div></div>)}</div> : <EmptyState icon={<CalendarDays className="h-12 w-12 text-indigo-500" />} title="No classes on the schedule" detail="Add your classes to see your day here." />}</section>
      </div>

      {missing.length > 0 && <section className="desktop-surface rounded-[30px] bg-white p-7 shadow-lg shadow-zinc-950/5"><div className="mb-5 flex items-center gap-3"><TriangleAlert className="h-6 w-6 text-red-600" /><h3 className="text-2xl font-semibold text-red-700">Missing assignments</h3></div><div className="grid gap-4 xl:grid-cols-2">{missing.slice(0, 4).map(task => <TaskRow key={task.id} task={task} missing onClick={() => onEditTask(task.id)} />)}</div></section>}

      <section className="desktop-surface grid items-center gap-6 rounded-[30px] bg-white p-7 shadow-lg shadow-zinc-950/5 xl:grid-cols-[1fr_auto]"><div className="flex items-start gap-4"><span className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><Bell className="h-6 w-6" /></span><div><h3 className="text-2xl font-semibold">Assignment check</h3><p className="mt-2 max-w-3xl text-base leading-6 text-zinc-500">Select an assignment in Tasks to update progress, review deadlines, and manage reminders.</p></div></div><button onClick={onTasks} className="min-h-12 rounded-2xl bg-indigo-600 px-6 text-base font-semibold text-white">Open tasks</button></section>
    </div>
  );
}
