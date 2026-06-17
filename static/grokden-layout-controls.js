(() => {
  const ROOT_CLASS = "grokden-layout-controls";
  const BUTTON_CLASS = "grokden-layout-btn";
  const MENU_BAR_CLASS = "grokden-menu-bar";
  const MENU_OPEN_CLASS = "grokden-menu-open";
  const ACTIVITY_HIDDEN_CLASS = "grokden-activity-rail-hidden";
  const TERMINAL_FORCE_CLASS = "liquid-terminal-force-closed";
  const SIDEBAR_FORCE_CLASS = "liquid-sidebar-force-closed";
  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
  const modLabel = isMac ? "Cmd" : "Ctrl";

  function normalize(value) {
    return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getIde() {
    return document.querySelector(".ide");
  }

  function markNoDrag(element) {
    element.style.webkitAppRegion = "no-drag";
    element.style.appRegion = "no-drag";
  }

  function dispatchShortcut(key, options = {}) {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ctrlKey: options.ctrlKey ?? !isMac,
      metaKey: options.metaKey ?? isMac,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
    });
    window.dispatchEvent(event);
  }

  function clickButtonByText(text) {
    const wanted = normalize(text);
    const buttons = Array.from(document.querySelectorAll("button"));
    const found = buttons.find((button) => normalize(button.textContent).includes(wanted));
    found?.click();
    return Boolean(found);
  }

  function clickButtonByExactText(text) {
    const wanted = normalize(text);
    const buttons = Array.from(document.querySelectorAll("button"));
    const found = buttons.find((button) => normalize(button.textContent) === wanted);
    found?.click();
    return Boolean(found);
  }

  function clickSelector(selector) {
    const button = document.querySelector(selector);
    if (button instanceof HTMLButtonElement) {
      button.click();
      return true;
    }
    return false;
  }

  function clickRailButton(label) {
    const wanted = normalize(label);
    const buttons = Array.from(document.querySelectorAll(".activity-rail button"));
    const found = buttons.find((button) => normalize(button.getAttribute("aria-label")) === wanted || normalize(button.textContent).includes(wanted));
    found?.click();
    return Boolean(found);
  }

  function icon(type) {
    if (type === "activity") {
      return '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="3" width="13" height="12" rx="2"/><path d="M6.5 3v12"/><circle cx="4.5" cy="6" r=".55"/><circle cx="4.5" cy="9" r=".55"/><circle cx="4.5" cy="12" r=".55"/></svg>';
    }
    if (type === "sidebar") {
      return '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="3" width="13" height="12" rx="2"/><path d="M7 3v12"/></svg>';
    }
    if (type === "panel") {
      return '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="3" width="13" height="12" rx="2"/><path d="M2.5 10.5h13"/></svg>';
    }
    if (type === "secondary") {
      return '<svg viewBox="0 0 18 18" aria-hidden="true"><rect x="2.5" y="3" width="13" height="12" rx="2"/><path d="M11 3v12"/></svg>';
    }
    if (type === "quick") {
      return '<svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="M11.5 11.5 15 15"/></svg>';
    }
    if (type === "settings") {
      return '<svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="2.4"/><path d="M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2M4.4 4.4l1.4 1.4M12.2 12.2l1.4 1.4M4.4 13.6l1.4-1.4M12.2 5.8l1.4-1.4"/></svg>';
    }
    return "";
  }

  function isActivityRailVisible() {
    const ide = getIde();
    const rail = document.querySelector(".activity-rail");
    if (!ide || !(rail instanceof HTMLElement)) return false;
    if (ide.classList.contains(ACTIVITY_HIDDEN_CLASS)) return false;
    const style = getComputedStyle(rail);
    return style.display !== "none" && style.visibility !== "hidden" && rail.offsetParent !== null;
  }

  function toggleActivityRail() {
    const ide = getIde();
    if (!ide) return;
    ide.classList.toggle(ACTIVITY_HIDDEN_CLASS);
  }

  function isTerminalVisible() {
    const ide = getIde();
    const terminal = document.querySelector(".terminal");
    if (ide?.classList.contains(TERMINAL_FORCE_CLASS)) return false;
    if (!(terminal instanceof HTMLElement)) return false;
    if (terminal.classList.contains("panel-hidden")) return false;
    const style = getComputedStyle(terminal);
    return style.display !== "none" && style.visibility !== "hidden" && terminal.offsetParent !== null;
  }

  function openTerminalPanel() {
    const ide = getIde();
    ide?.classList.remove(TERMINAL_FORCE_CLASS);
    if (clickButtonByExactText("Workspace terminal")) return;
    if (clickRailButton("Terminal")) return;
    dispatchShortcut("j");
  }

  function toggleTerminalPanel() {
    const ide = getIde();
    if (!ide) return;
    if (isTerminalVisible()) {
      ide.classList.add(TERMINAL_FORCE_CLASS);
      return;
    }
    ide.classList.remove(TERMINAL_FORCE_CLASS);
    openTerminalPanel();
  }

  function isSidebarVisible() {
    const ide = getIde();
    const sidebar = document.querySelector(".sidebar");
    if (ide?.classList.contains(SIDEBAR_FORCE_CLASS)) return false;
    if (!(sidebar instanceof HTMLElement)) return false;
    const style = getComputedStyle(sidebar);
    return style.display !== "none" && style.visibility !== "hidden" && sidebar.offsetParent !== null;
  }

  function toggleExplorerSidebar() {
    const ide = getIde();
    if (!ide) return;
    if (isSidebarVisible()) {
      ide.classList.add(SIDEBAR_FORCE_CLASS);
      return;
    }
    ide.classList.remove(SIDEBAR_FORCE_CLASS);
    if (clickButtonByExactText("Files")) return;
    dispatchShortcut("b");
  }

  function toggleSecondarySidebar() {
    const secondary = document.querySelector(".secondary-sidebar");
    if (secondary instanceof HTMLElement && secondary.offsetParent !== null) {
      secondary.style.display = secondary.style.display === "none" ? "" : "none";
      return;
    }
    clickButtonByText("Agent Activity");
  }

  function openSettings() {
    clickSelector("button.settings-item") || clickButtonByText("Settings");
  }

  function quickOpen() {
    dispatchShortcut("p");
  }

  function saveActive() {
    clickButtonByExactText("Save") || dispatchShortcut("s");
  }

  function selectAll() {
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
      active.select();
      return;
    }
    document.execCommand("selectAll");
  }

  function copySelection() {
    document.execCommand("copy");
  }

  function pasteClipboard() {
    document.execCommand("paste");
  }

  function makeButton({ type, label, shortcut, onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS} ${BUTTON_CLASS}-${type}`;
    button.setAttribute("aria-label", label);
    button.title = shortcut ? `${label} (${shortcut})` : label;
    button.innerHTML = icon(type);
    markNoDrag(button);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
      queueMicrotask(updateState);
      setTimeout(updateState, 80);
    });
    return button;
  }

  function createControls() {
    const controls = document.createElement("div");
    controls.className = ROOT_CLASS;
    controls.setAttribute("role", "toolbar");
    controls.setAttribute("aria-label", "Layout controls");
    markNoDrag(controls);

    controls.append(
      makeButton({
        type: "activity",
        label: "Toggle Activity Bar",
        shortcut: "Activity rail",
        onClick: toggleActivityRail,
      }),
      makeButton({
        type: "sidebar",
        label: "Toggle Explorer Side Bar",
        shortcut: `${modLabel}+B`,
        onClick: toggleExplorerSidebar,
      }),
      makeButton({
        type: "panel",
        label: "Toggle Panel",
        shortcut: `${modLabel}+J`,
        onClick: toggleTerminalPanel,
      }),
      makeButton({
        type: "secondary",
        label: "Toggle Secondary Side Bar",
        shortcut: "Agent Activity",
        onClick: toggleSecondarySidebar,
      }),
      makeButton({
        type: "quick",
        label: "Quick Open",
        shortcut: `${modLabel}+P`,
        onClick: quickOpen,
      }),
      makeButton({
        type: "settings",
        label: "Settings",
        shortcut: "Settings",
        onClick: openSettings,
      }),
    );

    return controls;
  }

  const menus = [
    {
      label: "File",
      items: [
        ["Open Folder…", () => clickButtonByText("Switch folder") || clickButtonByText("Open folder")],
        ["Save", saveActive, `${modLabel}+S`],
        ["Quick Open…", quickOpen, `${modLabel}+P`],
        ["Settings", openSettings],
      ],
    },
    {
      label: "Edit",
      items: [
        ["Copy", copySelection, `${modLabel}+C`],
        ["Paste", pasteClipboard, `${modLabel}+V`],
        ["Select All", selectAll, `${modLabel}+A`],
      ],
    },
    {
      label: "Selection",
      items: [["Select All", selectAll, `${modLabel}+A`]],
    },
    {
      label: "View",
      items: [
        ["Toggle Activity Bar", toggleActivityRail],
        ["Toggle Explorer Side Bar", toggleExplorerSidebar, `${modLabel}+B`],
        ["Toggle Panel", toggleTerminalPanel, `${modLabel}+J`],
        ["Toggle Secondary Side Bar", toggleSecondarySidebar],
        ["Search", () => clickRailButton("Search")],
        ["Source Control", () => clickButtonByText("Source Control")],
      ],
    },
    {
      label: "Go",
      items: [
        ["Quick Open…", quickOpen, `${modLabel}+P`],
        ["Explorer", () => clickButtonByExactText("Files")],
        ["Search", () => clickRailButton("Search")],
      ],
    },
    {
      label: "Run",
      items: [
        ["Launch Grok CLI", () => clickButtonByText("Launch Grok") || clickButtonByText("Grok CLI")],
        ["Parallel Agents", () => clickRailButton("Parallel Agents") || clickButtonByText("Parallel agents")],
        ["Debug Panel", () => { openTerminalPanel(); clickButtonByText("Debug"); }],
      ],
    },
    {
      label: "Terminal",
      items: [
        ["Toggle Terminal", toggleTerminalPanel, `${modLabel}+J`],
        ["Open Workspace Terminal", openTerminalPanel],
        ["Launch Grok CLI", () => clickButtonByText("Launch Grok") || clickButtonByText("Grok CLI")],
      ],
    },
    {
      label: "Help",
      items: [
        ["Settings", openSettings],
        ["Check for Updates", () => clickSelector(".update-indicator") || clickButtonByText("Updates")],
      ],
    },
  ];

  function closeMenus() {
    document.querySelectorAll(`.${MENU_OPEN_CLASS}`).forEach((node) => node.classList.remove(MENU_OPEN_CLASS));
  }

  function createMenuBar() {
    const bar = document.createElement("nav");
    bar.className = MENU_BAR_CLASS;
    bar.setAttribute("aria-label", "Application menu");
    markNoDrag(bar);

    for (const menu of menus) {
      const item = document.createElement("div");
      item.className = "grokden-menu";
      markNoDrag(item);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "grokden-menu-trigger";
      button.textContent = menu.label;
      markNoDrag(button);

      const list = document.createElement("div");
      list.className = "grokden-menu-list";
      list.setAttribute("role", "menu");
      markNoDrag(list);

      for (const [label, action, shortcut] of menu.items) {
        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.className = "grokden-menu-item";
        menuButton.setAttribute("role", "menuitem");
        menuButton.innerHTML = `<span>${label}</span>${shortcut ? `<kbd>${shortcut}</kbd>` : ""}`;
        markNoDrag(menuButton);
        menuButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          closeMenus();
          action();
          setTimeout(updateState, 80);
        });
        list.append(menuButton);
      }

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const open = item.classList.contains(MENU_OPEN_CLASS);
        closeMenus();
        item.classList.toggle(MENU_OPEN_CLASS, !open);
      });

      item.append(button, list);
      bar.append(item);
    }

    return bar;
  }

  function updateState() {
    const controls = document.querySelector(`.${ROOT_CLASS}`);
    if (!controls) return;
    controls.querySelector(`.${BUTTON_CLASS}-activity`)?.classList.toggle("active", isActivityRailVisible());
    controls.querySelector(`.${BUTTON_CLASS}-sidebar`)?.classList.toggle("active", isSidebarVisible());
    controls.querySelector(`.${BUTTON_CLASS}-panel`)?.classList.toggle("active", isTerminalVisible());
    controls.querySelector(`.${BUTTON_CLASS}-secondary`)?.classList.toggle("active", Boolean(document.querySelector(".secondary-sidebar:not([style*='display: none'])")));
    controls.querySelector(`.${BUTTON_CLASS}-settings`)?.classList.toggle("active", Boolean(document.querySelector(".tab .settings-badge, .settings-view")));
    controls.querySelector(`.${BUTTON_CLASS}-quick`)?.classList.toggle("active", Boolean(document.querySelector(".quick-open, [role='dialog'] .quick-open")));
  }

  function mount() {
    const chrome = document.querySelector(".ide .window-chrome");
    if (!chrome) return;

    if (!chrome.querySelector(`.${MENU_BAR_CLASS}`)) {
      const drag = chrome.querySelector(".chrome-drag");
      chrome.insertBefore(createMenuBar(), drag || chrome.firstChild);
    }

    if (!chrome.querySelector(`.${ROOT_CLASS}`)) {
      const controls = createControls();
      const chromeControls = chrome.querySelector(".chrome-controls");
      chrome.insertBefore(controls, chromeControls || null);
    }

    updateState();
  }

  const observer = new MutationObserver(() => {
    mount();
    updateState();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-selected"],
  });

  window.addEventListener("resize", updateState);
  window.addEventListener("focus", updateState);
  document.addEventListener("click", () => {
    closeMenus();
    setTimeout(updateState, 60);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });

  mount();
})();
