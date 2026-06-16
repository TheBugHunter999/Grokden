import type { AgentSession, AgentStep, AgentRunStatus } from "$lib/agent-activity/types";
import { normalizeActivityTitle } from "$lib/agent-activity/display-text";

export type TerminalCompactActivity = {
  currentTitle: string | null;
  status: AgentRunStatus;
};

let sessions = $state<Map<string, AgentSession>>(new Map());
let terminalCompact = $state<Map<number, TerminalCompactActivity>>(new Map());
let activeSessionId = $state<string | null>(null);

function now() {
  return Date.now();
}

function uid(prefix: string) {
  return `${prefix}-${now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STALE_MS = 45_000;

export function isSessionLive(session: AgentSession): boolean {
  if (session.status === "done" || session.status === "error") return false;
  if (session.status === "idle") return false;
  if (session.steps.length > 0) return true;
  if (session.terminalId == null) return false;
  return now() - session.updatedAt < STALE_MS;
}

export function getActivitySessions(): AgentSession[] {
  return [...sessions.values()]
    .filter(isSessionLive)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActiveActivitySession(): AgentSession | null {
  if (!activeSessionId) return null;
  return sessions.get(activeSessionId) ?? null;
}

export function getSessionByTerminalId(terminalId: number): AgentSession | undefined {
  return [...sessions.values()].find((s) => s.terminalId === terminalId);
}

export function getTerminalCompactActivity(terminalId: number): TerminalCompactActivity | undefined {
  return terminalCompact.get(terminalId);
}

function syncTerminalCompact(terminalId: number, currentTitle: string | null, status: AgentRunStatus): void {
  terminalCompact = new Map(terminalCompact).set(terminalId, { currentTitle, status });
}

function removeTerminalCompact(terminalId: number): void {
  if (!terminalCompact.has(terminalId)) return;
  const next = new Map(terminalCompact);
  next.delete(terminalId);
  terminalCompact = next;
}

export function createActivitySession(label: string, terminalId: number | null = null): AgentSession {
  const session: AgentSession = {
    id: uid("agent"),
    label,
    terminalId,
    status: "idle",
    startedAt: now(),
    updatedAt: now(),
    currentTitle: null,
    steps: [],
  };
  sessions = new Map(sessions).set(session.id, session);
  activeSessionId = session.id;
  return session;
}

export function bindSessionTerminal(sessionId: string, terminalId: number): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions = new Map(sessions).set(sessionId, { ...session, terminalId, updatedAt: now() });
}

export function setActiveActivitySession(sessionId: string | null): void {
  activeSessionId = sessionId;
}

function completeRunningStep(session: AgentSession): AgentSession {
  const steps = session.steps.map((s) =>
    s.status === "running" ? { ...s, status: "success" as const, endedAt: now() } : s,
  );
  return { ...session, steps };
}

export function pushActivityStep(
  sessionId: string,
  partial: Pick<AgentStep, "title" | "kind" | "toolKind" | "files">,
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  const title = normalizeActivityTitle(partial.title);
  if (!title) return;

  const closed = completeRunningStep(session);
  const step: AgentStep = {
    id: uid("step"),
    sessionId,
    kind: partial.kind,
    status: "running",
    title,
    toolKind: partial.toolKind,
    files: partial.files,
    startedAt: now(),
  };

  const status: AgentRunStatus =
    partial.kind === "permission"
      ? "awaiting_approval"
      : partial.kind === "thought"
        ? "thinking"
        : "tool_running";

  const updated: AgentSession = {
    ...closed,
    status,
    currentTitle: title,
    updatedAt: now(),
    steps: [...closed.steps, step].slice(-40),
  };
  sessions = new Map(sessions).set(sessionId, updated);
  if (updated.terminalId != null) {
    syncTerminalCompact(updated.terminalId, title, status);
  }
}

export function markSessionDone(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const closed = completeRunningStep(session);
  const updated: AgentSession = {
    ...closed,
    status: "done",
    currentTitle: "Done",
    updatedAt: now(),
  };
  sessions = new Map(sessions).set(sessionId, updated);
  if (updated.terminalId != null) {
    syncTerminalCompact(updated.terminalId, "Done", "done");
  }
}

export function removeActivitySession(sessionId: string): void {
  if (!sessions.has(sessionId)) return;
  const next = new Map(sessions);
  next.delete(sessionId);
  sessions = next;
  if (activeSessionId === sessionId) {
    const remaining = getActivitySessions();
    activeSessionId = remaining[0]?.id ?? null;
  }
}

export function removeSessionsByTerminalId(terminalId: number): void {
  for (const session of sessions.values()) {
    if (session.terminalId === terminalId) {
      removeActivitySession(session.id);
    }
  }
  removeTerminalCompact(terminalId);
}

export function clearActivitySessions(): void {
  sessions = new Map();
  terminalCompact = new Map();
  activeSessionId = null;
}

export function pruneStaleSessions(): void {
  const next = new Map(sessions);
  let changed = false;
  for (const [id, session] of next) {
    if (!isSessionLive(session) && session.status !== "tool_running" && session.status !== "awaiting_approval") {
      next.delete(id);
      changed = true;
    }
  }
  if (!changed) return;
  sessions = next;
  if (activeSessionId && !sessions.has(activeSessionId)) {
    const remaining = getActivitySessions();
    activeSessionId = remaining[0]?.id ?? null;
  }
}