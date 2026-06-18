import { GrokTuiParser } from "$lib/agent-activity/grok-tui-parser";
import {
  bindSessionTerminal,
  createActivitySession,
  pushActivityStep,
  removeSessionsByTerminalId,
  touchActivitySession,
} from "$lib/agent-activity/activity-store";
import {
  registerTerminalCloseHandler,
  registerTerminalTap,
  type TerminalId,
} from "$lib/terminal-bridge";

const parsers = new Map<TerminalId, { sessionId: string; parser: GrokTuiParser }>();

const FLUSH_MS = 100;
const MAX_WAIT_MS = 280;

type TapState = {
  pending: string;
  timer: ReturnType<typeof setTimeout> | undefined;
  firstChunkAt: number;
};

type DetachOptions = {
  flush?: boolean;
};

const tapStates = new Map<TerminalId, TapState>();
const tapUnsubscribers = new Map<TerminalId, () => void>();

registerTerminalCloseHandler((terminalId) => {
  detachParser(terminalId, { flush: false });
  removeSessionsByTerminalId(terminalId);
});

function flushTap(sessionId: string, terminalId: TerminalId, includePartial = false) {
  const state = tapStates.get(terminalId);
  if (!state || !state.pending) return;

  const entry = parsers.get(terminalId);
  if (!entry || entry.sessionId !== sessionId) {
    state.pending = "";
    state.firstChunkAt = 0;
    return;
  }

  const chunk = state.pending;
  state.pending = "";
  state.firstChunkAt = 0;

  const events = includePartial
    ? [...entry.parser.push(chunk), ...entry.parser.flush()]
    : entry.parser.push(chunk);
  if (events.length === 0) return;

  touchActivitySession(sessionId);
  for (const event of events) {
    if (event.type === "step_start") {
      pushActivityStep(sessionId, {
        title: event.title,
        kind: event.kind,
        toolKind: event.toolKind,
        files: event.files,
      });
    }
  }
}

function scheduleTapFlush(sessionId: string, terminalId: TerminalId) {
  let state = tapStates.get(terminalId);
  if (!state) {
    state = { pending: "", timer: undefined, firstChunkAt: 0 };
    tapStates.set(terminalId, state);
  }

  if (!state.firstChunkAt) state.firstChunkAt = Date.now();

  if (state.timer) clearTimeout(state.timer);

  const elapsed = Date.now() - state.firstChunkAt;
  if (elapsed >= MAX_WAIT_MS) {
    flushTap(sessionId, terminalId, false);
    return;
  }

  state.timer = setTimeout(() => {
    state!.timer = undefined;
    flushTap(sessionId, terminalId, false);
  }, FLUSH_MS);
}

export function startActivitySession(label: string, terminalId: number | null = null): string {
  const session = createActivitySession(label, terminalId);
  if (terminalId != null) {
    attachParser(session.id, terminalId);
  }
  return session.id;
}

export function attachParser(sessionId: string, terminalId: TerminalId): () => void {
  detachParser(terminalId, { flush: false });

  const parser = new GrokTuiParser();
  parsers.set(terminalId, { sessionId, parser });
  bindSessionTerminal(sessionId, terminalId);

  const prev = tapStates.get(terminalId);
  if (prev?.timer) clearTimeout(prev.timer);
  tapStates.set(terminalId, { pending: "", timer: undefined, firstChunkAt: 0 });

  const unsubscribe = registerTerminalTap(terminalId, (chunk) => {
    const entry = parsers.get(terminalId);
    if (!entry || entry.sessionId !== sessionId) return;

    let state = tapStates.get(terminalId);
    if (!state) {
      state = { pending: "", timer: undefined, firstChunkAt: 0 };
      tapStates.set(terminalId, state);
    }
    state.pending += chunk;
    scheduleTapFlush(sessionId, terminalId);
  });

  tapUnsubscribers.set(terminalId, unsubscribe);

  return () => {
    unsubscribe();
    if (tapUnsubscribers.get(terminalId) === unsubscribe) {
      tapUnsubscribers.delete(terminalId);
    }
    detachParser(terminalId, { flush: false });
  };
}

export function detachParser(terminalId: TerminalId, options: DetachOptions = {}): void {
  const unsubscribe = tapUnsubscribers.get(terminalId);
  if (unsubscribe) {
    unsubscribe();
    tapUnsubscribers.delete(terminalId);
  }

  const entry = parsers.get(terminalId);
  if (entry && options.flush) flushTap(entry.sessionId, terminalId, true);

  const state = tapStates.get(terminalId);
  if (state?.timer) clearTimeout(state.timer);
  tapStates.delete(terminalId);
  parsers.delete(terminalId);
}
