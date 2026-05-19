"use client";

import { useState, useMemo, useRef } from "react";
import { v4 as uid } from "@/lib/uid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Modal } from "@/components/modal";
import { Card, CardContent } from "@/components/card";
import { addToTrash } from "@/lib/trash";
import {
  Plus, Pencil, Trash2, ArrowRight, LayoutGrid, List,
  Lightbulb, FileText, Palette, Clapperboard, FileUp, Cloud,
  ExternalLink, Check, Square, ChevronUp, ChevronsUp, Minus, ArrowUp,
} from "lucide-react";

type TaskStatus = "idea" | "scripting" | "designing" | "editing" | "draft" | "publish";
type TaskPriority = "low" | "medium" | "high" | "urgent";
type ChannelId = "channel1" | "channel2";
type ViewMode = "kanban" | "list";

interface SubTask {
  text: string;
  done: boolean;
}

interface KanbanTask {
  id: string;
  channelId: ChannelId;
  number: number;
  title: string;
  description: string;
  subtasks: SubTask[];
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  link: string;
  createdAt: string;
}

const STATUSES: { id: TaskStatus; label: string; icon: typeof Lightbulb; color: string }[] = [
  { id: "idea",       label: "Idea",       icon: Lightbulb,    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
  { id: "scripting",  label: "Scripting",  icon: FileText,     color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400" },
  { id: "designing",  label: "Designing",  icon: Palette,      color: "text-pink-500 bg-pink-50 dark:bg-pink-950/30 dark:text-pink-400" },
  { id: "editing",    label: "Editing",    icon: Clapperboard, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400" },
  { id: "draft",      label: "Draft",      icon: FileUp,       color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-400" },
  { id: "publish",    label: "Publish",    icon: Cloud,        color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
];

const PRIORITIES: { id: TaskPriority; label: string; icon: typeof Minus; color: string }[] = [
  { id: "low",    label: "Low",    icon: ArrowUp,    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400" },
  { id: "medium", label: "Medium", icon: Minus,      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
  { id: "high",   label: "High",   icon: ChevronUp,  color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400" },
  { id: "urgent", label: "Urgent", icon: ChevronsUp, color: "text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400" },
];

const STATUS_ORDER: TaskStatus[] = ["idea", "scripting", "designing", "editing", "draft", "publish"];

function progressFromStatus(status: TaskStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return Math.round((idx / (STATUS_ORDER.length - 1)) * 100);
}

function nextStatus(status: TaskStatus): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(status);
  if (idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

const formatDate = (d: string) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const DEFAULT_CHANNEL_NAMES: Record<ChannelId, string> = { channel1: "Channel 1", channel2: "Channel 2" };

export default function YouTubeKanban() {
  const [tasks, setTasks] = useLocalStorage<KanbanTask[]>("wnx_kanbantasks", []);
  const [channelNames, setChannelNames] = useLocalStorage<Record<ChannelId, string>>("wnx_channelnames", DEFAULT_CHANNEL_NAMES);
  const [channel, setChannel] = useState<ChannelId>("channel1");
  const [view, setView] = useState<ViewMode>("kanban");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<KanbanTask | null>(null);
  const [renaming, setRenaming] = useState<ChannelId | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  const channelTasks = useMemo(() => tasks.filter((t) => t.channelId === channel), [tasks, channel]);

  const columnTasks = useMemo(() => {
    const map: Record<TaskStatus, KanbanTask[]> = {
      idea: [], scripting: [], designing: [], editing: [], draft: [], publish: [],
    };
    for (const t of channelTasks) {
      map[t.status].push(t);
    }
    return map;
  }, [channelTasks]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STATUS_ORDER) counts[s] = columnTasks[s].length;
    return counts;
  }, [columnTasks]);

  function getNextNumber(): number {
    const existing = tasks.filter((t) => t.channelId === channel);
    return existing.length ? Math.max(...existing.map((t) => t.number)) + 1 : 1;
  }

  function save(data: Omit<KanbanTask, "id" | "number" | "createdAt">) {
    if (!data.priority) data.priority = "medium";
    if (editing) {
      setTasks((p) => p.map((t) => (t.id === editing.id ? { ...t, ...data } : t)));
    } else {
      setTasks((p) => [...p, { ...data, id: uid(), number: getNextNumber(), createdAt: new Date().toISOString() }]);
    }
    setModal(false);
    setEditing(null);
  }

  function remove(id: string) {
    const item = tasks.find((t) => t.id === id);
    if (item) addToTrash({ id: item.id, source: "youtube", sourceLabel: "YouTube", sourceKey: "wnx_kanbantasks", data: item as unknown as Record<string, unknown> });
    setTasks((p) => p.filter((t) => t.id !== id));
  }

  function advanceTask(id: string) {
    setTasks((p) => p.map((t) => {
      if (t.id !== id) return t;
      const next = nextStatus(t.status);
      return next ? { ...t, status: next } : t;
    }));
  }

  function toggleSubtask(taskId: string, subIdx: number) {
    setTasks((p) => p.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = t.subtasks.map((st, i) => i === subIdx ? { ...st, done: !st.done } : st);
      return { ...t, subtasks };
    }));
  }

  function startRename(chId: ChannelId) {
    setRenaming(chId);
    setRenameValue(channelNames[chId]);
    setTimeout(() => renameRef.current?.select(), 0);
  }

  function commitRename() {
    if (renaming && renameValue.trim()) {
      setChannelNames((p) => ({ ...p, [renaming]: renameValue.trim() }));
    }
    setRenaming(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">YouTube</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Kanban board for your YouTube channels.</p>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
        {(["channel1", "channel2"] as const).map((chId) => (
          <div key={chId} className="flex items-center gap-0.5">
            {renaming === chId ? (
              <input ref={renameRef} type="text" value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => e.key === "Enter" && commitRename()}
                className="w-28 rounded-lg border border-brand-500 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-100"
                autoFocus
              />
            ) : (
              <button onClick={() => setChannel(chId)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                  channel === chId
                    ? "bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-400"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                }`}
              >{channelNames[chId]}</button>
            )}
            {channel === chId && renaming !== chId && (
              <button onClick={() => startRename(chId)}
                className="rounded-lg p-1 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
              ><Pencil className="h-3 w-3" /></button>
            )}
          </div>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setView("kanban")}
            className={`rounded-lg p-2 transition-all ${
              view === "kanban"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          ><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView("list")}
            className={`rounded-lg p-2 transition-all ${
              view === "list"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          ><List className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STATUSES.map((s) => (
          <div key={s.id} className={`rounded-lg border border-zinc-100 p-2.5 text-center dark:border-zinc-800 ${s.color}`}>
            <p className="text-lg font-bold">{stats[s.id]}</p>
            <p className="text-[10px] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        ><Plus className="h-3.5 w-3.5" /> Add Task</button>
      </div>

      {/* ════════════════════════════════════ */}
      {/* KANBAN VIEW */}
      {/* ════════════════════════════════════ */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => {
            const items = columnTasks[s.id];
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex min-w-[260px] flex-col gap-3">
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${s.color}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{s.label}</span>
                  <span className="ml-auto text-xs opacity-60">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    No tasks
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((t) => (
                      <KanbanCard key={t.id} task={t}
                        onEdit={() => { setEditing(t); setModal(true); }}
                        onDelete={() => remove(t.id)}
                        onAdvance={() => advanceTask(t.id)}
                        onToggleSubtask={(idx) => toggleSubtask(t.id, idx)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════ */}
      {/* LIST VIEW */}
      {/* ════════════════════════════════════ */}
      {view === "list" && (
        <Card>
          <CardContent className="pt-5">
            {channelTasks.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-400">No tasks yet. Create your first one.</p>
            ) : (
              <div className="space-y-2">
                {channelTasks
                  .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.number - b.number)
                  .map((t) => {
                    const s = STATUSES.find((s) => s.id === t.status)!;
                    const Icon = s.icon;
                    const pct = progressFromStatus(t.status);
                    const doneSubs = t.subtasks.filter((st) => st.done).length;
                    return (
                      <div key={t.id}
                        className="group rounded-xl border border-zinc-100 p-3 transition-all hover:border-zinc-200 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-zinc-400">#{t.number}</span>
                                <span className={`text-sm font-semibold ${t.status === "publish" ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                                  {t.title}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}>{s.label}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                  PRIORITIES.find((p) => p.id === t.priority)?.color
                                }`}>{t.priority}</span>
                              </div>
                              {t.description && (
                                <p className="mt-0.5 truncate text-xs text-zinc-400">{t.description}</p>
                              )}

                              {/* Subtask checkboxes */}
                              {t.subtasks.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {t.subtasks.map((st, i) => (
                                    <button key={i} onClick={() => toggleSubtask(t.id, i)}
                                      className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                    >
                                      {st.done
                                        ? <Check className="h-3 w-3 text-emerald-500" />
                                        : <Square className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />}
                                      <span className={`${st.done ? "line-through text-zinc-300 dark:text-zinc-600" : ""}`}>{st.text}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-400">
                                {t.startDate && <span>Start: {formatDate(t.startDate)}</span>}
                                {t.endDate && <span>End: {formatDate(t.endDate)}</span>}
                                {t.subtasks.length > 0 && <span>{doneSubs}/{t.subtasks.length} subtasks</span>}
                              </div>
                              {/* Progress bar */}
                              <div className="mt-1.5 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div className="h-full rounded-full bg-brand-500 transition-all duration-300"
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {nextStatus(t.status) && (
                              <button onClick={() => advanceTask(t.id)}
                                className="rounded-lg p-1.5 text-zinc-300 transition-all hover:bg-brand-50 hover:text-brand-600 dark:text-zinc-600 dark:hover:bg-brand-950/30 dark:hover:text-brand-400"
                                title={`Move to ${nextStatus(t.status)!.charAt(0).toUpperCase() + nextStatus(t.status)!.slice(1)}`}
                              ><ArrowRight className="h-3.5 w-3.5" /></button>
                            )}
                            <button onClick={() => { setEditing(t); setModal(true); }}
                              className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                            ><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => remove(t.id)}
                              className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                            ><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }}
        title={editing ? "Edit Task" : "New Task"}>
        <TaskForm initial={editing} onSave={save} onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

/* ─── Kanban Card ─── */
function KanbanCard({ task, onEdit, onDelete, onAdvance, onToggleSubtask }: {
  task: KanbanTask; onEdit: () => void; onDelete: () => void; onAdvance: () => void;
  onToggleSubtask: (idx: number) => void;
}) {
  const s = STATUSES.find((s) => s.id === task.status)!;
  const Icon = s.icon;
  const pct = progressFromStatus(task.status);
  const next = nextStatus(task.status);

  return (
    <div className="group rounded-xl border border-zinc-100 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-start justify-between gap-1">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${s.color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex gap-0.5">
          {next && (
            <button onClick={() => { if (confirm(`Move to ${next!.charAt(0).toUpperCase() + next!.slice(1)}?`)) onAdvance(); }}
              className="rounded-lg p-1 text-zinc-300 opacity-0 transition-all hover:bg-brand-50 hover:text-brand-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-brand-950/30 dark:hover:text-brand-400 [&]:opacity-100 sm:[&]:opacity-0"
              title={`Strict advance to ${next!.charAt(0).toUpperCase() + next!.slice(1)}`}
            ><ArrowRight className="h-3.5 w-3.5" /></button>
          )}
          <button onClick={onEdit}
            className="rounded-lg p-1 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
          ><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete}
            className="rounded-lg p-1 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
          ><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-zinc-400">#{task.number}</span>
          <span className={`text-xs font-semibold leading-tight ${task.status === "publish" ? "line-through text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
            {task.title}
          </span>
        </div>
        {task.description && (
          <p className="mt-1 text-[10px] leading-tight text-zinc-400 line-clamp-2">{task.description}</p>
        )}
      </div>

      {/* Priority */}
      <div className="mt-1.5">
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
          PRIORITIES.find((p) => p.id === task.priority)?.color
        }`}>
          {task.priority}
        </span>
      </div>

      {/* Subtask checkboxes */}
      {task.subtasks.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {task.subtasks.slice(0, 3).map((st, i) => (
            <button key={i} onClick={() => onToggleSubtask(i)}
              className="flex w-full items-center gap-1.5 text-left text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {st.done
                ? <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                : <Square className="h-3 w-3 shrink-0 text-zinc-300 dark:text-zinc-600" />}
              <span className={`truncate ${st.done ? "line-through text-zinc-300 dark:text-zinc-600" : ""}`}>{st.text}</span>
            </button>
          ))}
          {task.subtasks.length > 3 && (
            <p className="text-[10px] text-zinc-300 dark:text-zinc-600">+{task.subtasks.length - 3} more</p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-400">
        {task.startDate && <span>{formatDate(task.startDate)}</span>}
        {task.link && (
          <a href={task.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-brand-500 hover:underline"
          ><ExternalLink className="h-3 w-3" /></a>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Form ─── */
function TaskForm({ initial, onSave, onCancel }: {
  initial: KanbanTask | null;
  onSave: (d: Omit<KanbanTask, "id" | "number" | "createdAt">) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subtasks, setSubtasks] = useState<{ text: string; done: boolean }[]>(initial?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "medium");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [link, setLink] = useState(initial?.link ?? "");

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks((p) => [...p, { text: newSubtask.trim(), done: false }]);
    setNewSubtask("");
  }

  function removeSubtask(idx: number) {
    setSubtasks((p) => p.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      channelId: initial?.channelId ?? "channel1",
      title: title.trim(),
      description: description.trim(),
      subtasks,
      priority,
      status: initial?.status ?? "idea",
      startDate,
      endDate,
      link: link.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Subtasks</label>
        <div className="space-y-1.5">
          {subtasks.map((st, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">{st.text}</span>
              <button type="button" onClick={() => removeSubtask(i)}
                className="ml-auto text-zinc-300 hover:text-red-500"
              ><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
              placeholder="Add a subtask..."
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button type="button" onClick={addSubtask}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            >Add</button>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Priority</label>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => {
            const active = priority === p.id;
            const Icon = p.icon;
            return (
              <button key={p.id} type="button" onClick={() => setPriority(p.id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  active
                    ? `${p.color} shadow-sm ring-1 ring-current`
                    : "border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              ><Icon className="h-3.5 w-3.5" /> {p.label}</button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Link (optional)</label>
        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
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
