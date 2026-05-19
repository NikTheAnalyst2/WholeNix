"use client";

import { useState, useMemo } from "react";
import { v4 as uid } from "@/lib/uid";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Modal } from "@/components/modal";
import { Card, CardContent } from "@/components/card";
import { addToTrash } from "@/lib/trash";
import {
  Sparkles, Lightbulb, FolderOpen, Link as LinkIcon,
  Plus, Pencil, Trash2,
} from "lucide-react";

/* ─── Types ─── */
interface RoughIdea { id: string; title: string; content: string; tags: string; date: string; color: string; }
interface CreativeFile { id: string; name: string; link: string; date: string; }

const IDEA_COLORS = [
  "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900",
  "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900",
  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900",
  "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900",
  "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900",
  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900",
];

type TabId = "ideas" | "files";
const TABS: { id: TabId; label: string; icon: typeof Sparkles }[] = [
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "files", label: "Files", icon: FolderOpen },
];

function today() { return new Date().toISOString().slice(0, 10); }

export default function Creative() {
  const [ideas, setIdeas] = useLocalStorage<RoughIdea[]>("wnx_ideas", []);
  const [files, setFiles] = useLocalStorage<CreativeFile[]>("wnx_creativefiles", []);

  const [tab, setTab] = useState<TabId>("ideas");

  /* modals */
  const [ideaModal, setIdeaModal] = useState(false);
  const [editIdea, setEditIdea] = useState<RoughIdea | null>(null);
  const [fileModal, setFileModal] = useState(false);
  const [editFile, setEditFile] = useState<CreativeFile | null>(null);

  const stats = useMemo(() => ({
    ideas: ideas.length,
    files: files.length,
  }), [ideas, files]);

  /* ─── CRUD: Ideas ─── */
  function saveIdea(d: Omit<RoughIdea, "id" | "color">) {
    if (editIdea) {
      setIdeas((p) => p.map((i) => (i.id === editIdea.id ? { ...i, ...d } : i)));
    } else {
      setIdeas((p) => [...p, { ...d, id: uid(), color: IDEA_COLORS[p.length % IDEA_COLORS.length] }]);
    }
    setIdeaModal(false); setEditIdea(null);
  }
  function delIdea(id: string) {
    const item = ideas.find((i) => i.id === id);
    if (item) addToTrash({ id: item.id, source: "creative", sourceLabel: "Creative · Idea", sourceKey: "wnx_ideas", data: item as unknown as Record<string, unknown> });
    setIdeas((p) => p.filter((i) => i.id !== id));
  }

  /* ─── CRUD: Files ─── */
  function saveFile(d: Omit<CreativeFile, "id">) {
    if (editFile) {
      setFiles((p) => p.map((f) => (f.id === editFile.id ? { ...f, ...d } : f)));
    } else {
      setFiles((p) => [...p, { ...d, id: uid() }]);
    }
    setFileModal(false); setEditFile(null);
  }
  function delFile(id: string) {
    const item = files.find((f) => f.id === id);
    if (item) addToTrash({ id: item.id, source: "creative", sourceLabel: "Creative · File", sourceKey: "wnx_creativefiles", data: item as unknown as Record<string, unknown> });
    setFiles((p) => p.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Creative</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Ideas and creative files.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniStat icon={Lightbulb} label="Ideas" value={stats.ideas} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-950/30" />
        <MiniStat icon={FolderOpen} label="Files" value={stats.files} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-950/30" />
      </div>

      {/* Tabs */}
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

      {/* ═══ IDEAS TAB ═══ */}
      {tab === "ideas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{ideas.length} idea{ideas.length !== 1 && "s"}</p>
            <button onClick={() => { setEditIdea(null); setIdeaModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Idea</button>
          </div>
          {ideas.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No rough ideas yet.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...ideas].reverse().map((idea) => (
                <div key={idea.id} className={`group relative rounded-xl border p-4 transition-shadow hover:shadow-md ${idea.color}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm">{idea.title}</h3>
                    <div className="flex shrink-0 gap-0.5">
                      <button onClick={() => { setEditIdea(idea); setIdeaModal(true); }}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 [&]:opacity-100 sm:[&]:opacity-0"
                      ><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => delIdea(idea.id)}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 [&]:opacity-100 sm:[&]:opacity-0"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <p className="mb-2 whitespace-pre-wrap text-xs opacity-80">{idea.content}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] opacity-60">
                    {idea.tags && <span>#{idea.tags}</span>}
                    <span>•</span>
                    <span>{new Date(idea.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ FILES TAB ═══ */}
      {tab === "files" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{files.length} file{files.length !== 1 && "s"}</p>
            <button onClick={() => { setEditFile(null); setFileModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
            ><Plus className="h-3.5 w-3.5" /> Add Link</button>
          </div>
          {files.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-zinc-400">No files yet. Add a name and link.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...files].reverse().map((f) => (
                <Card key={f.id} className="group">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-brand-50 p-2 text-brand-500 dark:bg-brand-950/30 dark:text-brand-400">
                            <FolderOpen className="h-4 w-4" />
                          </div>
                          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{f.name}</h3>
                        </div>
                        <a href={f.link} target="_blank" rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                          <LinkIcon className="h-3 w-3" />
                          <span className="truncate">{f.link}</span>
                        </a>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <button onClick={() => { setEditFile(f); setFileModal(true); }}
                          className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 [&]:opacity-100 sm:[&]:opacity-0"
                        ><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => delFile(f.id)}
                          className="rounded-lg p-1.5 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 [&]:opacity-100 sm:[&]:opacity-0"
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-400">{new Date(f.date).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ─── */}
      <Modal open={ideaModal} onClose={() => { setIdeaModal(false); setEditIdea(null); }}
        title={editIdea ? "Edit Idea" : "Rough Idea"}>
        <IdeaForm initial={editIdea} onSave={saveIdea} onCancel={() => { setIdeaModal(false); setEditIdea(null); }} />
      </Modal>

      <Modal open={fileModal} onClose={() => { setFileModal(false); setEditFile(null); }}
        title={editFile ? "Edit Link" : "Add Link"}>
        <FileForm initial={editFile} onSave={saveFile} onCancel={() => { setFileModal(false); setEditFile(null); }} />
      </Modal>
    </div>
  );
}

/* ─── Sub-components ─── */

function MiniStat({ icon: Icon, label, value, color, bg }: {
  icon: typeof Sparkles; label: string; value: number; color: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${bg} ${color}`}><Icon className="h-4 w-4" /></div>
          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Forms ─── */

function IdeaForm({ initial, onSave, onCancel }: {
  initial: RoughIdea | null; onSave: (d: Omit<RoughIdea, "id" | "color">) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!title) return; onSave({ title, content, tags, date }); }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div><label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Notes</label>
        <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Tags</label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. design, ui"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div><label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Date</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
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

function FileForm({ initial, onSave, onCancel }: {
  initial: CreativeFile | null; onSave: (d: Omit<CreativeFile, "id">) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); if (!name || !link) return; onSave({ name, link, date: initial?.date ?? today() }); }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design System v2"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>
      <div><label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Link</label>
        <input type="url" required value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
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
