(() => {
  const HERO_CLASS = "welcome-supergrok-hero";

  function createHero() {
    const hero = document.createElement("div");
    hero.className = HERO_CLASS;
    hero.setAttribute("aria-label", "SuperGrok Heavy");
    hero.innerHTML = `
      <span class="welcome-supergrok-word">SuperGrok</span>
      <span class="welcome-supergrok-badge">HEAVY</span>
    `;
    return hero;
  }

  function syncWelcomeHero() {
    const welcome = document.querySelector(".welcome-center");
    if (!welcome) return;
    if (welcome.querySelector(`.${HERO_CLASS}`)) return;

    const title = welcome.querySelector(".welcome-title");
    const hero = createHero();
    if (title) {
      welcome.insertBefore(hero, title);
    } else {
      welcome.prepend(hero);
    }
  }

  const observer = new MutationObserver(syncWelcomeHero);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncWelcomeHero, { once: true });
  } else {
    syncWelcomeHero();
  }

  window.addEventListener("focus", syncWelcomeHero);
  window.setTimeout(syncWelcomeHero, 250);
})();
