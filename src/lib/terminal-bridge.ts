import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { debugControlPreview, terminalBridgeDebug } from "$lib/terminal-debug";

export type TerminalId = number;

export type TerminalSpawnOptions = {
  shell: string | null;
  cwd: string | null;
};

export type TerminalWriteOptions = {
  id: TerminalId;
  data: string;
};

export type TerminalResizeOptions = {
  id: TerminalId;
  cols: number;
  rows: number;
};

export type TerminalCloseOptions = {
  id: TerminalId;
};

export type TerminalOutputEvent = {
  id: TerminalId;
  data: string;
};

export type TerminalOutputHandler = (data: string) => void;
export type TerminalTapHandler = (data: string) => void;
export type TerminalCloseHandler = (id: TerminalId) => void;

const OUTPUT_BUFFER_LIMIT = 64;
const outputHandlers = new Map<TerminalId, TerminalOutputHandler>();
const outputTaps = new Map<TerminalId, Set<TerminalTapHandler>>();
const outputBuffers = new Map<TerminalId, string[]>();
const terminalCloseHandlers = new Set<TerminalCloseHandler>();
let outputListener: Promise<UnlistenFn> | null = null;

function deliverOutput(id: TerminalId, data: string) {
  terminalBridgeDebug("output:deliver", {
    id,
    chars: data.length,
    preview: debugControlPreview(data),
    taps: outputTaps.get(id)?.size ?? 0,
    hasHandler: outputHandlers.has(id),
    bufferedChunks: outputBuffers.get(id)?.length ?? 0,
  });
  const taps = outputTaps.get(id);
  if (taps) {
    for (const tap of taps) {
      try {
        tap(data);
      } catch (error) {
        console.error("Terminal tap failed:", error);
      }
    }
  }

  const handler = outputHandlers.get(id);
  if (handler) {
    terminalBridgeDebug("output:to-handler", { id, chars: data.length });
    handler(data);
    return;
  }

  const buffer = outputBuffers.get(id) ?? [];
  buffer.push(data);
  if (buffer.length > OUTPUT_BUFFER_LIMIT) {
    buffer.splice(0, buffer.length - OUTPUT_BUFFER_LIMIT);
  }
  outputBuffers.set(id, buffer);
  terminalBridgeDebug("output:buffered", { id, bufferedChunks: buffer.length });
}

function notifyTerminalClosed(id: TerminalId): void {
  for (const handler of terminalCloseHandlers) {
    try {
      handler(id);
    } catch (error) {
      console.error("Terminal close callback failed:", error);
    }
  }
}

async function ensureOutputListener(): Promise<void> {
  if (!outputListener) {
    terminalBridgeDebug("listener:create");
    outputListener = listen<TerminalOutputEvent>("terminal-output", (event) => {
      terminalBridgeDebug("listener:event", {
        id: event.payload.id,
        chars: event.payload.data.length,
        preview: debugControlPreview(event.payload.data),
      });
      deliverOutput(event.payload.id, event.payload.data);
    });
  }
  await outputListener;
  terminalBridgeDebug("listener:ready");
}

export function registerTerminalOutput(
  id: TerminalId,
  handler: TerminalOutputHandler,
): () => void {
  outputHandlers.set(id, handler);
  terminalBridgeDebug("handler:register", {
    id,
    bufferedChunks: outputBuffers.get(id)?.length ?? 0,
  });

  const buffered = outputBuffers.get(id);
  if (buffered?.length) {
    outputBuffers.delete(id);
    for (const chunk of buffered) {
      handler(chunk);
    }
  }

  void ensureOutputListener();

  return () => {
    terminalBridgeDebug("handler:unregister", { id });
    outputHandlers.delete(id);
    outputBuffers.delete(id);
  };
}

export function registerTerminalTap(
  id: TerminalId,
  handler: TerminalTapHandler,
): () => void {
  let taps = outputTaps.get(id);
  if (!taps) {
    taps = new Set();
    outputTaps.set(id, taps);
  }
  taps.add(handler);

  void ensureOutputListener();

  return () => {
    const set = outputTaps.get(id);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) outputTaps.delete(id);
  };
}

export function registerTerminalCloseHandler(handler: TerminalCloseHandler): () => void {
  terminalCloseHandlers.add(handler);
  return () => {
    terminalCloseHandlers.delete(handler);
  };
}

export async function spawnTerminal(options: TerminalSpawnOptions): Promise<TerminalId> {
  terminalBridgeDebug("invoke:spawn-request", options);
  await ensureOutputListener();
  const id = await invoke<TerminalId>("terminal_spawn", {
    shell: options.shell,
    cwd: options.cwd,
  });
  terminalBridgeDebug("invoke:spawn-complete", { id });
  return id;
}

export async function writeTerminal(options: TerminalWriteOptions): Promise<void> {
  terminalBridgeDebug("invoke:write-request", {
    id: options.id,
    chars: options.data.length,
    preview: debugControlPreview(options.data),
  });
  await invoke("terminal_write", {
    id: options.id,
    data: options.data,
  });
  terminalBridgeDebug("invoke:write-complete", { id: options.id, chars: options.data.length });
}

export async function resizeTerminal(options: TerminalResizeOptions): Promise<void> {
  terminalBridgeDebug("invoke:resize-request", options);
  await invoke("terminal_resize", {
    id: options.id,
    cols: options.cols,
    rows: options.rows,
  });
  terminalBridgeDebug("invoke:resize-complete", options);
}

export async function closeTerminal(options: TerminalCloseOptions): Promise<void> {
  terminalBridgeDebug("invoke:close-request", options);
  try {
    await invoke("terminal_close", {
      id: options.id,
    });
  } finally {
    terminalBridgeDebug("invoke:close-finally", options);
    outputHandlers.delete(options.id);
    outputTaps.delete(options.id);
    outputBuffers.delete(options.id);
    notifyTerminalClosed(options.id);
  }
}
