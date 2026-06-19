<script lang="ts">
  import { onMount } from "svelte";
  import { fileMeta, type SearchMatch } from "$lib/editor-utils";
  import {
    isSearchRegexValid,
    searchResultDirLabel,
    type SearchOptionFlags,
  } from "$lib/settings-runtime";

  type FileHit = { name: string; path: string };
  type SearchOptionKey = keyof SearchOptionFlags;

  let {
    query,
    results,
    searchOptions,
    onInput,
    onOpen,
    onJump,
    onToggleOption,
  }: {
    query: string;
    results: { files: FileHit[]; matches: SearchMatch[] };
    searchOptions: SearchOptionFlags;
    onInput: (value: string) => void;
    onOpen: (hit: FileHit) => void;
    onJump: (match: SearchMatch) => void;
    onToggleOption: (key: SearchOptionKey) => void;
  } = $props();

  const optionButtons: Array<{ key: SearchOptionKey; label: string; title: string }> = [
    { key: "caseSensitive", label: "Aa", title: "Match case" },
    { key: "wholeWord", label: "ab", title: "Match whole word" },
    { key: "useRegex", label: ".*", title: "Use regular expression" },
    { key: "includeIgnored", label: "ign", title: "Include ignored files" },
    { key: "followSymlinks", label: "lnk", title: "Follow symlinks" },
  ];

  let invalidRegex = $derived(searchOptions.useRegex && query.trim() && !isSearchRegexValid(query));
  let searchInput = $state<HTMLInputElement | undefined>();

  onMount(() => {
    searchInput?.focus();
  });
</script>

<div class="search-panel">
  <div class="search-box">
    <div class="search-toolbar liquid-glass">
      <input
        bind:this={searchInput}
        class="search-input"
        placeholder="Search files & open editors"
        value={query}
        oninput={(e) => onInput(e.currentTarget.value)}
      />
      <div class="search-options" aria-label="Search options">
        {#each optionButtons as option (option.key)}
          <button
            type="button"
            class="search-flag"
            class:active={searchOptions[option.key]}
            title={option.title}
            aria-label={option.title}
            aria-pressed={searchOptions[option.key]}
            onclick={() => onToggleOption(option.key)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="search-results">
    {#if !query.trim()}
      <div class="panel-empty">Search file names in the explorer and the contents of open editors.</div>
    {:else if invalidRegex}
      <div class="panel-empty panel-error">Invalid regular expression.</div>
    {:else}
      {#if results.files.length}
        <div class="group-title">Files · {results.files.length}</div>
        {#each results.files as f (f.path)}
          <button type="button" class="result" onclick={() => onOpen(f)}>
            <span class="badge" style="color: {fileMeta(f.name).color}">{fileMeta(f.name).label}</span>
            <span class="r-file-meta">
              <span class="r-name">{f.name}</span>
              {#if searchResultDirLabel(f.path)}
                <span class="r-path" title={f.path}>{searchResultDirLabel(f.path)}</span>
              {/if}
            </span>
          </button>
        {/each}
      {/if}
      {#if results.matches.length}
        <div class="group-title">In open editors · {results.matches.length}</div>
        {#each results.matches as m (m.path + ":" + m.line)}
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
</div>

<style>
  .search-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .search-box { padding: 4px 10px 10px; flex-shrink: 0; }
  .search-toolbar { display: flex; flex-direction: column; gap: 6px; }
  .search-options { display: flex; gap: 4px; flex-wrap: wrap; }
  .search-flag {
    padding: 3px 7px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--text-mute);
    background: transparent;
    border: none;
    border-radius: 4px;
    opacity: 0.5;
    user-select: none;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.12s ease, background 0.12s ease, color 0.12s ease;
  }
  .search-flag:hover {
    opacity: 0.8;
    background: var(--hover);
    color: var(--text-dim);
  }
  .search-flag.active {
    background: var(--accent-soft);
    color: var(--accent);
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

  .search-results { flex: 1; min-height: 0; overflow-y: auto; padding: 0 6px 8px; }

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
  .panel-error {
    color: var(--accent);
    font-style: normal;
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
  .r-file-meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .r-name { font-size: 13px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .r-path {
    font-size: 10px;
    color: var(--text-mute);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .result:hover .r-name { color: var(--text); }
  .result:hover .r-path { color: var(--text-dim); }

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