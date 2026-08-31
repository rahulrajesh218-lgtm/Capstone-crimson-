import { useState } from "react";
import { Folder, Pencil, Plus, Trash2 } from "lucide-react";
import { MobileSheet } from "./MobileSheet";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type TaskCategory,
} from "../features/tasks/categories";

type Props = {
  categories: TaskCategory[];
  onClose: () => void;
  onSave: (category: TaskCategory) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function CategoryManager({ categories, onClose, onSave, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("indigo");
  const [icon, setIcon] = useState("book");

  const reset = () => {
    setEditingId(null);
    setName("");
    setColor("indigo");
    setIcon("book");
  };

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await onSave({ id: editingId ?? crypto.randomUUID(), name: trimmedName, color, icon });
    reset();
  };

  return (
    <MobileSheet
      open
      title="Task Categories"
      description="Use a few clear labels to keep assignments organized."
      onClose={onClose}
      className="sm:max-w-xl"
    >
        <div className="rounded-2xl border border-zinc-200 p-4">
          <label className="block text-sm font-medium text-zinc-600">
            Category name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="School, SAT, AP Physics…" className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none" />
          </label>

          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-600">Color</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((option) => (
                <button key={option.value} onClick={() => setColor(option.value)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${color === option.value ? "border-zinc-900 bg-zinc-100" : "border-zinc-200"}`}>
                  <span className={`mr-2 inline-block h-3 w-3 rounded-full ${option.dot}`} />{option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-zinc-600">
            Icon
            <select value={icon} onChange={(event) => setIcon(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 capitalize outline-none">
              {CATEGORY_ICONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {editingId && <button onClick={reset} className="min-h-11 rounded-xl border border-zinc-300 px-4 font-semibold">Cancel edit</button>}
            <button onClick={submit} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#02031c] px-5 font-semibold text-white">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? "Save changes" : "Add category"}
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {categories.length ? categories.map((category) => {
            const colorOption = CATEGORY_COLORS.find((option) => option.value === category.color);
            return (
              <div key={category.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                <span className={`h-4 w-4 shrink-0 rounded-full ${colorOption?.dot ?? "bg-zinc-400"}`} />
                <Folder className="h-5 w-5 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate font-semibold">{category.name}</span>
                <button onClick={() => { setEditingId(category.id); setName(category.name); setColor(category.color); setIcon(category.icon); }} className="min-h-11 min-w-11 rounded-lg p-2 text-zinc-600 hover:bg-zinc-100" aria-label={`Edit ${category.name}`}><Pencil className="mx-auto h-4 w-4" /></button>
                <button onClick={() => onDelete(category.id)} className="min-h-11 min-w-11 rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${category.name}`}><Trash2 className="mx-auto h-4 w-4" /></button>
              </div>
            );
          }) : <p className="rounded-xl border border-dashed border-zinc-300 p-5 text-center text-zinc-500">No categories yet. They are optional.</p>}
        </div>
    </MobileSheet>
  );
}
