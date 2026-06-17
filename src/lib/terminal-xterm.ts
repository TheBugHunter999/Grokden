/** Shared xterm fit/resize helpers — avoids PTY resize storms that break Grok TUI alt-screen. */

export type TermDims = { cols: number; rows: number };

export const DEFAULT_RESIZE_DEBOUNCE_MS = 120;

const ALT_ENTER_RE = /\x1b\[[0-9;]*\??1049h|\x1b\[[0-9;]*\??47h/g;
const ALT_LEAVE_RE = /\x1b\[[0-9;]*\??1049l|\x1b\[[0-9;]*\??47l/g;
const INCOMPLETE_ESC_RE = /\x1b(?:\[[0-9;?]*)?$/;

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  }) as T;
}

export function dimsChanged(prev: TermDims | null, next: TermDims): boolean {
  if (!prev) return true;
  return prev.cols !== next.cols || prev.rows !== next.rows;
}

export function clampDims(cols: number, rows: number): TermDims | null {
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return null;
  const c = Math.floor(cols);
  const r = Math.floor(rows);
  if (c < 2 || r < 2) return null;
  return { cols: c, rows: r };
}

export function hostSizeChanged(
  prevW: number,
  prevH: number,
  w: number,
  h: number,
  threshold = 1,
): boolean {
  return Math.abs(w - prevW) >= threshold || Math.abs(h - prevH) >= threshold;
}

export type AltScreenParseResult = { active: boolean; carry: string };

/** Track alternate-screen (Grok TUI) from PTY output, including split escape sequences. */
export function parseAltScreenChunk(
  chunk: string,
  wasActive: boolean,
  carry = "",
): AltScreenParseResult {
  const stream = carry + chunk;
  let active = wasActive;
  let parseable = stream;
  let nextCarry = "";

  const lastEsc = stream.lastIndexOf("\x1b");
  if (lastEsc >= 0) {
    const tail = stream.slice(lastEsc);
    if (INCOMPLETE_ESC_RE.test(tail)) {
      parseable = stream.slice(0, lastEsc);
      nextCarry = tail;
    }
  }

  for (const match of parseable.matchAll(ALT_ENTER_RE)) {
    if (match) active = true;
  }
  for (const match of parseable.matchAll(ALT_LEAVE_RE)) {
    if (match) active = false;
  }

  return { active, carry: nextCarry };
}

/** @deprecated Use parseAltScreenChunk — kept for stress tests. */
export function parseAltScreenActive(chunk: string, wasActive: boolean): boolean {
  return parseAltScreenChunk(chunk, wasActive).active;
}

/** Gate PTY resize: skip cache hits and defer while alt-screen is active. */
export function shouldNotifyPtyResize(
  cached: TermDims | null,
  proposed: TermDims | null,
  options?: { altScreenActive?: boolean },
): boolean {
  const clamped = proposed ? clampDims(proposed.cols, proposed.rows) : null;
  if (!clamped) return false;
  if (!dimsChanged(cached, clamped)) return false;
  if (options?.altScreenActive) return false;
  return true;
}

/** Never call fitAddon.fit() while Grok TUI alt-screen is active — force does not bypass. */
export function shouldDeferFitForAltScreen(altScreenActive: boolean): boolean {
  return altScreenActive;
}

export function proposeFitDims(fitAddon: {
  proposeDimensions(): { cols: number; rows: number } | undefined;
}): TermDims | null {
  const raw = fitAddon.proposeDimensions();
  return clampDims(raw?.cols ?? 0, raw?.rows ?? 0);
}

/** Wait until the host has non-zero layout (grid/flex may settle over a few frames). */
export async function waitForHostLayout(
  el: HTMLElement,
  opts?: { maxFrames?: number; minW?: number; minH?: number },
): Promise<void> {
  const maxFrames = opts?.maxFrames ?? 12;
  const minW = opts?.minW ?? 2;
  const minH = opts?.minH ?? 2;
  for (let i = 0; i < maxFrames; i++) {
    const { clientWidth, clientHeight } = el;
    if (clientWidth >= minW && clientHeight >= minH) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}