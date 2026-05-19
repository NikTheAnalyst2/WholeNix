"use client";

import { useState, useMemo } from "react";
import { v4 as uid } from "@/lib/uid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Modal } from "@/components/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { addToTrash } from "@/lib/trash";
import { Target, Flag, Compass, Crosshair, Plus, Pencil, Trash2, Check, Square } from "lucide-react";

type MissionStatus = "active" | "completed" | "upcoming";

interface Todo { text: string; done: boolean; }

interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  startDate: string;
  status: MissionStatus;
  color: string;
  todos: Todo[];
}

const COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-brand-500",
];

export default function Missions() {
  const [missions, setMissions] = useLocalStorage<Mission[]>("wnx_missions", []);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);

  const stats = useMemo(() => {
    const active = missions.filter((m) => m.status === "active").length;
    const completed = missions.filter((m) => m.status === "completed").length;
    const upcoming = missions.filter((m) => m.status === "upcoming").length;
    const avg = missions.length
      ? Math.round(missions.reduce((s, m) => s + m.progress, 0) / missions.length)
      : 0;
    return { active, completed, upcoming, avg };
  }, [missions]);

  const sorted = useMemo(
    () => [...missions].sort((a, b) => {
      const order: Record<MissionStatus, number> = { active: 0, upcoming: 1, completed: 2 };
      return order[a.status] - order[b.status];
    }),
    [missions]
  );

  function save(data: Omit<Mission, "id" | "color">) {
    if (!data.startDate) data.startDate = new Date().toISOString().slice(0, 10);
    if (!data.todos) data.todos = [];
    if (editing) {
      setMissions((prev) => prev.map((m) => {
        if (m.id !== editing.id) return m;
        return { ...m, title: data.title, description: data.description, progress: data.progress, startDate: data.startDate, status: data.status, todos: m.todos };
      }));
    } else {
      const color = COLORS[missions.length % COLORS.length];
      setMissions((prev) => [...prev, { ...data, id: uid(), color }]);
    }
    setModal(false);
    setEditing(null);
  }

  function toggleTodo(missionId: string, idx: number) {
    setMissions((prev) => prev.map((m) => {
      if (m.id !== missionId) return m;
      const todos = m.todos.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
      return { ...m, todos };
    }));
  }

  function addTodo(missionId: string, text: string) {
    if (!text.trim()) return;
    setMissions((prev) => prev.map((m) => {
      if (m.id !== missionId) return m;
      return { ...m, todos: [...m.todos, { text: text.trim(), done: false }] };
    }));
  }

  function editTodo(missionId: string, idx: number, text: string) {
    if (!text.trim()) return;
    setMissions((prev) => prev.map((m) => {
      if (m.id !== missionId) return m;
      const todos = m.todos.map((t, i) => i === idx ? { ...t, text: text.trim() } : t);
      return { ...m, todos };
    }));
  }

  function deleteTodo(missionId: string, idx: number) {
    setMissions((prev) => prev.map((m) => {
      if (m.id !== missionId) return m;
      return { ...m, todos: m.todos.filter((_, i) => i !== idx) };
    }));
  }

  function remove(id: string) {
    const item = missions.find((m) => m.id === id);
    if (item) addToTrash({ id: item.id, source: "mission", sourceLabel: "Mission", sourceKey: "wnx_missions", data: item as unknown as Record<string, unknown> });
    setMissions((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Mission</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your life missions and long-term goals.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.active}</p>
                <p className="text-xs text-zinc-500">Active Missions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.completed}</p>
                <p className="text-xs text-zinc-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <Crosshair className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.avg}%</p>
                <p className="text-xs text-zinc-500">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.upcoming}</p>
                <p className="text-xs text-zinc-500">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Missions</CardTitle>
          <button onClick={() => { setEditing(null); setModal(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          ><Plus className="h-3.5 w-3.5" /> Add Mission</button>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">No missions yet. Create your first one.</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((m) => (
                <div key={m.id}
                  className="group rounded-xl border border-zinc-100 p-4 transition-all hover:border-zinc-200 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-semibold ${
                          m.status === "completed"
                            ? "line-through text-zinc-400 dark:text-zinc-500"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}>{m.title}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                          m.status === "active"
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400"
                            : m.status === "completed"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {m.status}
                        </span>
                        {m.startDate && <span className="text-[10px] text-zinc-400">{new Date(m.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.description}</p>
                      <div className="flex items-center gap-3">
                        <div className="relative h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                            setMissions((prev) => prev.map((x) => x.id === m.id ? { ...x, progress: Math.min(100, Math.max(0, pct)) } : x));
                          }}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${m.color}`}
                            style={{ width: `${m.progress}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-zinc-500">{m.progress}%</span>
                      </div>

                      {/* Todos */}
                      <div className="space-y-1">
                        {(m.todos ?? []).map((todo, i) => (
                          <TodoItem key={i} todo={todo}
                            onToggle={() => toggleTodo(m.id, i)}
                            onEdit={(text) => editTodo(m.id, i, text)}
                            onDelete={() => deleteTodo(m.id, i)} />
                        ))}
                        <TodoAdd onAdd={(text) => addTodo(m.id, text)} />
                      </div>
                      {(m.todos ?? []).length > 0 && (
                        <p className="text-[10px] text-zinc-400">
                          {(m.todos ?? []).filter((t) => t.done).length}/{(m.todos ?? []).length} done
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => { setEditing(m); setModal(true); }}
                        className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                      ><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(m.id)}
                        className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }}
        title={editing ? "Edit Mission" : "New Mission"}>
        <MissionForm initial={editing} onSave={save} onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

/* ─── Todo sub-components ─── */
function TodoItem({ todo, onToggle, onEdit, onDelete }: {
  todo: Todo; onToggle: () => void; onEdit: (text: string) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(todo.text);

  if (editing) {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) { onEdit(value); setEditing(false); }
        else { setValue(todo.text); setEditing(false); }
      }}
        className="flex items-center gap-1.5"
      >
        <Square className="h-3 w-3 shrink-0 text-zinc-200 dark:text-zinc-700" />
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
          onBlur={() => { setValue(todo.text); setEditing(false); }}
          className="min-w-0 flex-1 rounded border border-brand-500 bg-white px-1.5 py-0.5 text-xs text-zinc-700 outline-none dark:bg-zinc-900 dark:text-zinc-300"
          autoFocus
        />
      </form>
    );
  }

  return (
    <div className="group/todo flex items-center gap-1.5">
      <button onClick={onToggle} className="shrink-0">
        {todo.done
          ? <Check className="h-3 w-3 text-emerald-500" />
          : <Square className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />}
      </button>
      <span className={`min-w-0 flex-1 text-xs ${todo.done ? "line-through text-zinc-300 dark:text-zinc-600" : "text-zinc-600 dark:text-zinc-400"}`}>
        {todo.text}
      </span>
      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover/todo:opacity-100">
        <button onClick={() => { setValue(todo.text); setEditing(true); }}
          className="rounded p-0.5 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
        ><Pencil className="h-2.5 w-2.5" /></button>
        <button onClick={onDelete}
          className="rounded p-0.5 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
        ><Trash2 className="h-2.5 w-2.5" /></button>
      </div>
    </div>
  );
}

function TodoAdd({ onAdd }: { onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    onAdd(value);
    setValue("");
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="flex items-center gap-1.5"
    >
      <Square className="h-3 w-3 shrink-0 text-zinc-200 dark:text-zinc-700" />
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="Add todo..."
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-zinc-400 outline-none placeholder:text-zinc-300 focus:border-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-zinc-700"
      />
    </form>
  );
}

function MissionForm({
  initial, onSave, onCancel,
}: {
  initial: Mission | null; onSave: (d: Omit<Mission, "id" | "color">) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<MissionStatus>(initial?.status ?? "active");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), progress, startDate, status, todos: initial?.todos ?? [] });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start Date</label>
          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as MissionStatus)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Progress: {progress}%
        </label>
        <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-brand-600" />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
        <button type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}
