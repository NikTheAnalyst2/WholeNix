"use client";

import { useState, useMemo } from "react";
import { getAllTrash, removeFromTrash, clearTrash, restoreFromTrash, type TrashItem } from "@/lib/trash";
import { Card, CardContent } from "@/components/card";
import {
  Trash2, RotateCcw, Archive as ArchiveIcon,
  FileText, Search,
} from "lucide-react";

const ICON_MAP: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  mission:  { icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  finance:  { icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  learning: { icon: FileText, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  habit:    { icon: FileText, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  creative: { icon: FileText, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
  youtube:  { icon: FileText, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
};

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function ArchivePage() {
  const [trash, setTrash] = useState<TrashItem[]>(() => getAllTrash());
  const [search, setSearch] = useState("");

  function refresh() {
    setTrash(getAllTrash());
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return trash;
    const q = search.toLowerCase();
    return trash.filter((t) =>
      t.sourceLabel.toLowerCase().includes(q) ||
      (t.data.title as string || "").toLowerCase().includes(q) ||
      (t.data.name as string || "").toLowerCase().includes(q)
    );
  }, [trash, search]);

  function handleRestore(id: string) {
    restoreFromTrash(id);
    refresh();
  }

  function handleDelete(id: string) {
    removeFromTrash(id);
    refresh();
  }

  function handleClearAll() {
    if (!confirm("Permanently delete all trashed items?")) return;
    clearTrash();
    refresh();
  }

  function getItemTitle(item: TrashItem): string {
    return (item.data.title as string) || (item.data.name as string) || "Untitled";
  }

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of trash) {
      counts[t.source] = (counts[t.source] || 0) + 1;
    }
    return { total: trash.length, mission: counts.mission || 0, finance: counts.finance || 0, learning: counts.learning || 0, habit: counts.habit || 0, creative: counts.creative || 0, youtube: counts.youtube || 0 };
  }, [trash]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Archive</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Deleted items from all pages. Restore or permanently delete.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400"><ArchiveIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
                <p className="text-xs text-zinc-500">Trashed Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.mission || 0}</p>
                <p className="text-xs text-zinc-500">From Missions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.finance || 0}</p>
                <p className="text-xs text-zinc-500">From Finance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{(stats.learning || 0) + (stats.habit || 0) + (stats.creative || 0) + (stats.youtube || 0)}</p>
                <p className="text-xs text-zinc-500">From Others</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <Search className="h-4 w-4 text-zinc-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived items..."
            className="flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100" />
        </div>
        {trash.length > 0 && (
          <button onClick={handleClearAll}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          ><Trash2 className="h-3.5 w-3.5" /> Empty Trash</button>
        )}
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between pb-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{filtered.length} item{filtered.length !== 1 && "s"}</p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ArchiveIcon className="h-10 w-10 text-zinc-200 dark:text-zinc-700" />
              <p className="text-sm text-zinc-400">
                {search ? "No matching items in archive." : "Archive is empty. Deleted items from other pages will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((t) => {
                const iconDef = ICON_MAP[t.source] || { icon: FileText, color: "text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-800/50" };
                const Icon = iconDef.icon;
                const title = getItemTitle(t);
                return (
                  <div key={t.deletedAt + t.id}
                    className="group flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition-all hover:border-red-100 hover:bg-red-50/50 dark:hover:border-red-900/50 dark:hover:bg-red-950/10"
                  >
                    <div className={`rounded-lg p-2 ${iconDef.bg} ${iconDef.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>{t.sourceLabel}</span>
                        <span>•</span>
                        <span>Deleted {formatDate(t.deletedAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => handleRestore(t.id)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      ><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
                      <button onClick={() => handleDelete(t.id)}
                        className="rounded-lg p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      ><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
