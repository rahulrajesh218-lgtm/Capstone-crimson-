import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import type { ScheduleMeeting, ScheduleMeetingInput } from "../features/schedule/types";
import { MobileSheet } from "./MobileSheet";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const COLORS = [
  { value: "indigo", bar: "bg-indigo-500", soft: "bg-indigo-50 border-indigo-200" },
  { value: "emerald", bar: "bg-emerald-500", soft: "bg-emerald-50 border-emerald-200" },
  { value: "amber", bar: "bg-amber-500", soft: "bg-amber-50 border-amber-200" },
  { value: "rose", bar: "bg-rose-500", soft: "bg-rose-50 border-rose-200" },
  { value: "sky", bar: "bg-sky-500", soft: "bg-sky-50 border-sky-200" },
  { value: "violet", bar: "bg-violet-500", soft: "bg-violet-50 border-violet-200" },
] as const;

const emptyForm: ScheduleMeetingInput = {
  title: "",
  courseCode: "",
  teacher: "",
  room: "",
  color: "indigo",
  icon: "book",
  startTime: "08:30",
  endTime: "09:30",
  days: ["Monday", "Wednesday", "Friday"],
  rotationDays: [],
  notes: "",
};

type Props = {
  meetings: ScheduleMeeting[];
  loading: boolean;
  error: string;
  cardClassName: string;
  primaryButtonClassName: string;
  onSave: (meeting: ScheduleMeeting) => Promise<void> | void;
  onDelete: (meeting: ScheduleMeeting) => Promise<void> | void;
};

function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function currentWeekday() {
  const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return WEEKDAYS.includes(day) ? day : "Monday";
}

function isSameLocalDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function dateForWeekday(anchor: Date, weekday: string) {
  const next = new Date(anchor);
  const mondayOffset = anchor.getDay() === 0 ? -6 : 1 - anchor.getDay();
  next.setDate(anchor.getDate() + mondayOffset + WEEKDAYS.indexOf(weekday));
  return next;
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours || 0, minutes || 0).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function MeetingCard({ meeting, status, onEdit, onDelete }: { meeting: ScheduleMeeting; status?: "current" | "next"; onEdit: () => void; onDelete: () => void }) {
  const palette = COLORS.find((color) => color.value === meeting.color) ?? COLORS[0];
  return (
    <article className={`relative overflow-hidden rounded-2xl border p-4 ${palette.soft} ${status === "current" ? "ring-2 ring-zinc-900/20" : ""}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${palette.bar}`} />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{meeting.title}</h3>
            {status && <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-semibold uppercase tracking-wide">{status}</span>}
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600"><Clock3 className="h-4 w-4" />{formatTime(meeting.startTime)}–{formatTime(meeting.endTime)}</p>
          {(meeting.room || meeting.teacher || meeting.courseCode) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
              {meeting.room && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{meeting.room}</span>}
              {meeting.teacher && <span className="flex items-center gap-1"><UserRound className="h-4 w-4" />{meeting.teacher}</span>}
              {meeting.courseCode && <span className="font-medium">{meeting.courseCode}</span>}
            </div>
          )}
          {meeting.rotationDays.length > 0 && <p className="mt-2 text-xs font-medium text-zinc-500">Rotation: {meeting.rotationDays.join(", ")}</p>}
        </div>
        {meeting.source === "manual" && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEdit} className="min-h-11 min-w-11 rounded-xl bg-white/70 p-2 text-zinc-600 hover:bg-white" aria-label={`Edit ${meeting.title}`}><Pencil className="mx-auto h-4 w-4" /></button>
            <button onClick={onDelete} className="min-h-11 min-w-11 rounded-xl bg-white/70 p-2 text-red-600 hover:bg-white" aria-label={`Delete ${meeting.title}`}><Trash2 className="mx-auto h-4 w-4" /></button>
          </div>
        )}
      </div>
    </article>
  );
}

export function SchedulePage({ meetings, loading, error, cardClassName, primaryButtonClassName, onSave, onDelete }: Props) {
  const today = currentWeekday();
  const [view, setView] = useState<"today" | "week">("today");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleMeetingInput>(emptyForm);
  const [rotationText, setRotationText] = useState("");

  const meetingsByDay = useMemo(() => Object.fromEntries(WEEKDAYS.map((day) => [day, meetings.filter((meeting) => meeting.days.includes(day)).sort((a, b) => a.startTime.localeCompare(b.startTime))])), [meetings]);
  const todayMeetings = meetingsByDay[today] ?? [];
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const currentMeeting = todayMeetings.find((meeting) => minutesFromTime(meeting.startTime) <= nowMinutes && minutesFromTime(meeting.endTime) > nowMinutes);
  const nextMeeting = todayMeetings.find((meeting) => minutesFromTime(meeting.startTime) > nowMinutes);

  const nextMessage = currentMeeting
    ? `Now: ${currentMeeting.title} until ${formatTime(currentMeeting.endTime)}`
    : nextMeeting
      ? `Next: ${nextMeeting.title} in ${minutesFromTime(nextMeeting.startTime) - nowMinutes} min`
      : todayMeetings.length ? "Classes are finished for today." : "No classes scheduled today.";

  const selectedDay = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
  const selectedDateLabel = selectedDate.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  const selectedIsToday = isSameLocalDay(selectedDate, new Date());

  const shiftSelectedDay = (amount: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + amount);
      return next;
    });
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setRotationText("");
    setShowForm(true);
  };

  const openEdit = (meeting: ScheduleMeeting) => {
    setEditingId(meeting.id);
    setForm({ title: meeting.title, courseCode: meeting.courseCode ?? "", teacher: meeting.teacher ?? "", room: meeting.room ?? "", color: meeting.color, icon: meeting.icon, startTime: meeting.startTime, endTime: meeting.endTime, days: meeting.days, rotationDays: meeting.rotationDays, notes: meeting.notes ?? "" });
    setRotationText(meeting.rotationDays.join(", "));
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.startTime || !form.endTime || !form.days.length || form.endTime <= form.startTime) return;
    const existing = meetings.find((meeting) => meeting.id === editingId);
    await onSave({
      ...form,
      id: editingId ?? crypto.randomUUID(),
      title: form.title.trim(),
      courseCode: form.courseCode?.trim(),
      teacher: form.teacher?.trim(),
      room: form.room?.trim(),
      notes: form.notes?.trim(),
      rotationDays: rotationText.split(",").map((value) => value.trim()).filter(Boolean),
      source: existing?.source ?? "manual",
      externalId: existing?.externalId,
      metadata: existing?.metadata,
    });
    setShowForm(false);
  };

  const renderDay = (day: string) => {
    const dayMeetings = meetingsByDay[day] ?? [];
    return dayMeetings.length ? dayMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} status={day === today ? (meeting.id === currentMeeting?.id ? "current" : meeting.id === nextMeeting?.id ? "next" : undefined) : undefined} onEdit={() => openEdit(meeting)} onDelete={() => onDelete(meeting)} />) : <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-center text-sm text-zinc-500">No classes</div>;
  };

  return (
    <div className="space-y-5">
      <section className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClassName}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3"><CalendarDays className="h-7 w-7 text-blue-700" /></div>
            <div><h2 className="text-2xl font-semibold tracking-tight sm:text-[34px]">School Schedule</h2><p className="mt-1 text-sm text-zinc-500 sm:text-base">Your classes, rooms, and times in one place.</p></div>
          </div>
          <button onClick={openNew} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 font-semibold ${primaryButtonClassName}`}><Plus className="h-5 w-5" />Add class</button>
        </div>

        <div className="mt-5 hidden rounded-xl bg-zinc-100 p-1 lg:flex lg:w-fit">
          {(["today", "week"] as const).map((option) => <button key={option} onClick={() => setView(option)} className={`min-h-11 flex-1 rounded-lg px-5 font-semibold capitalize sm:flex-none ${view === option ? "bg-white shadow-sm" : "text-zinc-500"}`}>{option}</button>)}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {loading ? <div className={`rounded-2xl border p-8 text-center text-zinc-500 ${cardClassName}`}>Loading your schedule…</div> : (
        <>
          <section className={`rounded-2xl border p-4 shadow-sm lg:hidden ${cardClassName}`}>
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => shiftSelectedDay(-1)} className="min-h-11 min-w-11 rounded-xl border border-zinc-200" aria-label="Previous day"><ChevronLeft className="mx-auto h-5 w-5" /></button>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold uppercase tracking-wide text-zinc-500">{selectedDay}</p>
                <h3 className="truncate text-xl font-semibold">{selectedDateLabel}</h3>
              </div>
              <button onClick={() => shiftSelectedDay(1)} className="min-h-11 min-w-11 rounded-xl border border-zinc-200" aria-label="Next day"><ChevronRight className="mx-auto h-5 w-5" /></button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {WEEKDAYS.map((day) => <button key={day} onClick={() => setSelectedDate((current) => dateForWeekday(current, day))} className={`min-h-11 min-w-12 shrink-0 rounded-xl px-3 text-sm font-semibold ${selectedDay === day ? "bg-[#02031c] text-white" : "bg-zinc-100 text-zinc-700"}`}>{day.slice(0, 3)}</button>)}
            </div>
            {!selectedIsToday && <button onClick={() => setSelectedDate(new Date())} className="mb-4 min-h-11 w-full rounded-xl border border-zinc-200 font-semibold">Today</button>}
            {selectedIsToday && <p className="mb-4 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600">{nextMessage}</p>}
            <div className="space-y-3">{renderDay(selectedDay)}</div>
          </section>

          <div className="hidden lg:block">
          {view === "today" ? (
        <section className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClassName}`}>
          <div className="mb-5"><p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{today}</p><h3 className="mt-1 text-2xl font-semibold">{nextMessage}</h3></div>
          <div className="space-y-3">{renderDay(today)}</div>
        </section>
      ) : (
        <section className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${cardClassName}`}>
          <div className="grid grid-cols-5 gap-3">
            {WEEKDAYS.slice(0, 5).map((day) => <div key={day} className="min-w-0"><h3 className="mb-3 text-center font-semibold">{day}</h3><div className="space-y-3">{renderDay(day)}</div></div>)}
          </div>
          {(meetingsByDay.Saturday?.length || meetingsByDay.Sunday?.length) ? <div className="mt-5 hidden grid-cols-2 gap-3 border-t border-zinc-200 pt-5 lg:grid">{WEEKDAYS.slice(5).map((day) => <div key={day}><h3 className="mb-3 font-semibold">{day}</h3><div className="space-y-3">{renderDay(day)}</div></div>)}</div> : null}
        </section>
      )}
          </div>
        </>
      )}

      {!loading && !meetings.length && <section className={`rounded-2xl border border-dashed p-8 text-center ${cardClassName}`}><CalendarDays className="mx-auto h-10 w-10 text-zinc-400" /><h3 className="mt-3 text-xl font-semibold">Build your timetable once</h3><p className="mx-auto mt-2 max-w-lg text-zinc-500">Add a class, choose all the days it meets, and Zentaskra will place every occurrence in your week.</p><button onClick={openNew} className={`mt-5 min-h-11 rounded-xl px-5 font-semibold ${primaryButtonClassName}`}>Add your first class</button></section>}

      {showForm && (
        <MobileSheet open title={editingId ? "Edit class" : "Add class"} description="One entry can repeat across several weekdays." onClose={() => setShowForm(false)} className="sm:max-w-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-sm font-medium text-zinc-600">Class name *</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="AP Physics" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /></label>
              <label><span className="text-sm font-medium text-zinc-600">Course code</span><input value={form.courseCode} onChange={(event) => setForm((current) => ({ ...current, courseCode: event.target.value }))} placeholder="PHY4U" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /></label>
              <label><span className="text-sm font-medium text-zinc-600">Teacher</span><input value={form.teacher} onChange={(event) => setForm((current) => ({ ...current, teacher: event.target.value }))} placeholder="Ms. Chen" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /></label>
              <label><span className="text-sm font-medium text-zinc-600">Room / location</span><input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Room 204" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /></label>
              <label><span className="text-sm font-medium text-zinc-600">Color</span><select value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 capitalize outline-none">{COLORS.map((color) => <option key={color.value} value={color.value}>{color.value}</option>)}</select></label>
              <label><span className="text-sm font-medium text-zinc-600">Starts *</span><input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /></label>
              <label><span className="text-sm font-medium text-zinc-600">Ends *</span><input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /></label>
              <fieldset className="sm:col-span-2"><legend className="text-sm font-medium text-zinc-600">Meeting days *</legend><div className="mt-2 flex flex-wrap gap-2">{WEEKDAYS.map((day) => { const selected = form.days.includes(day); return <button type="button" key={day} onClick={() => setForm((current) => ({ ...current, days: selected ? current.days.filter((value) => value !== day) : [...current.days, day] }))} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${selected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200"}`}>{day.slice(0, 3)}</button>; })}</div></fieldset>
              <label className="sm:col-span-2"><span className="text-sm font-medium text-zinc-600">Rotation days <span className="font-normal text-zinc-400">(optional)</span></span><input value={rotationText} onChange={(event) => setRotationText(event.target.value)} placeholder="Day A, Day C or Week 1" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" /><span className="mt-1 block text-xs text-zinc-400">Separate labels with commas. They are preserved for rotating timetables.</span></label>
              <label className="sm:col-span-2"><span className="text-sm font-medium text-zinc-600">Notes</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" placeholder="Lab materials, pickup notes…" /></label>
            </div>
            <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:p-0"><button onClick={() => setShowForm(false)} className="min-h-11 rounded-xl border border-zinc-300 px-5 font-semibold">Cancel</button><button onClick={submit} className="min-h-11 rounded-xl bg-[#02031c] px-5 font-semibold text-white">Save class</button></div>
        </MobileSheet>
      )}
    </div>
  );
}
