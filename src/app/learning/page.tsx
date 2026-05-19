"use client";

import { useState, useMemo } from "react";
import { v4 as uid } from "@/lib/uid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Modal } from "@/components/modal";
import { Card, CardContent } from "@/components/card";
import { addToTrash } from "@/lib/trash";
import {
  BookOpen, Award, BookMarked, Lightbulb,
  Plus, Pencil, Trash2, CheckCircle2,
} from "lucide-react";

/* ─── Types ─── */
type ActivityType = "course" | "book" | "certification" | "other";
type ActivityStatus = "not-started" | "in-progress" | "completed";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  provider: string;
  progress: number;
  status: ActivityStatus;
  dateStarted: string;
  notes: string;
  color: string;
}

const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

const TYPE_COLORS: Record<ActivityType, { bg: string; text: string; iconBg: string }> = {
  course: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  book: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" },
  certification: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
  other: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400" },
};

const TYPE_ICONS: Record<ActivityType, typeof BookOpen> = {
  course: BookOpen,
  book: BookMarked,
  certification: Award,
  other: Lightbulb,
};

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "course", label: "Course" },
  { value: "book", label: "Book" },
  { value: "certification", label: "Certification" },
  { value: "other", label: "Other" },
];

type TabId = "all" | "course" | "book" | "certification" | "other";
const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "course", label: "Courses", icon: BookOpen },
  { id: "book", label: "Books", icon: BookMarked },
  { id: "certification", label: "Certifications", icon: Award },
  { id: "other", label: "Other", icon: Lightbulb },
];

function today() { return new Date().toISOString().slice(0, 10); }

export default function Learning() {
  const [activities, setActivities] = useLocalStorage<Activity[]>("wnx_activities", []);
  const [tab, setTab] = useState<TabId>("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const stats = useMemo(() => ({
    active: activities.filter((a) => a.status === "in-progress").length,
    completed: activities.filter((a) => a.status === "completed").length,
    courses: activities.filter((a) => a.type === "course").length,
    books: activities.filter((a) => a.type === "book").length,
    certs: activities.filter((a) => a.type === "certification").length,
    others: activities.filter((a) => a.type === "other").length,
    avgProgress: activities.length
      ? Math.round(activities.reduce((s, a) => s + a.progress, 0) / activities.length)
      : 0,
  }), [activities]);

  const filtered = tab === "all" ? activities : activities.filter((a) => a.type === tab);

  function save(d: Omit<Activity, "id" | "color">) {
    if (editing) {
      setActivities((p) => p.map((a) => (a.id === editing.id ? { ...a, ...d } : a)));
    } else {
      setActivities((p) => [...p, { ...d, id: uid(), color: TYPE_COLORS[d.type].bg }]);
    }
    setModal(false); setEditing(null);
  }
  function remove(id: string) {
    const item = activities.find((a) => a.id === id);
    if (item) addToTrash({ id: item.id, source: "learning", sourceLabel: "Learning", sourceKey: "wnx_activities", data: item as unknown as Record<string, unknown> });
    setActivities((p) => p.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Learning</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Courses, books, certifications, and activities.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={BookOpen} label="Active" value={stats.active} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-950/30" />
        <MiniStat icon={CheckCircle2} label="Completed" value={stats.completed} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-950/30" />
        <MiniStat icon={Award} label="Certifications" value={stats.certs} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" />
        <MiniStat icon={BookMarked} label="Avg Progress" value={stats.avgProgress} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-950/30" suffix="%" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                  active
                    ? "bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                }`}
              ><Icon className="h-4 w-4" /><span className="hidden sm:inline">{t.label}</span></button>
            );
          })}
        </div>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        ><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-zinc-400">
          No activities yet. Add your first course, book, or certification.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const Icon = TYPE_ICONS[a.type];
            const tc = TYPE_COLORS[a.type];
            const isCompleted = a.status === "completed";
            return (
              <Card key={a.id} className={`group relative overflow-hidden transition-shadow hover:shadow-lg ${
                isCompleted ? "border-emerald-200 dark:border-emerald-900" : ""
              }`}>
                {/* Progress background stripe */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  isCompleted ? "bg-emerald-500" : "bg-brand-500"
                }`} style={{ width: `${a.progress}%` }} />

                <CardContent className="pt-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`rounded-lg p-2 shrink-0 ${tc.iconBg}`}><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`truncate text-sm font-semibold ${
                          isCompleted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
                        }`}>{a.title}</h3>
                        <p className="truncate text-xs text-zinc-400">{a.provider}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button onClick={() => { setEditing(a); setModal(true); }}
                        className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                      ><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(a.id)}
                        className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  {/* Status & date */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                      isCompleted ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      a.status === "in-progress" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" :
                      "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>{a.status.replace("-", " ")}</span>
                    <span className="text-[10px] text-zinc-400">{new Date(a.dateStarted).toLocaleDateString()}</span>
                  </div>

                  {/* Clickable progress bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Progress</span>
                      <span className={`text-lg font-bold tabular-nums ${
                        isCompleted ? "text-emerald-500" : "text-zinc-700 dark:text-zinc-300"
                      }`}>{a.progress}%</span>
                    </div>
                    {/* Clickable bar — click anywhere to snap to nearest step */}
                    <div className="relative h-3 cursor-pointer rounded-full bg-zinc-100 dark:bg-zinc-800"
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const pct = ((e.clientX - rect.left) / rect.width) * 100;
                        const steps = PROGRESS_STEPS as readonly number[];
                        const nearest = steps.reduce((best, step) =>
                          Math.abs(step - pct) < Math.abs(best - pct) ? step : best
                        );
                        setActivities((p) => p.map((x) => {
                          if (x.id !== a.id) return x;
                          return { ...x, progress: nearest, status: nearest === 100 ? "completed" : nearest === 0 ? "not-started" : "in-progress" };
                        }));
                      }}
                    >
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? "bg-emerald-500" : "bg-brand-500"
                      }`} style={{ width: `${a.progress}%` }} />
                      {/* Step markers */}
                      <div className="absolute inset-0 flex items-center justify-between px-0">
                        {PROGRESS_STEPS.map((step) => (
                          <div key={step}
                            className={`h-2 w-2 rounded-full transition-all ${
                              step > 0 && a.progress >= step
                                ? isCompleted ? "bg-emerald-400" : "bg-white ring-2 ring-brand-400 dark:ring-brand-500"
                                : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                            style={{ marginLeft: step === 0 ? "-4px" : step === 100 ? "4px" : undefined }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span className="pl-1">0%</span><span>25%</span><span>50%</span><span>75%</span><span className="pr-1">100%</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {a.notes && (
                    <p className="mt-2 truncate text-[11px] text-zinc-400" title={a.notes}>{a.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }}
        title={editing ? "Edit Activity" : "Add Activity"}>
        <ActivityForm initial={editing} onSave={save} onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

/* ─── Sub-components ─── */

function MiniStat({ icon: Icon, label, value, color, bg, suffix }: {
  icon: typeof BookOpen; label: string; value: number | string; color: string; bg: string; suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${bg} ${color}`}><Icon className="h-4 w-4" /></div>
          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{value}{suffix}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityForm({ initial, onSave, onCancel }: {
  initial: Activity | null; onSave: (d: Omit<Activity, "id" | "color">) => void; onCancel: () => void;
}) {
  const [type, setType] = useState<ActivityType>(initial?.type ?? "course");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [provider, setProvider] = useState(initial?.provider ?? "");
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [status, setStatus] = useState<ActivityStatus>(initial?.status ?? "in-progress");
  const [dateStarted, setDateStarted] = useState(initial?.dateStarted ?? today());
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    onSave({ type, title, provider, progress, status, dateStarted, notes });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Provider / Author</label>
        <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Coursera, Robert C. Martin"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ActivityStatus)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start Date</label>
          <input type="date" required value={dateStarted} onChange={(e) => setDateStarted(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Progress: {progress}%
        </label>
        <div className="flex gap-2 pt-1">
          {PROGRESS_STEPS.map((step) => (
            <button key={step} type="button" onClick={() => setProgress(step)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                progress >= step
                  ? step === 100 ? "bg-emerald-500 text-white" : "bg-brand-600 text-white"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >{step}%</button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Notes</label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional..."
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
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
