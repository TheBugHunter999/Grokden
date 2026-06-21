export type TerminalDebugEvent = {
  at: string;
  event: string;
  detail?: unknown;
  snapshot?: unknown;
};

export type TerminalDebugEntry = {
  instanceId: string;
  createdAt: string;
  lastUpdatedAt: string;
  events: TerminalDebugEvent[];
  latestSnapshot?: unknown;
};

type TerminalDebugRegistry = {
  version: 2;
  terminals: Record<string, TerminalDebugEntry>;
  bridge: TerminalDebugEvent[];
  report: () => string;
  copy: () => Promise<string>;
  clear: () => void;
};

declare global {
  interface Window {
    __GROKDEN_TERMINAL_DEBUG__?: TerminalDebugRegistry;
  }
}

const MAX_EVENTS_PER_TERMINAL = 320;
const debugSampleCounters = new Map<string, number>();

function shouldCaptureDebugEvent(key: string, event: string, detail?: unknown): boolean {
  const noisy = event === "output:chunk"
    || event === "output:parsed-and-refreshed"
    || event === "listener:event"
    || event === "output:deliver"
    || event === "output:to-handler";
  if (!noisy) return true;
  const count = (debugSampleCounters.get(key) ?? 0) + 1;
  debugSampleCounters.set(key, count);
  const chars = typeof detail === "object" && detail !== null && "chars" in detail
    ? Number((detail as { chars?: unknown }).chars) || 0
    : 0;
  return count <= 48 || count % 100 === 0 || chars > 96;
}

function makeRegistry(): TerminalDebugRegistry {
  const registry: TerminalDebugRegistry = {
    version: 2,
    terminals: {},
    bridge: [],
    report: () => JSON.stringify({
      generatedAt: new Date().toISOString(),
      location: window.location.href,
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      bridge: registry.bridge,
      terminals: registry.terminals,
    }, null, 2),
    copy: async () => {
      const report = registry.report();
      await navigator.clipboard.writeText(report);
      console.info("[Grokden:TerminalDebug] Copied report to clipboard.");
      return report;
    },
    clear: () => {
      registry.terminals = {};
      registry.bridge = [];
      console.info("[Grokden:TerminalDebug] Cleared terminal diagnostics.");
    },
  };
  return registry;
}

function registry(): TerminalDebugRegistry | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  if (!window.__GROKDEN_TERMINAL_DEBUG__ || window.__GROKDEN_TERMINAL_DEBUG__.version !== 2) {
    window.__GROKDEN_TERMINAL_DEBUG__ = makeRegistry();
    console.info(
      "[Grokden:TerminalDebug] Diagnostics enabled. Run await window.__GROKDEN_TERMINAL_DEBUG__.copy() or window.__GROKDEN_TERMINAL_DEBUG__.report().",
    );
  }
  return window.__GROKDEN_TERMINAL_DEBUG__;
}

export function makeTerminalDebugId(): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `term-${suffix}`;
}

export function debugControlPreview(value: string, maxLength = 220): string {
  const visible = value
    .replace(/\x1b/g, "<ESC>")
    .replace(/\r/g, "<CR>")
    .replace(/\n/g, "<LF>")
    .replace(/\t/g, "<TAB>")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, (char) =>
      `<0x${char.charCodeAt(0).toString(16).padStart(2, "0")}>`,
    );
  return visible.length > maxLength ? `${visible.slice(0, maxLength)}...` : visible;
}

export function terminalDebug(
  instanceId: string,
  event: string,
  detail?: unknown,
  snapshot?: unknown,
) {
  const store = registry();
  if (!store) return;
  const now = new Date().toISOString();
  const entry = store.terminals[instanceId] ?? {
    instanceId,
    createdAt: now,
    lastUpdatedAt: now,
    events: [],
  };
  if (!shouldCaptureDebugEvent(`${instanceId}:${event}`, event, detail)) {
    if (snapshot !== undefined) entry.latestSnapshot = snapshot;
    entry.lastUpdatedAt = now;
    store.terminals[instanceId] = entry;
    return;
  }
  const item: TerminalDebugEvent = { at: now, event };
  if (detail !== undefined) item.detail = detail;
  if (snapshot !== undefined) {
    entry.latestSnapshot = snapshot;
    if (/error|timeout|component:mount|xterm:opened|spawn:complete|inject:sequence-complete/.test(event)) {
      item.snapshot = snapshot;
    }
  }
  entry.events.push(item);
  if (entry.events.length > MAX_EVENTS_PER_TERMINAL) {
    entry.events.splice(0, entry.events.length - MAX_EVENTS_PER_TERMINAL);
  }
  entry.lastUpdatedAt = now;
  store.terminals[instanceId] = entry;
  console.debug(`[Grokden:Terminal:${instanceId}] ${event}`, detail ?? "", snapshot ?? "");
}

export function terminalBridgeDebug(event: string, detail?: unknown) {
  const store = registry();
  if (!store) return;
  if (!shouldCaptureDebugEvent(`bridge:${event}`, event, detail)) return;
  const item: TerminalDebugEvent = { at: new Date().toISOString(), event };
  if (detail !== undefined) item.detail = detail;
  store.bridge.push(item);
  if (store.bridge.length > 480) {
    store.bridge.splice(0, store.bridge.length - 480);
  }
  console.debug(`[Grokden:TerminalBridge] ${event}`, detail ?? "");
}

export function removeTerminalDebugEntry(instanceId: string, snapshot?: unknown) {
  const store = registry();
  if (!store) return;
  terminalDebug(instanceId, "component:destroy", undefined, snapshot);
}
