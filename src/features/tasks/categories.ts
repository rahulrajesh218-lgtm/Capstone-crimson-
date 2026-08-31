export type TaskCategory = {
  id: string;
  userId?: string;
  name: string;
  color: string;
  icon: string;
};

export const CATEGORY_COLORS = [
  { value: "indigo", label: "Indigo", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800" },
  { value: "emerald", label: "Emerald", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  { value: "amber", label: "Amber", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  { value: "rose", label: "Rose", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800" },
  { value: "sky", label: "Sky", dot: "bg-sky-500", badge: "bg-sky-100 text-sky-800" },
  { value: "violet", label: "Violet", dot: "bg-violet-500", badge: "bg-violet-100 text-violet-800" },
] as const;

export const CATEGORY_ICONS = ["book", "user", "target", "users", "folder"] as const;

export function categoryBadgeClass(color: string) {
  return CATEGORY_COLORS.find((option) => option.value === color)?.badge ?? "bg-zinc-100 text-zinc-700";
}

