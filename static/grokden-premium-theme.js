(() => {
  const LEGACY_STORAGE_KEYS = [
    "AetherForge.premiumGrokTheme.enabled",
    "AetherForgeTest.premiumGrokTheme.enabled",
    "aetherforge.premiumGrokTheme.enabled",
  ];
  const STORAGE_KEY = "Grokden.premiumGrokTheme.enabled";

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    if (localStorage.getItem(STORAGE_KEY) !== null) break;
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null) {
      localStorage.setItem(STORAGE_KEY, legacyValue);
      break;
    }
  }
  const CLASS_NAME = "grokden-premium-theme";
  const CARD_CLASS = "grok-premium-theme-card";

  function premiumEnabled() {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === null) {
      localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    return value === "1";
  }

  function setPremiumEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    applyPremiumTheme(enabled);
    syncThemeCardState();
  }

  function getIde() {
    return document.querySelector(".ide");
  }

  function applyPremiumTheme(enabled = premiumEnabled()) {
    const ide = getIde();
    if (!ide) return;
    ide.classList.toggle(CLASS_NAME, enabled);
    ide.setAttribute("data-premium-grok-theme", enabled ? "true" : "false");
  }

  function syncThemeCardState() {
    const enabled = premiumEnabled();
    document.querySelectorAll(`.${CARD_CLASS}`).forEach((card) => {
      card.classList.toggle("active", enabled);
      card.setAttribute("aria-pressed", enabled ? "true" : "false");
    });
  }

  function makePremiumCard() {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `theme-card ${CARD_CLASS}`;
    card.setAttribute("aria-label", "Premium Grok theme");
    card.innerHTML = `
      <span class="theme-prev">
        <span class="tp-bar" style="background:#f5f5f5"></span>
        <span class="tp-dot" style="background:#151515"></span>
      </span>
      <span class="theme-name">Premium Grok</span>
    `;
    card.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setPremiumEnabled(true);
    });
    return card;
  }

  function injectThemeCard() {
    const grid = document.querySelector(".settings-view .theme-grid");
    if (!grid || grid.querySelector(`.${CARD_CLASS}`)) return;

    const card = makePremiumCard();
    grid.insertBefore(card, grid.firstChild);
    syncThemeCardState();

    grid.querySelectorAll(".theme-card:not(.grok-premium-theme-card)").forEach((existing) => {
      existing.addEventListener(
        "click",
        () => {
          setPremiumEnabled(false);
        },
        { capture: true },
      );
    });
  }

  function sync() {
    applyPremiumTheme();
    injectThemeCard();
    syncThemeCardState();
  }

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });

  window.addEventListener("storage", sync);
  window.addEventListener("focus", sync);
  window.addEventListener("resize", sync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  window.setTimeout(sync, 250);
})();
