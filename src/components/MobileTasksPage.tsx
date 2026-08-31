import { useState } from "react";
import { AlertTriangle, CheckCircle2, FolderKanban, Pencil, Plus } from "lucide-react";
import { categoryBadgeClass, type TaskCategory } from "../features/tasks/categories";

export type MobileTask = {
  id: number;
  title: string;
  subject: string;
  categoryId?: string;
  dueLabel: string;
  progress: number;
  missing: boolean;
};

type Props = {
  tasks: MobileTask[];
  categories: TaskCategory[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: number) => void;
  onComplete: (id: number) => void;
  onManageCategories: () => void;
};

export function MobileTasksPage({ tasks, categories, selectedCategory, onCategoryChange, onAdd, onEdit, onComplete, onManageCategories }: Props) {
  const [mode, setMode] = useState<"all" | "missing">("all");
  const filtered = tasks.filter((task) => (mode === "missing" ? task.missing : true) && (selectedCategory === "all" || task.categoryId === selectedCategory));

  return (
    <div className="space-y-4 md:hidden">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-indigo-700">Assignments</p><h2 className="mt-1 text-2xl font-semibold">Your tasks</h2></div>
        <button onClick={onAdd} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#02031c] px-4 font-semibold text-white"><Plus className="h-5 w-5" />Add</button>
      </header>

      <div className="grid grid-cols-2 rounded-xl bg-zinc-200/70 p-1">
        <button onClick={() => setMode("all")} className={`min-h-11 rounded-lg font-semibold ${mode === "all" ? "bg-white shadow-sm" : "text-zinc-500"}`}>All ({tasks.length})</button>
        <button onClick={() => setMode("missing")} className={`min-h-11 rounded-lg font-semibold ${mode === "missing" ? "bg-white text-red-700 shadow-sm" : "text-zinc-500"}`}>Missing ({tasks.filter((task) => task.missing).length})</button>
      </div>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button onClick={() => onCategoryChange("all")} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${selectedCategory === "all" ? "bg-indigo-600 text-white" : "border border-zinc-300 bg-white text-zinc-700"}`}>All categories</button>
        {categories.map((category) => <button key={category.id} onClick={() => onCategoryChange(category.id)} className={`min-h-11 max-w-48 shrink-0 truncate rounded-full px-4 text-sm font-semibold ${selectedCategory === category.id ? "bg-indigo-600 text-white" : "border border-zinc-300 bg-white text-zinc-700"}`}>{category.name}</button>)}
      </div>

      <button onClick={onManageCategories} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700"><FolderKanban className="h-4 w-4" />Manage categories</button>

      <div className="space-y-3">
        {filtered.length ? filtered.map((task) => {
          const category = categories.find((item) => item.id === task.categoryId);
          return (
            <article key={task.id} className={`rounded-2xl border p-4 ${task.missing ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1 rounded-full p-1.5 ${task.missing ? "bg-red-100 text-red-700" : task.progress >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>{task.missing ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-semibold leading-snug">{task.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs"><span className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-zinc-600">{task.subject}</span>{category && <span className={`max-w-full truncate rounded-full px-2.5 py-1 ${categoryBadgeClass(category.color)}`}>{category.name}</span>}{task.missing && <span className="rounded-full bg-red-600 px-2.5 py-1 font-semibold text-white">Missing</span>}</div>
                  <p className={`mt-2 text-sm font-medium ${task.missing ? "text-red-700" : "text-zinc-500"}`}>{task.dueLabel}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${task.progress}%` }} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => onEdit(task.id)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 font-semibold text-zinc-700"><Pencil className="h-4 w-4" />{task.missing ? "Reschedule" : "Edit"}</button>
                <button onClick={() => onComplete(task.id)} className="min-h-11 rounded-xl bg-[#02031c] px-3 font-semibold text-white">Complete</button>
              </div>
            </article>
          );
        }) : <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><h3 className="mt-3 font-semibold">{mode === "missing" ? "No missing work" : "No tasks here"}</h3><p className="mt-1 text-sm text-zinc-500">{mode === "missing" ? "You’re caught up." : "Try another category or add an assignment."}</p></div>}
      </div>
    </div>
  );
}
