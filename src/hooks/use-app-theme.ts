import { useEffect, useState, useCallback } from "react";

export type ThemeMode = "system" | "light" | "dark";
const KEY = "pxf:theme";

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolve(mode);
  const html = document.documentElement;
  html.classList.toggle("light", resolved === "light");
  html.classList.toggle("dark", resolved === "dark");
  html.style.colorScheme = resolved;
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function useAppTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(mode);
    try { window.localStorage.setItem(KEY, mode); } catch {}
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const set = useCallback((m: ThemeMode) => setMode(m), []);
  return { mode, setMode: set, resolved: resolve(mode) };
}