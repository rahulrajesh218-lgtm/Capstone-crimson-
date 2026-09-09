import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = { "Content-Type": "application/json" };
const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; timezone: string };
type Preference = { user_id: string; push_enabled: boolean; due_today: boolean; due_tomorrow: boolean; overdue: boolean; class_reminders: boolean; class_reminder_minutes: number };
type Candidate = { key: string; title: string; body: string; target: "tasks" | "schedule"; entityId: string };

const localParts = (date: Date, timezone: string) => Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
);
const dayKey = (parts: Record<string, string>) => `${parts.year}-${parts.month}-${parts.day}`;
const addDays = (key: string, days: number) => {
  const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
};

Deno.serve(async (request) => {
  try {
    if (request.headers.get("x-cron-secret") !== required("CRON_SECRET")) return new Response("Unauthorized", { status: 401 });
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"));
    webpush.setVapidDetails("mailto:support@zentaskra.com", required("VAPID_PUBLIC_KEY"), required("VAPID_PRIVATE_KEY"));
    const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth,timezone");
    if (subscriptionError) throw subscriptionError;
    if (!subscriptions?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });

    const userIds = [...new Set(subscriptions.map((item: Subscription) => item.user_id))];
    const [{ data: preferences }, { data: tasks }, { data: meetings }, { data: deliveries }] = await Promise.all([
      supabase.from("notification_preferences").select("user_id,push_enabled,due_today,due_tomorrow,overdue,class_reminders,class_reminder_minutes").in("user_id", userIds),
      supabase.from("tasks").select("id,user_id,title,subject,due,status,archived").in("user_id", userIds).neq("status", "completed").eq("archived", false),
      supabase.from("schedule_meetings").select("id,user_id,title,room,start_time,days").in("user_id", userIds),
      supabase.from("push_deliveries").select("subscription_id,event_key").gte("delivered_at", new Date(Date.now() - 8 * 86400000).toISOString()),
    ]);
    const preferenceMap = new Map((preferences ?? []).map((item: Preference) => [item.user_id, item]));
    const sentKeys = new Set((deliveries ?? []).map((item) => `${item.subscription_id}|${item.event_key}`));
    let sent = 0;

    for (const subscription of subscriptions as Subscription[]) {
      const preference = preferenceMap.get(subscription.user_id);
      if (!preference?.push_enabled) continue;
      const now = new Date();
      const parts = localParts(now, subscription.timezone || "UTC");
      const today = dayKey(parts); const tomorrow = addDays(today, 1);
      const candidates: Candidate[] = [];
      for (const task of (tasks ?? []).filter((item) => item.user_id === subscription.user_id)) {
        const [dueDate, dueTime = "23:59"] = String(task.due ?? "").split("|");
        const minuteNow = Number(parts.hour) * 60 + Number(parts.minute);
        const [hour, minute] = dueTime.split(":").map(Number);
        const overdue = dueDate < today || (dueDate === today && hour * 60 + minute < minuteNow);
        const subject = task.subject ? ` for ${task.subject}` : "";
        if (overdue && preference.overdue) candidates.push({ key: `overdue:${task.id}:${task.due}`, title: `Missing: ${task.title}`, body: `This assignment${subject} is overdue.`, target: "tasks", entityId: String(task.id) });
        else if (dueDate === today && preference.due_today && minuteNow >= 8 * 60) candidates.push({ key: `today:${task.id}:${task.due}`, title: `Due today: ${task.title}`, body: `Due${subject} at ${dueTime}.`, target: "tasks", entityId: String(task.id) });
        else if (dueDate === tomorrow && preference.due_tomorrow && minuteNow >= 18 * 60) candidates.push({ key: `tomorrow:${task.id}:${task.due}`, title: `Due tomorrow: ${task.title}`, body: `Due${subject} tomorrow at ${dueTime}.`, target: "tasks", entityId: String(task.id) });
      }
      if (preference.class_reminders) for (const meeting of (meetings ?? []).filter((item) => item.user_id === subscription.user_id && item.days?.includes(parts.weekday))) {
        const [hour, minute] = String(meeting.start_time).split(":").map(Number);
        const until = hour * 60 + minute - (Number(parts.hour) * 60 + Number(parts.minute));
        if (until >= 0 && until <= preference.class_reminder_minutes) candidates.push({ key: `class:${meeting.id}:${today}:${meeting.start_time}`, title: `${meeting.title} starts soon`, body: `${until === 0 ? "Starting now" : `Starts in ${until} min`}${meeting.room ? ` · ${meeting.room}` : ""}.`, target: "schedule", entityId: String(meeting.id) });
      }

      for (const candidate of candidates) {
        if (sentKeys.has(`${subscription.id}|${candidate.key}`)) continue;
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ ...candidate, icon: "/icons/pwa-192.png", badge: "/icons/pwa-192.png" }), { TTL: 86400, urgency: candidate.target === "schedule" ? "high" : "normal" });
          await supabase.from("push_deliveries").insert({ subscription_id: subscription.id, event_key: candidate.key });
          sentKeys.add(`${subscription.id}|${candidate.key}`); sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          else console.error("Push delivery failed", subscription.id, error);
        }
      }
    }
    await supabase.from("push_deliveries").delete().lt("delivered_at", new Date(Date.now() - 35 * 86400000).toISOString());
    return new Response(JSON.stringify({ sent }), { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
