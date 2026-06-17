import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emitViewportSync, setNativeFullscreen } from "$lib/viewport-sync";

export const DEFAULT_WINDOW_WIDTH = 1080;
export const DEFAULT_WINDOW_HEIGHT = 720;

export async function prepareWizardWindow(): Promise<void> {
  try {
    await invoke("prepare_wizard_window");
  } catch {
    // Browser dev fallback.
  }
}

export async function transitionToWorkspace(): Promise<void> {
  try {
    await invoke("transition_to_workspace");
  } catch {
    // Browser dev fallback.
  }
}

export async function signalAppReady(): Promise<void> {
  try {
    await invoke("app_ready");
  } catch {
    // Browser dev fallback.
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function restoreFullscreenIfRequested(enabled: boolean): Promise<void> {
  if (!enabled) return;
  try {
    const win = getCurrentWindow();
    const fs = await win.isFullscreen();
    if (!fs) await win.setFullscreen(true);
    setNativeFullscreen(await win.isFullscreen());
    emitViewportSync();
  } catch {
    setNativeFullscreen(false);
  }
}