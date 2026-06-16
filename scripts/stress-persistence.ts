/**
 * Stress tests for localStorage session/settings persistence helpers.
 * Run: npx tsx scripts/stress-persistence.ts
 */
import { DEFAULT_SETTINGS, type AppSettings } from "../src/lib/editor-utils";
import {
  applyRestoredTerminalSettings,
  buildTerminalSessionSlice,
  isEmptySessionSnapshot,
  parseSessionPayload,
  resolveRestoredTerminalOpen,
  resolveSavedTerminalOpen,
  shouldPersistSessionSnapshot,
  shouldRestoreSession,
} from "../src/lib/settings-runtime";

type MemoryStorage = {
  store: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function cloneSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function stressShouldRestoreSession(): void {
  assert(shouldRestoreSession(cloneSettings()), "default should restore");
  assert(!shouldRestoreSession(cloneSettings({ startupBehavior: "welcome" })), "welcome skips restore");
  assert(!shouldRestoreSession(cloneSettings({ restoreWindows: false })), "restoreWindows off");
  assert(
    !shouldRestoreSession(cloneSettings({ startupBehavior: "empty", restoreWindows: true })),
    "empty skips restore",
  );
}

function stressTerminalRestoreMatrix(): void {
  const cases: Array<{
    label: string;
    settings: Partial<AppSettings>;
    savedOpen: boolean | undefined;
    expected: boolean;
  }> = [
    { label: "persist + saved open", settings: { terminalPersistSession: true }, savedOpen: true, expected: true },
    { label: "persist + saved closed", settings: { terminalPersistSession: true }, savedOpen: false, expected: false },
    {
      label: "persist + missing uses showTerminalOnStart",
      settings: { terminalPersistSession: true, showTerminalOnStart: false },
      savedOpen: undefined,
      expected: false,
    },
    {
      label: "no persist ignores saved open",
      settings: { terminalPersistSession: false, showTerminalOnStart: true },
      savedOpen: false,
      expected: true,
    },
    {
      label: "no persist closed startup",
      settings: { terminalPersistSession: false, showTerminalOnStart: false },
      savedOpen: true,
      expected: false,
    },
  ];

  for (const c of cases) {
    const settings = cloneSettings(c.settings);
    const actual = resolveRestoredTerminalOpen(settings, c.savedOpen);
    assertEq(actual, c.expected, c.label);
  }
}

function stressSessionSlice(): void {
  const off = cloneSettings({ terminalPersistSession: false });
  assert(buildTerminalSessionSlice(off, true, "C:/proj") === null, "slice null when persist off");

  const on = cloneSettings({ terminalPersistSession: true, terminalShellPath: "  pwsh.exe  " });
  const slice = buildTerminalSessionSlice(on, false, "C:/proj");
  assert(slice !== null, "slice exists when persist on");
  assertEq(slice?.open, false, "slice open flag");
  assertEq(slice?.cwd, "C:/proj", "slice cwd");
  assertEq(slice?.shell, "pwsh.exe", "slice shell trimmed");
}

function stressPersistGating(): void {
  const empty = { folderPath: null, tabs: [] as Array<{ path: string; name: string; savedContent: string }> };
  const populated = {
    folderPath: "C:/repo",
    tabs: [{ path: "C:/repo/a.ts", name: "a.ts", savedContent: "x" }],
  };

  const restore = cloneSettings({ startupBehavior: "restore", restoreWindows: true });
  const welcome = cloneSettings({ startupBehavior: "welcome", restoreWindows: true });

  assert(!shouldPersistSessionSnapshot(restore, false, empty), "not hydrated");
  assert(shouldPersistSessionSnapshot(restore, true, empty), "restore mode can save empty after hydrate");
  assert(shouldPersistSessionSnapshot(restore, true, populated), "restore mode saves populated");

  assert(!shouldPersistSessionSnapshot(welcome, true, empty), "welcome does not clobber with empty");
  assert(shouldPersistSessionSnapshot(welcome, true, populated), "welcome saves once user has state");

  assert(isEmptySessionSnapshot(empty), "empty snapshot");
  assert(!isEmptySessionSnapshot(populated), "populated snapshot");
  assert(!shouldPersistSessionSnapshot(cloneSettings({ restoreWindows: false }), true, populated), "restoreWindows off");
}

function stressParsePayload(): void {
  assert(parseSessionPayload("") === null, "empty string");
  assert(parseSessionPayload("[]") === null, "array payload");
  assert(parseSessionPayload("{") === null, "invalid json");

  const payload = parseSessionPayload(
    JSON.stringify({
      folderPath: "C:/x",
      terminal: { open: false },
      terminalOpen: true,
    }),
  );
  assert(payload !== null, "valid payload");
  assertEq(resolveSavedTerminalOpen(payload!), false, "nested terminal.open wins");
}

function stressApplyTerminalSettings(): void {
  const base = cloneSettings({ terminalPersistSession: true, terminalShellPath: "cmd.exe" });
  const updated = applyRestoredTerminalSettings(base, { terminal: { shell: "pwsh.exe" } });
  assertEq(updated.terminalShellPath, "pwsh.exe", "shell restored");

  const unchanged = applyRestoredTerminalSettings(base, { terminal: {} });
  assertEq(unchanged.terminalShellPath, "cmd.exe", "missing shell leaves settings");

  const persistOff = applyRestoredTerminalSettings(
    cloneSettings({ terminalPersistSession: false }),
    { terminal: { shell: "pwsh.exe" } },
  );
  assertEq(persistOff.terminalShellPath, DEFAULT_SETTINGS.terminalShellPath, "persist off ignores shell");
}

/** Simulates startup race: save effect must not run before hydration. */
function stressStartupRace(): void {
  const storage = createMemoryStorage();
  const sessionKey = "Grokden.session";
  const settingsKey = "Grokden.settings";

  const priorSession = {
    folderPath: "C:/Grokden",
    tabs: [{ path: "C:/Grokden/README.md", name: "README.md", savedContent: "# Hi" }],
    activeTabPath: "C:/Grokden/README.md",
    terminalOpen: true,
    terminal: { open: true, cwd: "C:/Grokden", shell: "" },
    secondarySidebarOpen: false,
    sidebarCollapsed: false,
    activePanel: "explorer" as const,
  };
  storage.setItem(sessionKey, JSON.stringify(priorSession));

  let hydrated = false;
  const settings = cloneSettings();

  const trySave = (folderPath: string | null, tabs: typeof priorSession.tabs) => {
    const payload = { folderPath, tabs };
    if (shouldPersistSessionSnapshot(settings, hydrated, payload)) {
      storage.setItem(sessionKey, JSON.stringify({ ...priorSession, ...payload }));
    }
  };

  // Effect fires on first render before restore completes.
  trySave(null, []);
  assert(storage.getItem(sessionKey) === JSON.stringify(priorSession), "pre-hydration save blocked");

  hydrated = true;
  trySave(null, []);
  assert(
    storage.getItem(sessionKey) !== JSON.stringify(priorSession),
    "restore mode may persist empty state after hydration",
  );

  trySave(priorSession.folderPath, priorSession.tabs);
  const saved = parseSessionPayload(storage.getItem(sessionKey)!);
  assert(saved?.folderPath === priorSession.folderPath, "meaningful state persists after hydrate");

  storage.setItem(settingsKey, JSON.stringify({ theme: "midnight", fontSize: 15 }));
  const raw = storage.getItem(settingsKey);
  const merged = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  assertEq(merged.theme, "midnight", "settings merge theme");
  assertEq(merged.fontSize, 15, "settings merge fontSize");
  assertEq(merged.startupBehavior, DEFAULT_SETTINGS.startupBehavior, "settings merge keeps defaults");
}

function stressRapidToggles(iterations = 500): void {
  const storage = createMemoryStorage();
  let hydrated = true;
  let settings = cloneSettings();
  let folderPath: string | null = "C:/work";
  let tabs = [{ path: "C:/work/a.ts", name: "a.ts", savedContent: "let x=1" }];
  let terminalOpen = true;

  for (let i = 0; i < iterations; i++) {
    settings = cloneSettings({
      startupBehavior: i % 3 === 0 ? "welcome" : i % 3 === 1 ? "empty" : "restore",
      restoreWindows: i % 2 === 0,
      terminalPersistSession: i % 5 === 0,
      showTerminalOnStart: i % 7 !== 0,
    });
    terminalOpen = !terminalOpen;
    if (i % 11 === 0) {
      folderPath = null;
      tabs = [];
    } else {
      folderPath = "C:/work";
      tabs = [{ path: "C:/work/a.ts", name: "a.ts", savedContent: `let x=${i}` }];
    }

    const terminal = buildTerminalSessionSlice(settings, terminalOpen, folderPath);
    const payload = { folderPath, tabs, terminalOpen, terminal };
    const persisted = shouldPersistSessionSnapshot(settings, hydrated, payload);
    if (persisted) {
      storage.setItem("Grokden.session", JSON.stringify(payload));
    }

    if (persisted) {
      const parsed = parseSessionPayload(storage.getItem("Grokden.session")!);
      assert(parsed !== null, `parse survives toggle ${i}`);
      if (settings.terminalPersistSession && terminal) {
        assertEq(parsed?.terminal?.open, terminalOpen, `terminal open round-trip ${i}`);
      } else {
        assertEq(parsed?.terminalOpen, terminalOpen, `legacy terminalOpen round-trip ${i}`);
      }
    }
  }
}

function stressMalformedStorage(): void {
  const garbage = ["", "not-json", "[]", "null", '{"tabs":"bad"}', '{"terminal":42}'];
  for (const raw of garbage) {
    const parsed = parseSessionPayload(raw);
    if (raw === '{"tabs":"bad"}') {
      assert(parsed !== null, "loosely typed payload still parses");
    }
    resolveSavedTerminalOpen(parsed ?? {});
    applyRestoredTerminalSettings(cloneSettings({ terminalPersistSession: true }), parsed ?? {});
  }
}

const suites: Array<[string, () => void]> = [
  ["shouldRestoreSession", stressShouldRestoreSession],
  ["terminalRestoreMatrix", stressTerminalRestoreMatrix],
  ["sessionSlice", stressSessionSlice],
  ["persistGating", stressPersistGating],
  ["parsePayload", stressParsePayload],
  ["applyTerminalSettings", stressApplyTerminalSettings],
  ["startupRace", stressStartupRace],
  ["rapidToggles", () => stressRapidToggles(500)],
  ["malformedStorage", stressMalformedStorage],
];

let passed = 0;
for (const [name, fn] of suites) {
  fn();
  passed++;
  console.log(`  ok ${name}`);
}

console.log(`\n${passed}/${suites.length} persistence stress suites passed.`);