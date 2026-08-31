import { CalendarDays, GraduationCap, Home, ListTodo, Menu } from "lucide-react";

type Props = {
  activeTab: string;
  onNavigate: (tab: "dashboard" | "tasks" | "schedule" | "grades") => void;
  onMore: () => void;
};

const items = [
  { id: "dashboard" as const, label: "Home", icon: Home },
  { id: "tasks" as const, label: "Tasks", icon: ListTodo },
  { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
  { id: "grades" as const, label: "Grades", icon: GraduationCap },
];

export function MobileBottomNav({ activeTab, onNavigate, onMore }: Props) {
  const moreActive = !items.some((item) => item.id === activeTab);

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} aria-current={active ? "page" : undefined} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${active ? "text-indigo-700" : "text-zinc-500"}`}>
              <span className={`rounded-xl p-1.5 ${active ? "bg-indigo-100" : ""}`}><Icon className="h-5 w-5" /></span>
              {item.label}
            </button>
          );
        })}
        <button onClick={onMore} aria-current={moreActive ? "page" : undefined} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${moreActive ? "text-indigo-700" : "text-zinc-500"}`}>
          <span className={`rounded-xl p-1.5 ${moreActive ? "bg-indigo-100" : ""}`}><Menu className="h-5 w-5" /></span>
          More
        </button>
      </div>
    </nav>
  );
}
