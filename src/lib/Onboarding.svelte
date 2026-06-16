<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { fade } from "svelte/transition";
  import type { AppSettings, AgentModePreset, ExecutionPolicy } from "$lib/editor-utils";
  import { buildThemeStyle } from "$lib/editor-utils";
  import {
    loadOnboardingDraft,
    saveOnboardingDraft,
    clearOnboardingDraft,
    ONBOARDING_STEPS,
    type OnboardingDraft,
    type OnboardingStepId,
  } from "$lib/onboarding-storage";
  import {
    nextStep,
    prevStep,
    stepIndex,
    applyAgentPreset,
    policyLabel,
    draftToSettings,
  } from "$lib/onboarding-machine";
  import { ONBOARDING_THEMES } from "$lib/onboarding-theme-previews";
  import {
    mapImportedSettings,
    RECOMMENDED_EXTENSIONS,
    type EditorImportResult,
  } from "$lib/settings-import";
  import { setTelemetryEnabled, recordTelemetryEvent } from "$lib/telemetry-client";
  import ReviewDrivenDemo from "$lib/ReviewDrivenDemo.svelte";
  import AgentModeDemo from "$lib/AgentModeDemo.svelte";

  type Props = {
    settings: AppSettings;
    oncomplete: (settings: AppSettings) => void;
  };

  let { settings, oncomplete }: Props = $props();

  let draft = $state<OnboardingDraft>(loadOnboardingDraft(settings));
  let importing = $state(false);
  let importError = $state("");
  let importSummary = $state("");
  let exiting = $state(false);

  const wizardSteps = ONBOARDING_STEPS.filter((s) => s !== "complete");

  const agentModes: { id: AgentModePreset; title: string; badge?: string }[] = [
    { id: "strict", title: "Strict Mode" },
    { id: "review-driven", title: "Review-driven development", badge: "RECOMMENDED" },
    { id: "agent-driven", title: "Agent-driven development" },
    { id: "custom", title: "Custom configuration" },
  ];

  const policies: ExecutionPolicy[] = ["ask-every-time", "review-first", "auto-run"];

  const wizardThemeStyle = $derived(buildThemeStyle({ ...settings, theme: draft.theme }));

  $effect(() => {
    saveOnboardingDraft(draft);
  });

  async function runImport(source: "vscode" | "cursor") {
    importing = true;
    importError = "";
    importSummary = "";
    draft.importSource = source;
    try {
      const result = await invoke<EditorImportResult>("read_editor_settings", { source });
      if (!result.found) {
        importError = `No ${source === "vscode" ? "VS Code" : "Cursor"} settings found. You can start fresh instead.`;
        return;
      }
      const partial = mapImportedSettings(source, result.settings);
      if (partial.theme) draft.theme = partial.theme;
      draft.importedExtensionCount = result.extensions.length;
      importSummary = `Imported settings from ${source === "vscode" ? "VS Code" : "Cursor"}`;
      if (result.extensions.length) importSummary += ` (${result.extensions.length} extensions detected)`;
      await recordTelemetryEvent("onboarding_import", { source, extension_count: result.extensions.length });
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error);
    } finally {
      importing = false;
    }
  }

  function selectSetup(source: AppSettings["importSource"]) {
    draft.importSource = source;
    importError = "";
    if (source === "fresh") importSummary = "";
  }

  function selectAgentMode(mode: AgentModePreset) {
    draft.agentModePreset = mode;
    const preset = applyAgentPreset(mode);
    draft.terminalExecutionPolicy = preset.terminalExecutionPolicy;
    draft.artifactReviewPolicy = preset.artifactReviewPolicy;
    draft.jsExecutionPolicy = preset.jsExecutionPolicy;
  }

  function agentCaption(mode: AgentModePreset): string {
    switch (mode) {
      case "strict": return "The agent will ask before every action.";
      case "review-driven": return "The agent will frequently ask for review.";
      case "agent-driven": return "The agent runs with fewer checkpoints.";
      case "custom": return "Configure policies to match your workflow.";
    }
  }

  async function finish() {
    exiting = true;
    await new Promise((r) => setTimeout(r, 320));
    const merged = { ...settings, ...draftToSettings(draft) };
    await setTelemetryEnabled(merged.telemetryEnabled);
    if (merged.telemetryEnabled) {
      await recordTelemetryEvent("onboarding_completed", {
        agent_mode: merged.agentModePreset,
        import_source: merged.importSource,
        theme: merged.theme,
      });
    }
    clearOnboardingDraft();
    oncomplete(merged);
  }

  async function goNext() {
    if (draft.step === "privacy") {
      await finish();
      return;
    }
    draft.step = nextStep(draft.step);
  }

  function goBack() {
    draft.step = prevStep(draft.step);
  }

  function stepHeading(step: OnboardingStepId): string {
    switch (step) {
      case "welcome": return "Welcome to Grokden";
      case "setup": return "Choose setup flow";
      case "theme": return "Select Theme";
      case "agent": return "How do you want to use the Grokden agent?";
      case "editor": return "Configure Your Editor";
      case "privacy": return "Security Notice & Data Use";
      default: return "Grokden";
    }
  }

  function stepSubtitle(step: OnboardingStepId): string {
    switch (step) {
      case "setup": return "Start fresh or import settings from another IDE";
      case "agent": return "Select one of the options below.";
      case "editor": return "Configure your editor settings below.";
      default: return "";
    }
  }
</script>

<div class="wizard" class:exiting style={wizardThemeStyle}>
  <div class="scenic" aria-hidden="true"></div>

  <button type="button" class="help-link">Help</button>

  <div class="wizard-body" class:split={draft.step === "agent"}>
    <div class="content" class:centered={draft.step === "welcome" || draft.step === "privacy" || draft.step === "setup" || draft.step === "theme" || draft.step === "editor"}>
      {#key draft.step}
        <div class="step" in:fade={{ duration: 220, delay: 130 }} out:fade={{ duration: 130 }}>
          {#if draft.step === "welcome"}
            <div class="welcome-hero">
              <div class="hero-glow"></div>
              <img class="hero-logo" src="/favicon.png" alt="" width="88" height="88" />
              <h1>{stepHeading(draft.step)}</h1>
              <p class="hero-sub">Your desktop workspace for Grok CLI — editor, terminals, and parallel agents.</p>
            </div>
          {:else}
            <h1 class:compact={draft.step === "agent"}>{stepHeading(draft.step)}</h1>
            {#if stepSubtitle(draft.step)}
              <p class="subtitle">{stepSubtitle(draft.step)}</p>
            {/if}

            {#if draft.step === "setup"}
              <div class="setup-stack">
                <button type="button" class="setup-opt" class:selected={draft.importSource === "vscode"} disabled={importing} onclick={() => { selectSetup("vscode"); void runImport("vscode"); }}>
                  Import from VS Code
                </button>
                <button type="button" class="setup-opt" class:selected={draft.importSource === "cursor"} disabled={importing} onclick={() => { selectSetup("cursor"); void runImport("cursor"); }}>
                  Import from Cursor
                </button>
                <button type="button" class="setup-opt" class:selected={draft.importSource === "fresh"} onclick={() => selectSetup("fresh")}>
                  Start fresh
                </button>
              </div>
              {#if importing}<p class="meta-msg">Reading editor settings…</p>{/if}
              {#if importSummary}<p class="meta-msg ok">{importSummary}</p>{/if}
              {#if importError}<p class="meta-msg err">{importError}</p>{/if}

            {:else if draft.step === "theme"}
              <div class="theme-row">
                {#each ONBOARDING_THEMES as t}
                  <button type="button" class="theme-opt" class:selected={draft.theme === t.id} onclick={() => (draft.theme = t.id)}>
                    <div class="mini-ide" style:--frame={t.frame} style:--side={t.sidebar} style:--editor={t.editor} style:--accent={t.accent}>
                      <div class="mi-bar"></div>
                      <div class="mi-side"></div>
                      <div class="mi-editor">
                        {#each t.lines as color, i}
                          <span class="mi-line" style:width="{55 + i * 12}%" style:background={color}></span>
                        {/each}
                      </div>
                    </div>
                    <span class="theme-name">{t.label}</span>
                  </button>
                {/each}
              </div>

            {:else if draft.step === "agent"}
              <div class="agent-list">
                {#each agentModes as mode}
                  <button type="button" class="agent-opt" class:selected={draft.agentModePreset === mode.id} onclick={() => selectAgentMode(mode.id)}>
                    <span class="radio" class:checked={draft.agentModePreset === mode.id}></span>
                    <span class="agent-label">{mode.title}</span>
                    {#if mode.badge}<span class="rec-badge">{mode.badge}</span>{/if}
                  </button>
                {/each}
              </div>

            {:else if draft.step === "editor"}
              <div class="editor-card">
                <div class="editor-row">
                  <div class="editor-meta">
                    <strong>Keybindings</strong>
                    <span>Configure your keybindings.</span>
                  </div>
                  <div class="seg">
                    <button type="button" class:on={!draft.vimMode} onclick={() => { draft.vimMode = false; draft.keybindingPreset = draft.importSource === "vscode" || draft.importSource === "cursor" ? "vscode" : "default"; }}>Normal</button>
                    <button type="button" class:on={draft.vimMode} onclick={() => { draft.vimMode = true; draft.keybindingPreset = "vim"; }}>Vim</button>
                  </div>
                </div>
                <div class="editor-row">
                  <div class="editor-meta">
                    <strong>Extensions</strong>
                    <span>Install popular language extensions. Language extensions help power Agent features. Other extensions can be found in your editor marketplace.</span>
                  </div>
                  <div class="seg">
                    <button type="button" class:on={draft.extensionSetupMode === "recommended"} onclick={() => (draft.extensionSetupMode = "recommended")}>Recommended</button>
                    <button type="button" class:on={draft.extensionSetupMode === "configure"} onclick={() => (draft.extensionSetupMode = "configure")}>Configure</button>
                  </div>
                </div>
                {#if draft.extensionSetupMode === "recommended"}
                  <ul class="ext-brief">
                    {#each RECOMMENDED_EXTENSIONS.slice(0, 4) as ext}
                      <li>{ext.name}</li>
                    {/each}
                  </ul>
                {/if}
              </div>

            {:else if draft.step === "privacy"}
              <p class="privacy-lead">
                AI coding agents have security limitations. Avoid processing highly sensitive data and verify actions taken by the agent.
              </p>
              <label class="privacy-check">
                <input type="checkbox" bind:checked={draft.telemetryEnabled} />
                <span>Yes, I agree to help improve Grokden by allowing local storage of anonymous interaction data on this PC. I can opt out later in Settings.</span>
              </label>
              <label class="privacy-check">
                <input type="checkbox" bind:checked={draft.crashReportsEnabled} />
                <span>Yes, I'd like local crash diagnostics saved on this device to help troubleshoot issues.</span>
              </label>
              <label class="privacy-check">
                <input type="checkbox" bind:checked={draft.privacyImprovementConsent} />
                <span>Yes, I'd like to share local-only product feedback to help prioritize improvements.</span>
              </label>
              <p class="privacy-note">Press Next without checking any box to opt out.</p>
            {/if}
          {/if}
        </div>
      {/key}
    </div>

    {#if draft.step === "agent"}
      <aside class="agent-preview" in:fade={{ duration: 220 }}>
        {#if draft.agentModePreset === "custom"}
          <div class="custom-panel">
            <label>
              <span>Terminal execution policy</span>
              <select bind:value={draft.terminalExecutionPolicy}>
                {#each policies as p}<option value={p}>{policyLabel(p)}</option>{/each}
              </select>
            </label>
            <label>
              <span>Review policy</span>
              <select bind:value={draft.artifactReviewPolicy}>
                {#each policies as p}<option value={p}>{policyLabel(p)}</option>{/each}
              </select>
            </label>
            <label>
              <span>JavaScript execution policy</span>
              <select bind:value={draft.jsExecutionPolicy}>
                {#each policies as p}<option value={p}>{policyLabel(p)}</option>{/each}
              </select>
            </label>
            <p class="custom-note">Policies can be updated anytime in Settings.</p>
          </div>
        {:else if draft.agentModePreset === "review-driven"}
          {#key "review-driven"}
            <ReviewDrivenDemo />
          {/key}
        {:else if draft.agentModePreset === "strict" || draft.agentModePreset === "agent-driven"}
          {#key draft.agentModePreset}
            <AgentModeDemo mode={draft.agentModePreset} />
          {/key}
        {:else}
          <div class="preview-mock custom">
            <p class="custom-preview-note">Tune execution policies in the panel on the left.</p>
          </div>
        {/if}
        <p class="preview-caption">{agentCaption(draft.agentModePreset)}</p>
      </aside>
    {/if}
  </div>

  <footer class="wizard-nav">
    <button type="button" class="back" disabled={draft.step === "welcome"} onclick={goBack}>Back</button>
    <div class="dots" aria-label="Setup progress">
      {#each wizardSteps as step, i}
        <span class="dot" class:active={stepIndex(draft.step) === i} class:done={stepIndex(draft.step) > i}></span>
      {/each}
    </div>
    <button type="button" class="next" onclick={goNext}>
      {draft.step === "privacy" ? "Get started" : "Next"}
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </footer>
</div>

<style>
  .wizard {
    position: fixed;
    inset: 0;
    z-index: 15000;
    display: flex;
    flex-direction: column;
    background: var(--bg, #0e0e11);
    color: var(--text, #ececf4);
    opacity: 1;
    transition: opacity 0.35s ease-out, background 0.25s ease;
    overflow: hidden;
  }
  .wizard.exiting {
    opacity: 0;
    pointer-events: none;
  }

  .scenic {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 90% 45% at 50% 105%, color-mix(in srgb, var(--accent, #4a9eff) 22%, transparent) 0%, transparent 60%),
      radial-gradient(ellipse 50% 30% at 75% 95%, color-mix(in srgb, var(--accent2, #8b7cf8) 12%, transparent) 0%, transparent 50%),
      linear-gradient(180deg, var(--bg, #0a0a0c) 0%, var(--panel, #0e0e11) 50%, var(--editor-bg, #0c1016) 100%);
    pointer-events: none;
    transition: background 0.25s ease;
  }

  .help-link {
    position: absolute;
    top: 14px;
    left: 18px;
    z-index: 2;
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.35);
    font-size: 12px;
    padding: 4px 0;
    opacity: 0.5;
    pointer-events: none;
  }

  .wizard-body {
    position: relative;
    z-index: 1;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr;
    min-height: 0;
    padding: 48px 40px 12px;
  }
  .wizard-body.split {
    grid-template-columns: 1fr 340px;
    gap: 28px;
    max-width: 980px;
    margin: 0 auto;
    width: 100%;
  }

  .content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
  }
  .content.centered {
    align-items: center;
    text-align: center;
    justify-content: center;
  }
  .content.centered h1,
  .content.centered .subtitle { text-align: center; }

  .step { width: 100%; max-width: 720px; }
  .content.centered .step { max-width: 640px; }
  .wizard-body.split .step { max-width: none; text-align: left; }
  .wizard-body.split h1 { text-align: left; }

  h1 {
    margin: 0 0 10px;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  h1.compact { font-size: 22px; margin-bottom: 6px; }
  .subtitle {
    margin: 0 0 24px;
    color: rgba(255, 255, 255, 0.45);
    font-size: 14px;
  }

  .welcome-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    position: relative;
  }
  .hero-glow {
    position: absolute;
    top: 10px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(74, 158, 255, 0.25), rgba(139, 124, 248, 0.1) 50%, transparent 70%);
    filter: blur(12px);
  }
  .hero-logo {
    position: relative;
    border-radius: 22px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  }
  .hero-sub {
    margin: 0;
    max-width: 42ch;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    line-height: 1.55;
  }

  .setup-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(420px, 100%);
    margin: 0 auto;
  }
  .setup-opt {
    width: 100%;
    padding: 14px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.03);
    color: #f2f2fa;
    font-size: 14px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .setup-opt {
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .setup-opt:hover {
    border-color: rgba(74, 158, 255, 0.45);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  .setup-opt.selected {
    border-color: var(--accent, #4a9eff);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent), 0 8px 24px color-mix(in srgb, var(--accent) 8%, transparent);
    background: var(--accent-soft);
  }
  .setup-opt:disabled { opacity: 0.6; cursor: wait; }

  .theme-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    width: 100%;
    max-width: 720px;
    margin: 8px auto 0;
  }
  .theme-opt {
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
  }
  .theme-opt.selected .mini-ide {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 2px;
  }
  .mini-ide {
    width: 100%;
    aspect-ratio: 1.15;
    border-radius: 8px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 28% 1fr;
    grid-template-rows: 14px 1fr;
    background: var(--frame);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .mi-bar { grid-column: 1 / -1; background: rgba(0, 0, 0, 0.25); }
  .mi-side { background: var(--side); }
  .mi-editor {
    background: var(--editor);
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .mi-line { height: 3px; border-radius: 999px; opacity: 0.9; }

  .agent-list { display: flex; flex-direction: column; gap: 10px; }
  .agent-opt {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.02);
    color: #ececf4;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .agent-opt {
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .agent-opt:hover {
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-1px);
  }
  .agent-opt.selected {
    border-color: var(--accent, #4a9eff);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent), 0 8px 24px color-mix(in srgb, var(--accent) 8%, transparent);
    background: var(--accent-soft);
  }
  .radio {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
  .radio.checked {
    border-color: var(--accent, #4a9eff);
    background: radial-gradient(circle at center, var(--accent) 0 45%, transparent 46%);
    box-shadow: inset 0 0 0 3px var(--bg, #121214);
  }
  .agent-label { flex: 1; }
  .rec-badge {
    font-size: 10px;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 2px 8px;
  }

  .agent-preview {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 360px;
    position: sticky;
    top: 48px;
  }
  .preview-mock.custom {
    flex: 1;
    min-height: 200px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--panel) 60%, transparent);
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .custom-preview-note {
    margin: 0;
    font-size: 12px;
    color: var(--text-mute);
    text-align: center;
    line-height: 1.5;
  }
  .preview-caption {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.42);
    text-align: center;
  }

  .custom-panel {
    flex: 1;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(0, 0, 0, 0.2);
  }
  .custom-panel label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
  }
  .custom-panel select {
    background: #1a1a20;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #ececf4;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
  }
  .custom-note {
    margin: auto 0 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.38);
    line-height: 1.4;
  }

  .editor-card {
    width: min(640px, 100%);
    margin: 0 auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 6px 0;
    background: rgba(0, 0, 0, 0.18);
    text-align: left;
  }
  .editor-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .editor-row:last-of-type { border-bottom: none; }
  .editor-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    max-width: 360px;
  }
  .editor-meta strong { color: #ececf4; font-size: 14px; }
  .seg {
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }
  .seg button {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    padding: 7px 16px;
    font-size: 13px;
    cursor: pointer;
  }
  .seg button.on {
    background: var(--accent, #4a9eff);
    color: var(--on-accent, #fff);
  }
  .ext-brief {
    margin: 0;
    padding: 8px 20px 14px;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
  .ext-brief li {
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
  }

  .privacy-lead {
    text-align: left;
    color: rgba(255, 255, 255, 0.55);
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 20px;
    max-width: 560px;
  }
  .privacy-check {
    display: flex;
    gap: 12px;
    text-align: left;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.72);
    margin-bottom: 14px;
    cursor: pointer;
    max-width: 560px;
  }
  .privacy-check input {
    margin-top: 3px;
    flex-shrink: 0;
    accent-color: #4a9eff;
  }
  .privacy-note {
    margin: 16px 0 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
  }

  .meta-msg { font-size: 12px; color: rgba(255, 255, 255, 0.4); margin: 12px 0 0; }
  .meta-msg.ok { color: #7fd4a0; }
  .meta-msg.err { color: #f07178; }

  .wizard-nav {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 16px 28px 22px;
  }
  .back {
    justify-self: start;
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.45);
    font-size: 14px;
    cursor: pointer;
    padding: 8px 4px;
    min-width: 72px;
  }
  .back:disabled { opacity: 0.3; cursor: not-allowed; }
  .back:hover:not(:disabled) { color: rgba(255, 255, 255, 0.7); }

  .dots {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: transparent;
    transition: background 0.25s, border-color 0.25s;
  }
  .dot.done {
    background: rgba(255, 255, 255, 0.2);
    border-color: transparent;
  }
  .dot.active {
    background: var(--accent, #4a9eff);
    border-color: var(--accent, #4a9eff);
  }

  .next {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 8px;
    background: var(--accent, #4a9eff);
    color: var(--on-accent, #fff);
    font-size: 14px;
    font-weight: 500;
    padding: 9px 18px;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
  }
  .next:hover { filter: brightness(1.08); }
  .next:active { transform: scale(0.98); }

  @media (max-width: 860px) {
    .wizard-body.split { grid-template-columns: 1fr; }
    .agent-preview { display: none; }
    .theme-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>