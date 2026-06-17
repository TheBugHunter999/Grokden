<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { Terminal as XTerm, type ITheme } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import { WebLinksAddon } from "@xterm/addon-web-links";
  import "@xterm/xterm/css/xterm.css";
  import type { AppSettings } from "$lib/editor-utils";
  import {
    closeTerminal,
    registerTerminalOutput,
    resizeTerminal,
    spawnTerminal,
    writeTerminal,
  } from "$lib/terminal-bridge";
  import {
    completionSuffix,
    searchCommandSuggestions,
    shouldShowSuggestions,
    type CommandSuggestion,
  } from "$lib/terminal-commands";
  import { appendToBuffer, consumeTerminalInput } from "$lib/terminal-input";
  import TerminalHelper from "$lib/TerminalHelper.svelte";
  import {
    debounce,
    DEFAULT_RESIZE_DEBOUNCE_MS,
    hostSizeChanged,
    parseAltScreenChunk,
    proposeFitDims,
    shouldDeferFitForAltScreen,
    shouldNotifyPtyResize,
    waitForHostLayout,
    type TermDims,
  } from "$lib/terminal-xterm";
  let {
    settings,
    cwd = null,
    visible = false,
    sessionActive = true,
    injectToken = 0,
    restartBeforeInject = false,
    injectCommand = null,
    injectPrompt = null,
    promptDelayMs = 2800,
    compact = false,
    enableHelper = true,
    onSpawned = undefined,
  }: {
    settings: AppSettings;
    cwd?: string | null;
    visible?: boolean;
    sessionActive?: boolean;
    injectToken?: number;
    restartBeforeInject?: boolean;
    injectCommand?: string | null;
    injectPrompt?: string | null;
    promptDelayMs?: number;
    compact?: boolean;
    enableHelper?: boolean;
    onSpawned?: (id: number) => void;
  } = $props();

  let hostEl = $state<HTMLDivElement | undefined>();
  let term: XTerm | null = null;
  let fitAddon: FitAddon | null = null;
  let terminalId: number | null = null;
  let unregisterOutput: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let spawnGeneration = 0;
  let mounted = false;
  let inputBuffer = $state("");
  let lastPtyDims: TermDims | null = null;
  let lastHostW = 0;
  let lastHostH = 0;
  let altScreenActive = false;
  let altParseCarry = "";
  let pendingFitAfterAlt = false;
  let pendingSettingsAfterAlt = false;
  let spawnInFlight = false;
  let resizeSerial = 0;
  let initialResizeDone = false;
  let sessionLifecycleGen = 0;

  let bellEnabled = false;
  let suggestions = $derived(
    shouldShowSuggestions(inputBuffer) ? searchCommandSuggestions(inputBuffer) : [],
  );
  let helperVisible = $derived(enableHelper && suggestions.length > 0);

  function cssVar(el: HTMLElement, name: string, fallback: string): string {
    return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
  }

  function terminalSurfaceBg(el: HTMLElement): string {
    const glass = cssVar(el, "--glass-editor-bg", "");
    if (glass) return "transparent";
    return cssVar(el, "--editor-bg", cssVar(el, "--bg", "#09090d"));
  }

  function buildXtermTheme(el: HTMLElement): ITheme {
    const surface = terminalSurfaceBg(el);
    return {
      background: surface,
      foreground: cssVar(el, "--text-dim", "#b4b4c4"),
      cursor: cssVar(el, "--accent", "#8b5cf6"),
      cursorAccent: surface,
      selectionBackground: cssVar(el, "--accent-mid", "rgba(139, 92, 246, 0.22)"),
      selectionForeground: cssVar(el, "--text", "#e4e4ec"),
      black: "#1c1c26",
      red: cssVar(el, "--danger", "#f87171"),
      green: cssVar(el, "--success", "#4ade80"),
      yellow: cssVar(el, "--warn", "#fbbf24"),
      blue: "#3aa0ff",
      magenta: "#c678dd",
      cyan: "#56b6ff",
      white: cssVar(el, "--text", "#e4e4ec"),
      brightBlack: cssVar(el, "--text-mute", "#7a7a8c"),
      brightRed: "#fca5a5",
      brightGreen: "#86efac",
      brightYellow: "#fde68a",
      brightBlue: "#93c5fd",
      brightMagenta: "#e9a8ff",
      brightCyan: "#7dd3fc",
      brightWhite: "#ffffff",
    };
  }

  function xtermCursorStyle(
    style: AppSettings["terminalCursorStyle"],
  ): "block" | "underline" | "bar" {
    return style === "line" ? "bar" : style;
  }

  function createTerminalOptions(el: HTMLElement) {
    return {
      fontSize: settings.terminalFontSize,
      lineHeight: 1.3,
      letterSpacing: 0,
      scrollback: settings.terminalScrollback,
      cursorStyle: xtermCursorStyle(settings.terminalCursorStyle),
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, monospace',
      theme: buildXtermTheme(el),
      cursorBlink: true,
      convertEol: false,
      customGlyphs: true,
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      altClickMovesCursor: false,
      windowsPty: { backend: "conpty" as const },
      windowOptions: {
        getWinSizeChars: true,
        getCellSizePixels: true,
        getWinSizePixels: true,
      },
    };
  }

  function applyTerminalSettings() {
    if (!term || !hostEl) return;
    if (altScreenActive) {
      pendingSettingsAfterAlt = true;
      return;
    }

    term.options.fontSize = compact
      ? Math.max(10, settings.terminalFontSize - 2)
      : settings.terminalFontSize;
    term.options.lineHeight = compact ? 1.2 : 1.3;
    term.options.letterSpacing = 0;
    term.options.scrollback = settings.terminalScrollback;
    term.options.cursorStyle = xtermCursorStyle(settings.terminalCursorStyle);
    term.options.theme = buildXtermTheme(hostEl);
    term.options.customGlyphs = true;
    term.options.scrollOnUserInput = !altScreenActive;
  }

  function syncXtermFocus() {
    if (!term || !mounted) return;
    if (visible && sessionActive) return;
    term.blur();
  }

  async function fitAndResize(opts: { forceFit?: boolean; forcePty?: boolean } = {}) {
    const { forceFit = false, forcePty = false } = opts;
    if (!fitAddon || !term || !terminalId || !hostEl) return;

    const fitVisual = visible;

    const { clientWidth, clientHeight } = hostEl;
    if (clientWidth < 2 || clientHeight < 2) return;

    if (shouldDeferFitForAltScreen(altScreenActive)) {
      pendingFitAfterAlt = true;
      return;
    }

    if (
      !forceFit &&
      !hostSizeChanged(lastHostW, lastHostH, clientWidth, clientHeight)
    ) {
      return;
    }

    const id = terminalId;
    const generation = spawnGeneration;
    const ticket = ++resizeSerial;

    try {
      fitAddon.fit();
      const dims = proposeFitDims(fitAddon);
      if (!dims) return;
      if (!shouldNotifyPtyResize(lastPtyDims, dims, { altScreenActive }) && !forcePty) {
        return;
      }

      await resizeTerminal({
        id,
        cols: dims.cols,
        rows: dims.rows,
      });

      if (ticket !== resizeSerial || terminalId !== id || spawnGeneration !== generation) return;

      lastPtyDims = dims;
      lastHostW = clientWidth;
      lastHostH = clientHeight;
      pendingFitAfterAlt = false;
      initialResizeDone = true;

      if (fitVisual) term.refresh(0, term.rows - 1);
    } catch (error) {
      console.error("Terminal resize failed:", error);
    }
  }

  function handleAltScreenTransition(chunk: string) {
    const prevAlt = altScreenActive;
    const parsed = parseAltScreenChunk(chunk, altScreenActive, altParseCarry);
    altScreenActive = parsed.active;
    altParseCarry = parsed.carry;

    if (term) {
      term.options.scrollOnUserInput = !altScreenActive;
    }

    if (prevAlt && !altScreenActive) {
      if (pendingSettingsAfterAlt) {
        pendingSettingsAfterAlt = false;
        applyTerminalSettings();
      }
      if (pendingFitAfterAlt) {
        pendingFitAfterAlt = false;
        void fitAndResize({ forceFit: true, forcePty: true });
      } else {
        void fitAndResize({ forceFit: true, forcePty: true });
      }
    }
  }

  const scheduleFitAndResize = debounce(
    () => void fitAndResize({ forceFit: false, forcePty: false }),
    DEFAULT_RESIZE_DEBOUNCE_MS,
  );

  async function teardownSession(force = false) {
    if (!force && settings.terminalPersistSession) return;

    if (unregisterOutput) {
      unregisterOutput();
      unregisterOutput = null;
    }

    if (!terminalId) return;

    const id = terminalId;
    terminalId = null;

    try {
      await closeTerminal({ id });
    } catch (error) {
      console.error("Terminal close failed:", error);
    }
  }

  function copySelectionToClipboard() {
    const sel = term?.getSelection();
    if (!sel) return;
    void navigator.clipboard?.writeText(sel).catch(() => undefined);
  }

  function syncCopyOnSelect() {
    if (!term || !hostEl) return;

    hostEl.onmouseup = null;

    if (settings.terminalCopyOnSelect) {
      hostEl.onmouseup = () => {
        if (term?.hasSelection()) {
          copySelectionToClipboard();
        }
      };
    }
  }

  function playTerminalBell() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      /* audio unavailable */
    }
  }

  async function spawnSession() {
    if (!term || !sessionActive || terminalId || spawnInFlight) return;

    spawnInFlight = true;
    const generation = ++spawnGeneration;
    const shell = settings.terminalShellPath.trim() || null;

    try {
      const id = await spawnTerminal({ shell, cwd });
      if (generation !== spawnGeneration || !term || !sessionActive) {
        await closeTerminal({ id }).catch(() => undefined);
        return;
      }

      terminalId = id;
      lastPtyDims = null;
      lastHostW = 0;
      lastHostH = 0;
      altScreenActive = false;
      pendingFitAfterAlt = false;
      unregisterOutput = registerTerminalOutput(id, (data) => {
        if (terminalId === id && term) {
          handleAltScreenTransition(data);
          term.write(data);
        }
      });
      onSpawned?.(id);

      if (hostEl) await waitForHostLayout(hostEl);
      await fitAndResize({ forceFit: true, forcePty: true });
    } catch (error) {
      console.error("Terminal spawn failed:", error);
      term?.writeln("\r\n\x1b[31mFailed to spawn terminal.\x1b[0m");
    } finally {
      spawnInFlight = false;
    }
  }

  async function restartSession() {
    spawnGeneration += 1;
    sessionLifecycleGen += 1;
    initialResizeDone = false;
    await teardownSession();
    term?.clear();
    inputBuffer = "";
    lastPtyDims = null;
    lastHostW = 0;
    lastHostH = 0;
    altScreenActive = false;
    altParseCarry = "";
    pendingFitAfterAlt = false;
    pendingSettingsAfterAlt = false;
    await spawnSession();
  }

  async function applySuggestion(suggestion: CommandSuggestion) {
    if (!terminalId) return;
    const suffix = completionSuffix(inputBuffer, suggestion);
    if (!suffix) return;
    inputBuffer = appendToBuffer(inputBuffer, suffix);
    await writeTerminal({ id: terminalId, data: suffix });
  }

  async function handleTabComplete() {
    if (!terminalId || !shouldShowSuggestions(inputBuffer)) return;

    const matches = searchCommandSuggestions(inputBuffer);
    const top = matches[0];
    if (!top) return;

    const suffix = completionSuffix(inputBuffer, top);
    if (!suffix) return;

    inputBuffer = appendToBuffer(inputBuffer, suffix);
    await writeTerminal({ id: terminalId, data: suffix });
  }

  function handleTerminalData(data: string) {
    if (!terminalId || injectInFlight) return;

    let forward = data;
    if (enableHelper) {
      const consumed = consumeTerminalInput(data, inputBuffer);
      inputBuffer = consumed.buffer;
      forward = consumed.forward;
    }
    if (!forward) return;

    writeTerminal({ id: terminalId, data: forward }).catch((error) => {
      console.error("Terminal write failed:", error);
    });
  }

  onMount(() => {
    if (!hostEl) return;

    mounted = true;
    term = new XTerm(createTerminalOptions(hostEl));
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(hostEl);

    bellEnabled = settings.terminalBell;
    term.onData((data) => {
      if (bellEnabled && (data === "\x07" || data.includes("\x07"))) {
        playTerminalBell();
      }
      handleTerminalData(data);
    });

    syncCopyOnSelect();

    term.attachCustomKeyEventHandler((event) => {
      if (
        enableHelper &&
        event.key === "Tab" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        shouldShowSuggestions(inputBuffer)
      ) {
        event.preventDefault();
        void handleTabComplete();
        return false;
      }
      return true;
    });

    resizeObserver = new ResizeObserver(() => {
      if (!visible) return;
      scheduleFitAndResize();
    });
    resizeObserver.observe(hostEl);

    if (visible) {
      void spawnSession();
    }

    return () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    };
  });

  $effect(() => {
    settings.terminalFontSize;
    compact;
    settings.terminalScrollback;
    settings.terminalCursorStyle;
    settings.terminalGpuAcceleration;
    settings.theme;
    settings.accent;
    applyTerminalSettings();
    scheduleFitAndResize();
  });

  $effect(() => {
    settings.terminalCopyOnSelect;
    syncCopyOnSelect();
  });

  $effect(() => {
    bellEnabled = settings.terminalBell;
  });

  $effect(() => {
    if (!mounted || !term) return;

    if (sessionActive) {
      const gen = sessionLifecycleGen;
      void (async () => {
        if (!terminalId) await spawnSession();
        if (sessionActive && !terminalId && gen === sessionLifecycleGen) {
          await spawnSession();
        }
      })();
      return;
    }

    sessionLifecycleGen += 1;
    void teardownSession(true);
  });

  $effect(() => {
    visible;
    sessionActive;
    syncXtermFocus();
  });

  $effect(() => {
    if (!mounted || !term || !visible || !terminalId || !hostEl) return;
    let cancelled = false;
    const run = async () => {
      await waitForHostLayout(hostEl!);
      if (!cancelled) await fitAndResize({ forceFit: true, forcePty: false });
    };
    requestAnimationFrame(() => requestAnimationFrame(() => void run()));
    return () => {
      cancelled = true;
    };
  });

  let lastInjectToken = 0;
  let injectInFlight = false;
  let pendingInjectToken = 0;

  async function runInjectedCommand(cmd: string, id: number): Promise<boolean> {
    const data = cmd.endsWith("\r") || cmd.endsWith("\n") ? cmd : `${cmd}\r`;
    try {
      await writeTerminal({ id, data });
      inputBuffer = "";
      return true;
    } catch (error) {
      console.error("Terminal inject failed:", error);
      return false;
    }
  }

  async function runInjectSequence(
    cmd: string,
    prompt: string | null,
    token: number,
    generation: number,
  ) {
    if (injectInFlight || token === lastInjectToken) return;

    const id = terminalId;
    if (!id || !sessionActive || generation !== spawnGeneration) return;

    injectInFlight = true;
    try {
      if (hostEl) await waitForHostLayout(hostEl);
      const deadline = Date.now() + 3000;
      while (!initialResizeDone && Date.now() < deadline) {
        await fitAndResize({ forceFit: true, forcePty: true });
        if (!initialResizeDone) await new Promise((r) => setTimeout(r, 50));
      }
      await fitAndResize({ forceFit: true, forcePty: false });
      if (!(await runInjectedCommand(cmd, id))) return;

      const trimmed = prompt?.trim();
      if (trimmed) {
        await new Promise((resolve) => setTimeout(resolve, promptDelayMs));
        if (!terminalId || terminalId !== id || !sessionActive || generation !== spawnGeneration) {
          return;
        }
        await writeTerminal({ id, data: `${trimmed}\r` });
        inputBuffer = "";
      }

      lastInjectToken = token;
    } finally {
      injectInFlight = false;
      if (pendingInjectToken > lastInjectToken) {
        const next = pendingInjectToken;
        pendingInjectToken = 0;
        const cmd = injectCommand?.trim();
        if (cmd && next !== lastInjectToken) {
          void runInjectSequence(cmd, injectPrompt ?? null, next, spawnGeneration);
        }
      }
    }
  }

  $effect(() => {
    const token = injectToken;
    const cmd = untrack(() => injectCommand?.trim());
    const prompt = untrack(() => injectPrompt);
    const restart = restartBeforeInject;
    if (!token || token === lastInjectToken || !cmd || !sessionActive) return;
    if (injectInFlight) {
      pendingInjectToken = Math.max(pendingInjectToken, token);
      return;
    }

    const run = async () => {
      let generation = spawnGeneration;
      if (restart && lastInjectToken > 0) {
        await restartSession();
        generation = spawnGeneration;
      }
      await runInjectSequence(cmd, prompt ?? null, token, generation);
    };

    if (terminalId) {
      void run();
      return;
    }

    const generation = spawnGeneration;
    const interval = setInterval(() => {
      if (terminalId && spawnGeneration === generation) {
        clearInterval(interval);
        void run();
      }
    }, 50);
    const timeout = setTimeout(() => clearInterval(interval), 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  });

  let previousShell = "";
  let previousCwd: string | null | undefined;

  $effect(() => {
    const shell = settings.terminalShellPath;
    if (!mounted || !visible) {
      previousShell = shell;
      return;
    }
    if (previousShell && previousShell !== shell && terminalId) {
      void restartSession();
    }
    previousShell = shell;
  });

  $effect(() => {
    const nextCwd = cwd;
    if (!mounted || !term || !visible) {
      previousCwd = nextCwd;
      return;
    }

    if (previousCwd !== undefined && previousCwd !== nextCwd && terminalId) {
      void restartSession();
    }

    previousCwd = nextCwd;
  });

  onDestroy(() => {
    spawnGeneration += 1;
    resizeObserver?.disconnect();
    if (hostEl) hostEl.onmouseup = null;
    void teardownSession(true);
    term?.dispose();
    term = null;
    fitAddon = null;
  });
</script>

<div class="terminal-wrap" class:compact>
  <div class="terminal-host" data-terminal-root class:has-helper={helperVisible && enableHelper} bind:this={hostEl}></div>
  {#if enableHelper}
    <TerminalHelper input={inputBuffer} {suggestions} onApply={(item) => void applySuggestion(item)} />
  {/if}
</div>

<style>
  .terminal-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .terminal-host {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 6px 8px;
    border-top: 1px solid var(--border);
    box-sizing: border-box;
  }

  .terminal-wrap.compact .terminal-host {
    padding: 6px 8px;
  }

  .terminal-host.has-helper {
    padding-bottom: 100px;
  }

  :global(.terminal-host .xterm) {
    height: 100%;
    width: 100%;
    padding: 0;
  }

  :global(.terminal-host .xterm-viewport) {
    overflow-y: auto !important;
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar) transparent;
  }

  :global(.terminal-host .xterm-viewport::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.terminal-host .xterm-viewport::-webkit-scrollbar-thumb) {
    background: var(--scrollbar);
    border-radius: 4px;
  }

  :global(.terminal-host .xterm-viewport::-webkit-scrollbar-thumb:hover) {
    background: var(--scrollbar-hover);
  }
</style>