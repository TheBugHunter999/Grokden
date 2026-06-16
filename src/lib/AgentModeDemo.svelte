<script lang="ts">
  import { onMount } from "svelte";
  import type { AgentModePreset } from "$lib/editor-utils";

  type Props = { mode: AgentModePreset };
  let { mode }: Props = $props();

  type Phase = "idle" | "a" | "b" | "c";
  let phase = $state<Phase>("idle");
  let active = $state(false);

  onMount(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (!active) return;
      phase = "a";
      timer = setTimeout(() => {
        phase = "b";
        timer = setTimeout(() => {
          phase = "c";
          timer = setTimeout(() => {
            phase = "idle";
            timer = setTimeout(loop, 600);
          }, mode === "agent-driven" ? 900 : 1400);
        }, mode === "strict" ? 1600 : 1100);
      }, 800);
    };
    active = true;
    loop();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  });
</script>

<div class="demo mode-{mode}">
  <div class="demo-bar" class:lit={phase !== "idle"}></div>
  {#if mode === "strict"}
    <div class="row" class:lit={phase === "a"}>
      <span class="icon">?</span>
      <span>Run <code>npm test</code>?</span>
      <span class="pill wait" class:flash={phase === "a"}>Waiting</span>
    </div>
    <div class="row" class:lit={phase === "b"}>
      <span class="icon">✓</span>
      <span>You approved the command</span>
      <span class="pill ok">Approved</span>
    </div>
    <div class="row" class:lit={phase === "c"}>
      <span class="icon">?</span>
      <span>Apply edit to <code>auth.ts</code>?</span>
      <span class="pill wait" class:flash={phase === "c"}>Waiting</span>
    </div>
  {:else if mode === "agent-driven"}
    <div class="row" class:lit={phase === "a"}>
      <span class="icon">▶</span>
      <span>Running tests in terminal</span>
      <span class="pill run">Auto</span>
    </div>
    <div class="row" class:lit={phase === "b"}>
      <span class="icon">✎</span>
      <span>Updating <code>middleware.ts</code></span>
      <span class="pill run">Auto</span>
    </div>
    <div class="progress" class:animate={phase === "b" || phase === "c"}>
      <span class="fill"></span>
    </div>
    <div class="row dim" class:lit={phase === "c"}>
      <span class="icon">✓</span>
      <span>Task completed — summary ready</span>
    </div>
  {:else}
    <div class="row lit">
      <span class="icon">⚙</span>
      <span>Custom policies active</span>
    </div>
  {/if}
</div>

<style>
  .demo {
    flex: 1;
    min-height: 240px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.22);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .demo-bar {
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    margin-bottom: 6px;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .demo-bar.lit {
    background: var(--accent, #4a9eff);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
    border: 1px solid transparent;
    transition: color 0.25s, border-color 0.25s, background 0.25s;
  }
  .row.lit {
    color: rgba(255, 255, 255, 0.88);
    background: var(--accent-soft, rgba(74, 158, 255, 0.08));
    border-color: color-mix(in srgb, var(--accent) 20%, transparent);
  }
  .row.dim.lit { opacity: 0.85; }
  .icon { width: 18px; text-align: center; flex-shrink: 0; }
  code { font-family: Consolas, monospace; font-size: 11px; color: #7eb8ff; }
  .pill {
    margin-left: auto;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .pill.wait { color: #e5c07b; border-color: rgba(229, 192, 123, 0.35); }
  .pill.wait.flash { animation: pulse-wait 0.8s ease-in-out infinite; }
  .pill.ok { color: #98c379; border-color: rgba(152, 195, 121, 0.35); }
  .pill.run { color: var(--accent, #4a9eff); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .progress {
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
    margin: 4px 0;
  }
  .fill {
    display: block;
    height: 100%;
    width: 35%;
    background: var(--accent, #4a9eff);
    border-radius: inherit;
    transform: translateX(-100%);
  }
  .progress.animate .fill {
    animation: slide-progress 1.4s ease-in-out infinite;
  }
  @keyframes pulse-wait {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  @keyframes slide-progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(320%); }
  }
</style>