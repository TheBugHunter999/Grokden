import { migrateLegacyBrandingStorage } from "$lib/branding";

const STORAGE_KEY = "Grokden.folderTrust";

export type FolderTrustChoice = "trusted" | "restricted";

type FolderTrustStore = {
  trusted: string[];
};

function readStore(): FolderTrustStore {
  try {
    if (typeof localStorage === "undefined") return { trusted: [] };
    migrateLegacyBrandingStorage();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { trusted: [] };
    const parsed = JSON.parse(raw) as Partial<FolderTrustStore>;
    return { trusted: Array.isArray(parsed.trusted) ? parsed.trusted.map(normalizeFolderPath) : [] };
  } catch {
    return { trusted: [] };
  }
}

function writeStore(store: FolderTrustStore): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to persist folder trust:", error);
  }
}

/** Normalize paths for stable trust lookups on Windows. */
export function normalizeFolderPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function parentFolderPath(path: string): string | null {
  const norm = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return null;
  return norm.slice(0, idx);
}

export function parentFolderName(path: string): string {
  const parent = parentFolderPath(path);
  if (!parent) return "";
  const parts = parent.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? parent;
}

export function isFolderTrusted(path: string): boolean {
  const norm = normalizeFolderPath(path);
  const store = readStore();
  return store.trusted.some((trusted) => norm === trusted || norm.startsWith(`${trusted}/`));
}

export function shouldPromptFolderTrust(path: string): boolean {
  return !isFolderTrusted(path);
}

export function trustFolder(path: string, options?: { trustParent?: boolean }): void {
  const store = readStore();
  const next = new Set(store.trusted);
  next.add(normalizeFolderPath(path));
  if (options?.trustParent) {
    const parent = parentFolderPath(path);
    if (parent) next.add(normalizeFolderPath(parent));
  }
  writeStore({ trusted: [...next] });
}

export function revokeFolderTrust(path: string): void {
  const norm = normalizeFolderPath(path);
  const store = readStore();
  writeStore({ trusted: store.trusted.filter((p) => p !== norm) });
}