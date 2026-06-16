<script lang="ts">
  import type { CommandSuggestion } from "$lib/terminal-commands";

  let {
    input = "",
    suggestions = [],
    onApply,
  }: {
    input?: string;
    suggestions?: CommandSuggestion[];
    onApply?: (suggestion: CommandSuggestion) => void;
  } = $props();

  let typedCommand = $state("");
  let typedDesc = $state("");
  let lastAnimated = $state("");
  let typewriterTimer: ReturnType<typeof setInterval> | undefined;
  const CHAR_MS = 32;

  const primary = $derived(suggestions[0] ?? null);
  const secondary = $derived(suggestions.slice(1, 4));
  const visible = $derived(suggestions.length > 0);

  function cancelTypewriter() {
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = undefined;
    }
  }

  function runTypewriter(targetCommand: string, targetDesc: string) {
    cancelTypewriter();
    typedCommand = "";
    typedDesc = "";

    let cmdIndex = 0;
    let descIndex = 0;
    let phase: "cmd" | "desc" | "done" = "cmd";

    typewriterTimer = setInterval(() => {
      if (phase === "cmd") {
        cmdIndex += 1;
        typedCommand = targetCommand.slice(0, cmdIndex);
        if (cmdIndex >= targetCommand.length) phase = "desc";
        return;
      }

      if (phase === "desc") {
        descIndex += 1;
        typedDesc = targetDesc.slice(0, descIndex);
        if (descIndex >= targetDesc.length) {
          phase = "done";
          cancelTypewriter();
        }
      }
    }, CHAR_MS);
  }

  $effect(() => {
    if (!primary) {
      cancelTypewriter();
      typedCommand = "";
      typedDesc = "";
      lastAnimated = "";
      return;
    }

    const key = `${primary.command}|${input}`;
    if (key === lastAnimated) return;

    lastAnimated = key;
    runTypewriter(primary.command, primary.desc);
  });

  $effect(() => {
    return () => cancelTypewriter();
  });
</script>

{#if visible && primary}
  <div class="helper" aria-live="polite">
    <div class="helper-primary">
      <button type="button" class="primary-btn" onclick={() => onApply?.(primary)} title="Tab to complete">
        <span class="typed-cmd">{typedCommand}</span>
        {#if typedCommand.length >= primary.command.length}
          <span class="cursor-blink" aria-hidden="true"></span>
        {/if}
      </button>
      <span class="typed-desc">{typedDesc}</span>
      <span class="category">{primary.category}</span>
    </div>

    {#if secondary.length}
      <ul class="helper-list">
        {#each secondary as item (item.command)}
          <li>
            <button type="button" class="hint-item" onclick={() => onApply?.(item)}>
              <span class="hint-cmd">{item.command}</span>
              <span class="hint-desc">{item.desc}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <span class="helper-tip">Tab to complete · Enter when done</span>
  </div>
{/if}

<style>
  .helper {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    z-index: 5;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--panel-solid);
    border: 1px solid var(--border);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
    pointer-events: auto;
    font-family: var(--code-font), Consolas, monospace;
  }

  .helper-primary {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
    min-height: 20px;
  }

  .primary-btn {
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font: inherit;
    color: var(--accent);
  }

  .typed-cmd {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .cursor-blink {
    display: inline-block;
    width: 7px;
    height: 1.1em;
    margin-left: 1px;
    vertical-align: text-bottom;
    background: var(--accent);
    opacity: 0.85;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .typed-desc {
    font-size: 11px;
    color: var(--text-mute);
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  .category {
    margin-left: auto;
    font-size: 10px;
    color: var(--text-mute);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  .helper-list {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hint-item {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 2px 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
    border-radius: 3px;
  }

  .hint-item:hover {
    background: var(--hover);
  }

  .hint-cmd {
    font-size: 11px;
    color: var(--text-dim);
    min-width: 120px;
  }

  .hint-desc {
    font-size: 10px;
    color: var(--text-mute);
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  .helper-tip {
    display: block;
    margin-top: 6px;
    font-size: 9px;
    color: var(--text-mute);
    opacity: 0.75;
    font-family: "Segoe UI", system-ui, sans-serif;
  }
</style>