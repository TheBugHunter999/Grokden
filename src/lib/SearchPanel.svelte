<script lang="ts">
  import { fileMeta, type SearchMatch } from "$lib/editor-utils";
  import type { SearchOptionFlags } from "$lib/settings-runtime";

  type FileHit = { name: string; path: string };

  let {
    query,
    results,
    searchOptions,
    onInput,
    onOpen,
    onJump,
  }: {
    query: string;
    results: { files: FileHit[]; matches: SearchMatch[] };
    searchOptions: SearchOptionFlags;
    onInput: (value: string) => void;
    onOpen: (hit: FileHit) => void;
    onJump: (match: SearchMatch) => void;
  } = $props();
</script>

<div class="search-box">
  <div class="search-toolbar">
    <input class="search-input" placeholder="Search files & open editors" value={query} oninput={(e) => onInput(e.currentTarget.value)} />
    <div class="search-options" aria-label="Active search options">
      <span class="search-flag" class:active={searchOptions.caseSensitive} title="Match case">Aa</span>
      <span class="search-flag" class:active={searchOptions.wholeWord} title="Match whole word">ab</span>
      <span class="search-flag" class:active={searchOptions.useRegex} title="Use regular expression">.*</span>
      <span class="search-flag" class:active={searchOptions.includeIgnored} title="Include ignored files">ign</span>
      <span class="search-flag" class:active={searchOptions.followSymlinks} title="Follow symlinks">lnk</span>
    </div>
  </div>
</div>

<div class="search-results">
  {#if !query.trim()}
    <div class="panel-empty">Search file names in the explorer and the contents of open editors.</div>
  {:else}
    {#if results.files.length}
      <div class="group-title">Files · {results.files.length}</div>
      {#each results.files as f (f.path)}
        <button type="button" class="result" onclick={() => onOpen(f)}>
          <span class="badge" style="color: {fileMeta(f.name).color}">{fileMeta(f.name).label}</span>
          <span class="r-name">{f.name}</span>
        </button>
      {/each}
    {/if}
    {#if results.matches.length}
      <div class="group-title">In open editors · {results.matches.length}</div>
      {#each results.matches as m, i (m.path + ":" + m.line + ":" + i)}
        <button type="button" class="result match" onclick={() => onJump(m)}>
          <span class="r-loc">{m.name}:{m.line}</span>
          <span class="r-snippet">{m.text}</span>
        </button>
      {/each}
    {/if}
    {#if !results.files.length && !results.matches.length}
      <div class="panel-empty">No results found.</div>
    {/if}
  {/if}
</div>

<style>
  .search-box { padding: 4px 10px 10px; flex-shrink: 0; }
  .search-toolbar { display: flex; flex-direction: column; gap: 6px; }
  .search-options { display: flex; gap: 4px; flex-wrap: wrap; }
  .search-flag {
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--text-mute);
    background: var(--hover);
    border: 1px solid var(--border);
    border-radius: 4px;
    opacity: 0.45;
    user-select: none;
  }
  .search-flag.active {
    color: var(--accent);
    border-color: var(--accent-mid);
    background: var(--accent-soft);
    opacity: 1;
  }
  .search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 7px 10px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text);
    background: var(--hover);
    border: 1px solid var(--border);
    border-radius: 7px;
    outline: none;
  }
  .search-input:focus { border-color: var(--accent); }

  .search-results { flex: 1; overflow-y: auto; padding: 0 6px 8px; }

  .group-title {
    padding: 8px 8px 4px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--text-mute);
  }

  .panel-empty {
    padding: 14px 12px;
    font-size: 12px;
    color: var(--text-mute);
    font-style: italic;
    line-height: 1.5;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    border: none;
    background: none;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.12s, transform 0.08s;
  }
  .result:hover { background: var(--accent-soft); transform: translateX(2px); }

  .result:not(.match) { flex-direction: row; align-items: center; gap: 7px; }
  .badge { width: 18px; font-size: 9px; font-weight: 500; letter-spacing: -0.3px; text-align: center; flex-shrink: 0; }
  .r-name { font-size: 13px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .result:hover .r-name { color: var(--text); }

  .r-loc { font-size: 11px; font-weight: 400; color: var(--accent); }
  .r-snippet {
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    font-size: 11px;
    color: var(--text-mute);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .result.match:hover .r-snippet { color: var(--text-dim); }
</style>
