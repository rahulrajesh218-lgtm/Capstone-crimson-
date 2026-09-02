import { Flame, Sparkles, Trophy } from "lucide-react";

type Props = { level: number; lifetimeXp: number; weeklyXp: number; streak: number; levelProgress: number; nextLevelXp: number; guest: boolean };

export function ProductivityProgress({ level, lifetimeXp, weeklyXp, streak, levelProgress, nextLevelXp, guest }: Props) {
  return <section className="mb-5 rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white shadow-lg shadow-indigo-600/15 md:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white/15 p-3"><Trophy className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">Productivity level</p><p className="mt-1 text-2xl font-semibold">Level {level} <span className="text-base font-medium text-indigo-100">· {lifetimeXp.toLocaleString()} XP</span></p></div></div><div className="grid grid-cols-2 gap-3 sm:flex"><div className="rounded-2xl bg-white/10 px-4 py-3"><p className="flex items-center gap-1 text-xs text-indigo-100"><Sparkles className="h-3.5 w-3.5" />This week</p><p className="mt-1 text-lg font-semibold">{weeklyXp} XP</p></div><div className="rounded-2xl bg-white/10 px-4 py-3"><p className="flex items-center gap-1 text-xs text-indigo-100"><Flame className="h-3.5 w-3.5" />Activity streak</p><p className="mt-1 text-lg font-semibold">{streak} day{streak === 1 ? "" : "s"}</p></div></div></div>
    <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${levelProgress}%` }} /></div><div className="mt-2 flex justify-between text-xs text-indigo-100"><span>Progress to Level {level + 1}</span><span>{nextLevelXp - lifetimeXp} XP to go</span></div></div>
    {guest && <p className="mt-3 text-xs text-indigo-100">Guest progress stays on this device. Create an account to join the global leaderboard.</p>}
  </section>;
}
