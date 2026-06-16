import type { AgentStep, StepKind, ToolKind } from "$lib/agent-activity/types";
import { AnsiStripper, sanitizeDisplayText } from "$lib/agent-activity/grok-ansi";
import { shortPath } from "$lib/agent-activity/display-text";

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
  { re: /image-to-video\s+(.+)/i, kind: "execute", label: (m) => `Video: ${trimCmd(m[1])}` },
  { re: /\/imagine(?:-video)?\s+(.+)/i, kind: "execute", label: (m) => `Imagine: ${trimCmd(m[1])}` },
];

function trimCmd(cmd: string): string {
  return sanitizeDisplayText(cmd, 48);
}

export class GrokTuiParser {
  private buffer = "";
  private lastTitle = "";
  private ansi = new AnsiStripper();

  push(chunk: string): ParserEvent[] {
    this.buffer += this.ansi.push(chunk);
    if (this.buffer.length > 8000) {
      this.buffer = this.buffer.slice(-4000);
    }
    return this.parseCompleteLines();
  }

  flush(): ParserEvent[] {
    const tail = this.ansi.flush();
    if (tail) this.buffer += tail;
    return this.parseCompleteLines();
  }

  private parseCompleteLines(): ParserEvent[] {
    const parts = this.buffer.split("\n");
    const completeLines = this.buffer.endsWith("\n") ? parts : parts.slice(0, -1);
    const lines = completeLines.slice(-12);

    for (let i = lines.length - 1; i >= 0; i--) {
      const event = this.matchLine(lines[i].trim());
      if (!event || event.type === "step_end") continue;
      if (event.title === this.lastTitle) return [];
      this.lastTitle = event.title;
      return [event];
    }
    return [];
  }

  private matchLine(line: string): ParserEvent | null {
    if (line.length < 3) return null;

    if (/think(?:ing)?/i.test(line)) {
      return { type: "step_start", title: "Thinking…", kind: "thought" };
    }

    if (/approv|confirm|permission|waiting for/i.test(line)) {
      return { type: "step_start", title: "Waiting for your approval", kind: "permission" };
    }

    if (/loading/i.test(line) && line.length < 40) {
      return { type: "step_start", title: "Loading…", kind: "thought" };
    }

    for (const pat of TOOL_PATTERNS) {
      const m = line.match(pat.re);
      if (!m) continue;
      const title = sanitizeDisplayText(pat.label(m));
      if (!title) continue;
      return {
        type: "step_start",
        title,
        kind: "tool_call",
        toolKind: pat.kind,
        files: m[1] ? [m[1]] : undefined,
      };
    }

    return null;
  }
}