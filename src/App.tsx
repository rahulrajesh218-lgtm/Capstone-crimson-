import React, { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
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
} from "lucide-react";

type TaskStatus = "upcoming" | "in-progress" | "completed";
type Priority = "high" | "medium" | "low";
type Tab = "dashboard" | "chat" | "planner" | "settings";
type Theme = "light" | "dark" | "forest" | "sunset";

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

const STORAGE_KEYS = {
  guestMode: "zentaskra_guest_mode_v1",
  tasks: "zentaskra_tasks_v7",
  sessions: "zentaskra_sessions_v2",
  goals: "zentaskra_goals_v2",
  messages: "zentaskra_messages_v2",
  studyPlanFlow: "zentaskra_study_plan_flow_v2",
  theme: "zentaskra_theme_v1",
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
};

const emptySessionForm: SessionForm = {
  subject: "",
  topic: "",
  day: "Monday",
  time: "16:00",
  duration: "60",
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

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
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
  window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
}, [theme]);

useEffect(() => {
  let mounted = true;

  const loadSession = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error loading session:", error.message);
    }

    if (mounted) {
      setSession(data.session ?? null);
      setAuthLoading(false);
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
    subscription.unsubscribe();
  };
}, []);
useEffect(() => {
  if (authLoading) return;

  if (session?.user?.id) {
    loadTasks(session.user.id);
  } else {
    const localTasks = readStorage(STORAGE_KEYS.tasks, [] as Task[]);
    setTasks(normalizeTasks(localTasks));
  }
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
  const filtered = [...activeTasks];

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
}, [activeTasks, taskFilter]);

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
      reminders: (task.reminders ?? []).map((r: any) => ({
        id: Number(r.id),
        value: r.value,
        createdAt: new Date(r.created_at).getTime(),
      })),
      completedAt: task.completed_at ?? undefined,
    };
  });

  setTasks(normalizeTasks(mappedTasks));
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
  throw new Error(data?.error || "Failed to get response");
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
        text: "Sorry, I couldn’t generate a response right now.",
      },
    ]);
  } finally {
    setIsSending(false);
  }
};
const showAuthGate = !session && !guestMode;
const themeClasses = {
  page: cn(
    "min-h-screen transition-colors",
    theme === "dark"
      ? "zentaskra-dark bg-[#0b1020] text-zinc-100"
      : theme === "forest"
        ? "zentaskra-forest bg-emerald-50 text-[#1a1a1a]"
        : theme === "sunset"
          ? "zentaskra-sunset bg-orange-50 text-[#1a1a1a]"
          : "bg-[#f7f7f8] text-[#1a1a1a]"
  ),
  tabActive:
    theme === "forest"
      ? "bg-emerald-700 text-white"
      : theme === "sunset"
        ? "bg-orange-500 text-white"
        : "bg-[#02031c] text-white",
  primaryButton:
    theme === "forest"
      ? "bg-emerald-700 text-white"
      : theme === "sunset"
        ? "bg-orange-500 text-white"
        : "bg-[#02031c] text-white",
  badge:
    theme === "dark"
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
        .zentaskra-dark .text-zinc-900 { color: #f3f4f6 !important; }
        .zentaskra-dark .hover\:bg-zinc-300:hover { background-color: #334155 !important; }
        .zentaskra-dark input,
        .zentaskra-dark select,
        .zentaskra-dark textarea { background-color: #0f172a; color: #f8fafc; border-color: #334155; }
        .zentaskra-dark input::placeholder,
        .zentaskra-dark textarea::placeholder { color: #94a3b8; }
      `}</style>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
  <div className="flex items-center gap-3">
    <img
      src="/favicon.png"
      alt="Zentaskra logo"
      className="h-12 w-12 rounded-xl object-contain"
    />
    <h1 className="text-[38px] font-semibold tracking-tight">
      Zentaskra <span className="text-xl text-zinc-500 font-medium">(beta)</span>
    </h1>
  </div>
  <p className="mt-1 text-lg text-zinc-500">Your personal study assistant</p>
</div>
<div className="flex items-center gap-4">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-r border-zinc-200 pr-4">
            <nav className="space-y-3">
<button
  onClick={() => setActiveTab("dashboard")}
  className={cn(
    "flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-xl font-semibold transition",
    activeTab === "dashboard"
      ? themeClasses.tabActive
      : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
  )}
>
  <LayoutGrid className="h-6 w-6" /> Dashboard
</button>

              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-xl font-semibold transition",
                  activeTab === "chat"
  ? themeClasses.tabActive
  : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                )}
              >
                <MessageSquare className="h-6 w-6" /> AI Chat
              </button>

              <button
                onClick={() => setActiveTab("planner")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-xl font-semibold transition",
                  activeTab === "planner"
  ? themeClasses.tabActive
  : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                )}
              >
                <CalendarDays className="h-6 w-6" /> Study Planner
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-xl font-semibold transition",
                  activeTab === "settings"
  ? themeClasses.tabActive
  : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
                )}
              >
                <Settings className="h-6 w-6" /> Settings
              </button>
            </nav>
          </aside>

          <main>
            {activeTab === "dashboard" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={<Clock3 className="h-6 w-6 text-blue-500" />}
                    label="Upcoming"
                    value={stats.upcoming}
                    tint="bg-blue-100"
                  />
                  <StatCard
                    icon={<CircleAlert className="h-6 w-6 text-orange-500" />}
                    label="In Progress"
                    value={stats.inProgress}
                    tint="bg-orange-100"
                  />
                  <StatCard
                    icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
                    label="Completed"
                    value={stats.completed}
                    tint="bg-green-100"
                  />
                  <StatCard
                    icon={<Flame className="h-6 w-6 text-orange-500" />}
                    label="Streak"
                    value={`${completionStreak} day${completionStreak === 1 ? "" : "s"}`}
                    tint="bg-orange-100"
                  />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h2 className="flex items-center gap-2 text-[34px] font-semibold tracking-tight">
                        <Sparkles className="h-7 w-7" /> Your Assignments
                      </h2>
                      <button
                        onClick={openAddTaskModal}
                        className="flex items-center gap-2 rounded-xl bg-[#02031c] px-5 py-3 text-lg font-semibold text-white"
                      >
                        <Plus className="h-5 w-5" /> Add Task
                      </button>
                    </div>

                    <div className="space-y-4">
  <div className="flex items-center justify-end gap-3">
    <span className="text-sm font-medium text-zinc-500">Sort assignments</span>
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
      className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 outline-none"
    >
      <option value="default">Default</option>
      <option value="priority">Highest Priority</option>
      <option value="dueDate">Closest Due Date</option>
      <option value="progressHigh">Most Progress</option>
      <option value="progressLow">Least Progress</option>
    </select>
  </div>

  {activeTasks.length === 0 ? (
                        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white px-8 py-14 text-center">
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
                              ? "border-zinc-400 bg-zinc-50"
                              : "border-zinc-200 bg-white hover:bg-zinc-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 text-left">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className={cn(
                                    "h-3.5 w-3.5 rounded-full",
                                    priorityDotColor(task.priority)
                                  )}
                                />
                                <h3 className="text-2xl font-semibold">{task.title}</h3>
                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
                                  {task.subject}
                                </span>
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

                            <div className="flex flex-col items-end gap-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditTaskModal(task);
                                  }}
                                  className="rounded-lg border border-zinc-200 p-2 text-zinc-600"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeTask(task.id);
                                  }}
                                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                                  title="Complete"
                                >
                                  Complete
                                </button>
                                <button
  onClick={(e) => {
    e.stopPropagation();
    archiveTask(task.id);
  }}
  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
  title="Archive"
>
  Archive
</button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="rounded-lg border border-zinc-200 p-2 text-rose-500"
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
                              className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
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

                  <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-[28px] font-semibold">
                      Assignment Check
                    </h3>

                    {selectedTask ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-zinc-50 p-4">
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
                          <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
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
                                  className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
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
                  />
                  <StatCard
                    icon={<Clock3 className="h-6 w-6 text-blue-500" />}
                    label="Weekly Hours"
                    value={plannerStats.weeklyHours.toFixed(1)}
                    tint="bg-blue-100"
                  />
                  <StatCard
                    icon={<Target className="h-6 w-6 text-green-500" />}
                    label="Goals Completed"
                    value={`${plannerStats.completedGoals}/${goals.length}`}
                    tint="bg-green-100"
                  />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
                  <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                                  className="flex items-center justify-between rounded-2xl bg-zinc-100 p-4"
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

                  <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                          className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-100 px-4 py-4"
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

            {activeTab === "settings" && (
              <div className="space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
                        {(["light", "dark", "forest", "sunset"] as Theme[]).map((themeOption) => (
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
    <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
      <div className="text-center">
        <div className="flex items-center gap-3">
  <img
    src="/favicon.png"
    alt="Zentaskra logo"
    className="h-14 w-14 rounded-xl object-contain"
  />
  <h1 className="text-[38px] font-semibold tracking-tight">
    Zentaskra <span className="text-xl text-zinc-500 font-medium">(beta)</span>
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
                authMode === "login" ? handleLogin() : handleSignUp();
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
{showHowToUse && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-semibold">How to Use Zentaskra</h3>
          <p className="mt-1 text-zinc-500">
            Quick guide to using your study assistant.
          </p>
        </div>
        <button
          onClick={() => setShowHowToUse(false)}
          className="rounded-full bg-zinc-100 p-2 text-zinc-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-lg text-zinc-700">
        <p>1. Add assignments from your dashboard.</p>
        <p>2. Set due date, due time, and priority.</p>
        <p>3. Track progress using the slider.</p>
        <p>4. Select a task to save reminders.</p>
        <p>5. Use AI Chat to ask what to study.</p>
        <p>6. Generate study plans in Study Planner.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-semibold">
                  {editingTaskId !== null ? "Edit Task" : "Add Task"}
                </h3>
                <p className="mt-1 text-zinc-500">
                  Create or update an assignment on your dashboard.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTaskId(null);
                  setTaskForm(emptyTaskForm);
                }}
                className="rounded-full bg-zinc-100 p-2 text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

            <div className="mt-6 flex justify-end gap-3">
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
          </div>
        </div>
      )}
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

  let cursor = new Date(today);
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
