<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let maximized = $state(false);
  let appWindow: ReturnType<typeof getCurrentWindow> | null = null;

  onMount(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        appWindow = getCurrentWindow();
        maximized = await appWindow.isMaximized();
        unlisten = await appWindow.onResized(async () => {
          if (appWindow) maximized = await appWindow.isMaximized();
        });
      } catch {
        /* browser dev */
      }
    })();
    return () => unlisten?.();
  });

  function minimize() {
    void appWindow?.minimize();
  }

  function toggleMaximize() {
    void appWindow?.toggleMaximize();
  }

  function close() {
    void appWindow?.close();
  }

  function onDragMouseDown(e: MouseEvent) {
    if (!appWindow || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    if (e.detail === 2) {
      void appWindow.toggleMaximize();
      return;
    }
    void appWindow.startDragging();
  }
</script>

<div class="window-chrome" data-tauri-drag-region onmousedown={onDragMouseDown}>
  <div class="chrome-drag" data-tauri-drag-region></div>
  <div class="chrome-controls">
    <button type="button" class="chrome-btn" aria-label="Minimize" onclick={minimize}>
      <span aria-hidden="true"></span>
    </button>
    <button type="button" class="chrome-btn" aria-label={maximized ? "Restore" : "Maximize"} onclick={toggleMaximize}>
      <span class:restore={maximized} aria-hidden="true"></span>
    </button>
    <button type="button" class="chrome-btn close" aria-label="Close" onclick={close}>
      <span aria-hidden="true"></span>
    </button>
  </div>
</div>

<style>
  .window-chrome {
    position: relative;
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
    height: 32px;
    flex-shrink: 0;
    background: var(--panel-solid);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-app-region: drag;
    app-region: drag;
  }
  .chrome-drag {
    flex: 1;
    min-width: 0;
    -webkit-app-region: drag;
    app-region: drag;
  }
  .chrome-controls {
    display: flex;
    align-items: stretch;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
  .chrome-btn {
    width: 46px;
    height: 32px;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-mute);
    transition: background 0.12s, color 0.12s;
  }
  .chrome-btn:hover {
    background: var(--hover);
    color: var(--text);
  }
  .chrome-btn.close:hover {
    background: var(--danger);
    color: #fff;
  }
  .chrome-btn span {
    display: block;
    width: 10px;
    height: 1px;
    background: currentColor;
    position: relative;
  }
  .chrome-btn:nth-child(2) span {
    width: 9px;
    height: 9px;
    background: transparent;
    border: 1px solid currentColor;
    box-sizing: border-box;
  }
  .chrome-btn:nth-child(2) span.restore {
    width: 8px;
    height: 8px;
    border: none;
    background:
      linear-gradient(currentColor, currentColor) 2px 0 / 6px 1px no-repeat,
      linear-gradient(currentColor, currentColor) 0 2px / 1px 6px no-repeat,
      linear-gradient(currentColor, currentColor) 0 0 / 8px 8px no-repeat;
    background-color: transparent;
    box-shadow: inset 0 0 0 1px currentColor;
    transform: translate(2px, -2px);
  }
  .chrome-btn.close span {
    width: 10px;
    height: 10px;
    background: none;
  }
  .chrome-btn.close span::before,
  .chrome-btn.close span::after {
    content: "";
    position: absolute;
    left: 0;
    top: 4px;
    width: 10px;
    height: 1px;
    background: currentColor;
  }
  .chrome-btn.close span::before { transform: rotate(45deg); }
  .chrome-btn.close span::after { transform: rotate(-45deg); }
</style>