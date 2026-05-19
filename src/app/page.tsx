"use client";

import { useState, useMemo } from "react";
import {
  Wallet, Target, BookOpen,
  IndianRupee, AlertCircle, Flame, Lightbulb, Check, Square,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { v4 as uid } from "@/lib/uid";
import { cn } from "@/lib/utils";

/* ─── Types matching source pages ─── */
interface Tx { id: string; type: "income" | "expense"; amount: number; }
interface KanbanTask { id: string; priority: string; title: string; status: string; }
interface Mission { id: string; title: string; status: string; }
interface Habit { id: string; name: string; daysOfWeek: number[]; color: string; }
interface Challenge { id: string; name: string; startDate: string; }
interface ChallengeDay { id: string; challengeId: string; day: number; date: string; done: boolean; }
interface HabitLog { id: string; habitId: string; date: string; done: boolean; }
interface Activity { id: string; title: string; status: string; }
interface Idea { id: string; title: string; }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function write<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function today() { return new Date().toISOString().slice(0, 10); }

const QUOTES = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Small daily improvements over time lead to stunning results. — James Clear",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Your habits shape your identity. — James Clear",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
  "Success is the sum of small efforts, repeated day in and day out. — Robert Collier",
  "You don't have to be extreme, just consistent. — Unknown",
  "Motivation gets you started. Habit keeps you going. — Jim Ryun",
  "The journey of a thousand miles begins with one step. — Lao Tzu",
  "What you do today can improve all your tomorrows. — Ralph Marston",
  "Discipline is choosing between what you want now and what you want most. — Abraham Lincoln",
  "The only impossible journey is the one you never begin. — Tony Robbins",
  "It does not matter how slowly you go as long as you do not stop. — Confucius",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
];

export default function Dashboard() {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const txns = useState<Tx[]>(() => read("wnx_txns", []))[0];
  const tasks = useState<KanbanTask[]>(() => read("wnx_kanbantasks", []))[0];
  const missions = useState<Mission[]>(() => read("wnx_missions", []))[0];
  const [habits] = useState<Habit[]>(() => read("wnx_habits", []));
  const [challenges] = useState<Challenge[]>(() => read("wnx_challenges", []));
  const [logs, setLogs] = useState<HabitLog[]>(() => read("wnx_habitlogs", []));
  const [challengeDays, setChallengeDays] = useState<ChallengeDay[]>(() => read("wnx_challengelogs", []));
  const activities = useState<Activity[]>(() => read("wnx_activities", []))[0];
  const ideas = useState<Idea[]>(() => read("wnx_ideas", []))[0];

  const balance = useMemo(() => {
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return income - expense;
  }, [txns]);

  const urgentTasks = useMemo(() => tasks.filter((t) => t.priority === "urgent" && t.status !== "publish"), [tasks]);
  const activeMissions = useMemo(() => missions.filter((m) => m.status === "active"), [missions]);
  const activeHabits = useMemo(() => habits.length, [habits]);
  const inProgressLearning = useMemo(() => activities.filter((a) => a.status === "in-progress"), [activities]);
  const ideaCount = useMemo(() => ideas.length, [ideas]);

  const activeChallenges = useMemo(() => challenges.filter((c) => {
    const days = challengeDays.filter((d) => d.challengeId === c.id);
    return days.filter((d) => d.done).length < 21;
  }), [challenges, challengeDays]);

  const todayHabits = useMemo(() => {
    const day = new Date().getDay();
    return habits.filter((h) => h.daysOfWeek.includes(day));
  }, [habits]);

  function toggleHabit(habitId: string) {
    const todayStr = today();
    const existing = logs.find((l) => l.habitId === habitId && l.date === todayStr);
    let newLogs: HabitLog[];
    if (existing) {
      newLogs = logs.map((l) => l.id === existing.id ? { ...l, done: !l.done } : l);
    } else {
      newLogs = [...logs, { id: uid(), habitId, date: todayStr, done: true }];
    }
    setLogs(newLogs);
    write("wnx_habitlogs", newLogs);
  }

  function isHabitDone(habitId: string) {
    return logs.some((l) => l.habitId === habitId && l.date === today() && l.done);
  }

  function toggleChallengeDay(challengeId: string) {
    const todayStr = today();
    const existing = challengeDays.find((d) => d.challengeId === challengeId && d.date === todayStr);
    let newDays: ChallengeDay[];
    if (existing) {
      newDays = challengeDays.map((d) => d.id === existing.id ? { ...d, done: !d.done } : d);
    } else {
      const c = challenges.find((x) => x.id === challengeId)!;
      const start = new Date(c.startDate);
      const dayNum = Math.floor((new Date(todayStr).getTime() - start.getTime()) / 86400000) + 1;
      if (dayNum < 1 || dayNum > 21) return;
      newDays = [...challengeDays, { id: uid(), challengeId, day: dayNum, date: todayStr, done: true }];
    }
    setChallengeDays(newDays);
    write("wnx_challengelogs", newDays);
  }

  function isChallengeDayDone(challengeId: string) {
    return challengeDays.some((d) => d.challengeId === challengeId && d.date === today() && d.done);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-sm italic text-zinc-500 dark:text-zinc-400" suppressHydrationWarning>&ldquo;{quote}&rdquo;</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardReal title="Balance" value={balance >= 0 ? fmtINR(balance) : `-${fmtINR(Math.abs(balance))}`} icon={IndianRupee} href="/finance" accent="emerald" />
        <StatCardReal title="Urgent Tasks" value={urgentTasks.length} icon={AlertCircle} href="/youtube" accent="rose" />
        <StatCardReal title="Active Missions" value={activeMissions.length} icon={Target} href="/mission" accent="violet" />
        <StatCardReal title="Habits + Challenges" value={`${activeHabits} / ${activeChallenges.length}`} icon={Flame} href="/habit" accent="amber" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardReal title="In-Progress Learning" value={inProgressLearning.length} icon={BookOpen} href="/learning" accent="cyan" />
        <StatCardReal title="Creative Ideas" value={ideaCount} icon={Lightbulb} href="/creative" accent="pink" />
      </div>

      {/* Today's Habits */}
      {todayHabits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayHabits.map((h) => {
                const done = isHabitDone(h.id);
                return (
                  <button key={h.id} onClick={() => toggleHabit(h.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    {done
                      ? <Check className="h-5 w-5 text-emerald-500" />
                      : <Square className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />}
                    <span className={`${done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {h.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Challenge */}
      {activeChallenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeChallenges.slice(0, 5).map((c) => {
                const done = isChallengeDayDone(c.id);
                return (
                  <button key={c.id} onClick={() => toggleChallengeDay(c.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    {done
                      ? <Check className="h-5 w-5 text-emerald-500" />
                      : <Square className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />}
                    <span className={`${done ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {urgentTasks.length > 0 && (
        <a href="/youtube">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle>Urgent YouTube Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {urgentTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-zinc-700 dark:text-zinc-300">{t.title}</span>
                    <span className="ml-auto text-xs capitalize text-zinc-400">{t.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </a>
      )}

      {activeMissions.length > 0 && (
        <a href="/mission">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle>Active Missions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeMissions.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-zinc-700 dark:text-zinc-300">{m.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </a>
      )}

      {inProgressLearning.length > 0 && (
        <a href="/learning">
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle>Learning In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inProgressLearning.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-zinc-700 dark:text-zinc-300">{a.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </a>
      )}
    </div>
  );
}

const ACCENTS = {
  emerald: { bar: "bg-emerald-500", icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400", hover: "hover:border-emerald-200 dark:hover:border-emerald-800" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400", hover: "hover:border-rose-200 dark:hover:border-rose-800" },
  violet: { bar: "bg-violet-500", icon: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400", hover: "hover:border-violet-200 dark:hover:border-violet-800" },
  amber: { bar: "bg-amber-500", icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400", hover: "hover:border-amber-200 dark:hover:border-amber-800" },
  cyan: { bar: "bg-cyan-500", icon: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400", hover: "hover:border-cyan-200 dark:hover:border-cyan-800" },
  pink: { bar: "bg-pink-500", icon: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400", hover: "hover:border-pink-200 dark:hover:border-pink-800" },
} as const;

function StatCardReal({ title, value, icon: Icon, href, accent }: {
  title: string; value: string | number; icon: typeof Wallet; href: string; accent: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <a href={href} className="group block">
      <Card className={cn("relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md", a.hover)}>
        <div className={cn("h-1 w-full", a.bar)} />
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-110", a.icon)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{value}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{title}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 dark:text-zinc-600" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
