import { invoke } from "@tauri-apps/api/core";

let chain: Promise<void> = Promise.resolve();
let latestPercent = 100;

async function invokeTransparency(percent: number): Promise<void> {
  await invoke("set_window_transparency", { percent });
}

/** Serialized native transparency updates — latest value always wins. */
export function applyWindowTransparency(percent: number): Promise<void> {
  latestPercent = percent;
  chain = chain.then(async () => {
    const target = latestPercent;
    try {
      await invokeTransparency(target);
    } catch {
      /* browser dev */
    }
  });
  return chain;
}

function applyThemeVarsToRoot(themeStyle: string): void {
  const el = document.documentElement;
  for (const chunk of themeStyle.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon <= 0) continue;
    const key = chunk.slice(0, colon).trim();
    const value = chunk.slice(colon + 1).trim();
    if (key.startsWith("--")) {
      el.style.setProperty(key, value);
    }
  }
}

function applyGlassDom(glass: boolean, themeStyle: string): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  html.classList.toggle("glass-window", glass);
  html.classList.toggle("opaque-window", !glass);
  body.classList.toggle("glass-window", glass);
  body.classList.toggle("opaque-window", !glass);
  applyThemeVarsToRoot(themeStyle);
}

/**
 * Keep native and DOM glass state in sync without flicker.
 * Opaque (100%): native layer commits before CSS removes glass.
 * Glass (<100%): CSS prepares transparent roots before native acrylic applies.
 */
export async function syncWindowGlass(percent: number, themeStyle: string): Promise<void> {
  const glass = percent < 100;
  if (!glass) {
    await applyWindowTransparency(percent);
    applyGlassDom(false, themeStyle);
  } else {
    applyGlassDom(true, themeStyle);
    await applyWindowTransparency(percent);
  }
}