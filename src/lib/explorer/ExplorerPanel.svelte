<script lang="ts">
  import type { AppSettings } from "$lib/editor-utils";
  import ExplorerTree from "$lib/explorer/ExplorerTree.svelte";
  import {
    collapseAllExplorer,
    getExplorerError,
    workspaceDisplayName,
  } from "$lib/explorer/explorer-store.svelte";
  import { middleTruncate } from "$lib/explorer/path-utils";
  import type { ExplorerTreeNode } from "$lib/workspace/types";

  type Props = {
    settings: AppSettings;
    folderPath: string | null;
    folderRestricted: boolean;
    selectedFolderPath: string | null;
    activeTabPath: string | null;
    view: string;
    onOpenFolder: () => void;
    onOpenFile: (node: ExplorerTreeNode) => void;
    onNewFile: () => void;
    onNewFolder: () => void;
    onRefresh: () => void;
    onSelectFolder: (path: string) => void;
  };

  let {
    settings,
    folderPath,
    folderRestricted,
    selectedFolderPath,
    activeTabPath,
    view,
    onOpenFolder,
    onOpenFile,
    onNewFile,
    onNewFolder,
    onRefresh,
    onSelectFolder,
  }: Props = $props();

  const explorerError = $derived(getExplorerError());
  const projectName = $derived(workspaceDisplayName() || folderPath?.split(/[/\\]+/).pop() || "");
  const displayProjectName = $derived(middleTruncate(projectName, 36));
  const displayError = $derived(explorerError ? middleTruncate(explorerError, 64) : "");
</script>

<div class="explorer-panel">
  <div class="sidebar-header">
    <span>Explorer</span>
    <button type="button" class="open-folder-btn" onclick={onOpenFolder} title="Open folder">…</button>
  </div>

  {#if explorerError}
    <div class="explorer-error" title={explorerError}>{displayError}</div>
  {/if}

  {#if folderPath}
    <div class="workspace-section">
      <span class="section-label" title={folderPath}>{displayProjectName}</span>
      <div class="section-actions">
        <button type="button" class="icon-btn" disabled={folderRestricted} onclick={onNewFile} title="New file">+</button>
        <button type="button" class="icon-btn" disabled={folderRestricted} onclick={onNewFolder} title="New folder">⊕</button>
        <button type="button" class="icon-btn" onclick={onRefresh} title="Refresh">↻</button>
        <button type="button" class="icon-btn" onclick={collapseAllExplorer} title="Collapse all">⊟</button>
      </div>
    </div>
  {/if}

  <ExplorerTree
    {settings}
    {folderPath}
    {selectedFolderPath}
    {activeTabPath}
    {view}
    {onOpenFile}
    {onSelectFolder}
  />
</div>

<style>
  .explorer-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--grok-space-4, 8px) var(--grok-space-5, 12px) var(--grok-space-2, 4px);
    font-size: var(--grok-font-size-xs, 11px);
    font-weight: var(--grok-font-weight-medium, 500);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--grok-text-muted, var(--text-mute));
    flex-shrink: 0;
  }

  .open-folder-btn {
    padding: 0 2px;
    font-size: var(--grok-font-size-lg, 14px);
    line-height: 1;
    font-family: inherit;
    color: var(--grok-text-muted, var(--text-mute));
    background: none;
    border: none;
    border-radius: var(--grok-radius-lg, 8px);
    cursor: pointer;
    transition: color var(--grok-duration-fast, 150ms) var(--grok-ease-default, ease);
  }

  .open-folder-btn:hover {
    color: var(--grok-text, var(--text));
    background: var(--grok-surface-2, var(--hover));
  }

  .explorer-error {
    margin: 0 var(--grok-space-4, 8px) var(--grok-space-2, 4px);
    padding: var(--grok-space-2, 4px) var(--grok-space-4, 8px);
    font-size: var(--grok-font-size-xs, 11px);
    color: var(--grok-danger, var(--danger));
    background: var(--grok-danger-soft, var(--danger-soft));
    border: 1px solid var(--grok-border, var(--border));
    border-radius: var(--grok-radius-lg, 8px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .workspace-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--grok-space-3, 6px);
    padding: var(--grok-space-1, 2px) var(--grok-space-4, 8px) var(--grok-space-2, 4px) 20px;
    flex-shrink: 0;
  }

  .section-label {
    flex: 1;
    min-width: 0;
    font-size: var(--grok-font-size-xs, 11px);
    font-weight: var(--grok-font-weight-medium, 500);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--grok-text-secondary, var(--text-dim));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: var(--grok-space-1, 2px);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--grok-duration-fast, 150ms) var(--grok-ease-default, ease);
  }

  .workspace-section:hover .section-actions,
  .section-actions:focus-within {
    opacity: 1;
  }

  .icon-btn {
    width: 22px;
    height: 22px;
    padding: 0;
    font-size: var(--grok-font-size-sm, 12px);
    line-height: 1;
    font-family: inherit;
    color: var(--grok-text-muted, var(--text-mute));
    background: none;
    border: none;
    border-radius: var(--grok-radius-lg, 8px);
    cursor: pointer;
    transition:
      color var(--grok-duration-fast, 150ms) var(--grok-ease-default, ease),
      background var(--grok-duration-fast, 150ms) var(--grok-ease-default, ease);
  }

  .icon-btn:hover:not(:disabled) {
    color: var(--grok-text, var(--text));
    background: var(--grok-surface-2, var(--hover));
  }

  .icon-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>