(() => {
  try {
    const key = "Grokden.settings";
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
