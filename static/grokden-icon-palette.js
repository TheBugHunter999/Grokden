(() => {
  try {
    const key = "Grokden.settings";
    for (const legacyKey of [
      "AetherForge.settings",
      "AetherForgeTest.settings",
      "aetherforge.settings",
    ]) {
      if (localStorage.getItem(key) !== null) break;
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        localStorage.setItem(key, legacyValue);
        break;
      }
    }

    const raw = localStorage.getItem(key);
    if (!raw) return;

    const settings = JSON.parse(raw);
    if (!settings || typeof settings !== "object") return;

    if (settings.accent === "violet" || settings.accent === "coral") {
      settings.accent = "teal";
      localStorage.setItem(key, JSON.stringify(settings));
    }
  } catch {
    /* Ignore settings migration failures. */
  }
})();
