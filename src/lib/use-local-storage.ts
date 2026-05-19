"use client";

import { useSyncExternalStore, useCallback } from "react";

const listeners = new Set<() => void>();
const snapCache = new Map<string, { raw: string | null; value: unknown }>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function useLocalStorage<T>(key: string, initial: T) {
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    window.addEventListener("storage", callback);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", callback);
    };
  }, []);

  const getSnapshot = useCallback((): T => {
    try {
      const stored = localStorage.getItem(key);
      const cached = snapCache.get(key);
      if (cached && cached.raw === stored) {
        return cached.value as T;
      }
      const parsed: T = stored ? JSON.parse(stored) : initial;
      snapCache.set(key, { raw: stored, value: parsed });
      return parsed;
    } catch {
      return initial;
    }
  }, [key, initial]);

  const getServerSnapshot = useCallback((): T => initial, [initial]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = getSnapshot();
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
      snapCache.delete(key);
      notifyListeners();
    },
    [key, getSnapshot]
  );

  const remove = useCallback(() => {
    localStorage.removeItem(key);
    snapCache.delete(key);
    notifyListeners();
  }, [key]);

  return [value, set, remove] as const;
}
