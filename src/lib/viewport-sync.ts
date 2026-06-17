import { getCurrentWindow } from "@tauri-apps/api/window";

export const VIEWPORT_SYNC_EVENT = "grokden:viewport-sync";

const WORK_AREA_HEIGHT_SLACK = 8;

let rafPending = false;
let burstTimer: ReturnType<typeof setTimeout> | undefined;
let nativeFullscreenActive = false;

export function setNativeFullscreen(active: boolean): void {
  nativeFullscreenActive = active;
}

/** Prefer visualViewport / inner* — client* can mirror a stale fixed shell after fullscreen. */
export function readViewportSize(): { width: number; height: number } {
  if (typeof document === "undefined") {
    return { width: 0, height: 0 };
  }
  const vv = window.visualViewport;
  let width = vv?.width ?? window.innerWidth;
  let height = vv?.height ?? window.innerHeight;

  if (nativeFullscreenActive && typeof screen !== "undefined") {
    const screenW = screen.width;
    const screenH = screen.height;
    if (
      height <= screenH - WORK_AREA_HEIGHT_SLACK ||
      width <= screenW - WORK_AREA_HEIGHT_SLACK
    ) {
      width = screenW;
      height = screenH;
    }
  }

  return { width, height };
}

export function syncViewportSize(): void {
  if (typeof document === "undefined") return;
  const { width, height } = readViewportSize();
  const root = document.documentElement;
  root.style.setProperty("--app-width", `${width}px`);
  root.style.setProperty("--app-height", `${height}px`);
  root.style.setProperty("--viewport-sync", `${Date.now()}`);
}

export function scheduleViewportSync(): void {
  if (rafPending || typeof document === "undefined") return;
  rafPending = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      rafPending = false;
      syncViewportSize();
    });
  });
}

/** WebView2 can report the old height for several frames after maximize/fullscreen. */
export function scheduleViewportSyncBurst(): void {
  if (burstTimer) clearTimeout(burstTimer);
  const delays = [0, 48, 120, 280, 500];
  let i = 0;
  const tick = () => {
    scheduleViewportSync();
    i += 1;
    if (i < delays.length) {
      burstTimer = setTimeout(tick, delays[i]! - delays[i - 1]!);
    } else {
      burstTimer = undefined;
    }
  };
  tick();
}

export function emitViewportSync(): void {
  scheduleViewportSyncBurst();
  window.dispatchEvent(new CustomEvent(VIEWPORT_SYNC_EVENT));
}

async function refreshNativeFullscreenFlag(): Promise<void> {
  try {
    setNativeFullscreen(await getCurrentWindow().isFullscreen());
  } catch {
    setNativeFullscreen(false);
  }
}

export async function bindViewportSync(onSync?: () => void): Promise<() => void> {
  await refreshNativeFullscreenFlag();
  syncViewportSize();

  const handle = () => {
    scheduleViewportSyncBurst();
    onSync?.();
  };

  const onResize = () => {
    void refreshNativeFullscreenFlag().then(handle);
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") onResize();
  };

  window.addEventListener("resize", onResize);
  window.addEventListener(VIEWPORT_SYNC_EVENT, onResize);
  document.addEventListener("visibilitychange", onVisibility);
  window.visualViewport?.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("scroll", onResize);

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(onResize)
      : null;
  ro?.observe(document.documentElement);
  if (document.body) ro?.observe(document.body);

  let unlistenResized: (() => void) | undefined;
  let unlistenScale: (() => void) | undefined;
  let unlistenFocus: (() => void) | undefined;

  try {
    const win = getCurrentWindow();
    unlistenResized = await win.onResized(() => onResize());
    unlistenScale = await win.onScaleChanged(() => onResize());
    unlistenFocus = await win.onFocusChanged(() => onResize());
  } catch {
    /* browser dev */
  }

  return () => {
    if (burstTimer) clearTimeout(burstTimer);
    window.removeEventListener("resize", onResize);
    window.removeEventListener(VIEWPORT_SYNC_EVENT, onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    window.visualViewport?.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("scroll", onResize);
    ro?.disconnect();
    unlistenResized?.();
    unlistenScale?.();
    unlistenFocus?.();
  };
}