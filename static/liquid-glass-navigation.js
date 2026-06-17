(() => {
  const SIDEBAR_FORCE_CLASS = "liquid-sidebar-force-closed";
  const TERMINAL_FORCE_CLASS = "liquid-terminal-force-closed";
  const SIDEBAR_KEY_ATTR = "data-liquid-sidebar-force";

  const normalize = (value) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const getIde = () => document.querySelector(".ide");

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  }

  function buttonText(button) {
    return normalize(button.textContent);
  }

  function isDisabled(button) {
    return button.disabled || button.getAttribute("aria-disabled") === "true";
  }

  function isButtonActive(button) {
    return button.classList.contains("active") || button.getAttribute("aria-selected") === "true";
  }

  function sidebarKeyFor(button) {
    const aria = normalize(button.getAttribute("aria-label"));
    const text = buttonText(button);

    if (aria === "search") return "search";
    if (text === "files" || text.startsWith("files ")) return "explorer";
    if (button.classList.contains("codex-project-row")) return "explorer";
    if (text.includes("source control")) return "scm";
    return null;
  }

  function isTerminalButton(button) {
    const aria = normalize(button.getAttribute("aria-label"));
    const text = buttonText(button);
    return aria === "terminal" || text === "workspace terminal" || text.startsWith("workspace terminal ");
  }

  function clearSidebarForce(ide) {
    ide.classList.remove(SIDEBAR_FORCE_CLASS);
    ide.removeAttribute(SIDEBAR_KEY_ATTR);
  }

  function handleSidebarToggle(event, ide, button, key) {
    const forcedKey = ide.getAttribute(SIDEBAR_KEY_ATTR);
    const forcedClosed = ide.classList.contains(SIDEBAR_FORCE_CLASS);

    if (forcedClosed && forcedKey === key) {
      stop(event);
      clearSidebarForce(ide);
      return true;
    }

    if (forcedClosed && forcedKey !== key) {
      clearSidebarForce(ide);
      return false;
    }

    if (isButtonActive(button)) {
      stop(event);
      ide.classList.add(SIDEBAR_FORCE_CLASS);
      ide.setAttribute(SIDEBAR_KEY_ATTR, key);
      return true;
    }

    clearSidebarForce(ide);
    return false;
  }

  function handleTerminalToggle(event, ide, button) {
    const forcedClosed = ide.classList.contains(TERMINAL_FORCE_CLASS);

    if (forcedClosed) {
      stop(event);
      ide.classList.remove(TERMINAL_FORCE_CLASS);
      return true;
    }

    if (isButtonActive(button)) {
      stop(event);
      ide.classList.add(TERMINAL_FORCE_CLASS);
      return true;
    }

    ide.classList.remove(TERMINAL_FORCE_CLASS);
    return false;
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!button || isDisabled(button)) return;

      const rail = button.closest(".activity-rail");
      if (!rail) return;

      const ide = getIde();
      if (!ide) return;

      const key = sidebarKeyFor(button);
      if (key && handleSidebarToggle(event, ide, button, key)) return;

      if (isTerminalButton(button) && handleTerminalToggle(event, ide, button)) return;

      // Moving to other rail destinations should not leave a fake hidden state behind.
      if (!key) clearSidebarForce(ide);
    },
    true,
  );

  // If Svelte rerenders the workspace after folder/settings changes, clear stale forced states
  // when the matching panel is truly gone. This keeps the tiny DOM shim predictable.
  const observer = new MutationObserver(() => {
    const ide = getIde();
    if (!ide) return;

    if (ide.classList.contains(SIDEBAR_FORCE_CLASS) && !ide.querySelector(".sidebar")) {
      clearSidebarForce(ide);
    }

    if (ide.classList.contains(TERMINAL_FORCE_CLASS) && !ide.querySelector(".terminal")) {
      ide.classList.remove(TERMINAL_FORCE_CLASS);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
