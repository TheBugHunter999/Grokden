import { GrokTuiParser } from "$lib/agent-activity/grok-tui-parser";
import {
  bindSessionTerminal,
  createActivitySession,
  pushActivityStep,
} from "$lib/agent-activity/activity-store";
import { registerTerminalTap, type TerminalId } from "$lib/terminal-bridge";

const parsers = new Map<TerminalId, { sessionId: string; parser: GrokTuiParser }>();

export function startActivitySession(label: string, terminalId: number | null = null): string {
  const session = createActivitySession(label, terminalId);
  if (terminalId != null) {
    attachParser(session.id, terminalId);
  }
  return session.id;
}

export function attachParser(sessionId: string, terminalId: TerminalId): () => void {
  const parser = new GrokTuiParser();
  parsers.set(terminalId, { sessionId, parser });
  bindSessionTerminal(sessionId, terminalId);

  return registerTerminalTap(terminalId, (chunk) => {
    const entry = parsers.get(terminalId);
    if (!entry || entry.sessionId !== sessionId) return;
    for (const event of entry.parser.push(chunk)) {
      if (event.type === "step_start") {
        pushActivityStep(sessionId, {
          title: event.title,
          kind: event.kind,
          toolKind: event.toolKind,
          files: event.files,
        });
      }
    }
  });
}

export function detachParser(terminalId: TerminalId): void {
  parsers.delete(terminalId);
}