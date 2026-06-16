import type { AgentStep, StepKind, ToolKind } from "$lib/agent-activity/types";
import { stripAnsi } from "$lib/agent-activity/grok-ansi";

export type ParserEvent =
  | { type: "step_start"; title: string; kind: StepKind; toolKind?: ToolKind; files?: string[] }
  | { type: "step_end"; title?: string }
  | { type: "status"; title: string };

const TOOL_PATTERNS: { re: RegExp; kind: ToolKind; label: (m: RegExpMatchArray) => string }[] = [
  { re: /read(?:ing)?\s+[`'"]?([^\s`'"\\]+)/i, kind: "read", label: (m) => `Reading ${shortPath(m[1])}` },
  { re: /write(?:ing)?\s+[`'"]?([^\s`'"\\]+)/i, kind: "write", label: (m) => `Writing ${shortPath(m[1])}` },
  { re: /edit(?:ing)?\s+[`'"]?([^\s`'"\\]+)/i, kind: "write", label: (m) => `Editing ${shortPath(m[1])}` },
  { re: /(?:run(?:ning)?|exec(?:ute)?)\s+[`'"]?([^\n`'"\\]{3,})/i, kind: "execute", label: (m) => `Running ${trimCmd(m[1])}` },
  { re: /grep(?:ping)?\s+[`'"]?([^\n`'"\\]{2,})/i, kind: "search", label: (m) => `Searching ${trimCmd(m[1])}` },
  { re: /([A-Za-z]:\\[^\s`'"\\]+|\/[^\s`'"\\]+)/, kind: "read", label: (m) => `Working on ${shortPath(m[1])}` },
];

function shortPath(path: string): string {
  const norm = path.replace(/\\/g, "/");
  const parts = norm.split("/").filter(Boolean);
  if (parts.length <= 2) return norm;
  return `…/${parts.slice(-2).join("/")}`;
}

function trimCmd(cmd: string): string {
  const t = cmd.trim();
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

export class GrokTuiParser {
  private buffer = "";
  private lastTitle = "";

  push(chunk: string): ParserEvent[] {
    this.buffer += stripAnsi(chunk);
    if (this.buffer.length > 8000) {
      this.buffer = this.buffer.slice(-4000);
    }

    const events: ParserEvent[] = [];
    const lines = this.buffer.split("\n").slice(-12);
    for (const raw of lines) {
      const line = raw.trim();
      if (line.length < 3) continue;

      if (/think(?:ing)?/i.test(line)) {
        const title = "Thinking…";
        if (title !== this.lastTitle) {
          this.lastTitle = title;
          events.push({ type: "step_start", title, kind: "thought" });
        }
        continue;
      }

      if (/approv|confirm|permission|waiting for/i.test(line)) {
        const title = "Waiting for your approval";
        if (title !== this.lastTitle) {
          this.lastTitle = title;
          events.push({ type: "step_start", title, kind: "permission" });
        }
        continue;
      }

      for (const pat of TOOL_PATTERNS) {
        const m = line.match(pat.re);
        if (!m) continue;
        const title = pat.label(m);
        if (title === this.lastTitle) break;
        this.lastTitle = title;
        events.push({
          type: "step_start",
          title,
          kind: "tool_call",
          toolKind: pat.kind,
          files: m[1] ? [m[1]] : undefined,
        });
        break;
      }
    }

    return events;
  }
}