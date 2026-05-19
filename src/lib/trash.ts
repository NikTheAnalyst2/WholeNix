export interface TrashItem {
  id: string;
  source: string;
  sourceLabel: string;
  sourceKey: string;
  data: Record<string, unknown>;
  deletedAt: string;
}

function readTrash(): TrashItem[] {
  try {
    const raw = localStorage.getItem("wnx_trash");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTrash(items: TrashItem[]): void {
  localStorage.setItem("wnx_trash", JSON.stringify(items));
}

export function addToTrash(item: Omit<TrashItem, "deletedAt">): void {
  const trash = readTrash();
  trash.push({ ...item, deletedAt: new Date().toISOString() });
  writeTrash(trash);
}

export function removeFromTrash(id: string): void {
  writeTrash(readTrash().filter((t) => t.id !== id));
}

export function clearTrash(): void {
  localStorage.removeItem("wnx_trash");
}

export function getAllTrash(): TrashItem[] {
  return readTrash().sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export function restoreFromTrash(id: string): TrashItem | null {
  const all = readTrash();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const item = all[idx];
  all.splice(idx, 1);
  writeTrash(all);

  try {
    const raw = localStorage.getItem(item.sourceKey);
    const existing = raw ? JSON.parse(raw) : [];
    existing.push(item.data);
    localStorage.setItem(item.sourceKey, JSON.stringify(existing));
  } catch {
    return null;
  }

  return item;
}
