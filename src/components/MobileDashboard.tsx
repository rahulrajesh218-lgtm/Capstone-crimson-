import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Plus } from "lucide-react";

export type MobileDashboardTask = {
  id: number;
  title: string;
  subject: string;
  dueLabel: string;
  categoryName?: string;
};

export type MobileDashboardClass = {
  title: string;
  timeLabel: string;
  room?: string;
  status: "current" | "next";
};

type Props = {
  nextClass: MobileDashboardClass | null;
  dueToday: MobileDashboardTask[];
  missing: MobileDashboardTask[];
  upcoming: MobileDashboardTask[];
  completedCount: number;
  onTasks: () => void;
  onSchedule: () => void;
  onAddTask: () => void;
  onEditTask: (id: number) => void;
};

function CompactTask({ task, tone, onEdit }: { task: MobileDashboardTask; tone: "normal" | "missing"; onEdit: () => void }) {
  return (
    <button onClick={onEdit} className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${tone === "missing" ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-zinc-950">{task.title}</p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-xs text-zinc-600">
            <span className="max-w-full truncate rounded-full bg-white px-2 py-1">{task.subject}</span>
            {task.categoryName && <span className="max-w-full truncate rounded-full bg-zinc-100 px-2 py-1">{task.categoryName}</span>}
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
      </div>
      <p className={`mt-2 text-sm font-medium ${tone === "missing" ? "text-red-700" : "text-zinc-500"}`}>{task.dueLabel}</p>
    </button>
  );
}
export function MobileDashboard({ nextClass, dueToday, missing, upcoming, completedCount, onTasks, onSchedule, onAddTask, onEditTask }: Props) {
  const todayLabel = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5 md:hidden">
      <header>
        <p className="text-sm font-semibold text-indigo-700">{todayLabel}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Here’s what matters today</h2>
      </header>

      <section className="overflow-hidden rounded-3xl bg-[#02031c] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">{nextClass?.status === "current" ? "Current class" : "Next class"}</p>
          <CalendarDays className="h-5 w-5 text-indigo-200" />
        </div>
        {nextClass ? (
          <>
            <h3 className="mt-3 line-clamp-2 text-2xl font-semibold">{nextClass.title}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-300"><Clock3 className="h-4 w-4" />{nextClass.timeLabel}</p>
            {nextClass.room && <p className="mt-1 flex items-center gap-2 text-sm text-zinc-300"><MapPin className="h-4 w-4" />{nextClass.room}</p>}
          </>
        ) : (
          <><h3 className="mt-3 text-xl font-semibold">No class coming up</h3><p className="mt-2 text-sm text-zinc-300">Add your timetable to see what’s next at a glance.</p></>
        )}
        <button onClick={onSchedule} className="mt-4 min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white active:bg-white/20">Open schedule</button>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3"><p className="text-xs text-zinc-500">Due today</p><p className="mt-1 text-2xl font-semibold">{dueToday.length}</p></div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3"><p className="text-xs text-red-700">Missing</p><p className="mt-1 text-2xl font-semibold text-red-800">{missing.length}</p></div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3"><p className="text-xs text-zinc-500">Completed</p><p className="mt-1 text-2xl font-semibold">{completedCount}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onAddTask} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 font-semibold text-white"><Plus className="h-5 w-5" />Add task</button>
        <button onClick={onTasks} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-800">View tasks<ArrowRight className="h-4 w-4" /></button>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-semibold"><Clock3 className="h-5 w-5 text-indigo-600" />Due today</h3><button onClick={onTasks} className="min-h-11 px-2 text-sm font-semibold text-indigo-700">See all</button></div>
        <div className="space-y-2">{dueToday.length ? dueToday.slice(0, 3).map((task) => <CompactTask key={task.id} task={task} tone="normal" onEdit={() => onEditTask(task.id)} />) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" /><p className="mt-2 font-medium">Nothing due today</p></div>}</div>
      </section>

      {missing.length > 0 && <section><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-semibold text-red-800"><AlertTriangle className="h-5 w-5" />Missing</h3><button onClick={onTasks} className="min-h-11 px-2 text-sm font-semibold text-red-700">Review all</button></div><div className="space-y-2">{missing.slice(0, 3).map((task) => <CompactTask key={task.id} task={task} tone="missing" onEdit={() => onEditTask(task.id)} />)}</div></section>}

      <section><h3 className="mb-3 text-lg font-semibold">Coming up</h3><div className="space-y-2">{upcoming.length ? upcoming.slice(0, 3).map((task) => <CompactTask key={task.id} task={task} tone="normal" onEdit={() => onEditTask(task.id)} />) : <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-500">No upcoming assignments yet.</p>}</div></section>
    </div>
  );
}
