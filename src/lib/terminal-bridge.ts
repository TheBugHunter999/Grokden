import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

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

const OUTPUT_BUFFER_LIMIT = 64;
const outputHandlers = new Map<TerminalId, TerminalOutputHandler>();
const outputBuffers = new Map<TerminalId, string[]>();
let outputListener: Promise<UnlistenFn> | null = null;

function deliverOutput(id: TerminalId, data: string) {
  const handler = outputHandlers.get(id);
  if (handler) {
    handler(data);
    return;
  }

  const buffer = outputBuffers.get(id) ?? [];
  buffer.push(data);
  if (buffer.length > OUTPUT_BUFFER_LIMIT) {
    buffer.splice(0, buffer.length - OUTPUT_BUFFER_LIMIT);
  }
  outputBuffers.set(id, buffer);
}

async function ensureOutputListener(): Promise<void> {
  if (!outputListener) {
    outputListener = listen<TerminalOutputEvent>("terminal-output", (event) => {
      deliverOutput(event.payload.id, event.payload.data);
    });
  }
  await outputListener;
}

export function registerTerminalOutput(
  id: TerminalId,
  handler: TerminalOutputHandler,
): () => void {
  outputHandlers.set(id, handler);

  const buffered = outputBuffers.get(id);
  if (buffered?.length) {
    outputBuffers.delete(id);
    for (const chunk of buffered) {
      handler(chunk);
    }
  }

  void ensureOutputListener();

  return () => {
    outputHandlers.delete(id);
    outputBuffers.delete(id);
  };
}

export async function spawnTerminal(options: TerminalSpawnOptions): Promise<TerminalId> {
  await ensureOutputListener();
  return invoke<TerminalId>("terminal_spawn", {
    shell: options.shell,
    cwd: options.cwd,
  });
}

export async function writeTerminal(options: TerminalWriteOptions): Promise<void> {
  await invoke("terminal_write", {
    id: options.id,
    data: options.data,
  });
}

export async function resizeTerminal(options: TerminalResizeOptions): Promise<void> {
  await invoke("terminal_resize", {
    id: options.id,
    cols: options.cols,
    rows: options.rows,
  });
}

export async function closeTerminal(options: TerminalCloseOptions): Promise<void> {
  outputHandlers.delete(options.id);
  outputBuffers.delete(options.id);
  await invoke("terminal_close", {
    id: options.id,
  });
}