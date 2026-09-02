export type XpEvent = { eventKey: string; eventType: string; xp: number; occurredOn: string };

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateProgress(events: XpEvent[], now = new Date()) {
  const lifetimeXp = events.reduce((sum, event) => sum + event.xp, 0);
  const level = Math.floor(Math.sqrt(lifetimeXp / 100)) + 1;
  const levelStartXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const levelProgress = nextLevelXp === levelStartXp ? 0 : ((lifetimeXp - levelStartXp) / (nextLevelXp - levelStartXp)) * 100;
  const monday = new Date(now);
  const offset = now.getDay() === 0 ? -6 : 1 - now.getDay();
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  const weeklyXp = events.filter((event) => new Date(`${event.occurredOn}T12:00:00`).getTime() >= monday.getTime()).reduce((sum, event) => sum + event.xp, 0);
  const activeDays = new Set(events.map((event) => event.occurredOn));
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return { lifetimeXp, weeklyXp, level, levelProgress: Math.max(0, Math.min(100, levelProgress)), nextLevelXp, streak };
}
