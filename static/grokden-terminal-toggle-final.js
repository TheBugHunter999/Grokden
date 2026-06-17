(() => {
  const HIDDEN = "grokden-terminal-final-hidden";
  const OLD_HIDDEN = ["grokden-panel-safe-hidden", "grokden-terminal-hidden", "liquid-terminal-force-closed"];

  const root = () => document.querySelector(".ide");
  const visible = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && el.offsetParent !== null && el.getBoundingClientRect().height > 1;
  };

  function clearOldHidden(ide) {
    for (const cls of OLD_HIDDEN) ide.classList.remove(cls);
  }

  function findButton(predicate) {
    return Array.from(document.querySelectorAll("button")).find(predicate);
  }

  function clickWorkspaceTerminal() {
    const btn = findButton((button) => {
      const text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      const aria = (button.getAttribute("aria-label") || "").trim().toLowerCase();
      return text === "workspace terminal" || aria === "terminal";
    });
    btn?.click();
  }

  function syncButton() {
    const ide = root();
    const btn = document.querySelector(".grokden-layout-btn-panel");
    if (!ide || !(btn instanceof HTMLElement)) return;
    btn.classList.toggle(HIDDEN, ide.classList.contains(HIDDEN));
    btn.classList.toggle("active", !ide.classList.contains(HIDDEN) && visible(document.querySelector(".terminal")));
  }

  function toggleTerminal(event) {
    const ide = root();
    if (!ide) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const terminal = document.querySelector(".terminal");
    const isOpen = !ide.classList.contains(HIDDEN) && visible(terminal);

    clearOldHidden(ide);

    if (isOpen) {
      ide.classList.add(HIDDEN);
      syncButton();
      return;
    }

    ide.classList.remove(HIDDEN);
    clickWorkspaceTerminal();
    window.setTimeout(syncButton, 80);
    window.setTimeout(syncButton, 220);
  }

  function wire() {
    const btn = document.querySelector(".grokden-layout-btn-panel");
    if (!(btn instanceof HTMLElement) || btn.dataset.terminalFinal === "1") return;
    btn.dataset.terminalFinal = "1";
    btn.addEventListener("click", toggleTerminal, true);
    syncButton();
  }

  new MutationObserver(() => {
    wire();
    syncButton();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

  window.addEventListener("resize", syncButton);
  setInterval(() => { wire(); syncButton(); }, 700);
  wire();
})();
