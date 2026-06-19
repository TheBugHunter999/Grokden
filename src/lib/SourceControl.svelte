<script lang="ts">
  import { fileMeta } from "$lib/editor-utils";

  type Change = { name: string; path: string; status: string };

  let {
    changes,
    gitDiffMode = "inline",
    gitBlame = false,
    gitAutoFetch = false,
    gitDefaultBranch = "main",
    gitSignCommits = false,
    gitPullRebase = false,
    gitLastFetch = null,
    onOpen,
    onSave,
    onRevert,
    onSaveAll,
    onRevertAll,
  }: {
    changes: Change[];
    gitDiffMode?: string;
    gitBlame?: boolean;
    gitAutoFetch?: boolean;
    gitDefaultBranch?: string;
    gitSignCommits?: boolean;
    gitPullRebase?: boolean;
    gitLastFetch?: Date | null;
    onOpen: (change: Change) => void;
    onSave: (change: Change) => void;
    onRevert: (change: Change) => void;
    onSaveAll: () => void;
    onRevertAll: () => void;
  } = $props();

  function formatFetchTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
</script>

<div class="scm-panel">
<div class="scm-meta">
  <span class="scm-branch" title="Default branch">{gitDefaultBranch}</span>
  <span class="scm-mode" title="Diff mode">{gitDiffMode === "side-by-side" ? "Side by side" : "Inline"}</span>
  <span class="scm-flag" title="Pull strategy">{gitPullRebase ? "Rebase pull" : "Merge pull"}</span>
  {#if gitSignCommits}<span class="scm-flag scm-signed">Signed commits</span>{/if}
  {#if gitAutoFetch}
    <span class="scm-flag scm-fetch" title={gitLastFetch ? `Last fetch ${formatFetchTime(gitLastFetch)}` : "Waiting for first fetch"}>
      Auto-fetch{#if gitLastFetch}<span class="scm-fetch-time"> · {formatFetchTime(gitLastFetch)}</span>{/if}
    </span>
  {/if}
  {#if gitBlame}<span class="scm-flag">Blame</span>{/if}
</div>

<div class="scm-header liquid-glass">
  <span class="scm-count">{changes.length} change{changes.length === 1 ? "" : "s"}</span>
  <div class="scm-actions">
    <button type="button" class="scm-btn" disabled={!changes.length} onclick={onSaveAll}>Save All</button>
    <button type="button" class="scm-btn" disabled={!changes.length} onclick={onRevertAll}>Revert All</button>
  </div>
</div>

<ul class="scm-list">
  {#if !changes.length}
    <li class="panel-empty">No unsaved changes. Working changes from the editor appear here.</li>
  {:else}
    {#each changes as c (c.path)}
      <li class="scm-item">
        <span class="badge" style="color: {fileMeta(c.name).color}">{fileMeta(c.name).label}</span>
        <button type="button" class="scm-name" title={c.path} onclick={() => onOpen(c)}>{c.name}</button>
        <span class="scm-tag" data-status={c.status} title="Status">{c.status}</span>
        <span class="scm-row-actions">
          <button type="button" class="scm-action" title="Save" aria-label="Save {c.name}" onclick={() => onSave(c)}>Save</button>
          <button type="button" class="scm-action" title="Revert" aria-label="Revert {c.name}" onclick={() => onRevert(c)}>Revert</button>
        </span>
      </li>
    {/each}
  {/if}
</ul>
</div>

<style>
  .scm-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .scm-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 12px 6px;
    flex-shrink: 0;
  }
  .scm-branch,
  .scm-mode,
  .scm-flag {
    font-size: 10px;
    color: var(--text-mute);
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--chip-bg);
    border: 1px solid var(--border);
  }
  .scm-branch { color: var(--accent); }
  .scm-signed { color: var(--accent); }
  .scm-fetch { color: var(--text-dim); }
  .scm-fetch-time { opacity: 0.75; }

  .scm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 12px 10px;
    flex-shrink: 0;
  }
  .scm-count { font-size: 11px; font-weight: 400; color: var(--text-mute); }
  .scm-actions { display: flex; gap: 10px; }
  .scm-btn {
    padding: 0;
    font-size: 11px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.12s, opacity 0.12s;
  }
  .scm-btn:hover:not(:disabled) { color: var(--text); }
  .scm-btn:disabled { opacity: 0.35; cursor: default; }

  .scm-list { list-style: none; margin: 0; padding: 0 6px; overflow-y: auto; flex: 1; }

  .panel-empty {
    padding: 14px 12px;
    font-size: 12px;
    color: var(--text-mute);
    font-style: italic;
    line-height: 1.5;
  }

  .scm-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 8px;
    border-radius: 7px;
    transition: background 0.12s;
  }
  .scm-item:hover { background: var(--hover); }

  .badge { width: 18px; font-size: 9px; font-weight: 500; letter-spacing: -0.3px; text-align: center; flex-shrink: 0; }

  .scm-name {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-dim);
    background: none;
    border: none;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .scm-item:hover .scm-name { color: var(--text); }

  .scm-tag { font-size: 11px; font-weight: 400; flex-shrink: 0; }
  .scm-tag[data-status="U"],
  .scm-tag[data-status="?"] { color: var(--success); }
  .scm-tag[data-status="A"],
  .scm-tag[data-status="M"] { color: var(--warn); }
  .scm-tag[data-status="D"],
  .scm-tag[data-status="!"] { color: var(--danger); }
  .scm-tag[data-status="R"] { color: var(--accent); }

  .scm-row-actions { display: flex; gap: 2px; flex-shrink: 0; }
  .scm-action {
    padding: 0 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 400;
    font-family: inherit;
    color: var(--text-mute);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.12s;
  }
  .scm-action:hover { color: var(--text); }
</style>
