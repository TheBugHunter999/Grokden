import type { AppSettings } from "$lib/editor-utils";
import { migrateLegacyBrandingStorage } from "$lib/branding";

export type OnboardingStepId =
  | "welcome"
  | "setup"
  | "theme"
  | "agent"
  | "editor"
  | "privacy"
  | "complete";

export type OnboardingDraft = {
  step: OnboardingStepId;
  importSource: AppSettings["importSource"];
  theme: string;
  agentModePreset: AppSettings["agentModePreset"];
  terminalExecutionPolicy: AppSettings["terminalExecutionPolicy"];
  artifactReviewPolicy: AppSettings["artifactReviewPolicy"];
  jsExecutionPolicy: AppSettings["jsExecutionPolicy"];
  keybindingPreset: string;
  vimMode: boolean;
  extensionSetupMode: AppSettings["extensionSetupMode"];
  telemetryEnabled: boolean;
  crashReportsEnabled: boolean;
  privacyImprovementConsent: boolean;
  importedExtensionCount: number;
};

const STORAGE_KEY = "Grokden.onboarding";

export const ONBOARDING_STEPS: OnboardingStepId[] = [
  "welcome",
  "setup",
  "theme",
  "agent",
  "editor",
  "privacy",
  "complete",
];

export function defaultOnboardingDraft(settings: AppSettings): OnboardingDraft {
  return {
    step: "welcome",
    importSource: settings.importSource,
    theme: settings.theme,
    agentModePreset: settings.agentModePreset,
    terminalExecutionPolicy: settings.terminalExecutionPolicy,
    artifactReviewPolicy: settings.artifactReviewPolicy,
    jsExecutionPolicy: settings.jsExecutionPolicy,
    keybindingPreset: settings.keybindingPreset,
    vimMode: settings.vimMode,
    extensionSetupMode: settings.extensionSetupMode,
    telemetryEnabled: settings.telemetryEnabled,
    crashReportsEnabled: settings.crashReportsEnabled,
    privacyImprovementConsent: settings.privacyImprovementConsent,
    importedExtensionCount: 0,
  };
}

function readStorageKey(key: string): string | null {
  migrateLegacyBrandingStorage();
  return localStorage.getItem(key);
}

export function loadOnboardingDraft(settings: AppSettings): OnboardingDraft {
  try {
    const raw = readStorageKey(STORAGE_KEY);
    if (!raw) return defaultOnboardingDraft(settings);
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return { ...defaultOnboardingDraft(settings), ...parsed };
  } catch {
    return defaultOnboardingDraft(settings);
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearOnboardingDraft(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function shouldRequireOnboarding(settings: AppSettings): boolean {
  if (settings.onboardingCompleted) return false;

  const hasSession = !!readStorageKey("Grokden.session");
  const rawSettings = readStorageKey("Grokden.settings");
  const rawOnboarding = readStorageKey(STORAGE_KEY);

  if (rawOnboarding) return true;
  if (hasSession) return false;
  if (rawSettings) {
    try {
      const parsed = JSON.parse(rawSettings) as Partial<AppSettings>;
      if (parsed.onboardingCompleted === true) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function markLegacyOnboardingComplete(settings: AppSettings): AppSettings {
  if (settings.onboardingCompleted) return settings;
  const hasSession = !!readStorageKey("Grokden.session");
  const rawOnboarding = readStorageKey(STORAGE_KEY);
  if (rawOnboarding) return settings;
  if (hasSession) {
    return { ...settings, onboardingCompleted: true };
  }
  const rawSettings = readStorageKey("Grokden.settings");
  if (rawSettings) {
    try {
      const parsed = JSON.parse(rawSettings) as Partial<AppSettings>;
      if (parsed.onboardingCompleted === true) {
        return { ...settings, onboardingCompleted: true };
      }
    } catch {
      /* ignore corrupt settings */
    }
  }
  return settings;
}