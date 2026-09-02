import { CalendarDays, CheckCircle2, Clock3, Pencil, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export type PlannerSession = { id: number; day: string; subject: string; topic: string; time: string; duration: number; sourceTaskId?: number; completedAt?: string };
export type PlannerGoal = { id: number; text: string; done: boolean };

type Props = {
  sessions: PlannerSession[]; goals: PlannerGoal[]; weeklyHours: number;
  onGenerate: (minutes: number) => void; onAdd: () => void; onEdit: (session: PlannerSession) => void;
  onDelete: (id: number) => void; onComplete: (id: number) => void; onAddGoal: (text: string) => void;
  onToggleGoal: (id: number) => void; onDeleteGoal: (id: number) => void;
};

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours || 0, minutes || 0).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function endTime(time: string, duration: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(2000, 0, 1, hours || 0, minutes || 0);
  value.setMinutes(value.getMinutes() + duration);
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function SessionCard({ session, onEdit, onDelete, onComplete }: { session: PlannerSession; onEdit: () => void; onDelete: () => void; onComplete: () => void }) {
  const complete = Boolean(session.completedAt);
  return <article className={`rounded-2xl border p-4 ${complete ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-indigo-700">{formatTime(session.time)}–{endTime(session.time, session.duration)}</p><h3 className={`mt-1 line-clamp-2 text-lg font-semibold text-zinc-950 ${complete ? "line-through opacity-60" : ""}`}>{session.subject}</h3><p className="mt-1 line-clamp-2 text-sm text-zinc-600">{session.topic}</p></div><div className="flex shrink-0 gap-1"><button onClick={onEdit} className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100" aria-label={`Edit ${session.subject}`}><Pencil className="h-4 w-4" /></button><button onClick={onDelete} className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50" aria-label={`Delete ${session.subject}`}><Trash2 className="h-4 w-4" /></button></div></div>
    <button onClick={onComplete} className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold ${complete ? "bg-emerald-100 text-emerald-800" : "bg-zinc-950 text-white"}`}><CheckCircle2 className="h-4 w-4" />{complete ? "Completed" : "Mark study session complete"}</button>
  </article>;
}

export function StudyPlanner({ sessions, goals, weeklyHours, onGenerate, onAdd, onEdit, onDelete, onComplete, onAddGoal, onToggleGoal, onDeleteGoal }: Props) {
  const [view, setView] = useState<"today" | "week">("today");
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [goalText, setGoalText] = useState("");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todaySessions = useMemo(() => sessions.filter((session) => session.day === today).sort((a, b) => a.time.localeCompare(b.time)), [sessions, today]);
  const completed = sessions.filter((session) => session.completedAt).length;

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-indigo-700">INTELLIGENT STUDY PLANNING</p><h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">What should I study today?</h2><p className="mt-2 max-w-2xl text-zinc-500">Turn your real assignments and deadlines into a realistic, ordered plan.</p></div><button onClick={onAdd} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 font-semibold"><Plus className="h-5 w-5" />Add session</button></header>

    <section className="rounded-3xl bg-[#05051f] p-5 text-white shadow-lg sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-indigo-200"><Sparkles className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wider">Build today’s plan</span></div><h3 className="mt-2 text-2xl font-semibold">How much time do you have?</h3><p className="mt-1 text-sm text-zinc-300">Urgent and missing assignments are scheduled first, with short breaks.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex min-h-12 items-center gap-2 rounded-xl bg-white/10 px-4"><Clock3 className="h-4 w-4 text-indigo-200" /><select value={availableMinutes} onChange={(event) => setAvailableMinutes(Number(event.target.value))} className="bg-transparent font-semibold text-white outline-none"><option className="text-zinc-950" value={30}>30 minutes</option><option className="text-zinc-950" value={60}>1 hour</option><option className="text-zinc-950" value={90}>1.5 hours</option><option className="text-zinc-950" value={120}>2 hours</option><option className="text-zinc-950" value={180}>3 hours</option></select></label><button onClick={() => onGenerate(availableMinutes)} className="min-h-12 rounded-xl bg-indigo-500 px-5 font-semibold hover:bg-indigo-400">Generate my plan</button></div></div></section>

    <div className="grid grid-cols-3 gap-2 sm:gap-4"><div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-5"><p className="text-xs text-zinc-500 sm:text-sm">Sessions</p><p className="mt-1 text-2xl font-semibold">{sessions.length}</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-5"><p className="text-xs text-zinc-500 sm:text-sm">Weekly hours</p><p className="mt-1 text-2xl font-semibold">{weeklyHours.toFixed(1)}</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-5"><p className="text-xs text-zinc-500 sm:text-sm">Completed</p><p className="mt-1 text-2xl font-semibold">{completed}</p></div></div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="text-2xl font-semibold">{view === "today" ? "Today’s Study Plan" : "Weekly Plan"}</h3><p className="mt-1 text-sm text-zinc-500">{view === "today" ? `${today} · ${todaySessions.reduce((sum, item) => sum + item.duration, 0)} planned minutes` : "Your study blocks across the week"}</p></div><div className="flex rounded-xl bg-zinc-100 p-1"><button onClick={() => setView("today")} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${view === "today" ? "bg-white text-indigo-700 shadow-sm" : "text-zinc-500"}`}>Today</button><button onClick={() => setView("week")} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${view === "week" ? "bg-white text-indigo-700 shadow-sm" : "text-zinc-500"}`}>Week</button></div></div>
        {view === "today" ? <div className="space-y-3">{todaySessions.map((session) => <SessionCard key={session.id} session={session} onEdit={() => onEdit(session)} onDelete={() => onDelete(session.id)} onComplete={() => onComplete(session.id)} />)}{todaySessions.length === 0 && <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center"><CalendarDays className="mx-auto h-8 w-8 text-indigo-500" /><p className="mt-3 font-semibold">No study plan for today</p><p className="mt-1 text-sm text-zinc-500">Tell Zentaskra how much time you have and generate a focused plan.</p></div>}</div> : <div className="space-y-6">{weekDays.map((day) => { const items = sessions.filter((session) => session.day === day).sort((a, b) => a.time.localeCompare(b.time)); if (!items.length) return null; return <div key={day}><h4 className="mb-2 font-semibold">{day}</h4><div className="grid gap-3 lg:grid-cols-2">{items.map((session) => <SessionCard key={session.id} session={session} onEdit={() => onEdit(session)} onDelete={() => onDelete(session.id)} onComplete={() => onComplete(session.id)} />)}</div></div>; })}{sessions.length === 0 && <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">No study sessions yet.</p>}</div>}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h3 className="text-2xl font-semibold">Study Goals</h3><p className="mt-1 text-sm text-zinc-500">Keep the bigger picture visible.</p></div><Target className="h-6 w-6 text-indigo-600" /></div><div className="mt-4 flex gap-2"><input value={goalText} onChange={(event) => setGoalText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && goalText.trim()) { onAddGoal(goalText.trim()); setGoalText(""); } }} placeholder="Add a goal" className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-3" /><button onClick={() => { if (goalText.trim()) { onAddGoal(goalText.trim()); setGoalText(""); } }} className="min-h-11 min-w-11 rounded-xl bg-indigo-600 text-white" aria-label="Add study goal"><Plus className="mx-auto h-5 w-5" /></button></div><div className="mt-4 space-y-2">{goals.map((goal) => <div key={goal.id} className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3"><button onClick={() => onToggleGoal(goal.id)} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left"><CheckCircle2 className={`h-5 w-5 shrink-0 ${goal.done ? "fill-emerald-500 text-emerald-500" : "text-zinc-400"}`} /><span className={`text-sm font-medium ${goal.done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>{goal.text}</span></button><button onClick={() => onDeleteGoal(goal.id)} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-red-500" aria-label={`Delete ${goal.text}`}><Trash2 className="h-4 w-4" /></button></div>)}{goals.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">No study goals yet.</p>}</div></section>
    </div>
  </div>;
}
