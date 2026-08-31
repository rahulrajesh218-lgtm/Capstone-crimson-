import React, { useEffect, useMemo, useState } from "react";
import { Analytics } from '@vercel/analytics/react';
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { CategoryManager } from "./components/CategoryManager";
import { DesktopDashboard } from "./components/DesktopDashboard";
import { InstallAppCard } from "./components/InstallAppCard";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { MobileDashboard } from "./components/MobileDashboard";
import { MobileGradesPage } from "./components/MobileGradesPage";
import { MobileSheet } from "./components/MobileSheet";
import { MobileTasksPage } from "./components/MobileTasksPage";
import { SchedulePage } from "./components/SchedulePage";
import { blackbaudScheduleProvider } from "./features/schedule/providers";
import type { ScheduleMeeting } from "./features/schedule/types";
import { categoryBadgeClass, type TaskCategory } from "./features/tasks/categories";
import { usePwaInstall } from "./pwa";
import {
  LayoutGrid,
  MessageSquare,
  CalendarDays,
  Clock3,
  CircleAlert,
  CheckCircle2,
  Bot,
  Send,
  Sparkles,
  Plus,
  Target,
  Trash2,
  Bell,
  Settings,
  X,
  Pencil,
  Flame,
  GraduationCap,
Calculator,
FolderKanban,
Plug,
Menu,
} from "lucide-react";

type TaskStatus = "upcoming" | "in-progress" | "completed";
type Priority = "high" | "medium" | "low";
type Tab = "dashboard" | "tasks" | "schedule" | "chat" | "planner" | "grades" | "settings";
type Theme = "light" | "dark" | "forest" | "sunset" | "ocean" | "lavender" | "midnight" | "rose" | "slate";

type ReminderItem = {
  id: number;
  value: string;
  createdAt: number;
};

type Task = {
  id: number;
  user_id?: string;
  title: string;
  subject: string;
  dueDate: string;
  dueTime?: string;
  dueIn?: number;
  status: TaskStatus;
  priority: Priority;
  details: string;
  progress: number;
  archived?: boolean;
  reminders?: ReminderItem[];
  completedAt?: string;
  categoryId?: string;
};

type StudySession = {
  id: number;
  day: string;
  subject: string;
  topic: string;
  time: string;
  duration: number;
};

type Goal = {
  id: number;
  text: string;
  done: boolean;
};

type MessageMeta = {
  type?: "study-plan-draft" | "study-plan-revision" | "study-plan-confirmation";
};

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  meta?: MessageMeta;
};

type SessionForm = {
  subject: string;
  topic: string;
  day: string;
  time: string;
  duration: string;
};

type TaskForm = {
  title: string;
  subject: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  details: string;
  progress: string;
  categoryId: string;
};

type StudyPlanDraftItem = {
  day: string;
  subject: string;
  topic: string;
  time: string;
  duration: number;
};

type StudyPlanFlow = {
  stage: "idle" | "drafted" | "revised" | "awaiting-confirmation";
  draft: StudyPlanDraftItem[];
  lastInstruction: string;
};

type UploadedStudyFile = {
  name: string;
  content: string;
};

type ChatMode = "normal" | "quiz";
type GradeAssessment = {
  id: number;
  name: string;
  score: number;
  total: number;
  factor: number;
};

type GradeCourse = {
  id: number;
  name: string;
  goal: number;
  assessments: GradeAssessment[];
};

type CourseForm = {
  name: string;
  goal: string;
};

type AssessmentForm = {
  courseId: string;
  name: string;
  score: string;
  total: string;
  factor: string;
};

const STORAGE_KEYS = {
  guestMode: "zentaskra_guest_mode_v1",
  tasks: "zentaskra_tasks_v7",
  sessions: "zentaskra_sessions_v2",
  goals: "zentaskra_goals_v2",
  messages: "zentaskra_messages_v2",
  studyPlanFlow: "zentaskra_study_plan_flow_v2",
  theme: "zentaskra_theme_v1",
  grades: "zentaskra_grades_v1",
  categories: "zentaskra_categories_v1",
  schedule: "zentaskra_schedule_v1",
};

const progressSteps = [0, 25, 50, 75, 100];



const defaultSessions: StudySession[] = [];
const defaultGoals: Goal[] = [];
const defaultMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "I’m your Zentaskra study assistant. I can look at your real tasks, deadlines, priorities, and progress to help you decide what to do first, make study plans, and recover when your workload gets heavy.",
  },
];

const defaultStudyPlanFlow: StudyPlanFlow = {
  stage: "idle",
  draft: [],
  lastInstruction: "",
};

const suggestions = [
  "What assignments are due this week?",
  "What should I work on first tonight?",
  "I'm overwhelmed — help me make a recovery plan",
  "Make me a study plan",
];

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyTaskForm: TaskForm = {
  title: "",
  subject: "",
  dueDate: "",
  dueTime: "23:59",
  priority: "medium",
  details: "",
  progress: "0",
  categoryId: "",
};

const emptySessionForm: SessionForm = {
  subject: "",
  topic: "",
  day: "Monday",
  time: "16:00",
  duration: "60",
};

const emptyCourseForm: CourseForm = {
  name: "",
  goal: "95",
};

const emptyAssessmentForm: AssessmentForm = {
  courseId: "",
  name: "",
  score: "",
  total: "100",
  factor: "1",
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function priorityDotColor(priority: Priority) {
  if (priority === "high") return "bg-red-500";
  if (priority === "medium") return "bg-yellow-500";
  return "bg-green-500";
}

function progressFillColor(priority: Priority) {
  if (priority === "high") return "bg-[#02031c]";
  if (priority === "medium") return "bg-yellow-500";
  return "bg-green-500";
}

function progressLabel(progress: number) {
  if (progress >= 100) return "Done";
  if (progress >= 75) return "Almost done";
  if (progress >= 50) return "Halfway there";
  if (progress >= 25) return "Started";
  return "Not started";
}

function snapProgress(value: number) {
  return progressSteps.reduce((closest, step) =>
    Math.abs(step - value) < Math.abs(closest - value) ? step : closest
  );
}

function getTaskStatus(progress: number): TaskStatus {
  if (progress >= 100) return "completed";
  if (progress > 0) return "in-progress";
  return "upcoming";
}

function normalizeTasks(rawTasks: Task[]): Task[] {
  return rawTasks.map((task) => {
    const progress =
      typeof task.progress === "number"
        ? Math.max(0, Math.min(100, task.progress))
        : task.status === "completed"
          ? 100
          : task.status === "in-progress"
            ? 25
            : 0;

    const dueDate =
      typeof task.dueDate === "string" && task.dueDate
        ? task.dueDate
        : formatDateInput(addDays(startOfDay(new Date()), Math.max(1, Number(task.dueIn ?? 1))));

    const dueTime =
      typeof task.dueTime === "string" && /^\d{2}:\d{2}$/.test(task.dueTime)
        ? task.dueTime
        : "23:59";

    return {
      ...task,
      dueDate,
      dueTime,
      progress,
      status: getTaskStatus(progress),
      archived: Boolean(task.archived),
      reminders: Array.isArray(task.reminders) ? task.reminders : [],
    };
  });
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatPlanDraft(plan: StudyPlanDraftItem[]) {
  return plan
    .map(
      (item) =>
        `${item.day}: ${item.topic} (${item.subject}) ${item.time}–${addMinutes(
          item.time,
          item.duration
        )}`
    )
    .join("\n");
}

function addMinutes(time: string, duration: number) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + duration);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateInput(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDueDateTime(taskOrDueDate: Task | string, dueTime?: string) {
  const dueDate = typeof taskOrDueDate === "string" ? taskOrDueDate : taskOrDueDate.dueDate;
  const resolvedDueTime = typeof taskOrDueDate === "string" ? dueTime ?? "23:59" : taskOrDueDate.dueTime ?? "23:59";
  const [year, month, day] = dueDate.split("-").map(Number);
  const [hours, minutes] = resolvedDueTime.split(":").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
}

function formatTimeDisplay(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatDueDateTime(date: Date) {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDaysLeft(taskOrDueDate: Task | string, dueTime?: string) {
  const now = new Date();
  const due = getDueDateTime(taskOrDueDate, dueTime);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDueLabel(taskOrDueDate: Task | string, dueTime?: string) {
  const now = new Date();
  const due = getDueDateTime(taskOrDueDate, dueTime);
  const diffMs = due.getTime() - now.getTime();
  const dayDiff = Math.ceil((startOfDay(due).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24));
  const timeText = formatTimeDisplay(typeof taskOrDueDate === "string" ? dueTime ?? "23:59" : taskOrDueDate.dueTime ?? "23:59");

  if (diffMs < 0) {
    if (Math.abs(diffMs) < 1000 * 60 * 60) {
      const mins = Math.max(1, Math.floor(Math.abs(diffMs) / (1000 * 60)));
      return `Overdue by ${mins} minute${mins === 1 ? "" : "s"}`;
    }
    if (Math.abs(diffMs) < 1000 * 60 * 60 * 24) {
      const hours = Math.max(1, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60)));
      return `Overdue by ${hours} hour${hours === 1 ? "" : "s"}`;
    }
    const days = Math.max(1, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }

  if (dayDiff === 0) return `Due today at ${timeText}`;
  if (dayDiff === 1) return `Due tomorrow at ${timeText}`;
  return `Due in ${dayDiff} days at ${timeText}`;
}

function getTaskCheckSummary(task: Task) {
  const daysLeft = getDaysLeft(task);
  const reminderCount = task.reminders?.length ?? 0;

  if (task.progress >= 100) {
    return "This assignment is completed.";
  }

  const parts: string[] = [];

  if (daysLeft < 0) parts.push("This assignment is overdue.");
  else if (daysLeft === 0) parts.push("This assignment is due today.");
  else if (daysLeft === 1) parts.push("This assignment is due tomorrow.");
  else parts.push(`This assignment is due in ${daysLeft} days.`);

  if (task.progress === 0) parts.push("You have not started yet.");
  else if (task.progress < 100) parts.push(`You are ${task.progress}% done.`);

  if (reminderCount === 0) parts.push("No reminders saved yet.");
  else if (reminderCount === 1) parts.push("You have 1 reminder saved.");
  else parts.push(`You have ${reminderCount} reminders saved.`);

  return parts.join(" ");
}

function getPriorityRank(priority: Priority) {
  return { high: 0, medium: 1, low: 2 }[priority];
}

function buildDraftFromTasks(tasks: Task[]) {
  const openTasks = [...tasks]
    .filter((task) => !task.archived)
    .filter((task) => task.progress < 100)
    .sort((a, b) => {
      if (getDaysLeft(a) !== getDaysLeft(b)) return getDaysLeft(a) - getDaysLeft(b);
      return getPriorityRank(a.priority) - getPriorityRank(b.priority);
    })
    .slice(0, 5);

  if (!openTasks.length) return [];

  const baseTimes = ["17:00", "18:00", "16:30", "17:30", "15:30"];
  const todayJs = new Date().getDay();
  const startIndex = todayJs === 0 ? 6 : todayJs - 1;

  return openTasks.map((task, index) => ({
    day: weekDays[(startIndex + index) % 7],
    subject: task.subject,
    topic: task.title,
    time: baseTimes[index] ?? "17:00",
    duration: task.priority === "high" ? 45 : task.priority === "medium" ? 35 : 30,
  }));
}

function applyStudyPlanEdits(
  currentPlan: StudyPlanDraftItem[],
  instruction: string
): StudyPlanDraftItem[] {
  const text = instruction.toLowerCase();
  let next = currentPlan.map((item) => ({ ...item }));

  if (text.includes("keep weekends free")) {
    next = next.map((item) => {
      if (item.day === "Saturday") return { ...item, day: "Thursday" };
      if (item.day === "Sunday") return { ...item, day: "Friday" };
      return item;
    });
  }

  const moveTargets = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  moveTargets.forEach((day) => {
    if (text.includes(`move science to ${day}`)) {
      next = next.map((item) =>
        item.subject.toLowerCase().includes("science")
          ? { ...item, day: capitalize(day) }
          : item
      );
    }
    if (text.includes(`move math to ${day}`)) {
      next = next.map((item) =>
        item.subject.toLowerCase().includes("math")
          ? { ...item, day: capitalize(day) }
          : item
      );
    }
    if (text.includes(`move physics to ${day}`)) {
      next = next.map((item) =>
        item.subject.toLowerCase().includes("physics")
          ? { ...item, day: capitalize(day) }
          : item
      );
    }
  });

  if (text.includes("make monday lighter")) {
    next = next.map((item) =>
      item.day === "Monday"
        ? { ...item, duration: Math.max(20, item.duration - 15) }
        : item
    );
  }

  if (text.includes("add more physics")) {
    const physicsItems = next.filter(
      (item) =>
        item.subject.toLowerCase().includes("physics") ||
        item.topic.toLowerCase().includes("physics")
    );
    if (physicsItems.length > 0) {
      next = next.flatMap((item) =>
        physicsItems.includes(item)
          ? [item, { ...item, day: "Friday", time: "18:30", duration: 30 }]
          : [item]
      );
    }
  }

  if (text.includes("keep weekends free")) {
    next = next.filter((item) => item.day !== "Saturday" && item.day !== "Sunday");
  }

  next = next.map((item, index) => {
    if (text.includes("lighter") && item.day === "Monday") {
      return { ...item, duration: Math.max(20, item.duration) };
    }
    return { ...item, time: item.time || ["17:00", "18:00", "16:30"][index % 3] };
  });

  return next;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getOpenTasks(tasks: Task[]) {
  return tasks
    .filter((task) => !task.archived)
    .filter((task) => task.progress < 100)
    .sort((a, b) => {
      const aScore = getSmartTaskScore(a);
      const bScore = getSmartTaskScore(b);
      if (aScore !== bScore) return bScore - aScore;
      return getDueDateTime(a).getTime() - getDueDateTime(b).getTime();
    });
}

function getSmartTaskScore(task: Task) {
  const daysLeft = getDaysLeft(task);
  const priorityWeight = task.priority === "high" ? 30 : task.priority === "medium" ? 18 : 10;
  const urgencyWeight =
    daysLeft < 0
      ? 45
      : daysLeft === 0
        ? 38
        : daysLeft === 1
          ? 30
          : daysLeft <= 3
            ? 22
            : daysLeft <= 7
              ? 12
              : 4;
  const progressWeight = Math.max(0, 100 - task.progress) * 0.35;
  return priorityWeight + urgencyWeight + progressWeight;
}

function getTaskReason(task: Task) {
  const reasons: string[] = [];
  const daysLeft = getDaysLeft(task);

  if (daysLeft < 0) reasons.push("it is already overdue");
  else if (daysLeft === 0)
    reasons.push(`it is due today at ${formatTimeDisplay(task.dueTime ?? "23:59")}`);
  else if (daysLeft === 1)
    reasons.push(`it is due tomorrow at ${formatTimeDisplay(task.dueTime ?? "23:59")}`);
  else if (daysLeft <= 3) reasons.push(`it is due soon (${getDueLabel(task).toLowerCase()})`);

  if (task.priority === "high") reasons.push("it is marked high priority");
  if (task.progress <= 25) reasons.push(`it is only ${task.progress}% done`);
  else if (task.progress < 100)
    reasons.push(`it still needs another ${100 - task.progress}% of progress`);

  return reasons.slice(0, 2).join(" and ");
}

function buildFocusPlan(openTasks: Task[]) {
  const first = openTasks[0];
  const second = openTasks[1];
  const third = openTasks[2];

  if (!first) {
    return "You’re all caught up right now. A good next step would be reviewing old material or planning ahead for future classes.";
  }

  return [
    `Start with ${first.title} (${first.subject}) because ${getTaskReason(first)}.`,
    second
      ? `After that, switch to ${second.title} so you keep momentum without ignoring another important deadline.`
      : "After that, do a light review session or organize tomorrow’s work.",
    third && getDaysLeft(third) <= 3
      ? `If you still have energy, spend 20–30 minutes on ${third.title} so it does not become urgent tomorrow.`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildRecoveryPlan(openTasks: Task[]) {
  const urgent = openTasks.slice(0, 3);
  if (!urgent.length) {
    return "You’re actually in a good spot right now. Take a breath and do one small review session instead of a full work block.";
  }

  return [
    "Recovery mode: do not try to finish everything tonight.",
    urgent[0]
      ? `1. Rescue ${urgent[0].title} first because ${getTaskReason(urgent[0])}.`
      : null,
    urgent[1]
      ? `2. Then spend one shorter block on ${urgent[1].title} just to move it forward.`
      : null,
    urgent[2]
      ? `3. If you have anything left, do a quick win on ${urgent[2].title}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWorkloadSummary(openTasks: Task[]) {
  const overdue = openTasks.filter((task) => getDaysLeft(task) < 0);
  const dueToday = openTasks.filter((task) => getDaysLeft(task) === 0);
  const dueSoon = openTasks.filter(
    (task) => getDaysLeft(task) >= 0 && getDaysLeft(task) <= 3
  );

  if (!openTasks.length) {
    return "You have no active unfinished assignments right now.";
  }

  const parts = [
    `${openTasks.length} active task${openTasks.length === 1 ? "" : "s"}`,
    overdue.length ? `${overdue.length} overdue` : null,
    dueToday.length ? `${dueToday.length} due today` : null,
    dueSoon.length ? `${dueSoon.length} due within 3 days` : null,
  ].filter(Boolean);

  return `Current workload: ${parts.join(" • ")}.`;
}

function answerQuestion(input: string, tasks: Task[]) {
  const text = input.toLowerCase().trim();
  const openTasks = getOpenTasks(tasks);
  const urgentTask = openTasks[0];
  const dueThisWeek = openTasks.filter((task) => getDaysLeft(task) <= 7);
  const overloaded = openTasks.filter((task) => getDaysLeft(task) <= 3).length >= 3;

  if (
    text.includes("due this week") ||
    text.includes("what is due this week") ||
    text.includes("upcoming assignments") ||
    text.includes("what's due")
  ) {
    if (!dueThisWeek.length) {
      return "You don’t have any active assignments due this week.";
    }

    return `${buildWorkloadSummary(openTasks)}

Here’s what is due this week:
${dueThisWeek
      .slice(0, 6)
      .map(
        (task, index) =>
          `${index + 1}. ${task.title} (${task.subject}) — ${getDueLabel(task)} • ${task.progress}% complete`
      )
      .join("\n")}`;
  }

  if (
    text.includes("what should i study") ||
    text.includes("what do i study") ||
    text.includes("what should i work on") ||
    text.includes("what should i study tonight") ||
    text.includes("what should i do tonight")
  ) {
    return buildFocusPlan(openTasks);
  }

  if (
    text.includes("hardest task") ||
    text.includes("most urgent task") ||
    text.includes("highest priority") ||
    text.includes("what should i do first")
  ) {
    return urgentTask
      ? `${urgentTask.title} is your most important task right now because ${getTaskReason(urgentTask)}.`
      : "You do not have any urgent tasks right now.";
  }

  if (
    text.includes("overwhelmed") ||
    text.includes("too much work") ||
    text.includes("behind") ||
    text.includes("recover")
  ) {
    return `${buildWorkloadSummary(openTasks)}

${buildRecoveryPlan(openTasks)}`;
  }

  if (
    text.includes("help me focus") ||
    text.includes("i can't focus") ||
    text.includes("cant focus")
  ) {
    return `${buildFocusPlan(openTasks)}

Use a 25 minute focus block, then take a 5 minute break. Do not multitask until the first block is finished.`;
  }

  if (
    text.includes("am i behind") ||
    text.includes("how bad is my workload") ||
    text.includes("workload")
  ) {
    return overloaded
      ? `${buildWorkloadSummary(openTasks)} You’re entering overload territory, so focus on rescue work first instead of trying to finish everything perfectly.`
      : `${buildWorkloadSummary(openTasks)} Your workload still looks manageable if you start the top priority task soon.`;
  }

  if (text.includes("study plan") || text.includes("make me a study plan")) {
    const plan = buildDraftFromTasks(tasks);
    if (!plan.length) {
      return "You don’t have enough active tasks for me to build a study plan right now.";
    }
    return `${buildWorkloadSummary(openTasks)}

Here is a first draft study plan:
${formatPlanDraft(plan)}

Would you like to change anything?`;
  }

  return `${buildWorkloadSummary(openTasks)}

I can help you decide what to study, rank your tasks, build a recovery plan if you’re behind, or make a study plan from your deadlines.`;
}
function getCourseAverage(course: GradeCourse) {
  const totalWeight = course.assessments.reduce(
    (sum, item) => sum + Math.max(0, item.factor),
    0
  );

  if (!course.assessments.length || totalWeight === 0) return null;

  const weightedScore = course.assessments.reduce((sum, item) => {
    const percent = item.total > 0 ? (item.score / item.total) * 100 : 0;
    return sum + percent * Math.max(0, item.factor);
  }, 0);

  return weightedScore / totalWeight;
}

function getNeededOnNextAssessment(course: GradeCourse, nextFactor: number) {
  const currentWeight = course.assessments.reduce(
    (sum, item) => sum + Math.max(0, item.factor),
    0
  );

  const currentWeightedScore = course.assessments.reduce((sum, item) => {
    const percent = item.total > 0 ? (item.score / item.total) * 100 : 0;
    return sum + percent * Math.max(0, item.factor);
  }, 0);

  if (nextFactor <= 0) return null;

  return (
    (course.goal * (currentWeight + nextFactor) - currentWeightedScore) /
    nextFactor
  );
}

function formatGradeValue(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
}

function StatCard({
  icon,
  label,
  value,
  tint,
  themeClasses,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tint: string;
  themeClasses: { card: string };
}) {
  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", themeClasses.card)}>
      <div className="flex items-center gap-4">
        <div className={cn("rounded-2xl p-3", tint)}>{icon}</div>
        <div>
          <p className="text-xl text-zinc-500">{label}</p>
          <p className="text-[44px] font-semibold leading-none tracking-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const pwaInstall = usePwaInstall();
   const [session, setSession] = useState<Session | null>(null);
const [authLoading, setAuthLoading] = useState(true);
const [guestMode, setGuestMode] = useState<boolean>(
  () => readStorage(STORAGE_KEYS.guestMode, false)
);
const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
const [tasks, setTasks] = useState<Task[]>(
  () => normalizeTasks(readStorage(STORAGE_KEYS.tasks, [] as Task[]))
);
  const [sessions, setSessions] = useState<StudySession[]>(
    () => readStorage(STORAGE_KEYS.sessions, defaultSessions)
  );
  const [goals, setGoals] = useState<Goal[]>(
    () => readStorage(STORAGE_KEYS.goals, defaultGoals)
  );
  const [messages, setMessages] = useState<Message[]>(
    () => readStorage(STORAGE_KEYS.messages, defaultMessages)
  );
  const [studyPlanFlow, setStudyPlanFlow] = useState<StudyPlanFlow>(
    () => readStorage(STORAGE_KEYS.studyPlanFlow, defaultStudyPlanFlow)
  );
  const [theme, setTheme] = useState<Theme>(
  () => readStorage(STORAGE_KEYS.theme, "light")
);

const [courses, setCourses] = useState<GradeCourse[]>(
  () => readStorage(STORAGE_KEYS.grades, [] as GradeCourse[])
);
const [showCourseModal, setShowCourseModal] = useState(false);
const [showAssessmentModal, setShowAssessmentModal] = useState(false);
const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm);
const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>(emptyAssessmentForm);
const [nextAssessmentFactor, setNextAssessmentFactor] = useState("1");
const [categories, setCategories] = useState<TaskCategory[]>(
  () => readStorage(STORAGE_KEYS.categories, [] as TaskCategory[])
);
const [scheduleMeetings, setScheduleMeetings] = useState<ScheduleMeeting[]>(
  () => readStorage(STORAGE_KEYS.schedule, [] as ScheduleMeeting[])
);
const [scheduleLoading, setScheduleLoading] = useState(false);
const [scheduleError, setScheduleError] = useState("");
const [showCategoryManager, setShowCategoryManager] = useState(false);
const [categoryFilter, setCategoryFilter] = useState("all");
const [showMobileMore, setShowMobileMore] = useState(false);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number>(0);
  const [reminderInput, setReminderInput] = useState("");
    const [uploadedStudyFile, setUploadedStudyFile] = useState<UploadedStudyFile | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("normal");
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);


  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [taskFilter, setTaskFilter] = useState<
  "default" | "priority" | "dueDate" | "progressHigh" | "progressLow"
>("default");
  const handleStudyFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTextTypes = [
      "text/plain",
      "text/markdown",
      "application/json",
    ];

    const isProbablyText =
      allowedTextTypes.includes(file.type) ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json");

    if (!isProbablyText) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: "For now, upload a text-based file like .txt or .md so I can turn it into a quiz.",
        },
      ]);
      return;
    }

    try {
      const content = await file.text();

      setUploadedStudyFile({
        name: file.name,
        content: content.slice(0, 12000),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: `Uploaded "${file.name}". I can now quiz you on it. Switch quiz mode on and say something like "quiz me on this file".`,
        },
      ]);
    } catch (error) {
      console.error("File upload error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          text: "Sorry, I couldn’t read that file.",
        },
      ]);
    }

    e.target.value = "";
  };
  const clearChat = () => {
  setMessages([
    {
      id: Date.now(),
      role: "assistant",
      text: "Chat cleared. I’m ready to help you plan your work, sort priorities, build a study plan, or quiz you on uploaded notes.",
    },
  ]);

  setStudyPlanFlow(defaultStudyPlanFlow);
  setUploadedStudyFile(null);
  setChatMode("normal");
  setQuizQuestionCount(5);
  setInput("");
};




  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.studyPlanFlow,
      JSON.stringify(studyPlanFlow)
    );
  }, [studyPlanFlow]);

useEffect(() => {
  window.localStorage.setItem(STORAGE_KEYS.guestMode, JSON.stringify(guestMode));
}, [guestMode]);

useEffect(() => {
  window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
}, [theme]);

useEffect(() => {
  window.localStorage.setItem(STORAGE_KEYS.grades, JSON.stringify(courses));
}, [courses]);

useEffect(() => {
  if (!session?.user) {
    window.localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
  }
}, [categories, session]);

useEffect(() => {
  if (!session?.user) {
    window.localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(scheduleMeetings));
  }
}, [scheduleMeetings, session]);

useEffect(() => {
  let mounted = true;
  const authTimeoutId = window.setTimeout(() => {
    if (mounted) {
      setAuthLoading(false);
    }
  }, 3000);

  const loadSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error loading session:", error.message);
      }

      if (mounted) {
        setSession(data.session ?? null);
      }
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      window.clearTimeout(authTimeoutId);
      if (mounted) {
        setAuthLoading(false);
      }
    }
  };

  loadSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    setSession(nextSession ?? null);
    setAuthLoading(false);
  });

  return () => {
    mounted = false;
    window.clearTimeout(authTimeoutId);
    subscription.unsubscribe();
  };
}, []);
useEffect(() => {
  if (authLoading) return;

  if (session?.user?.id) {
    loadTasks(session.user.id);
    loadCategoriesAndSchedule(session.user.id);
  } else {
    const localTasks = readStorage(STORAGE_KEYS.tasks, [] as Task[]);
    setTasks(normalizeTasks(localTasks));
    setCategories(readStorage(STORAGE_KEYS.categories, [] as TaskCategory[]));
    setScheduleMeetings(readStorage(STORAGE_KEYS.schedule, [] as ScheduleMeeting[]));
    setScheduleError("");
  }
// Authentication changes are the intentional reload boundary for remote data.
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [session, authLoading]);
useEffect(() => {
  if (!session?.user) {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  }
}, [tasks, session]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.archived),
    [tasks]
  );
  const sortedActiveTasks = useMemo(() => {
  const filtered = activeTasks.filter(
    (task) => categoryFilter === "all" || task.categoryId === categoryFilter
  );

  if (taskFilter === "priority") {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  } else if (taskFilter === "dueDate") {
    filtered.sort(
      (a, b) => getDueDateTime(a).getTime() - getDueDateTime(b).getTime()
    );
  } else if (taskFilter === "progressHigh") {
    filtered.sort((a, b) => b.progress - a.progress);
  } else if (taskFilter === "progressLow") {
    filtered.sort((a, b) => a.progress - b.progress);
  }

  return filtered;
}, [activeTasks, taskFilter, categoryFilter]);

  const missingTasks = useMemo(
    () => activeTasks
      .filter((task) => task.progress < 100 && getDueDateTime(task).getTime() < Date.now())
      .sort((a, b) => getDueDateTime(a).getTime() - getDueDateTime(b).getTime()),
    [activeTasks]
  );

  const mobileDashboardData = useMemo(() => {
    const now = new Date();
    const todayKey = formatDateInput(now);
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todaysClasses = scheduleMeetings
      .filter((meeting) => meeting.days.includes(todayName))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    };
    const currentClass = todaysClasses.find(
      (meeting) => toMinutes(meeting.startTime) <= nowMinutes && toMinutes(meeting.endTime) > nowMinutes
    );
    const nextClass = todaysClasses.find((meeting) => toMinutes(meeting.startTime) > nowMinutes);
    const highlightedClass = currentClass ?? nextClass ?? null;
    const mapTask = (task: Task) => ({
      id: task.id,
      title: task.title,
      subject: task.subject,
      dueLabel: getDueLabel(task),
      categoryName: categories.find((category) => category.id === task.categoryId)?.name,
    });

    return {
      nextClass: highlightedClass ? {
        title: highlightedClass.title,
        timeLabel: `${formatTimeDisplay(highlightedClass.startTime)}–${formatTimeDisplay(highlightedClass.endTime)}`,
        room: highlightedClass.room,
        status: currentClass ? "current" as const : "next" as const,
      } : null,
      dueToday: activeTasks.filter((task) => task.progress < 100 && task.dueDate === todayKey).map(mapTask),
      missing: missingTasks.map(mapTask),
      upcoming: activeTasks
        .filter((task) => task.progress < 100 && getDueDateTime(task).getTime() > now.getTime() && task.dueDate !== todayKey)
        .sort((a, b) => getDueDateTime(a).getTime() - getDueDateTime(b).getTime())
        .map(mapTask),
      todayClasses: todaysClasses,
    };
  }, [activeTasks, categories, missingTasks, scheduleMeetings]);

  const mobileTasks = useMemo(() => activeTasks.map((task) => ({
    id: task.id,
    title: task.title,
    subject: task.subject,
    categoryId: task.categoryId,
    dueLabel: getDueLabel(task),
    progress: task.progress,
    missing: task.progress < 100 && getDueDateTime(task).getTime() < Date.now(),
  })), [activeTasks]);

  const archivedTasks = useMemo(
    () => tasks.filter((task) => task.archived),
    [tasks]
  );

  useEffect(() => {
    if (!activeTasks.length) {
      setSelectedTaskId(0);
      return;
    }
    const selectedStillExists = activeTasks.some((task) => task.id === selectedTaskId);
    if (!selectedStillExists) {
      setSelectedTaskId(0);
    }
  }, [activeTasks, selectedTaskId]);

  const selectedTask = useMemo(
    () => activeTasks.find((task) => task.id === selectedTaskId) ?? null,
    [activeTasks, selectedTaskId]
  );

  const upcomingReminders = useMemo(() => {
    return activeTasks
      .flatMap((task) =>
        (task.reminders ?? []).map((reminder) => ({
          ...reminder,
          taskId: task.id,
          taskTitle: task.title,
          subject: task.subject,
          priority: task.priority,
        }))
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [activeTasks]);

  const stats = useMemo(() => {
  return {
    upcoming: tasks.filter((task) => !task.archived && task.progress === 0).length,
    inProgress: tasks.filter(
      (task) => !task.archived && task.progress > 0 && task.progress < 100
    ).length,
    completed: tasks.filter((task) => task.progress >= 100).length,
    missing: tasks.filter(
      (task) => !task.archived && task.progress < 100 && getDueDateTime(task).getTime() < Date.now()
    ).length,
  };
}, [tasks]);
  const plannerStats = useMemo(() => {
    const weeklyHours =
      sessions.reduce((sum, session) => sum + session.duration, 0) / 60;
    const completedGoals = goals.filter((goal) => goal.done).length;
    return {
      sessions: sessions.length,
      weeklyHours,
      completedGoals,
    };
  }, [sessions, goals]);

  const completionStreak = useMemo(() => calculateCompletionStreak(tasks), [tasks]);
const gradeStats = useMemo(() => {
  const averages = courses
    .map((course) => getCourseAverage(course))
    .filter((average): average is number => average !== null);

  const overall =
    averages.length > 0
      ? averages.reduce((sum, value) => sum + value, 0) / averages.length
      : null;

  const atGoal = courses.filter((course) => {
    const average = getCourseAverage(course);
    return average !== null && average >= course.goal;
  }).length;

  return {
    courses: courses.length,
    assessments: courses.reduce((sum, course) => sum + course.assessments.length, 0),
    overall,
    atGoal,
  };
}, [courses]);

const addCourse = () => {
  const name = courseForm.name.trim();
  const goal = Number(courseForm.goal);

  if (!name || !goal) return;

  setCourses((prev) => [
    ...prev,
    {
      id: Date.now(),
      name,
      goal,
      assessments: [],
    },
  ]);

  setCourseForm(emptyCourseForm);
  setShowCourseModal(false);
};

const deleteCourse = (id: number) => {
  const confirmed = window.confirm("Delete this course and all its assessments?");
  if (!confirmed) return;
  setCourses((prev) => prev.filter((course) => course.id !== id));
};

const addAssessment = () => {
  const courseId = Number(assessmentForm.courseId);
  const name = assessmentForm.name.trim();
  const score = Number(assessmentForm.score);
  const total = Number(assessmentForm.total);
  const factor = Number(assessmentForm.factor);

  if (!courseId || !name || total <= 0 || factor <= 0 || Number.isNaN(score)) return;

  const newAssessment: GradeAssessment = {
    id: Date.now(),
    name,
    score,
    total,
    factor,
  };

  setCourses((prev) =>
    prev.map((course) =>
      course.id === courseId
        ? { ...course, assessments: [newAssessment, ...course.assessments] }
        : course
    )
  );

  setAssessmentForm(emptyAssessmentForm);
  setShowAssessmentModal(false);
};

const deleteAssessment = (courseId: number, assessmentId: number) => {
  setCourses((prev) =>
    prev.map((course) =>
      course.id === courseId
        ? {
            ...course,
            assessments: course.assessments.filter(
              (assessment) => assessment.id !== assessmentId
            ),
          }
        : course
    )
  );
};

const updateCourseGoal = (courseId: number, goal: number) => {
  setCourses((prev) =>
    prev.map((course) =>
      course.id === courseId ? { ...course, goal } : course
    )
  );
};

const handleSignUp = async () => {
  const email = authEmail.trim();
  const password = authPassword.trim();

  if (!email || !password) {
    setAuthMessage("Please enter your email and password.");
    return;
  }

  try {
    setAuthSubmitting(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

if (data.session) {
  setGuestMode(false);
  setAuthMessage("Account created. You are now signed in.");
} else {
      setAuthMessage(
        "Account created. Check your email to confirm your account before logging in."
      );
    }
  } finally {
    setAuthSubmitting(false);
  }
};

const handleLogin = async () => {
  const email = authEmail.trim();
  const password = authPassword.trim();

  if (!email || !password) {
    setAuthMessage("Please enter your email and password.");
    return;
  }

  try {
    setAuthSubmitting(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setGuestMode(false);
setAuthMessage("Logged in successfully.");
  } finally {
    setAuthSubmitting(false);
  }
};

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  setAuthMessage("");
  setAuthEmail("");
  setAuthPassword("");
  setGuestMode(true);

  const localTasks = readStorage(STORAGE_KEYS.tasks, [] as Task[]);
  setTasks(normalizeTasks(localTasks));
};
const loadTasks = async (userId?: string) => {
  const resolvedUserId = userId ?? session?.user?.id;
  if (!resolvedUserId) return;

  const { data, error } = await supabase
    .from("tasks")
    .select("*, reminders(*)")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading tasks:", error.message);
    return;
  }

  const mappedTasks: Task[] = (data ?? []).map((task) => {
    const due = typeof task.due === "string" ? task.due : "";
    const [dueDate, dueTime] = due.includes("|") ? due.split("|") : [due, "23:59"];

    return {
      id: Number(task.id),
      user_id: task.user_id,
      title: task.title ?? "",
      subject: task.subject ?? "",
      dueDate: dueDate || "",
      dueTime: dueTime || "23:59",
      priority: (task.priority as Priority) ?? "medium",
      details: task.details ?? task.reminder ?? "",
      progress: typeof task.progress === "number" ? task.progress : 0,
      status: (task.status as TaskStatus) ?? "upcoming",
      archived: Boolean(task.archived),
      reminders: (task.reminders ?? []).map((r: { id: string | number; value: string; created_at: string }) => ({
        id: Number(r.id),
        value: r.value,
        createdAt: new Date(r.created_at).getTime(),
      })),
      completedAt: task.completed_at ?? undefined,
      categoryId: task.category_id ?? undefined,
    };
  });

  setTasks(normalizeTasks(mappedTasks));
};

const loadCategoriesAndSchedule = async (userId: string) => {
  setScheduleLoading(true);
  setScheduleError("");

  const [categoryResult, scheduleResult] = await Promise.all([
    supabase.from("task_categories").select("*").eq("user_id", userId).order("name"),
    supabase.from("schedule_meetings").select("*").eq("user_id", userId).order("start_time"),
  ]);

  if (categoryResult.error) {
    console.error("Error loading categories:", categoryResult.error.message);
  } else {
    setCategories((categoryResult.data ?? []).map((category) => ({
      id: String(category.id),
      userId: category.user_id,
      name: category.name,
      color: category.color ?? "indigo",
      icon: category.icon ?? "book",
    })));
  }

  if (scheduleResult.error) {
    console.error("Error loading schedule:", scheduleResult.error.message);
    setScheduleError("Your schedule could not be loaded. Apply the included Supabase migration, then try again.");
  } else {
    setScheduleMeetings((scheduleResult.data ?? []).map((meeting) => ({
      id: String(meeting.id),
      userId: meeting.user_id,
      title: meeting.title,
      courseCode: meeting.course_code ?? "",
      teacher: meeting.teacher ?? "",
      room: meeting.room ?? "",
      color: meeting.color ?? "indigo",
      icon: meeting.icon ?? "book",
      startTime: meeting.start_time,
      endTime: meeting.end_time,
      days: Array.isArray(meeting.days) ? meeting.days : [],
      rotationDays: Array.isArray(meeting.rotation_days) ? meeting.rotation_days : [],
      notes: meeting.notes ?? "",
      source: meeting.source === "blackbaud" ? "blackbaud" : "manual",
      externalId: meeting.external_id ?? undefined,
      metadata: meeting.metadata ?? {},
    })));
  }

  setScheduleLoading(false);
};

const saveCategory = async (category: TaskCategory) => {
  if (!session?.user) {
    setCategories((current) => current.some((item) => item.id === category.id)
      ? current.map((item) => item.id === category.id ? category : item)
      : [...current, category]);
    return;
  }

  const { error } = await supabase.from("task_categories").upsert({
    id: category.id,
    user_id: session.user.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
  });
  if (error) {
    console.error("Error saving category:", error.message);
    return;
  }
  await loadCategoriesAndSchedule(session.user.id);
};

const deleteCategory = async (id: string) => {
  if (!window.confirm("Delete this category? Tasks will remain uncategorized.")) return;
  if (!session?.user) {
    setCategories((current) => current.filter((category) => category.id !== id));
    setTasks((current) => current.map((task) => task.categoryId === id ? { ...task, categoryId: undefined } : task));
    return;
  }

  const { error } = await supabase.from("task_categories").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) {
    console.error("Error deleting category:", error.message);
    return;
  }
  await Promise.all([loadTasks(), loadCategoriesAndSchedule(session.user.id)]);
};

const saveScheduleMeeting = async (meeting: ScheduleMeeting) => {
  if (!session?.user) {
    setScheduleMeetings((current) => current.some((item) => item.id === meeting.id)
      ? current.map((item) => item.id === meeting.id ? meeting : item)
      : [...current, meeting]);
    return;
  }

  const { error } = await supabase.from("schedule_meetings").upsert({
    id: meeting.id,
    user_id: session.user.id,
    title: meeting.title,
    course_code: meeting.courseCode || null,
    teacher: meeting.teacher || null,
    room: meeting.room || null,
    color: meeting.color,
    icon: meeting.icon,
    start_time: meeting.startTime,
    end_time: meeting.endTime,
    days: meeting.days,
    rotation_days: meeting.rotationDays,
    notes: meeting.notes || null,
    source: meeting.source,
    external_id: meeting.externalId || null,
    metadata: meeting.metadata ?? {},
  });
  if (error) {
    console.error("Error saving schedule:", error.message);
    setScheduleError(error.message);
    return;
  }
  await loadCategoriesAndSchedule(session.user.id);
};

const deleteScheduleMeeting = async (meeting: ScheduleMeeting) => {
  if (!window.confirm(`Delete ${meeting.title} from your schedule?`)) return;
  if (!session?.user) {
    setScheduleMeetings((current) => current.filter((item) => item.id !== meeting.id));
    return;
  }

  const { error } = await supabase.from("schedule_meetings").delete().eq("id", meeting.id).eq("user_id", session.user.id);
  if (error) {
    console.error("Error deleting schedule:", error.message);
    setScheduleError(error.message);
    return;
  }
  await loadCategoriesAndSchedule(session.user.id);
};


const updateTaskProgress = async (id: number, value: number) => {
  const snapped = snapProgress(value);

  if (!session?.user) {
    setTasks((prev) =>
      normalizeTasks(
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                progress: snapped,
                status: getTaskStatus(snapped),
              }
            : task
        )
      )
    );
    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      progress: snapped,
      status: getTaskStatus(snapped),
    })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Error updating task progress:", error.message);
    return;
  }

  await loadTasks();
};

  const addManualSession = () => {
    const subject = sessionForm.subject.trim();
    const topic = sessionForm.topic.trim();
    const duration = Number(sessionForm.duration);

    if (!subject || !topic || !sessionForm.day || !sessionForm.time || !duration) {
      return;
    }

    const newSession: StudySession = {
      id: Date.now(),
      subject,
      topic,
      day: sessionForm.day,
      time: sessionForm.time,
      duration,
    };

    setSessions((prev) => [...prev, newSession]);
    setSessionForm(emptySessionForm);
    setShowSessionModal(false);
  };

  const openAddTaskModal = () => {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      subject: task.subject,
      dueDate: task.dueDate,
      dueTime: task.dueTime ?? "23:59",
      priority: task.priority,
      details: task.details,
      progress: String(task.progress),
      categoryId: task.categoryId ?? "",
    });
    setShowTaskModal(true);
  };

  const saveTask = async () => {
  const title = taskForm.title.trim();
  const subject = taskForm.subject.trim();
  const dueDate = taskForm.dueDate;
  const dueTime = taskForm.dueTime || "23:59";
  const details = taskForm.details.trim();
  const progress = snapProgress(Number(taskForm.progress));

  if (!title || !subject || !dueDate || !dueTime) return;

  if (!session?.user) {
    if (editingTaskId !== null) {
      setTasks((prev) =>
        normalizeTasks(
          prev.map((task) =>
            task.id === editingTaskId
              ? {
                  ...task,
                  title,
                  subject,
                  dueDate,
                  dueTime,
                  priority: taskForm.priority,
                  progress,
                  status: getTaskStatus(progress),
                  details,
                  categoryId: taskForm.categoryId || undefined,
                }
              : task
          )
        )
      );
    } else {
      const newTask: Task = {
        id: Date.now(),
        title,
        subject,
        dueDate,
        dueTime,
        priority: taskForm.priority,
        details,
        progress,
        status: getTaskStatus(progress),
        archived: false,
        reminders: [],
        categoryId: taskForm.categoryId || undefined,
      };

      setTasks((prev) => normalizeTasks([newTask, ...prev]));
    }

    setTaskForm(emptyTaskForm);
    setEditingTaskId(null);
    setShowTaskModal(false);
    return;
  }

  const payload = {
    user_id: session.user.id,
    title,
    subject,
    due: `${dueDate}|${dueTime}`,
    priority: taskForm.priority,
    progress,
    status: getTaskStatus(progress),
    details,
    archived: false,
    category_id: taskForm.categoryId || null,
  };

  if (editingTaskId !== null) {
    const { error } = await supabase
      .from("tasks")
      .update({
        title,
        subject,
        due: `${dueDate}|${dueTime}`,
        priority: taskForm.priority,
        progress,
        status: getTaskStatus(progress),
        details,
        category_id: taskForm.categoryId || null,
      })
      .eq("id", editingTaskId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating task:", error.message);
      return;
    }
  } else {
    const { error } = await supabase.from("tasks").insert(payload);

    if (error) {
      console.error("Error creating task:", error.message);
      return;
    }
  }

  await loadTasks();

  setTaskForm(emptyTaskForm);
  setEditingTaskId(null);
  setShowTaskModal(false);
};

const deleteTask = async (id: number) => {
  const taskToDelete = tasks.find((task) => task.id === id);

  if (!session?.user) {
    setTasks((prev) => prev.filter((task) => task.id !== id));

    if (taskToDelete) {
      setSessions((prev) =>
        prev.filter(
          (session) => session.topic.toLowerCase() !== taskToDelete.title.toLowerCase()
        )
      );
    }

    return;
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Error deleting task:", error.message);
    return;
  }

  await loadTasks();

  if (taskToDelete) {
    setSessions((prev) =>
      prev.filter(
        (session) => session.topic.toLowerCase() !== taskToDelete.title.toLowerCase()
      )
    );
  }
};
const completeTask = async (id: number) => {
  const confirmed = window.confirm("Are you sure you're done with this task?");
  if (!confirmed) return;

  if (!session?.user) {
    setTasks((prev) =>
      normalizeTasks(
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                progress: 100,
                status: "completed",
                archived: true,
                completedAt: getLocalDateKey(),
              }
            : task
        )
      )
    );

    if (selectedTaskId === id) {
      setSelectedTaskId(0);
      setReminderInput("");
    }

    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      progress: 100,
      status: "completed",
      archived: true,
      completed_at: getLocalDateKey(),
    })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Error completing task:", error.message);
    return;
  }

  await loadTasks();

  if (selectedTaskId === id) {
    setSelectedTaskId(0);
    setReminderInput("");
  }
};
const archiveTask = async (id: number) => {
  if (!session?.user) {
    setTasks((prev) =>
      normalizeTasks(
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                archived: true,
              }
            : task
        )
      )
    );

    if (selectedTaskId === id) {
      setSelectedTaskId(0);
      setReminderInput("");
    }

    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      archived: true,
    })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Error archiving task:", error.message);
    return;
  }

  await loadTasks();

  if (selectedTaskId === id) {
    setSelectedTaskId(0);
    setReminderInput("");
  }
};
const unarchiveTask = async (id: number) => {
  const task = tasks.find((task) => task.id === id);
  if (!task) return;

  const nextProgress = task.progress >= 100 ? 75 : task.progress;
  const nextStatus =
    task.progress >= 100 ? "in-progress" : getTaskStatus(task.progress);

  if (!session?.user) {
    setTasks((prev) =>
      normalizeTasks(
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                archived: false,
                progress: nextProgress,
                status: nextStatus,
                completedAt: undefined,
              }
            : item
        )
      )
    );
    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      archived: false,
      progress: nextProgress,
      status: nextStatus,
      completed_at: null,
    })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("Error restoring task:", error.message);
    return;
  }

  await loadTasks();
};

const saveReminder = async () => {
  const value = reminderInput.trim();
  if (!selectedTask || !value) return;

  if (!session?.user) {
    const newReminder: ReminderItem = {
      id: Date.now(),
      value,
      createdAt: Date.now(),
    };

    setTasks((prev) =>
      prev.map((task) =>
        task.id === selectedTask.id
          ? {
              ...task,
              reminders: [...(task.reminders ?? []), newReminder],
            }
          : task
      )
    );

    setReminderInput("");
    return;
  }

  const { error } = await supabase.from("reminders").insert({
    task_id: selectedTask.id,
    user_id: session.user.id,
    value,
  });

  if (error) {
    console.error("Error saving reminder:", error.message);
    return;
  }

  setReminderInput("");
  await loadTasks();
};

  const startStudyPlanFlow = () => {
    setActiveTab("chat");
    setStudyPlanFlow(defaultStudyPlanFlow);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "assistant",
        text: "Ready. I'll use your real deadlines, priorities, and progress to draft a study plan, revise it with you, and save it to your Weekly Study Schedule once you confirm.",
      },
    ]);
  };

  const saveDraftToSchedule = (draft: StudyPlanDraftItem[]) => {
    const generated: StudySession[] = draft.map((item, index) => ({
      id: Date.now() + index,
      day: item.day,
      subject: item.subject,
      topic: item.topic,
      time: item.time,
      duration: item.duration,
    }));

    setSessions((prev) => [...prev, ...generated]);
    setStudyPlanFlow(defaultStudyPlanFlow);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 20,
        role: "assistant",
        text: "Done — I saved this plan to your Weekly Study Schedule. Your Study Sessions and Weekly Hours have been updated.",
      },
    ]);

    setActiveTab("planner");
  };

  const handleStudyPlanConversation = (value: string) => {
    const text = value.toLowerCase().trim();

    if (!studyPlanFlow.draft.length) {
      const response = answerQuestion(value, tasks);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", text: value },
        { id: Date.now() + 1, role: "assistant", text: response },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: value }]);

    const isConfirmation =
      text === "yes" ||
      text === "y" ||
      text.includes("looks good") ||
      text.includes("save it") ||
      text.includes("save this") ||
      text.includes("confirm") ||
      text.includes("yes save") ||
      text.includes("that works");

    if (isConfirmation) {
      saveDraftToSchedule(studyPlanFlow.draft);
      return;
    }

    const revised = applyStudyPlanEdits(studyPlanFlow.draft, value);
    setStudyPlanFlow({
      stage: "awaiting-confirmation",
      draft: revised,
      lastInstruction: value,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: "assistant",
        text: `Here’s the revised version:\n${formatPlanDraft(revised)}\n\nDoes this look good? I can save it to your Weekly Study Schedule when you confirm.`,
        meta: { type: "study-plan-confirmation" },
      },
    ]);
  };

 const sendMessage = async (prefill?: string) => {
  const value = (prefill ?? input).trim();
  if (!value || isSending) return;

  if (value.toLowerCase().includes("make me a study plan")) {
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: value }]);
    const draft = buildDraftFromTasks(tasks);

    if (!draft.length) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "I couldn’t generate a study plan because there are no active unfinished tasks right now.",
        },
      ]);
      setInput("");
      return;
    }

    setStudyPlanFlow({
      stage: "drafted",
      draft,
      lastInstruction: "",
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 2,
        role: "assistant",
        text: `Here is your first draft study plan:\n${formatPlanDraft(draft)}\n\nWould you like me to adjust anything before I save it?`,
        meta: { type: "study-plan-draft" },
      },
    ]);

    setInput("");
    setActiveTab("chat");
    return;
  }

  if (studyPlanFlow.stage !== "idle") {
    handleStudyPlanConversation(value);
    setInput("");
    return;
  }

  const userMessageId = Date.now();

  setMessages((prev) => [
    ...prev,
    { id: userMessageId, role: "user", text: value },
  ]);

  setInput("");
  setActiveTab("chat");
  setIsSending(true);

  try {
    const taskSummary = tasks
      .filter((task) => !task.archived)
      .map((task) => ({
        title: task.title,
        subject: task.subject,
        dueDate: task.dueDate,
        dueTime: task.dueTime ?? "23:59",
        priority: task.priority,
        progress: task.progress,
        status: task.status,
        details: task.details,
      }));

    const res = await fetch("/api/gemini", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: value,
    tasks: taskSummary,
    uploadedStudyFile,
    chatMode,
    quizQuestionCount,
  }),
});

    const data = await res.json();

    if (!res.ok) {
  console.error("Gemini API response error:", data);
  throw new Error(data?.reply || data?.error || "Failed to get response");
}

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: "assistant",
        text: data.reply || "Sorry, I couldn't generate a response right now.",
      },
    ]);
  } catch (error) {
    console.error("Gemini chat error:", error);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: "assistant",
        text: error instanceof Error ? error.message : "Sorry, I couldn’t generate a response right now.",
      },
    ]);
  } finally {
    setIsSending(false);
  }
};
const showAuthGate = !session && !guestMode;
const themeClasses = {
  card:
  theme === "dark"
    ? "bg-zinc-900 border-zinc-700"
    : theme === "forest"
      ? "bg-emerald-100 border-emerald-300"
      : theme === "sunset"
        ? "bg-orange-100 border-orange-300"
        : theme === "ocean"
          ? "bg-cyan-100 border-cyan-300"
          : theme === "lavender"
            ? "bg-violet-100 border-violet-300"
            : theme === "midnight"
              ? "bg-indigo-950 border-indigo-700"
              : theme === "rose"
                ? "bg-rose-100 border-rose-300"
                : theme === "slate"
                  ? "bg-slate-200 border-slate-400"
                  : "bg-white border-zinc-200",
  page: cn(
    "min-h-screen transition-colors",
    theme === "dark"
      ? "zentaskra-dark bg-[#0b1020] text-zinc-100"
      : theme === "forest"
        ? "zentaskra-forest bg-emerald-50 text-[#1a1a1a]"
        : theme === "sunset"
          ? "zentaskra-sunset bg-orange-50 text-[#1a1a1a]"
          : theme === "ocean"
            ? "zentaskra-ocean bg-cyan-50 text-[#10202a]"
            : theme === "lavender"
              ? "zentaskra-lavender bg-violet-50 text-[#1f1633]"
              : theme === "midnight"
                ? "zentaskra-dark bg-[#020617] text-zinc-100"
                : theme === "rose"
                  ? "zentaskra-rose bg-rose-50 text-[#2a1018]"
                  : theme === "slate"
                    ? "zentaskra-slate bg-slate-100 text-slate-950"
                    : "bg-[#f7f7f8] text-[#1a1a1a]"
  ),

  tabActive:
    theme === "forest"
      ? "bg-emerald-700 text-white"
      : theme === "sunset"
        ? "bg-orange-500 text-white"
        : theme === "ocean"
          ? "bg-cyan-700 text-white"
          : theme === "lavender"
            ? "bg-violet-700 text-white"
            : theme === "midnight"
              ? "bg-indigo-700 text-white"
              : theme === "rose"
                ? "bg-rose-600 text-white"
                : theme === "slate"
                  ? "bg-slate-700 text-white"
                  : "bg-[#02031c] text-white",

  primaryButton:
    theme === "forest"
      ? "bg-emerald-700 text-white"
      : theme === "sunset"
        ? "bg-orange-500 text-white"
        : theme === "ocean"
          ? "bg-cyan-700 text-white"
          : theme === "lavender"
            ? "bg-violet-700 text-white"
            : theme === "midnight"
              ? "bg-indigo-700 text-white"
              : theme === "rose"
                ? "bg-rose-600 text-white"
                : theme === "slate"
                  ? "bg-slate-700 text-white"
                  : "bg-[#02031c] text-white",

  badge:
    theme === "dark" || theme === "midnight"
      ? "bg-zinc-800 text-zinc-100"
      : "bg-white text-zinc-700 border border-zinc-200",
};
if (authLoading) {
  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#1a1a1a] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Zentaskra</h1>
        <p className="mt-3 text-zinc-500">Loading your account...</p>
      </div>
    </div>
  );
}

  return (
<div className={themeClasses.page}>
      <style>{`
        .zentaskra-dark .bg-white { background-color: #111827 !important; }
        .zentaskra-dark .bg-zinc-50 { background-color: #0f172a !important; }
        .zentaskra-dark .bg-zinc-100 { background-color: #1f2937 !important; }
        .zentaskra-dark .bg-zinc-200 { background-color: #1f2937 !important; }
        .zentaskra-dark .border-zinc-200,
        .zentaskra-dark .border-zinc-300,
        .zentaskra-dark .border-zinc-400 { border-color: #374151 !important; }
        .zentaskra-dark .text-zinc-500,
        .zentaskra-dark .text-zinc-600 { color: #94a3b8 !important; }
        .zentaskra-dark .text-zinc-700,
        .zentaskra-dark .text-zinc-900,
        .zentaskra-dark .text-zinc-950 { color: #f3f4f6 !important; }
        .zentaskra-dark input,
        .zentaskra-dark select,
        .zentaskra-dark textarea { background-color: #0f172a; color: #f8fafc; border-color: #334155; }
        .zentaskra-dark input::placeholder,
        .zentaskra-dark textarea::placeholder { color: #94a3b8; }
        .zentaskra-dark .desktop-app-main { background-color: #0b1020 !important; }
      `}</style>
      <div className="mx-auto min-h-[100dvh] max-w-[1400px] px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 md:py-6 md:pb-6">
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <button onClick={() => setActiveTab("dashboard")} className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl text-left" aria-label="Go to Home">
            <img src="/icons/pwa-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0"><p className="truncate text-lg font-semibold">Zentaskra</p><p className="truncate text-xs text-zinc-500">{session?.user?.email ?? "Guest mode"}</p></div>
          </button>
          <button onClick={() => setShowMobileMore(true)} className="min-h-11 min-w-11 rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700" aria-label="Open More menu"><Menu className="mx-auto h-5 w-5" /></button>
        </div>

        <div className="hidden">
          <div>
  <div className="flex items-center gap-3">
    <img
      src="/favicon.png"
      alt="Zentaskra logo"
      className="h-16 w-16 rounded-xl object-contain sm:h-20 sm:w-20"
    />
    <h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">
      Zentaskra <span className="text-base font-medium text-zinc-500 sm:text-xl">(beta)</span>
    </h1>
  </div>
  <p className="mt-1 text-lg text-zinc-500">Your personal study assistant</p>
</div>
<div className="flex flex-wrap items-center gap-2 sm:gap-3">
  <button
    onClick={() => setShowHowToUse(true)}
    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
  >
    How to Use Zentaskra
  </button>

<div className={cn("rounded-full px-4 py-2 text-sm font-semibold", themeClasses.badge)}>
  {session?.user?.email ?? "Guest Mode"}
</div>

  <div className={cn("rounded-full px-4 py-2 text-sm font-semibold", themeClasses.badge)}>
    Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
  </div>

 {session ? (
  <button
    onClick={handleLogout}
    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
  >
    Logout
  </button>
) : (
  <button
    onClick={() => setGuestMode(false)}
    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
  >
    Sign In
  </button>
)}
</div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:gap-0 md:overflow-hidden md:rounded-3xl md:border md:border-zinc-200 md:bg-white md:shadow-sm">
          <aside className="hidden min-h-[calc(100dvh-3rem)] flex-col border-r border-zinc-200 bg-white p-4 md:flex">
            <button onClick={() => setActiveTab("dashboard")} className="mb-6 flex min-h-12 items-center gap-3 rounded-2xl px-2 text-left">
              <img src="/icons/pwa-192.png" alt="" className="h-11 w-11 rounded-xl" />
              <span className="text-xl font-semibold tracking-tight">Zentaskra</span>
            </button>
            <nav className="flex flex-1 flex-col space-y-1">
<button
  onClick={() => setActiveTab("dashboard")}
  className={cn(
    "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition",
    activeTab === "dashboard"
      ? "bg-indigo-50 text-indigo-700"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  )}
>
  <LayoutGrid className="h-5 w-5" /> Home
</button>

              <button onClick={() => setActiveTab("tasks")} className={cn("flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition", activeTab === "tasks" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950")}>
                <CheckCircle2 className="h-5 w-5" /> Tasks
              </button>

              <button
                onClick={() => setActiveTab("schedule")}
                className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition",
                    activeTab === "schedule" ? "bg-indigo-50 text-indigo-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                )}
              >
                <CalendarDays className="h-5 w-5" /> Schedule
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition",
                    activeTab === "chat"
  ? "bg-indigo-50 text-indigo-700"
  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                )}
              >
                <MessageSquare className="h-5 w-5" /> AI Chat
              </button>

              <button
                onClick={() => setActiveTab("planner")}
                className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition",
                    activeTab === "planner"
  ? "bg-indigo-50 text-indigo-700"
  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                )}
                
              >
                <CalendarDays className="h-5 w-5" /> Study Planner
              </button>
              <button
  onClick={() => setActiveTab("grades")}
  className={cn(
    "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition",
    activeTab === "grades"
      ? "bg-indigo-50 text-indigo-700"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
  )}
>
  <GraduationCap className="h-5 w-5" /> Grades
</button>

              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "mt-auto flex min-h-12 w-full items-center gap-3 rounded-xl border-t border-zinc-200 px-4 pt-4 text-left text-sm font-semibold transition",
                  activeTab === "settings"
  ? "text-indigo-700"
  : "text-zinc-600 hover:text-zinc-950"
                )}
              >
                <Settings className="h-5 w-5" /> Settings
              </button>
            </nav>
            <button onClick={() => session ? handleLogout() : setGuestMode(false)} className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 p-3 text-left hover:bg-zinc-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{(session?.user?.email ?? "G").charAt(0).toUpperCase()}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{session?.user?.email?.split("@")[0] ?? "Guest mode"}</span><span className="block truncate text-xs text-zinc-500">{session?.user?.email ?? "Sign in to sync"}</span></span>
            </button>
          </aside>

          <main className="desktop-app-main min-w-0 md:bg-[#fafafa] md:p-6 lg:p-8">
            {activeTab === "dashboard" && (
              <>
              <MobileDashboard
                nextClass={mobileDashboardData.nextClass}
                dueToday={mobileDashboardData.dueToday}
                missing={mobileDashboardData.missing}
                upcoming={mobileDashboardData.upcoming}
                completedCount={stats.completed}
                onTasks={() => setActiveTab("tasks")}
                onSchedule={() => setActiveTab("schedule")}
                onAddTask={openAddTaskModal}
                onEditTask={(id) => {
                  const task = tasks.find((item) => item.id === id);
                  if (task) openEditTaskModal(task);
                }}
              />
              <DesktopDashboard
                nextClass={mobileDashboardData.nextClass}
                dueToday={mobileDashboardData.dueToday}
                missing={mobileDashboardData.missing}
                upcoming={mobileDashboardData.upcoming}
                todayClasses={mobileDashboardData.todayClasses}
                completedCount={stats.completed}
                onTasks={() => setActiveTab("tasks")}
                onSchedule={() => setActiveTab("schedule")}
                onAddTask={openAddTaskModal}
                onEditTask={(id) => {
                  const task = tasks.find((item) => item.id === id);
                  if (task) openEditTaskModal(task);
                }}
              />
              </>
            )}

            {activeTab === "tasks" && (
              <MobileTasksPage
                tasks={mobileTasks}
                categories={categories}
                selectedCategory={categoryFilter}
                onCategoryChange={setCategoryFilter}
                onAdd={openAddTaskModal}
                onEdit={(id) => {
                  const task = tasks.find((item) => item.id === id);
                  if (task) openEditTaskModal(task);
                }}
                onComplete={completeTask}
                onManageCategories={() => setShowCategoryManager(true)}
              />
            )}

            {activeTab === "schedule" && (
              <SchedulePage
                meetings={scheduleMeetings}
                loading={scheduleLoading}
                error={scheduleError}
                cardClassName={themeClasses.card}
                primaryButtonClassName={themeClasses.primaryButton}
                onSave={saveScheduleMeeting}
                onDelete={deleteScheduleMeeting}
              />
            )}

            {activeTab === "tasks" && (
              <div className="hidden space-y-5 md:block">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard
  icon={<Clock3 className="h-6 w-6 text-blue-500" />}
  label="Upcoming"
  value={stats.upcoming}
  tint="bg-blue-100"
  themeClasses={themeClasses}
/>
                  <StatCard
  icon={<CircleAlert className="h-6 w-6 text-orange-500" />}
  label="In Progress"
  value={stats.inProgress}
  tint="bg-orange-100"
  themeClasses={themeClasses}
/>
                  <StatCard
  icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
  label="Completed"
  value={stats.completed}
  tint="bg-green-100"
  themeClasses={themeClasses}
/>
                  <StatCard
                    icon={<CircleAlert className="h-6 w-6 text-red-500" />}
                    label="Missing"
                    value={stats.missing}
                    tint="bg-red-100"
                    themeClasses={themeClasses}
                  />
                 <StatCard
  icon={<Flame className="h-6 w-6 text-orange-500" />}
  label="Streak"
  value={`${completionStreak} day${completionStreak === 1 ? "" : "s"}`}
  tint="bg-orange-100"
  themeClasses={themeClasses}
/>
                </div>

                {missingTasks.length > 0 && (
                  <section className={cn("rounded-2xl border border-red-200 p-4 shadow-sm sm:p-5", themeClasses.card)}>
                    <div className="mb-4 flex items-start gap-3">
                      <div className="rounded-xl bg-red-100 p-2.5"><CircleAlert className="h-6 w-6 text-red-600" /></div>
                      <div>
                        <h2 className="text-xl font-semibold sm:text-2xl">Missing Assignments</h2>
                        <p className="text-sm text-zinc-500">Automatically detected from unfinished work past its due date.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {missingTasks.map((task) => {
                        const category = categories.find((item) => item.id === task.categoryId);
                        return (
                          <div key={task.id} className="rounded-xl border border-red-200 bg-red-50/70 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-semibold">{task.title}</h3>
                                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                  <span className="rounded-full bg-white px-2.5 py-1 text-zinc-600">{task.subject}</span>
                                  {category && <span className={cn("rounded-full px-2.5 py-1", categoryBadgeClass(category.color))}>{category.name}</span>}
                                </div>
                                <p className="mt-2 text-sm font-medium text-red-700">{getDueLabel(task)}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => openEditTaskModal(task)} className="min-h-11 flex-1 rounded-xl border border-red-200 bg-white px-3 font-semibold text-zinc-700 sm:flex-none">Reschedule</button>
                                <button onClick={() => completeTask(task.id)} className="min-h-11 flex-1 rounded-xl bg-[#02031c] px-3 font-semibold text-white sm:flex-none">Complete</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <section className={cn("rounded-2xl border p-4 shadow-sm sm:p-5", themeClasses.card)}>
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-[34px]">
                        <Sparkles className="h-7 w-7" /> Your Assignments
                      </h2>
                      <button
                        onClick={openAddTaskModal}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#02031c] px-5 py-3 text-base font-semibold text-white sm:text-lg"
                      >
                        <Plus className="h-5 w-5" /> Add Task
                      </button>
                    </div>

                    <div className="space-y-4">
  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
    <select
      value={categoryFilter}
      onChange={(e) => setCategoryFilter(e.target.value)}
      aria-label="Filter by category"
      className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 outline-none"
    >
      <option value="all">All categories</option>
      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select>
    <select
      value={taskFilter}
      onChange={(e) =>
        setTaskFilter(
          e.target.value as
            | "default"
            | "priority"
            | "dueDate"
            | "progressHigh"
            | "progressLow"
        )
      }
      aria-label="Sort assignments"
      className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 outline-none"
    >
      <option value="default">Default</option>
      <option value="priority">Highest Priority</option>
      <option value="dueDate">Closest Due Date</option>
      <option value="progressHigh">Most Progress</option>
      <option value="progressLow">Least Progress</option>
    </select>
    <button onClick={() => setShowCategoryManager(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 sm:col-span-2 lg:col-span-1">
      <FolderKanban className="h-4 w-4" /> Manage categories
    </button>
  </div>

  {sortedActiveTasks.length === 0 ? (
                        <div className={cn("rounded-[28px] border border-dashed px-8 py-14 text-center", themeClasses.card)}>
                          <p className="text-2xl text-zinc-500">
                            No active tasks yet. Click <span className="font-semibold text-zinc-700">Add Task</span> to create your first assignment.
                          </p>
                        </div>
                      ) : sortedActiveTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={cn(
                            "w-full cursor-pointer rounded-2xl border p-5 transition",
                            selectedTaskId === task.id
  ? cn("border-zinc-400", themeClasses.card)
  : cn("border-zinc-200 hover:opacity-90", themeClasses.card)
                          )}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className={cn(
                                    "h-3.5 w-3.5 rounded-full",
                                    priorityDotColor(task.priority)
                                  )}
                                />
                                <h3 className="text-xl font-semibold sm:text-2xl">{task.title}</h3>
                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
                                  {task.subject}
                                </span>
                                {(() => {
                                  const category = categories.find((item) => item.id === task.categoryId);
                                  return category ? <span className={cn("rounded-full px-3 py-1 text-sm", categoryBadgeClass(category.color))}>{category.name}</span> : null;
                                })()}
                              </div>

                              <p className="mt-3 text-lg text-zinc-500">
                                {getDueLabel(task)}
                              </p>

                              <p className="mt-3 text-zinc-600">
                                {task.details || "No details added yet."}
                              </p>

                              <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
                                  <span>{progressLabel(task.progress)}</span>
                                  <span>{task.progress}%</span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      progressFillColor(task.priority)
                                    )}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:items-end">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditTaskModal(task);
                                  }}
                                  className="min-h-11 min-w-11 rounded-lg border border-zinc-200 p-2 text-zinc-600"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeTask(task.id);
                                  }}
                                  className="min-h-11 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                                  title="Complete"
                                >
                                  Complete
                                </button>
                                <button
  onClick={(e) => {
    e.stopPropagation();
    archiveTask(task.id);
  }}
  className="min-h-11 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
  title="Archive"
>
  Archive
</button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="min-h-11 min-w-11 rounded-lg border border-zinc-200 p-2 text-rose-500"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <div className="mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-zinc-600" />
                        <h3 className="text-2xl font-semibold">Archived Assignments</h3>
                      </div>

                      <div className="space-y-3">
                        {archivedTasks.length > 0 ? (
                          archivedTasks.map((task) => (
                            <div
                              key={task.id}
                              className={cn("flex items-center justify-between rounded-2xl border p-4", themeClasses.card)}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "h-3 w-3 rounded-full",
                                      priorityDotColor(task.priority)
                                    )}
                                  />
                                  <p className="text-xl font-semibold">{task.title}</p>
                                </div>
                                <p className="mt-1 text-zinc-500">{task.subject}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => unarchiveTask(task.id)}
                                  className="rounded-xl border border-zinc-300 px-4 py-2 font-semibold text-zinc-700"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="rounded-xl border border-zinc-300 px-4 py-2 font-semibold text-rose-500"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
                            No completed assignments yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className={cn("rounded-2xl border p-5 shadow-sm", themeClasses.card)}>
                    <h3 className="mb-4 text-[28px] font-semibold">
                      Assignment Check
                    </h3>

                    {selectedTask ? (
                      <div className="space-y-4">
                        <div className={cn("rounded-2xl p-4", themeClasses.card)}>
                          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                            Selected task
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <span
                              className={cn(
                                "h-3.5 w-3.5 rounded-full",
                                priorityDotColor(selectedTask.priority)
                              )}
                            />
                            <h4 className="text-2xl font-semibold">
                              {selectedTask.title}
                            </h4>
                          </div>
                          <p className="mt-1 text-zinc-500">{selectedTask.subject}</p>
                          <div className={cn("mt-3 rounded-xl border px-3 py-3", themeClasses.card)}>
  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
    Quick check
  </p>
  <p className="mt-1 text-sm text-zinc-600">
    {getTaskCheckSummary(selectedTask)}
  </p>
</div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <p className="text-lg text-zinc-500">Due date & time</p>
                          <p className="text-2xl font-semibold">
                            {getDueLabel(selectedTask)}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {formatDueDateTime(getDueDateTime(selectedTask))}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-lg text-zinc-500">Progress</p>
                            <p className="text-lg font-semibold">
                              {selectedTask.progress}%
                            </p>
                          </div>

                          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                progressFillColor(selectedTask.priority)
                              )}
                              style={{ width: `${selectedTask.progress}%` }}
                            />
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="25"
                            value={selectedTask.progress}
                            onChange={(e) =>
                              updateTaskProgress(selectedTask.id, Number(e.target.value))
                            }
                            className="mt-4 w-full accent-[#02031c]"
                          />

                          <div className="mt-2 flex justify-between text-sm text-zinc-500">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>

                          <p className="mt-3 text-sm text-zinc-500">
                            {progressLabel(selectedTask.progress)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <p className="text-lg text-zinc-500">Reminder option</p>
                          <input
                            value={reminderInput}
                            onChange={(e) => setReminderInput(e.target.value)}
                            placeholder="Tomorrow at 5:00 PM"
                            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-lg outline-none"
                          />
                          <button
                            onClick={saveReminder}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#02031c] px-4 py-3 text-lg font-semibold text-white"
                          >
                            <Bell className="h-5 w-5" /> Save Reminder
                          </button>

                          {(selectedTask.reminders?.length ?? 0) > 0 && (
                            <div className="mt-4 space-y-2">
                              {(selectedTask.reminders ?? []).map((reminder) => (
                                <div
                                  key={reminder.id}
                                  className={cn("rounded-xl px-3 py-2 text-sm", themeClasses.card)}
                                >
                                  {reminder.value}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-zinc-500" />
                            <p className="text-lg font-semibold">Upcoming Reminders</p>
                          </div>

                          {upcomingReminders.length > 0 ? (
                            <div className="space-y-2">
                              {upcomingReminders.map((reminder) => (
                                <button
                                  key={reminder.id}
                                  onClick={() => setSelectedTaskId(reminder.taskId)}
                                  className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-left hover:bg-zinc-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "h-3 w-3 rounded-full",
                                        priorityDotColor(reminder.priority)
                                      )}
                                    />
                                    <span className="font-semibold">
                                      {reminder.taskTitle}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-zinc-500">
                                    {reminder.value}
                                  </p>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-zinc-500">
                              No reminders saved yet.
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-zinc-600">
                          {selectedTask.details || "No extra details added yet."}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-xl text-zinc-500">
                          Click a task card to select it for reminders.
                        </div>

                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-zinc-500" />
                            <p className="text-lg font-semibold">Upcoming Reminders</p>
                          </div>

                          {upcomingReminders.length > 0 ? (
                            <div className="space-y-2">
                              {upcomingReminders.map((reminder) => (
                                <button
                                  key={reminder.id}
                                  onClick={() => setSelectedTaskId(reminder.taskId)}
                                  className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-left hover:bg-zinc-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "h-3 w-3 rounded-full",
                                        priorityDotColor(reminder.priority)
                                      )}
                                    />
                                    <span className="font-semibold">
                                      {reminder.taskTitle}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-zinc-500">
                                    {reminder.value}
                                  </p>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-zinc-500">
                              No reminders saved yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}



            {activeTab === "chat" && (
              <div className="flex min-h-[760px] flex-col">
                <div className="mb-5 border-b border-zinc-200 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-violet-100 p-3">
                        <Bot className="h-7 w-7 text-violet-600" />
                      </div>
                      <div>
                        <h2 className="text-[34px] font-semibold tracking-tight">
                          AI Study Assistant
                        </h2>
                        <p className="text-xl text-zinc-500">
                          Ask about assignments, deadlines, study plans, or quiz yourself with uploaded notes
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const confirmed = window.confirm("Clear the current chat?");
                        if (confirmed) clearChat();
                      }}
                      className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                    >
                      Clear Chat
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <button
                      onClick={() => setChatMode("normal")}
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-semibold transition",
                        chatMode === "normal"
                          ? "bg-[#02031c] text-white"
                          : "border border-zinc-300 bg-white text-zinc-700"
                      )}
                    >
                      Normal Mode
                    </button>

                    <button
                      onClick={() => setChatMode("quiz")}
                      className={cn(
                        "rounded-xl px-4 py-3 text-sm font-semibold transition",
                        chatMode === "quiz"
                          ? "bg-violet-600 text-white"
                          : "border border-zinc-300 bg-white text-zinc-700"
                      )}
                    >
                      Quiz Mode
                    </button>

                    <label className="flex cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                      Upload Notes
                      <input
                        type="file"
                        accept=".txt,.md,.json,.pdf,.doc,.docx,text/plain,text/markdown,application/json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleStudyFileUpload}
                        className="hidden"
                      />
                    </label>

                    <select
                      value={quizQuestionCount}
                      onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 outline-none"
                    >
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions</option>
                      <option value={10}>10 Questions</option>
                    </select>
                  </div>

                  {uploadedStudyFile && (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                      <p className="text-sm font-semibold text-violet-700">
                        Uploaded file: {uploadedStudyFile.name}
                      </p>
                      <p className="mt-1 text-sm text-violet-600">
                        Quiz mode can now use this file.
                      </p>
                    </div>
                  )}
                </div>

                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-start gap-4",
                        message.role === "user" && "justify-end"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="rounded-full bg-violet-100 p-2.5">
                          <Bot className="h-5 w-5 text-violet-600" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-3xl whitespace-pre-line rounded-2xl border p-5 text-xl leading-relaxed shadow-sm",
                          message.role === "assistant"
                            ? "border-zinc-200 bg-white"
                            : "border-[#02031c] bg-[#02031c] text-white"
                        )}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <div className="mb-3 flex items-center gap-2 text-lg text-violet-600">
                    <Sparkles className="h-5 w-5" /> Try asking:
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          if (!isSending) sendMessage(suggestion);
                        }}
                        className="rounded-xl bg-zinc-200 px-4 py-4 text-left text-xl font-medium transition hover:bg-zinc-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-8">
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isSending) {
                          sendMessage();
                        }
                      }}
                      placeholder={
                        chatMode === "quiz"
                          ? 'Say "quiz me on this file"...'
                          : "Ask what to study, what's due, or say 'Make me a study plan'..."
                      }
                      className="flex-1 bg-transparent px-3 py-3 text-xl outline-none placeholder:text-zinc-400"
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={isSending}
                      className="flex items-center gap-2 rounded-xl bg-zinc-500 px-5 py-3 text-lg font-semibold text-white disabled:opacity-60"
                    >
                      <Send className="h-5 w-5" /> {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "planner" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
  icon={<CalendarDays className="h-6 w-6 text-violet-600" />}
  label="Study Sessions"
  value={plannerStats.sessions}
  tint="bg-violet-100"
  themeClasses={themeClasses}
/>
                  <StatCard
  icon={<Clock3 className="h-6 w-6 text-blue-500" />}
  label="Weekly Hours"
  value={plannerStats.weeklyHours.toFixed(1)}
  tint="bg-blue-100"
  themeClasses={themeClasses}
/>
                  <StatCard
  icon={<Target className="h-6 w-6 text-green-500" />}
  label="Goals Completed"
  value={`${plannerStats.completedGoals}/${goals.length}`}
  tint="bg-green-100"
  themeClasses={themeClasses}
/>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
                  <section className={cn("rounded-2xl border p-5 shadow-sm", themeClasses.card)}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                      <h2 className="text-[34px] font-semibold tracking-tight">
                        Weekly Study Schedule
                      </h2>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setShowSessionModal(true)}
                          className="flex items-center gap-2 rounded-xl bg-[#02031c] px-5 py-3 text-lg font-semibold text-white"
                        >
                          <Plus className="h-5 w-5" /> Add Session
                        </button>
                        <button
                          onClick={startStudyPlanFlow}
                          className="rounded-xl border border-zinc-300 px-5 py-3 text-lg font-semibold text-zinc-700"
                        >
                          Generate Study Plan
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[560px] space-y-5 overflow-auto pr-2">
                      {weekDays.map((day) => {
                        const daySessions = sessions.filter(
                          (session) => session.day === day
                        );
                        if (!daySessions.length) return null;

                        return (
                          <div key={day}>
                            <h3 className="mb-2 text-2xl font-semibold">{day}</h3>
                            <div className="space-y-3">
                              {daySessions.map((session) => (
                                <div
                                  key={session.id}
                                  className={cn("flex items-center justify-between rounded-2xl p-4", themeClasses.card)}
                                >
                                  <div>
                                    <p className="text-2xl font-medium">
                                      {session.subject}
                                    </p>
                                    <p className="text-xl text-zinc-500">
                                      {session.topic}
                                    </p>
                                    <div className="mt-2 flex items-center gap-3 text-lg text-zinc-500">
                                      <Clock3 className="h-4 w-4" /> {session.time}
                                      <span>{session.duration} min</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setSessions((prev) =>
                                        prev.filter((item) => item.id !== session.id)
                                      )
                                    }
                                    className="p-2 text-rose-500"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {sessions.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-xl text-zinc-500">
                          No study sessions yet. Click <span className="font-semibold">Add Session</span> to create
                          one manually, or use <span className="font-semibold">Generate Study Plan</span> to
                          auto-build your week.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className={cn("rounded-2xl border p-5 shadow-sm", themeClasses.card)}>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-[34px] font-semibold tracking-tight">
                        Study Goals
                      </h2>
                      <Target className="h-6 w-6 text-zinc-500" />
                    </div>

                    <div className="mb-4 flex items-center gap-3">
                      <input
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="Add a new goal..."
                        className="flex-1 rounded-xl bg-zinc-100 px-4 py-4 text-xl outline-none placeholder:text-zinc-400"
                      />
                      <button
                        onClick={() => {
                          if (!newGoal.trim()) return;
                          setGoals((prev) => [
                            ...prev,
                            { id: Date.now(), text: newGoal.trim(), done: false },
                          ]);
                          setNewGoal("");
                        }}
                        className="rounded-xl bg-[#02031c] p-4 text-white"
                      >
                        <Plus className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {goals.map((goal) => (
                        <div
                          key={goal.id}
                          className={cn("flex items-center justify-between gap-3 rounded-2xl px-4 py-4", themeClasses.card)}
                        >
                          <button
                            onClick={() =>
                              setGoals((prev) =>
                                prev.map((item) =>
                                  item.id === goal.id
                                    ? { ...item, done: !item.done }
                                    : item
                                )
                              )
                            }
                            className="flex flex-1 items-center gap-3 text-left text-xl"
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded border-2",
                                goal.done
                                  ? "border-blue-500 bg-blue-500 text-white"
                                  : "border-zinc-500 bg-transparent"
                              )}
                            >
                              {goal.done ? "✓" : ""}
                            </div>
                            <span
                              className={cn(goal.done && "text-zinc-400 line-through")}
                            >
                              {goal.text}
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              setGoals((prev) =>
                                prev.filter((item) => item.id !== goal.id)
                              )
                            }
                            className="p-2 text-rose-500"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ))}

                      {goals.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500">
                          No study goals yet.
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
{activeTab === "grades" && (
  <>
  <MobileGradesPage
    courses={courses}
    overall={gradeStats.overall}
    atGoal={gradeStats.atGoal}
    onAddCourse={() => setShowCourseModal(true)}
    onAddMark={() => {
      setAssessmentForm((prev) => ({ ...prev, courseId: courses[0]?.id ? String(courses[0].id) : "" }));
      setShowAssessmentModal(true);
    }}
    onGoalChange={updateCourseGoal}
    onDeleteCourse={deleteCourse}
    onDeleteAssessment={deleteAssessment}
  />
  <div className="hidden space-y-5 md:block">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
  icon={<GraduationCap className="h-6 w-6 text-blue-500" />}
  label="Courses"
  value={gradeStats.courses}
  tint="bg-blue-100"
  themeClasses={themeClasses}
/>
      <StatCard
  icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
  label="At Goal"
  value={`${gradeStats.atGoal}/${gradeStats.courses}`}
  tint="bg-green-100"
  themeClasses={themeClasses}
/>
      <StatCard
  icon={<Calculator className="h-6 w-6 text-violet-600" />}
  label="Overall Avg"
  value={formatGradeValue(gradeStats.overall)}
  tint="bg-violet-100"
  themeClasses={themeClasses}
/>
      <StatCard
  icon={<Sparkles className="h-6 w-6 text-orange-500" />}
  label="Assessments"
  value={gradeStats.assessments}
  tint="bg-orange-100"
  themeClasses={themeClasses}
/>
    </div>

    <section className={cn("rounded-2xl border p-5 shadow-sm", themeClasses.card)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[34px] font-semibold tracking-tight">
            <GraduationCap className="h-7 w-7" /> Grade Tracker
          </h2>
          <p className="mt-1 text-zinc-500">
            Estimate course marks using factors like quiz = 2, test = 4, lab = 1.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCourseModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#02031c] px-5 py-3 text-lg font-semibold text-white"
          >
            <Plus className="h-5 w-5" /> Add Course
          </button>

          <button
            onClick={() => {
              setAssessmentForm((prev) => ({
                ...prev,
                courseId: courses[0]?.id ? String(courses[0].id) : "",
              }));
              setShowAssessmentModal(true);
            }}
            disabled={courses.length === 0}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 px-5 py-3 text-lg font-semibold text-zinc-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> Add Mark
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white px-8 py-14 text-center">
          <p className="text-2xl text-zinc-500">
            No courses yet. Add a course to start tracking your estimated mark.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {courses.map((course) => {
            const average = getCourseAverage(course);
            const nextNeeded = getNeededOnNextAssessment(
              course,
              Number(nextAssessmentFactor)
            );

            return (
              <div key={course.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-semibold">{course.name}</h3>
                    <p className="mt-1 text-zinc-500">
                      Current estimate:{" "}
                      <span className="font-semibold text-zinc-900">
                        {formatGradeValue(average)}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="rounded-lg border border-zinc-200 bg-white p-2 text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Goal
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={course.goal}
                        onChange={(e) => updateCourseGoal(course.id, Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xl font-semibold outline-none"
                      />
                      <span className="font-semibold">%</span>
                    </div>
                  </label>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      Status
                    </span>
                    <p
                      className={cn(
                        "mt-2 text-xl font-semibold",
                        average !== null && average >= course.goal
                          ? "text-green-600"
                          : "text-orange-600"
                      )}
                    >
                      {average === null
                        ? "Add marks first"
                        : average >= course.goal
                          ? "On track"
                          : `${(course.goal - average).toFixed(1)}% below goal`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">What do I need next?</p>
                      <p className="text-sm text-zinc-500">
                        Uses your goal and next assessment factor.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500">Factor</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={nextAssessmentFactor}
                        onChange={(e) => setNextAssessmentFactor(e.target.value)}
                        className="w-20 rounded-xl border border-zinc-200 px-3 py-2 font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <p className="text-2xl font-semibold">
                    {average === null
                      ? "Add at least one mark first."
                      : nextNeeded === null
                        ? "Enter a valid factor."
                        : nextNeeded > 100
                          ? `You would need ${nextNeeded.toFixed(1)}%, so your goal may need more than one assessment.`
                          : nextNeeded < 0
                            ? "You are already safely above this goal."
                            : `You need about ${nextNeeded.toFixed(1)}% on the next assessment.`}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {course.assessments.length > 0 ? (
                    course.assessments.map((assessment) => {
                      const percent =
                        assessment.total > 0
                          ? (assessment.score / assessment.total) * 100
                          : 0;

                      return (
                        <div
                          key={assessment.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
                        >
                          <div>
                            <p className="text-xl font-semibold">{assessment.name}</p>
                            <p className="text-zinc-500">
                              {assessment.score}/{assessment.total} • {percent.toFixed(1)}% • Factor {assessment.factor}
                            </p>
                          </div>

                          <button
                            onClick={() => deleteAssessment(course.id, assessment.id)}
                            className="p-2 text-rose-500"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-center text-zinc-500">
                      No marks added yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  </div>
  </>
)}
            {activeTab === "settings" && (
              <div className="space-y-5">
                <section className={cn("rounded-2xl border p-6 shadow-sm", themeClasses.card)}>
                  <div className="mb-6 flex items-center gap-3">
                    <Settings className="h-7 w-7" />
                    <div>
                      <h2 className="text-[34px] font-semibold tracking-tight">Settings</h2>
                      <p className="text-zinc-500">Customize how Zentaskra looks.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 p-5">
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold">Theme</h3>
                        <p className="mt-1 text-zinc-500">
                          Choose how Zentaskra looks.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {(["light", "dark", "forest", "sunset", "ocean", "lavender", "midnight", "rose", "slate"] as Theme[]).map((themeOption) => (
                          <button
                            key={themeOption}
                            onClick={() => setTheme(themeOption)}
                            className={cn(
                              "rounded-xl border px-5 py-3 text-left text-lg font-semibold transition",
                              theme === themeOption
                                ? themeClasses.tabActive
                                : "border-zinc-300 bg-white text-zinc-900"
                            )}
                          >
                   {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
</button>
))}
</div>
</div>
</div>

<div className="rounded-2xl border border-zinc-200 p-5">
  <h3 className="text-2xl font-semibold">Account</h3>
  <p className="mt-1 text-zinc-500">
    {session
      ? "You are signed in and your tasks sync across devices."
      : "You are using Zentaskra in guest mode. Your data is only saved on this device."}
  </p>
</div>

<InstallAppCard
  canInstall={pwaInstall.canInstall}
  isIosSafari={pwaInstall.isIosSafari}
  isStandalone={pwaInstall.isStandalone}
  onInstall={pwaInstall.install}
/>

<div className="rounded-2xl border border-zinc-200 p-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-blue-100 p-3"><Plug className="h-6 w-6 text-blue-700" /></div>
      <div>
        <h3 className="text-2xl font-semibold">Integrations</h3>
        <p className="mt-1 text-zinc-500">Connect official school services when they become available.</p>
      </div>
    </div>
    <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600">Coming soon</span>
  </div>
  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
    <p className="font-semibold">{blackbaudScheduleProvider.label}</p>
    <p className="mt-1 text-sm text-zinc-500">Future connection will use official Blackbaud OAuth and school authorization. Zentaskra will never ask for your BBK12 password.</p>
  </div>
</div>

</section>
              </div>
            )}
            <footer className="mt-10 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500">
  © 2026 Zentaskra. All rights reserved.
</footer>
          </main>
        </div>
      </div>
      {showAuthGate && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
  <img
    src="/favicon.png"
    alt="Zentaskra logo"
    className="h-12 w-12 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14"
  />
  <h1 className="min-w-0 text-2xl font-semibold tracking-tight sm:text-[38px]">
    Zentaskra <span className="text-sm font-medium text-zinc-500 sm:text-xl">(beta)</span>
  </h1>
</div>
        <p className="mt-2 text-zinc-500">
          Sign in to sync across devices, or continue as a guest on this device.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setAuthMode("login");
            setAuthMessage("");
          }}
          className={cn(
            "rounded-xl px-4 py-3 text-lg font-semibold transition",
            authMode === "login"
              ? "bg-[#02031c] text-white"
              : "border border-zinc-300 bg-white text-zinc-900"
          )}
        >
          Log In
        </button>

        <button
          onClick={() => {
            setAuthMode("signup");
            setAuthMessage("");
          }}
          className={cn(
            "rounded-xl px-4 py-3 text-lg font-semibold transition",
            authMode === "signup"
              ? "bg-[#02031c] text-white"
              : "border border-zinc-300 bg-white text-zinc-900"
          )}
        >
          Sign Up
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-600">Email</span>
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-600">Password</span>
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (authMode === "login") handleLogin();
                else handleSignUp();
              }
            }}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
          />
        </label>

        {authMessage ? (
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
            {authMessage}
          </div>
        ) : null}

        <button
          onClick={authMode === "login" ? handleLogin : handleSignUp}
          disabled={authSubmitting}
          className="w-full rounded-xl bg-[#02031c] px-5 py-3 text-lg font-semibold text-white disabled:opacity-60"
        >
          {authSubmitting
            ? authMode === "login"
              ? "Logging in..."
              : "Creating account..."
            : authMode === "login"
              ? "Log In"
              : "Create Account"}
        </button>

        <button
          onClick={() => {
            setGuestMode(true);
            setAuthMessage("");
          }}
          className="w-full rounded-xl border border-zinc-300 px-5 py-3 text-lg font-semibold text-zinc-700"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  </div>
)}
{showCourseModal && (
  <MobileSheet open title="Add Course" description="Create a course to track your estimated mark." onClose={() => { setShowCourseModal(false); setCourseForm(emptyCourseForm); }} className="sm:max-w-xl">
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-600">Course Name</span>
          <input
            value={courseForm.name}
            onChange={(e) =>
              setCourseForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
            placeholder="Science"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-600">Goal Mark (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={courseForm.goal}
            onChange={(e) =>
              setCourseForm((prev) => ({ ...prev, goal: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
            placeholder="95"
          />
        </label>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:p-0">
        <button
          onClick={() => {
            setShowCourseModal(false);
            setCourseForm(emptyCourseForm);
          }}
          className="rounded-xl border border-zinc-300 px-5 py-3 font-semibold text-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={addCourse}
          className="rounded-xl bg-[#02031c] px-5 py-3 font-semibold text-white"
        >
          Add Course
        </button>
      </div>
  </MobileSheet>
)}
{showAssessmentModal && (
  <MobileSheet open title="Add Mark" description="Add a quiz, test, lab, assignment, or exam mark." onClose={() => { setShowAssessmentModal(false); setAssessmentForm(emptyAssessmentForm); }} className="sm:max-w-xl">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-zinc-600">Course</span>
          <select
            value={assessmentForm.courseId}
            onChange={(e) =>
              setAssessmentForm((prev) => ({
                ...prev,
                courseId: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-zinc-600">Assessment Name</span>
          <input
            value={assessmentForm.name}
            onChange={(e) =>
              setAssessmentForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
            placeholder="Unit 5 Test"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-600">Score</span>
          <input
            type="number"
            value={assessmentForm.score}
            onChange={(e) =>
              setAssessmentForm((prev) => ({ ...prev, score: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
            placeholder="24"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-zinc-600">Out Of</span>
          <input
            type="number"
            min="1"
            value={assessmentForm.total}
            onChange={(e) =>
              setAssessmentForm((prev) => ({ ...prev, total: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
            placeholder="26"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-zinc-600">
            Factor / Weight
          </span>
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={assessmentForm.factor}
            onChange={(e) =>
              setAssessmentForm((prev) => ({ ...prev, factor: e.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
            placeholder="4"
          />
          <p className="text-sm text-zinc-500">
            Example: quiz = 2, test = 4, lab/assignment = 1.
          </p>
        </label>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:p-0">
        <button
          onClick={() => {
            setShowAssessmentModal(false);
            setAssessmentForm(emptyAssessmentForm);
          }}
          className="rounded-xl border border-zinc-300 px-5 py-3 font-semibold text-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={addAssessment}
          className="rounded-xl bg-[#02031c] px-5 py-3 font-semibold text-white"
        >
          Save Mark
        </button>
      </div>
  </MobileSheet>
)}
{showHowToUse && (
  <div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-y-auto">
    <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-semibold">How to Use Zentaskra</h3>
          <p className="mt-1 text-zinc-500">
            Quick visual guide to using your study assistant.
          </p>
        </div>
        <button
          onClick={() => setShowHowToUse(false)}
          className="rounded-full bg-zinc-100 p-2 text-zinc-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 space-y-8">
        <section>
          <h3 className="text-xl font-semibold">1. Add assignments</h3>
          <p className="text-zinc-500">
            Use the dashboard to add homework, projects, and deadlines.
          </p>
          <img
            src="/how-to/dashboard.png"
            className="mt-3 w-full rounded-xl border border-zinc-300"
          />
        </section>

        <section>
          <h3 className="text-xl font-semibold">2. Track your progress</h3>
          <p className="text-zinc-500">
            Update each task as you work on it.
          </p>
          <img
            src="/how-to/progress.png"
            className="mt-3 w-full rounded-xl border border-zinc-300"
          />
        </section>

        <section>
          <h3 className="text-xl font-semibold">3. Use AI Chat</h3>
          <p className="text-zinc-500">
            Ask Zentaskra what to study first or generate a study plan.
          </p>
          <img
            src="/how-to/chat.png"
            className="mt-3 w-full rounded-xl border border-zinc-300"
          />
        </section>

        <section>
          <h3 className="text-xl font-semibold">4. Use the Study Planner</h3>
          <p className="text-zinc-500">
            Create study sessions and organize your week.
          </p>
          <img
            src="/how-to/planner.png"
            className="mt-3 w-full rounded-xl border border-zinc-300"
          />
        </section>
      </div>
    </div>
  </div>
)}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-semibold">Add Session</h3>
                <p className="mt-1 text-zinc-500">
                  Create your own study block manually.
                </p>
              </div>
              <button
                onClick={() => setShowSessionModal(false)}
                className="rounded-full bg-zinc-100 p-2 text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">Subject</span>
                <input
                  value={sessionForm.subject}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                  placeholder="Mathematics"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">
                  Task / Topic
                </span>
                <input
                  value={sessionForm.topic}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      topic: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                  placeholder="Math Chapter 5 Homework"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">Day</span>
                <select
                  value={sessionForm.day}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      day: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                >
                  {weekDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">Time</span>
                <input
                  type="time"
                  value={sessionForm.time}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-600">
                  Duration (minutes)
                </span>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={sessionForm.duration}
                  onChange={(e) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      duration: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                  placeholder="60"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSessionModal(false)}
                className="rounded-xl border border-zinc-300 px-5 py-3 font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={addManualSession}
                className="rounded-xl bg-[#02031c] px-5 py-3 font-semibold text-white"
              >
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <MobileSheet
          open
          title={editingTaskId !== null ? "Edit Task" : "Add Task"}
          description="Create or update an assignment on your dashboard."
          onClose={() => {
            setShowTaskModal(false);
            setEditingTaskId(null);
            setTaskForm(emptyTaskForm);
          }}
          className="sm:max-w-xl"
        >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-600">Task Title</span>
                <input
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                  placeholder="Math Homework"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">Subject</span>
                <input
                  value={taskForm.subject}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                  placeholder="Mathematics"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">Category <span className="font-normal text-zinc-400">(optional)</span></span>
                <select
                  value={taskForm.categoryId}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                >
                  <option value="">No category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">
                  Due Date
                </span>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  min={formatDateInput(new Date())}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-600">
                  Due Time
                </span>
                <input
                  type="time"
                  value={taskForm.dueTime}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      dueTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-600">Priority</span>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      priority: e.target.value as Priority,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-600">
                    Progress
                  </span>
                  <span className="text-sm font-semibold text-zinc-700">
                    {taskForm.progress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  value={taskForm.progress}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      progress: String(snapProgress(Number(e.target.value))),
                    }))
                  }
                  className="w-full accent-[#02031c]"
                />

                <div className="flex justify-between text-xs text-zinc-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-600">Details</span>
                <textarea
                  value={taskForm.details}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      details: e.target.value,
                    }))
                  }
                  className="min-h-[120px] w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none"
                  placeholder="Add instructions or notes..."
                />
              </label>
            </div>

            <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:p-0">
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTaskId(null);
                  setTaskForm(emptyTaskForm);
                }}
                className="rounded-xl border border-zinc-300 px-5 py-3 font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={saveTask}
                className="rounded-xl bg-[#02031c] px-5 py-3 font-semibold text-white"
              >
                Save Task
              </button>
            </div>
        </MobileSheet>
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onSave={saveCategory}
          onDelete={deleteCategory}
        />
      )}

      {!showAuthGate && (
        <>
          <MobileBottomNav
            activeTab={activeTab}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setShowMobileMore(false);
            }}
            onMore={() => setShowMobileMore(true)}
          />
          <MobileSheet open={showMobileMore} title="More" description="Your account, tools, and app settings." onClose={() => setShowMobileMore(false)} className="sm:max-w-md">
            <nav className="grid gap-2" aria-label="More navigation">
              {([
                ["chat", "AI Chat"],
                ["planner", "Study Planner"],
                ["settings", "Settings"],
              ] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setShowMobileMore(false); }} className="min-h-12 rounded-xl border border-zinc-200 px-4 text-left font-semibold hover:bg-zinc-50">
                  {label}
                </button>
              ))}
              <button onClick={() => { setShowHowToUse(true); setShowMobileMore(false); }} className="min-h-12 rounded-xl border border-zinc-200 px-4 text-left font-semibold hover:bg-zinc-50">
                How to Use Zentaskra
              </button>
            </nav>
            <div className="mt-5">
              <InstallAppCard
                canInstall={pwaInstall.canInstall}
                isIosSafari={pwaInstall.isIosSafari}
                isStandalone={pwaInstall.isStandalone}
                onInstall={pwaInstall.install}
              />
            </div>
            <button
              onClick={() => {
                setShowMobileMore(false);
                if (session) handleLogout();
                else setGuestMode(false);
              }}
              className="mt-5 min-h-12 w-full rounded-xl border border-zinc-300 px-4 font-semibold text-zinc-700"
            >
              {session ? "Log out" : "Sign in or create an account"}
            </button>
          </MobileSheet>
        </>
      )}

      <Analytics />
    </div>
  );
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateCompletionStreak(tasks: Task[]) {
  const completedDays = Array.from(
    new Set(tasks.filter((task) => task.completedAt).map((task) => task.completedAt as string))
  ).sort();

  if (!completedDays.length) return 0;

  const completedSet = new Set(completedDays);
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  const cursor = new Date(today);
  if (!completedSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!completedSet.has(getLocalDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (completedSet.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
