import type { AppSettings, AgentModePreset, ExecutionPolicy } from "$lib/editor-utils";
import {
  ONBOARDING_STEPS,
  type OnboardingDraft,
  type OnboardingStepId,
} from "$lib/onboarding-storage";

export function stepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function nextStep(step: OnboardingStepId): OnboardingStepId {
  const idx = stepIndex(step);
  return ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)] ?? "complete";
}

export function prevStep(step: OnboardingStepId): OnboardingStepId {
  const idx = stepIndex(step);
  return ONBOARDING_STEPS[Math.max(idx - 1, 0)] ?? "welcome";
}

export function applyAgentPreset(preset: AgentModePreset): Pick<
  AppSettings,
  | "agentModePreset"
  | "aiAgentModeDefault"
  | "terminalExecutionPolicy"
  | "artifactReviewPolicy"
  | "jsExecutionPolicy"
> {
  switch (preset) {
    case "strict":
      return {
        agentModePreset: preset,
        aiAgentModeDefault: false,
        terminalExecutionPolicy: "ask-every-time",
        artifactReviewPolicy: "ask-every-time",
        jsExecutionPolicy: "ask-every-time",
      };
    case "review-driven":
      return {
        agentModePreset: preset,
        aiAgentModeDefault: true,
        terminalExecutionPolicy: "review-first",
        artifactReviewPolicy: "review-first",
        jsExecutionPolicy: "review-first",
      };
    case "agent-driven":
      return {
        agentModePreset: preset,
        aiAgentModeDefault: true,
        terminalExecutionPolicy: "auto-run",
        artifactReviewPolicy: "review-first",
        jsExecutionPolicy: "auto-run",
      };
    case "custom":
      return {
        agentModePreset: preset,
        aiAgentModeDefault: true,
        terminalExecutionPolicy: "review-first",
        artifactReviewPolicy: "review-first",
        jsExecutionPolicy: "review-first",
      };
  }
}

export function policyLabel(policy: ExecutionPolicy): string {
  switch (policy) {
    case "ask-every-time":
      return "Ask every time";
    case "review-first":
      return "Request review";
    case "auto-run":
      return "Always proceed";
  }
}

export function draftToSettings(draft: OnboardingDraft): Partial<AppSettings> {
  const agent = applyAgentPreset(draft.agentModePreset);
  const keybindingPreset =
    draft.importSource === "vscode" || draft.importSource === "cursor"
      ? "vscode"
      : draft.keybindingPreset;

  return {
    ...agent,
    terminalExecutionPolicy:
      draft.agentModePreset === "custom"
        ? draft.terminalExecutionPolicy
        : agent.terminalExecutionPolicy,
    artifactReviewPolicy:
      draft.agentModePreset === "custom"
        ? draft.artifactReviewPolicy
        : agent.artifactReviewPolicy,
    jsExecutionPolicy:
      draft.agentModePreset === "custom"
        ? draft.jsExecutionPolicy
        : agent.jsExecutionPolicy,
    theme: draft.theme,
    importSource: draft.importSource,
    keybindingPreset,
    vimMode: draft.vimMode,
    extensionSetupMode: draft.extensionSetupMode,
    telemetryEnabled: draft.telemetryEnabled,
    crashReportsEnabled: draft.crashReportsEnabled,
    privacyImprovementConsent: draft.privacyImprovementConsent,
    windowRestoreFullscreen: false,
    onboardingCompleted: true,
  };
}

export function canAdvance(step: OnboardingStepId): boolean {
  return step !== "complete";
}