(() => {
  const MENU_OPEN = "grokden-menu-open";
  const ACTIVITY_HIDDEN = "grokden-activity-rail-hidden";
  const SIDEBAR_HIDDEN = "grokden-sidebar-hidden";
  const TERMINAL_HIDDEN = "grokden-terminal-hidden";
  const SECONDARY_HIDDEN = "grokden-secondary-hidden";

  const ide = () => document.querySelector(".ide");
  const visible = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && el.offsetParent !== null;
  };
  const norm = (v) => (v || "").replace(/\s+/g, " ").trim().toLowerCase();

  function clickButton(label) {
    const wanted = norm(label);
    const found = Array.from(document.querySelectorAll("button")).find((b) => norm(b.textContent).includes(wanted) || norm(b.getAttribute("aria-label")) === wanted);
    found?.click();
    return Boolean(found);
  }

  function clickExact(label) {
    const wanted = norm(label);
    const found = Array.from(document.querySelectorAll("button")).find((b) => norm(b.textContent) === wanted);
    found?.click();
    return Boolean(found);
  }

  function closeMenus() {
    document.querySelectorAll(`.${MENU_OPEN}`).forEach((el) => el.classList.remove(MENU_OPEN));
  }

  function anyMenuOpen() {
    return Boolean(document.querySelector(`.${MENU_OPEN}`));
  }

  function fixMenus() {
    document.querySelectorAll(".grokden-menu").forEach((menu) => {
      if (menu.dataset.grokdenMenuV2 === "1") return;
      menu.dataset.grokdenMenuV2 = "1";
      const trigger = menu.querySelector(".grokden-menu-trigger");
      if (!trigger) return;

      trigger.addEventListener("pointerdown", () => {
        menu.dataset.wasOpenBeforeClick = menu.classList.contains(MENU_OPEN) ? "1" : "0";
      }, true);

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const wasOpen = menu.dataset.wasOpenBeforeClick === "1";
        closeMenus();
        if (!wasOpen) menu.classList.add(MENU_OPEN);
        menu.dataset.wasOpenBeforeClick = "0";
      }, true);

      menu.addEventListener("mouseenter", () => {
        if (!anyMenuOpen() || menu.classList.contains(MENU_OPEN)) return;
        closeMenus();
        menu.classList.add(MENU_OPEN);
      });
    });
  }

  function fixIcons() {
    const settings = document.querySelector(".grokden-layout-btn-settings");
    if (!settings || settings.dataset.iconFixed === "1") return;
    settings.dataset.iconFixed = "1";
    settings.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 5h12M3 9h12M3 13h12"/><circle cx="6" cy="5" r="1.35"/><circle cx="12" cy="9" r="1.35"/><circle cx="8" cy="13" r="1.35"/></svg>';
  }

  function updateStates() {
    const root = ide();
    const controls = document.querySelector(".grokden-layout-controls");
    if (!root || !controls) return;
    controls.querySelector(".grokden-layout-btn-activity")?.classList.toggle("active", !root.classList.contains(ACTIVITY_HIDDEN) && visible(document.querySelector(".activity-rail")));
    controls.querySelector(".grokden-layout-btn-sidebar")?.classList.toggle("active", !root.classList.contains(SIDEBAR_HIDDEN) && visible(document.querySelector(".sidebar")));
    controls.querySelector(".grokden-layout-btn-panel")?.classList.toggle("active", !root.classList.contains(TERMINAL_HIDDEN) && visible(document.querySelector(".terminal")));
    controls.querySelector(".grokden-layout-btn-secondary")?.classList.toggle("active", !root.classList.contains(SECONDARY_HIDDEN) && visible(document.querySelector(".secondary-sidebar")));
  }

  function openTerminal() {
    const root = ide();
    root?.classList.remove(TERMINAL_HIDDEN, "liquid-terminal-force-closed");
    if (visible(document.querySelector(".terminal"))) return;
    clickExact("Workspace terminal") || clickButton("Terminal");
  }

  function patchLayoutButtons() {
    const root = ide();
    if (!root) return;
    const map = [
      [".grokden-layout-btn-activity", () => root.classList.toggle(ACTIVITY_HIDDEN)],
      [".grokden-layout-btn-sidebar", () => {
        if (!root.classList.contains(SIDEBAR_HIDDEN) && visible(document.querySelector(".sidebar"))) root.classList.add(SIDEBAR_HIDDEN);
        else { root.classList.remove(SIDEBAR_HIDDEN, "liquid-sidebar-force-closed"); if (!visible(document.querySelector(".sidebar"))) clickExact("Files"); }
      }],
      [".grokden-layout-btn-panel", () => {
        if (!root.classList.contains(TERMINAL_HIDDEN) && visible(document.querySelector(".terminal"))) root.classList.add(TERMINAL_HIDDEN);
        else openTerminal();
      }],
      [".grokden-layout-btn-secondary", () => {
        if (!root.classList.contains(SECONDARY_HIDDEN) && visible(document.querySelector(".secondary-sidebar"))) root.classList.add(SECONDARY_HIDDEN);
        else { root.classList.remove(SECONDARY_HIDDEN); if (!visible(document.querySelector(".secondary-sidebar"))) clickButton("Agent Activity"); }
      }],
    ];

    for (const [selector, action] of map) {
      const btn = document.querySelector(selector);
      if (!btn || btn.dataset.grokdenV2 === "1") continue;
      btn.dataset.grokdenV2 = "1";
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMenus();
        action();
        setTimeout(updateStates, 120);
      }, true);
    }
  }

  function tick() {
    fixMenus();
    fixIcons();
    patchLayoutButtons();
    updateStates();
  }

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".grokden-menu-bar")) return;
    closeMenus();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenus(); });
  new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  window.addEventListener("resize", tick);
  setInterval(tick, 800);
  tick();
})();
