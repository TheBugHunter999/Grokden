<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { emitViewportSync } from "$lib/viewport-sync";

  let {
    locked = false,
  }: {
    /** Setup wizard: centered, no drag, no maximize. */
    locked?: boolean;
  } = $props();

  let maximized = $state(false);
  let scaleFactor = $state(1);
  let appWindow: ReturnType<typeof getCurrentWindow> | null = null;

  onMount(() => {
    let unlistenResized: (() => void) | undefined;
    let unlistenScale: (() => void) | undefined;
    let unlistenFocus: (() => void) | undefined;
    void (async () => {
      try {
        appWindow = getCurrentWindow();
        maximized = await appWindow.isMaximized();
        scaleFactor = await appWindow.scaleFactor();
        unlistenResized = await appWindow.onResized(async () => {
          if (appWindow) maximized = await appWindow.isMaximized();
          emitViewportSync();
        });
        unlistenScale = await appWindow.onScaleChanged(({ payload }) => {
          scaleFactor = payload.scaleFactor;
          emitViewportSync();
        });
        unlistenFocus = await appWindow.onFocusChanged(() => {
          emitViewportSync();
        });
      } catch {
        /* browser dev */
      }
    })();
    return () => {
      unlistenResized?.();
      unlistenScale?.();
      unlistenFocus?.();
    };
  });

  function minimize() {
    void appWindow?.minimize();
  }

  async function toggleMaximize() {
    if (locked) return;
    await appWindow?.toggleMaximize();
    if (appWindow) maximized = await appWindow.isMaximized();
    emitViewportSync();
  }

  function close() {
    void appWindow?.close();
  }

  function onDragMouseDown(e: MouseEvent) {
    if (locked || !appWindow || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    if (e.detail === 2) {
      void toggleMaximize();
      return;
    }
    void appWindow.startDragging();
  }
</script>

<div
  class="window-chrome"
  class:locked
  class:maximized
  style:--scale-factor={scaleFactor}
  data-tauri-drag-region={locked ? undefined : true}
  onmousedown={onDragMouseDown}
>
  <div class="chrome-drag" data-tauri-drag-region={locked ? undefined : true}></div>
  <div class="chrome-controls">
    <button type="button" class="chrome-btn" aria-label="Minimize" onclick={minimize}>
      <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5h10" stroke="currentColor" stroke-width="1" /></svg>
    </button>
    {#if !locked}
      <button
        type="button"
        class="chrome-btn"
        aria-label={maximized ? "Restore" : "Maximize"}
        onclick={toggleMaximize}
      >
        {#if maximized}
          <svg class="icon-restore" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 0h6v2H4v6H2V0z" fill="none" stroke="currentColor" stroke-width="1" />
            <path d="M4 2h6v8H4V2z" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        {:else}
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        {/if}
      </button>
    {/if}
    <button type="button" class="chrome-btn close" aria-label="Close" onclick={close}>
      <svg viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</div>

<style>
  .window-chrome {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 32px;
    min-height: 32px;
    max-height: 32px;
    flex-shrink: 0;
    background: var(--panel-solid);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-app-region: drag;
    app-region: drag;
    z-index: 20;
  }

  .window-chrome.locked {
    -webkit-app-region: no-drag;
    app-region: no-drag;
    cursor: default;
  }

  .chrome-drag {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    -webkit-app-region: drag;
    app-region: drag;
  }

  .window-chrome.locked .chrome-drag {
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .chrome-controls {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: 32px;
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .chrome-btn {
    flex: 0 0 46px;
    width: 46px;
    min-width: 46px;
    max-width: 46px;
    height: 32px;
    min-height: 32px;
    max-height: 32px;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-mute);
    transition: background 0.12s, color 0.12s;
  }

  .chrome-btn svg {
    width: 10px;
    height: 10px;
    display: block;
    flex-shrink: 0;
    pointer-events: none;
  }

  .chrome-btn .icon-restore {
    width: 10px;
    height: 10px;
  }

  .chrome-btn:hover {
    background: var(--hover);
    color: var(--text);
  }

  .chrome-btn.close:hover {
    background: var(--danger);
    color: #fff;
  }

  .window-chrome.maximized .chrome-controls {
    padding-right: max(env(titlebar-area-x, 0px), calc((var(--scale-factor, 1) - 1) * 12px), 12px);
  }
</style>