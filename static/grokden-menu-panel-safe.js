(() => {
  const MENU_OPEN = "grokden-menu-open";
  const PANEL_HIDDEN = "grokden-panel-safe-hidden";
  const ROOT_SELECTOR = ".ide";

  const isVisible = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  };

  const closeMenus = () => {
    document.querySelectorAll(`.${MENU_OPEN}`).forEach((menu) => menu.classList.remove(MENU_OPEN));
  };

  const openMenu = (menu) => {
    closeMenus();
    menu.classList.add(MENU_OPEN);
  };

  function wireMenus() {
    document.querySelectorAll(".grokden-menu").forEach((menu) => {
      if (menu.dataset.safeMenu === "1") return;
      const trigger = menu.querySelector(".grokden-menu-trigger");
      if (!(trigger instanceof HTMLElement)) return;

      menu.dataset.safeMenu = "1";

      trigger.addEventListener("pointerdown", () => {
        menu.dataset.wasOpen = menu.classList.contains(MENU_OPEN) ? "1" : "0";
      }, true);

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const wasOpen = menu.dataset.wasOpen === "1";
        closeMenus();
        if (!wasOpen) menu.classList.add(MENU_OPEN);
        menu.dataset.wasOpen = "0";
      }, true);

      menu.addEventListener("mouseenter", () => {
        if (!document.querySelector(`.${MENU_OPEN}`)) return;
        if (!menu.classList.contains(MENU_OPEN)) openMenu(menu);
      });

      menu.addEventListener("mouseleave", () => {
        window.clearTimeout(menu._safeCloseTimer);
        menu._safeCloseTimer = window.setTimeout(() => {
          if (!menu.matches(":hover")) menu.classList.remove(MENU_OPEN);
        }, 140);
      });
    });
  }

  function clickTerminalEntry() {
    const buttons = Array.from(document.querySelectorAll("button"));
    const terminalButton = buttons.find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      const aria = (btn.getAttribute("aria-label") || "").trim().toLowerCase();
      return text === "workspace terminal" || aria === "terminal" || text === "terminal";
    });
    terminalButton?.click();
  }

  function wirePanelButton() {
    const button = document.querySelector(".grokden-layout-btn-panel");
    if (!(button instanceof HTMLElement) || button.dataset.safePanel === "1") return;
    button.dataset.safePanel = "1";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenus();

      const ide = document.querySelector(ROOT_SELECTOR);
      if (!(ide instanceof HTMLElement)) return;
      const terminal = document.querySelector(".terminal");
      const open = !ide.classList.contains(PANEL_HIDDEN) && isVisible(terminal);

      if (open) {
        ide.classList.add(PANEL_HIDDEN);
        button.classList.remove("active");
        return;
      }

      ide.classList.remove(PANEL_HIDDEN, "liquid-terminal-force-closed");
      clickTerminalEntry();
      window.setTimeout(() => button.classList.toggle("active", isVisible(document.querySelector(".terminal"))), 160);
    }, true);
  }

  function tick() {
    wireMenus();
    wirePanelButton();
  }

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".grokden-menu-bar")) return;
    closeMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });

  let attempts = 0;
  const timer = window.setInterval(() => {
    tick();
    attempts += 1;
    if (attempts > 80 && document.querySelector(".grokden-menu-bar")) window.clearInterval(timer);
  }, 250);

  window.addEventListener("resize", tick);
  tick();
})();
