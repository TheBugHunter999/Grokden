import { invoke } from "@tauri-apps/api/core";
import { glassSurfaceMix, type GlassSurfaceMix } from "./settings-runtime";

const GLASS_VAR_KEYS = [
  "--glass-strength",
  "--glass-blur",
  "--glass-chrome-bg",
  "--glass-panel-bg",
  "--glass-editor-bg",
  "--glass-rail-bg",
  "--glass-border",
  "--glass-shadow",
] as const;

export type GlassDebugState = {
  percent: number;
  cssAlphas: GlassSurfaceMix | null;
  effect: string;
};

type NativeTransparencyResult = {
  effect: string;
  percent: number;
};

const DEFAULT_DEBUG: GlassDebugState = {
  percent: 100,
  cssAlphas: null,
  effect: "opaque",
};

let chain: Promise<void> = Promise.resolve();
let latestPercent = 100;
let glassDebugState: GlassDebugState = { ...DEFAULT_DEBUG };

export function getGlassDebugState(): Readonly<GlassDebugState> {
  return glassDebugState;
}

function setGlassDebugState(
  percent: number,
  cssAlphas: GlassSurfaceMix | null,
  native: NativeTransparencyResult | null,
): void {
  glassDebugState = {
    percent,
    cssAlphas,
    effect: native?.effect ?? (percent >= 100 ? "opaque" : "css-blur"),
  };
}

async function invokeTransparency(percent: number): Promise<NativeTransparencyResult | null> {
  try {
    return await invoke<NativeTransparencyResult>("set_window_transparency", { percent });
  } catch {
    return null;
  }
}

/** Serialized native transparency updates — latest value always wins. */
export function applyWindowTransparency(
  percent: number,
): Promise<NativeTransparencyResult | null> {
  latestPercent = percent;
  const pending = chain.then(async (): Promise<NativeTransparencyResult | null> => {
    const target = latestPercent;
    return invokeTransparency(target);
  });
  chain = pending.then(() => {});
  return pending;
}

function applyGlassVarsToRoot(glassStyle: string): void {
  const el = document.documentElement;
  for (const chunk of glassStyle.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon <= 0) continue;
    const key = chunk.slice(0, colon).trim();
    const value = chunk.slice(colon + 1).trim();
    if (key.startsWith("--glass-")) {
      el.style.setProperty(key, value);
    }
  }
}

function clearGlassVarsFromRoot(): void {
  const el = document.documentElement;
  for (const key of GLASS_VAR_KEYS) {
    el.style.removeProperty(key);
  }
}

function applyGlassDom(glass: boolean, glassStyle: string): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  html.classList.toggle("glass-window", glass);
  html.classList.toggle("opaque-window", !glass);
  body.classList.toggle("glass-window", glass);
  body.classList.toggle("opaque-window", !glass);
  if (glass && glassStyle) {
    applyGlassVarsToRoot(glassStyle);
  } else {
    clearGlassVarsFromRoot();
  }
}

/**
 * Keep window background and DOM glass state in sync.
 * Opaque (100%): native opaque webview bg before CSS removes glass.
 * Glass (<100%): transparent webview + CSS backdrop-filter frosted panels.
 */
export async function syncWindowGlass(percent: number, glassStyle: string): Promise<void> {
  const glass = percent < 100;
  const cssAlphas = glass ? glassSurfaceMix(percent) : null;

  if (!glass) {
    const native = await applyWindowTransparency(percent);
    applyGlassDom(false, glassStyle);
    setGlassDebugState(percent, null, native);
  } else {
    applyGlassDom(true, glassStyle);
    const native = await applyWindowTransparency(percent);
    setGlassDebugState(percent, cssAlphas, native);
  }
}