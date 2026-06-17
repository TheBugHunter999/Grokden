import { getCurrentWindow } from "@tauri-apps/api/window";

export const VIEWPORT_SYNC_EVENT = "grokden:viewport-sync";

let rafPending = false;
let burstTimer: ReturnType<typeof setTimeout> | undefined;

/** Read the live webview client box (more reliable than stale innerHeight after fullscreen). */
export function readViewportSize(): { width: number; height: number } {
  if (typeof document === "undefined") {
    return { width: 0, height: 0 };
  }
  const root = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport;
  const width = Math.max(
    root.clientWidth,
    body?.clientWidth ?? 0,
    vv?.width ?? 0,
    window.innerWidth,
  );
  const height = Math.max(
    root.clientHeight,
    body?.clientHeight ?? 0,
    vv?.height ?? 0,
    window.innerHeight,
  );
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
  const delays = [0, 48, 120, 280];
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

export async function bindViewportSync(onSync?: () => void): Promise<() => void> {
  syncViewportSize();

  const handle = () => {
    scheduleViewportSyncBurst();
    onSync?.();
  };

  const onResize = () => handle();
  const onVisibility = () => {
    if (document.visibilityState === "visible") handle();
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
    unlistenResized = await win.onResized(() => handle());
    unlistenScale = await win.onScaleChanged(() => handle());
    unlistenFocus = await win.onFocusChanged(() => handle());
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