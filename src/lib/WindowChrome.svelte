<script lang="ts">
  import { onMount } from "svelte";
  import { LogicalSize } from "@tauri-apps/api/dpi";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { emitViewportSync, setNativeFullscreen } from "$lib/viewport-sync";
  import {
    DEFAULT_WINDOW_HEIGHT,
    DEFAULT_WINDOW_WIDTH,
  } from "$lib/window-lifecycle";

  let {
    locked = false,
    menuBar,
    utilities,
    workspaceTitle,
    onSearchClick,
  }: {
    /** Setup wizard: centered, no drag, no maximize. */
    locked?: boolean;
    menuBar?: import("svelte").Snippet;
    utilities?: import("svelte").Snippet;
    workspaceTitle?: string;
    onSearchClick?: () => void;
  } = $props();

  let maximized = $state(false);
  let fullscreen = $state(false);
  let scaleFactor = $state(1);
  let appWindow: ReturnType<typeof getCurrentWindow> | null = null;

  let expanded = $derived(maximized || fullscreen);
  let showSearch = $derived(!locked && Boolean(onSearchClick));

  async function syncWindowState() {
    if (!appWindow) return;
    fullscreen = await appWindow.isFullscreen();
    maximized = await appWindow.isMaximized();
    setNativeFullscreen(fullscreen);
  }

  onMount(() => {
    let unlistenResized: (() => void) | undefined;
    let unlistenScale: (() => void) | undefined;
    let unlistenFocus: (() => void) | undefined;
    void (async () => {
      try {
        appWindow = getCurrentWindow();
        await syncWindowState();
        scaleFactor = await appWindow.scaleFactor();
        unlistenResized = await appWindow.onResized(async () => {
          await syncWindowState();
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

  async function restoreFromFullscreen() {
    if (!appWindow) return;
    await appWindow.setFullscreen(false);
    if (await appWindow.isMaximized()) {
      await appWindow.unmaximize();
    }
    await appWindow.setSize(new LogicalSize(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT));
    await appWindow.center();
  }

  async function toggleMaximize() {
    if (locked || !appWindow) return;
    if (await appWindow.isFullscreen()) {
      await restoreFromFullscreen();
    } else {
      await appWindow.toggleMaximize();
    }
    await syncWindowState();
    emitViewportSync();
  }

  function close() {
    void appWindow?.close();
  }

  function onDragMouseDown(e: MouseEvent) {
    if (locked || !appWindow || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [role='button'], [role='group']")) return;
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
  class:maximized={expanded}
  role="presentation"
  style:--scale-factor={scaleFactor}
  data-tauri-drag-region={locked ? undefined : true}
  onmousedown={onDragMouseDown}
>
  {#if workspaceTitle}
    <div class="chrome-left" data-tauri-drag-region={locked ? undefined : true}>
      <span class="workspace-title">{workspaceTitle}</span>
    </div>
  {/if}

  {#if menuBar}
    <div class="chrome-menu-bar">
      {@render menuBar()}
    </div>
  {/if}

  <div class="chrome-drag" data-tauri-drag-region={locked ? undefined : true}></div>

  {#if utilities}
    <div class="chrome-utilities">
      {@render utilities()}
    </div>
  {/if}

  {#if showSearch}
    <div class="chrome-actions">
      {#if showSearch}
        <button
          type="button"
          class="chrome-search-btn"
          aria-label="Search"
          onclick={() => onSearchClick?.()}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" stroke-width="1.25" />
            <path d="M10.2 10.2L13.5 13.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
          </svg>
        </button>
      {/if}
    </div>
  {/if}

  <div class="chrome-controls">
    <button type="button" class="chrome-btn" aria-label="Minimize" onclick={minimize}>
      <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 5.5h8" stroke="currentColor" stroke-width="1" /></svg>
    </button>
    {#if !locked}
      <button
        type="button"
        class="chrome-btn"
        aria-label={fullscreen ? "Exit fullscreen" : maximized ? "Restore" : "Maximize"}
        onclick={toggleMaximize}
      >
        {#if expanded}
          <svg class="icon-restore" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M3 1.5h5.5v5.5H7.3V2.7H3V1.5z" fill="currentColor" />
            <path d="M1.5 3h5.5v5.5H1.5V3z" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        {:else}
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1" />
          </svg>
        {/if}
      </button>
    {/if}
    <button type="button" class="chrome-btn close" aria-label="Close" onclick={close}>
      <svg viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.05" stroke-linecap="square" />
      </svg>
    </button>
  </div>
</div>

<style>
  .window-chrome {
    position: relative;
    display: flex;
    align-items: center;
    height: var(--grok-chrome-h);
    min-height: var(--grok-chrome-h);
    max-height: var(--grok-chrome-h);
    flex-shrink: 0;
    background: var(--grok-glass-chrome);
    border-bottom: 1px solid var(--grok-border);
    box-shadow: var(--grok-shadow-chrome);
    backdrop-filter: blur(var(--grok-blur-chrome)) saturate(var(--grok-saturate));
    -webkit-backdrop-filter: blur(var(--grok-blur-chrome)) saturate(var(--grok-saturate));
    color: var(--grok-text-secondary);
    font-family: var(--grok-font-sans);
    user-select: none;
    -webkit-app-region: drag;
    app-region: drag;
    z-index: var(--grok-z-sticky);
  }

  .window-chrome.locked {
    -webkit-app-region: no-drag;
    app-region: no-drag;
    cursor: default;
  }

  .chrome-left {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: 100%;
    padding-left: var(--grok-space-6);
    padding-right: var(--grok-space-4);
    min-width: 0;
    -webkit-app-region: drag;
    app-region: drag;
  }

  .window-chrome.locked .chrome-left {
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .workspace-title {
    font-size: var(--grok-font-size-sm);
    font-weight: var(--grok-font-weight-medium);
    line-height: var(--grok-line-height-tight);
    color: var(--grok-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
  }

  .chrome-menu-bar {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: var(--grok-chrome-h);
    -webkit-app-region: no-drag;
    app-region: no-drag;
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

  .chrome-utilities {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: var(--grok-chrome-h);
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .chrome-actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: var(--grok-space-3);
    height: var(--grok-chrome-h);
    padding: 0 var(--grok-space-4);
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .env-mode-switch {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: var(--grok-space-1);
    border-radius: var(--grok-radius-full);
    border: 1px solid var(--grok-border);
    background: var(--grok-surface-2);
    gap: var(--grok-space-1);
  }

  .env-mode-seg {
    height: 22px;
    padding: 0 var(--grok-space-5);
    border: none;
    border-radius: var(--grok-radius-full);
    background: transparent;
    color: var(--grok-text-muted);
    font-size: var(--grok-font-size-xs);
    font-weight: var(--grok-font-weight-medium);
    line-height: 1;
    cursor: default;
    transition:
      background var(--grok-duration-fast) var(--grok-ease-out),
      color var(--grok-duration-fast) var(--grok-ease-out);
  }

  .env-mode-seg:hover {
    color: var(--grok-text-secondary);
    background: var(--grok-hover);
  }

  .env-mode-seg.active {
    color: var(--grok-text);
    background: var(--grok-surface-3);
    box-shadow: var(--grok-shadow-inset);
  }

  .chrome-search-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--grok-radius-md);
    background: transparent;
    color: var(--grok-text-muted);
    cursor: default;
    transition:
      background var(--grok-duration-fast) var(--grok-ease-out),
      color var(--grok-duration-fast) var(--grok-ease-out);
  }

  .chrome-search-btn svg {
    width: 14px;
    height: 14px;
    display: block;
    pointer-events: none;
  }

  .chrome-search-btn:hover {
    background: var(--grok-hover);
    color: var(--grok-text);
  }

  .chrome-controls {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: var(--grok-chrome-h);
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .chrome-btn {
    flex: 0 0 46px;
    width: 46px;
    min-width: 46px;
    max-width: 46px;
    height: var(--grok-chrome-h);
    min-height: var(--grok-chrome-h);
    max-height: var(--grok-chrome-h);
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    cursor: default;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--grok-text-secondary);
    transition:
      background var(--grok-duration-fast) var(--grok-ease-out),
      color var(--grok-duration-fast) var(--grok-ease-out);
  }

  .chrome-btn svg {
    width: 10px;
    height: 10px;
    display: block;
    flex-shrink: 0;
    pointer-events: none;
    shape-rendering: crispEdges;
  }

  .chrome-btn .icon-restore {
    width: 10px;
    height: 10px;
  }

  .chrome-btn:hover {
    background: var(--grok-hover);
    color: var(--grok-text);
  }

  .chrome-btn.close:hover {
    background: var(--grok-danger);
    color: var(--grok-text-inverse);
  }

  .window-chrome.maximized .chrome-controls {
    padding-right: max(env(titlebar-area-x, 0px), calc((var(--scale-factor, 1) - 1) * 12px), 12px);
  }
</style>