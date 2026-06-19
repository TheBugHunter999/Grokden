<script lang="ts">
  import { parentFolderName } from "$lib/folder-trust";

  type Props = {
    folderPath: string;
    trustParent: boolean;
    onTrustParentChange: (value: boolean) => void;
    onTrust: () => void;
    onRestricted: () => void;
  };

  let {
    folderPath,
    trustParent = false,
    onTrustParentChange,
    onTrust,
    onRestricted,
  }: Props = $props();

  const parentName = $derived(parentFolderName(folderPath));
  const docsUrl = "https://github.com/TheBugHunter999/Grokden#security";
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="trust-backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onRestricted()}>
  <div class="trust-dialog dialog" role="dialog" aria-modal="true" aria-labelledby="trust-title">
    <div class="trust-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M24 4L8 12v10c0 11 6.5 21.2 16 24 9.5-2.8 16-13 16-24V12L24 4z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M24 6.5L10.5 13.2V22c0 9.4 5.6 18.1 13.5 20.7 7.9-2.6 13.5-11.3 13.5-20.7v-8.8L24 6.5z"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
        <circle cx="24" cy="22" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none" />
        <path d="M24 25.5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>

    <h2 id="trust-title" class="trust-title">Do you trust the authors of the files in this folder?</h2>

    <p class="trust-body">
      Grokden provides features that may automatically execute commands and run AI agents against files
      in this folder.
    </p>
    <p class="trust-body">
      Grokden may cause an AI agent to take unsafe actions based on file content, which can result in
      data loss or unintended changes. If you do not trust the authors of these files, continue in
      restricted mode — you can browse and edit, but terminals and agent features stay disabled.
    </p>

    <div class="trust-path" title={folderPath}>{folderPath}</div>

    {#if parentName}
      <label class="trust-parent">
        <input
          type="checkbox"
          checked={trustParent}
          onchange={(e) => onTrustParentChange(e.currentTarget.checked)}
        />
        <span>Trust the authors of all files in the parent folder &lsquo;{parentName}&rsquo;</span>
      </label>
    {/if}

    <div class="trust-actions">
      <button type="button" class="trust-btn btn btn--primary" onclick={onTrust}>
        <span class="trust-btn-label">Yes, I trust the authors</span>
        <span class="trust-btn-sub">Trust folder and enable all features</span>
      </button>
      <button type="button" class="trust-btn btn btn--secondary" onclick={onRestricted}>
        <span class="trust-btn-label">No, I don&apos;t trust the authors</span>
        <span class="trust-btn-sub">Browse folder in restricted mode</span>
      </button>
    </div>

    <p class="trust-footer">
      <a href={docsUrl} target="_blank" rel="noopener noreferrer">See our docs</a> to learn more.
    </p>
  </div>
</div>

<style>
  .trust-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(4px);
  }

  .trust-dialog {
    width: min(640px, 100%);
    max-height: min(90vh, 720px);
    overflow: auto;
    padding: 28px 32px 24px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--panel-solid, var(--panel));
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    color: var(--text);
    font-family: inherit;
  }

  .trust-icon {
    width: 44px;
    height: 44px;
    margin-bottom: 14px;
    color: var(--accent, #8b5cf6);
  }

  .trust-icon svg {
    width: 100%;
    height: 100%;
  }

  .trust-title {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.35;
    color: var(--text);
  }

  .trust-body {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-dim);
  }

  .trust-path {
    margin: 16px 0 14px;
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg);
    font-family: "Cascadia Mono", "Cascadia Code", Consolas, monospace;
    font-size: 12px;
    color: var(--text-mute);
    word-break: break-all;
  }

  .trust-parent {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0 0 20px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-dim);
    cursor: pointer;
    user-select: none;
  }

  .trust-parent input {
    margin-top: 2px;
    accent-color: var(--accent);
    flex-shrink: 0;
  }

  .trust-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  @media (max-width: 560px) {
    .trust-actions {
      grid-template-columns: 1fr;
    }
  }

  .trust-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--chip-bg);
    color: var(--text);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .trust-btn:hover {
    background: var(--hover);
  }

  .trust-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .trust-btn.primary:hover {
    filter: brightness(1.06);
  }

  .trust-btn.secondary {
    background: transparent;
  }

  .trust-btn-label {
    font-size: 13px;
    font-weight: 500;
  }

  .trust-btn-sub {
    font-size: 11px;
    opacity: 0.82;
    line-height: 1.35;
  }

  .trust-footer {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--text-mute);
    text-align: center;
  }

  .trust-footer a {
    color: var(--accent);
    text-decoration: none;
  }

  .trust-footer a:hover {
    text-decoration: underline;
  }
</style>