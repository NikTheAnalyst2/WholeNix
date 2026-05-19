"use client";

import { useState, useMemo } from "react";
import { v4 as uid } from "@/lib/uid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Modal } from "@/components/modal";
import { Card, CardContent } from "@/components/card";
import { addToTrash } from "@/lib/trash";
import {
  Flame, Trophy, CalendarDays, Check, Plus, Pencil, Trash2,
  Target, Zap, Smile,
} from "lucide-react";

/* ─── Types ─── */
interface Habit {
  id: string; name: string; description: string; color: string;
  daysOfWeek: number[]; createdAt: string;
}
interface HabitLog {
  id: string; habitId: string; date: string; done: boolean;
}
interface Challenge {
  id: string; name: string; description: string; startDate: string; color: string;
}
interface ChallengeDay {
  id: string; challengeId: string; day: number; date: string; done: boolean;
}
interface MoodEntry {
  id: string; date: string; mood: number; note: string;
}

const HABIT_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-blue-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-brand-500",
];
const CHALLENGE_COLORS = [
  "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-600",
  "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-600",
  "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-600",
  "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-600",
  "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-600",
  "border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-600",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOODS = [
  { value: 1, emoji: "😢", label: "Terrible" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😊", label: "Great" },
];
const MOOD_COLORS = [
  "bg-red-200 dark:bg-red-900/40",
  "bg-orange-200 dark:bg-orange-900/40",
  "bg-yellow-200 dark:bg-yellow-900/40",
  "bg-lime-200 dark:bg-lime-900/40",
  "bg-emerald-200 dark:bg-emerald-900/40",
];

type TabId = "habits" | "challenges" | "mood";

function today() { return new Date().toISOString().slice(0, 10); }
function dateKey(d: Date) { return d.toISOString().slice(0, 10); }

export default function Habit() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("wnx_habits", []);
  const [logs, setLogs] = useLocalStorage<HabitLog[]>("wnx_habitlogs", []);
  const [challenges, setChallenges] = useLocalStorage<Challenge[]>("wnx_challenges", []);
  const [challengeDays, setChallengeDays] = useLocalStorage<ChallengeDay[]>("wnx_challengelogs", []);
  const [moods, setMoods] = useLocalStorage<MoodEntry[]>("wnx_moodlogs", []);

  const [tab, setTab] = useState<TabId>("habits");
  const [habitModal, setHabitModal] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [challengeModal, setChallengeModal] = useState(false);
  const [editChallenge, setEditChallenge] = useState<Challenge | null>(null);
  const [moodMonth, setMoodMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  /* ─── Derived: habit streaks ─── */
  const habitStats = useMemo(() => {
    const todayStr = today();
    const todayDay = new Date().getDay();

    let doneToday = 0;
    let totalActiveToday = 0;
    let bestStreak = 0;

    const streaks: Record<string, number> = {};
    for (const h of habits) {
      const hLogs = logs.filter((l) => l.habitId === h.id).sort((a, b) => b.date.localeCompare(a.date));
      let streak = 0;
      const d = new Date();
      while (true) {
        const key = dateKey(d);
        const log = hLogs.find((l) => l.date === key);
        if (log?.done) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
      streaks[h.id] = streak;
      if (streak > bestStreak) bestStreak = streak;

      const todayLog = logs.find((l) => l.habitId === h.id && l.date === todayStr);
      if (h.daysOfWeek.includes(todayDay)) {
        totalActiveToday++;
        if (todayLog?.done) doneToday++;
      }
    }

    const weekStr = new Date();
    const weekStart = new Date(weekStr);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekTotal = habits.reduce((sum, h) => {
      const weekLogs = logs.filter((l) => l.habitId === h.id && l.date >= dateKey(weekStart) && l.date <= todayStr);
      return sum + (weekLogs.filter((l) => l.done).length / Math.max(weekLogs.length, 1));
    }, 0);
    const weekPct = habits.length ? Math.round((weekTotal / habits.length) * 100) : 0;

    return { bestStreak, doneToday, totalActiveToday, weekPct, streaks };
  }, [habits, logs]);

  /* ─── Weekly chart data ─── */
  const weekChartData = useMemo(() => {
    const todayD = new Date();
    const start = new Date(todayD);
    start.setDate(start.getDate() - start.getDay());
    const days: { label: string; date: string; pct: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = dateKey(d);
      const dayHabits = habits.filter((h) => h.daysOfWeek.includes(d.getDay()));
      const done = dayHabits.filter((h) => logs.some((l) => l.habitId === h.id && l.date === dateStr && l.done)).length;
      const pct = dayHabits.length ? Math.round((done / dayHabits.length) * 100) : 0;
      days.push({ label: DAY_NAMES[d.getDay()].slice(0, 2), date: dateStr, pct });
    }
    return days;
  }, [habits, logs]);

  /* ─── Challenge stats ─── */
  const challengeStats = useMemo(() => {
    let active = 0, completed = 0, bestStreak = 0;
    for (const c of challenges) {
      const cDays = challengeDays.filter((d) => d.challengeId === c.id);
      const done = cDays.filter((d) => d.done).length;
      if (done >= 21) completed++;
      else active++;

      let streak = 0;
      for (let i = 1; i <= 21; i++) {
        const d = cDays.find((d) => d.day === i);
        if (d?.done) streak++;
        else break;
      }
      if (streak > bestStreak) bestStreak = streak;
    }
    return { active, completed, bestStreak };
  }, [challenges, challengeDays]);

  /* ─── CRUD: Habits ─── */
  function saveHabit(d: Omit<Habit, "id" | "color" | "createdAt">) {
    if (editHabit) {
      setHabits((p) => p.map((h) => (h.id === editHabit.id ? { ...h, ...d } : h)));
      setHabitModal(false); setEditHabit(null);
    } else {
      const h: Habit = { ...d, id: uid(), color: HABIT_COLORS[habits.length % HABIT_COLORS.length], createdAt: today() };
      setHabits((p) => [...p, h]);
      setHabitModal(false);
    }
  }
  function delHabit(id: string) {
    const item = habits.find((h) => h.id === id);
    if (item) addToTrash({ id: item.id, source: "habit", sourceLabel: "Habit", sourceKey: "wnx_habits", data: item as unknown as Record<string, unknown> });
    setHabits((p) => p.filter((h) => h.id !== id));
    setLogs((p) => p.filter((l) => l.habitId !== id));
  }

  function toggleHabit(habitId: string) {
    const todayStr = today();
    const existing = logs.find((l) => l.habitId === habitId && l.date === todayStr);
    if (existing) {
      setLogs((p) => p.map((l) => l.id === existing.id ? { ...l, done: !l.done } : l));
    } else {
      setLogs((p) => [...p, { id: uid(), habitId, date: todayStr, done: true }]);
    }
  }

  function isHabitDoneToday(habitId: string) {
    return logs.some((l) => l.habitId === habitId && l.date === today() && l.done);
  }

  function isHabitDoneOn(habitId: string, date: string) {
    return logs.some((l) => l.habitId === habitId && l.date === date && l.done);
  }

  /* ─── CRUD: Challenges ─── */
  function saveChallenge(d: Omit<Challenge, "id" | "color">) {
    if (editChallenge) {
      setChallenges((p) => p.map((c) => (c.id === editChallenge.id ? { ...c, ...d } : c)));
      setChallengeModal(false); setEditChallenge(null);
    } else {
      const c: Challenge = { ...d, id: uid(), color: CHALLENGE_COLORS[challenges.length % CHALLENGE_COLORS.length] };
      setChallenges((p) => [...p, c]);
      setChallengeModal(false);
    }
  }
  function delChallenge(id: string) {
    const item = challenges.find((c) => c.id === id);
    if (item) addToTrash({ id: item.id, source: "habit", sourceLabel: "Habit · 21-Day Challenge", sourceKey: "wnx_challenges", data: item as unknown as Record<string, unknown> });
    setChallenges((p) => p.filter((c) => c.id !== id));
    setChallengeDays((p) => p.filter((d) => d.challengeId !== id));
  }

  function toggleChallengeDay(challengeId: string, day: number) {
    const existing = challengeDays.find((d) => d.challengeId === challengeId && d.day === day);
    if (existing) {
      setChallengeDays((p) => p.map((d) => d.id === existing.id ? { ...d, done: !d.done } : d));
    } else {
      const start = challenges.find((c) => c.id === challengeId)!;
      const d = new Date(start.startDate);
      d.setDate(d.getDate() + day - 1);
      setChallengeDays((p) => [...p, { id: uid(), challengeId, day, date: dateKey(d), done: true }]);
    }
  }

  function isChallengeDayDone(challengeId: string, day: number) {
    return challengeDays.some((d) => d.challengeId === challengeId && d.day === day && d.done);
  }

  function challengeProgress(challengeId: string) {
    return challengeDays.filter((d) => d.challengeId === challengeId && d.done).length;
  }

  /* ─── Mood ─── */
  function setMood(mood: number) {
    const existing = moods.find((m) => m.date === today());
    if (existing) {
      setMoods((p) => p.map((m) => m.id === existing.id ? { ...m, mood } : m));
    } else {
      setMoods((p) => [...p, { id: uid(), date: today(), mood, note: "" }]);
    }
  }

  function getMood(date: string): number | null {
    return moods.find((m) => m.date === date)?.mood ?? null;
  }

  /* ─── Mood calendar ─── */
  const moodCalendar = useMemo(() => {
    const [year, month] = moodMonth.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const days: { date: string; day: number; mood: number | null }[] = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const dateStr = dateKey(d);
      days.push({ date: dateStr, day: d.getDate(), mood: getMood(dateStr) });
    }
    const startPad = first.getDay();
    return { days, startPad };
  }, [moodMonth, moods]);

  function prevMonth() {
    const [y, m] = moodMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMoodMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = moodMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMoodMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  /* ─── Week generator ─── */
  function currentWeek() {
    const days: { label: string; date: string; day: number }[] = [];
    const todayD = new Date();
    const start = new Date(todayD);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({ label: DAY_NAMES[d.getDay()], date: dateKey(d), day: d.getDay() });
    }
    return days;
  }
  const weekDays = currentWeek();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Habits</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Track daily routines, 21-day challenges, and your mood.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
        {(["habits", "challenges", "mood"] as const).map((t) => {
          const active = tab === t;
          const Icon = t === "habits" ? Flame : t === "challenges" ? Target : Smile;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                active
                  ? "bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              }`}
            ><Icon className="h-4 w-4" /><span>{t === "habits" ? "Daily Habits" : t === "challenges" ? "21-Day Challenges" : "Mood Tracker"}</span></button>
          );
        })}
      </div>

      {/* ════════════════════════════════════ */}
      {/* DAILY HABITS TAB */}
      {/* ════════════════════════════════════ */}
      {tab === "habits" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat icon={Flame} label="Best Streak" value={habitStats.bestStreak} color="text-brand-500" bg="bg-brand-50 dark:bg-brand-950/30" />
            <MiniStat icon={Trophy} label="Done Today" value={`${habitStats.doneToday}/${habitStats.totalActiveToday}`} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-950/30" />
            <MiniStat icon={CalendarDays} label="This Week" value={`${habitStats.weekPct}%`} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" />
          </div>

          {/* Weekly chart */}
          {habits.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <p className="mb-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Weekly Completion</p>
                <div className="flex items-end gap-2">
                  {weekChartData.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-zinc-500">{d.pct}%</span>
                      <div className="flex w-full flex-col items-center">
                        <div className="h-24 w-full max-w-[28px] overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="w-full rounded-md bg-brand-500 transition-all duration-300"
                            style={{ height: `${d.pct}%`, marginTop: `${100 - d.pct}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium ${d.date === today() ? "text-brand-600" : "text-zinc-400"}`}>
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{habits.length} habit{habits.length !== 1 && "s"}</p>
            <button onClick={() => { setEditHabit(null); setHabitModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Add Habit</button>
          </div>

          {habits.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No habits yet. Create your first one.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {habits.map((h) => {
                const done = isHabitDoneToday(h.id);
                const streak = habitStats.streaks[h.id] || 0;
                return (
                  <Card key={h.id} className={`group transition-shadow hover:shadow-lg ${done ? "border-emerald-200 dark:border-emerald-900" : ""}`}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => toggleHabit(h.id)}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            done
                              ? `${h.color} border-transparent text-white shadow-sm`
                              : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400"
                          }`}
                        >{done && <Check className="h-3.5 w-3.5" />}</button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-semibold ${done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                              {h.name}
                            </h3>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Flame className="h-3.5 w-3.5 text-orange-400" />
                              <span className="text-xs font-bold text-orange-500">{streak}</span>
                            </div>
                          </div>
                          {h.description && (
                            <p className="mt-0.5 truncate text-xs text-zinc-400">{h.description}</p>
                          )}
                          <div className="mt-2.5 flex gap-1">
                            {weekDays.map((wd) => {
                              const active = h.daysOfWeek.includes(wd.day);
                              const dayDone = isHabitDoneOn(h.id, wd.date);
                              return (
                                <div key={wd.date}
                                  className={`flex h-7 flex-1 items-center justify-center rounded text-[10px] font-medium transition-all ${
                                    !active ? "bg-zinc-50 text-zinc-300 dark:bg-zinc-800/50 dark:text-zinc-600" :
                                    dayDone ? `${h.color} text-white shadow-sm` :
                                    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                  }`}
                                >{wd.label.slice(0, 2)}</div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-0.5">
                          <button onClick={() => { setEditHabit(h); setHabitModal(true); }}
                            className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                          ><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => delHabit(h.id)}
                            className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                          ><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════ */}
      {/* 21-DAY CHALLENGES TAB */}
      {/* ════════════════════════════════════ */}
      {tab === "challenges" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat icon={Target} label="Active" value={challengeStats.active} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-950/30" />
            <MiniStat icon={Trophy} label="Completed" value={challengeStats.completed} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-950/30" />
            <MiniStat icon={Zap} label="Best Streak" value={challengeStats.bestStreak} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" suffix="/21" />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{challenges.length} challenge{challenges.length !== 1 && "s"}</p>
            <button onClick={() => { setEditChallenge(null); setChallengeModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Add Challenge</button>
          </div>

          {challenges.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No 21-day challenges yet. Start forming a habit!</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {challenges.map((c) => {
                const progress = challengeProgress(c.id);
                const done = progress >= 21;
                return (
                  <Card key={c.id} className={`group transition-shadow hover:shadow-lg ${done ? "border-emerald-200 dark:border-emerald-900" : ""}`}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-semibold ${done ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                              {c.name}
                            </h3>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              done ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" :
                              progress > 0 ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" :
                              "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>{done ? "Done" : `Day ${Math.min(progress + 1, 21)}/21`}</span>
                          </div>
                          {c.description && (
                            <p className="mt-0.5 truncate text-xs text-zinc-400">{c.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <button onClick={() => { setEditChallenge(c); setChallengeModal(true); }}
                            className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                          ><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => delChallenge(c.id)}
                            className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                          ><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="grid grid-cols-7 gap-1.5">
                          {Array.from({ length: 21 }, (_, i) => i + 1).map((day) => {
                            const dayDone = isChallengeDayDone(c.id, day);
                            return (
                              <button key={day} onClick={() => toggleChallengeDay(c.id, day)}
                                className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xs font-bold transition-all ${
                                  dayDone
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                    : progress >= day && !dayDone
                                    ? "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                                    : "border-zinc-100 bg-white text-zinc-300 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600 dark:hover:border-zinc-600"
                                } ${dayDone ? "" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                                title={`Day ${day}`}
                              >{dayDone ? <Check className="h-3 w-3" /> : day}</button>
                            );
                          })}
                        </div>

                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-brand-500"}`}
                              style={{ width: `${(progress / 21) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-zinc-500">{progress}/21</span>
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-400">
                          <div className="flex items-center gap-1">
                            <div className="h-2.5 w-2.5 rounded border-2 border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
                            <span>Remaining</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
                            <span>Done</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════ */}
      {/* MOOD TRACKER TAB */}
      {/* ════════════════════════════════════ */}
      {tab === "mood" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <p className="mb-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">How are you feeling today?</p>
              <div className="flex justify-center gap-3">
                {MOODS.map((m) => {
                  const current = getMood(today()) === m.value;
                  return (
                    <button key={m.value} onClick={() => setMood(m.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl px-4 py-3 text-lg transition-all ${
                        current
                          ? `${MOOD_COLORS[m.value - 1]} shadow-sm ring-2 ring-brand-500`
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className={`text-[10px] font-medium ${current ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Monthly calendar */}
          <Card>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center justify-between">
                <button onClick={prevMonth}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >← Prev</button>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {new Date(moodMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button onClick={nextMonth}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >Next →</button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-1 text-center text-[10px] font-medium text-zinc-400">{d.slice(0, 2)}</div>
                ))}
                {Array.from({ length: moodCalendar.startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {moodCalendar.days.map((d) => {
                  const m = d.mood;
                  return (
                    <div key={d.date}
                      className={`flex aspect-square items-center justify-center rounded-lg text-xs font-medium ${
                        m ? MOOD_COLORS[m - 1] + " text-zinc-700 dark:text-zinc-300" :
                        d.date === today() ? "border border-dashed border-zinc-300 text-zinc-300 dark:border-zinc-600 dark:text-zinc-600" :
                        "text-zinc-300 dark:text-zinc-700"
                      } ${d.date === today() && !m ? "" : ""}`}
                      title={MOODS.find((x) => x.value === m)?.label || d.date}
                    >
                      {d.date === today() && !m ? "?" : m ? MOODS[m - 1].emoji : d.day}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                {MOODS.map((m) => (
                  <div key={m.value} className="flex items-center gap-1 text-[10px] text-zinc-400">
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Modals ─── */}
      <Modal open={habitModal} onClose={() => { setHabitModal(false); setEditHabit(null); }}
        title={editHabit ? "Edit Habit" : "New Habit"}>
        <HabitForm initial={editHabit} onSave={saveHabit} onCancel={() => { setHabitModal(false); setEditHabit(null); }} />
      </Modal>

      <Modal open={challengeModal} onClose={() => { setChallengeModal(false); setEditChallenge(null); }}
        title={editChallenge ? "Edit Challenge" : "New 21-Day Challenge"}>
        <ChallengeForm initial={editChallenge} onSave={saveChallenge} onCancel={() => { setChallengeModal(false); setEditChallenge(null); }} />
      </Modal>
    </div>
  );
}

/* ─── Sub-components ─── */

function MiniStat({ icon: Icon, label, value, color, bg, suffix }: {
  icon: typeof Flame; label: string; value: string | number; color: string; bg: string; suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${bg} ${color}`}><Icon className="h-4 w-4" /></div>
          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{value}{suffix || ""}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HabitForm({ initial, onSave, onCancel }: {
  initial: Habit | null; onSave: (d: Omit<Habit, "id" | "color" | "createdAt">) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? [1, 2, 3, 4, 5]);

  function toggleDay(day: number) {
    setDaysOfWeek((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day].sort());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || daysOfWeek.length === 0) return;
    onSave({ name, description, daysOfWeek });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Habit Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description (optional)</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Repeat on</label>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                daysOfWeek.includes(d)
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >{DAY_NAMES[d].slice(0, 2)}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">{initial ? "Save" : "Add"}</button>
      </div>
    </form>
  );
}

function ChallengeForm({ initial, onSave, onCancel }: {
  initial: Challenge | null; onSave: (d: Omit<Challenge, "id" | "color">) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? today());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    onSave({ name, description, startDate });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Challenge Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 pages daily"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description (optional)</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start Date</label>
        <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="rounded-lg bg-brand-50 p-3 text-center text-xs text-brand-700 dark:bg-brand-950/30 dark:text-brand-400">
        21 days to form a lasting habit. You&apos;ve got this!
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">{initial ? "Save" : "Start"}</button>
      </div>
    </form>
  );
}
