import { DEFAULT_SETTINGS } from "../src/lib/editor-utils";
import {
  buildExplorerDisplayRows,
  computeSearch,
  globToRegExp,
  isPathExcluded,
  isSearchExcluded,
  lineMatchesQuery,
  parsePatterns,
  pathMatchesAny,
  shouldExpandSymlinkDirectory,
} from "../src/lib/settings-runtime";

let passed = 0;
let failed = 0;

function assert(label: string, cond: boolean) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${label}`);
  }
}

const settings = { ...DEFAULT_SETTINGS };

// ── Exclude patterns ────────────────────────────────────────────────────────
const excludeCases: Array<[string, string, boolean]> = [
  ["proj/node_modules/lodash/index.js", "**/node_modules", true],
  ["proj/node_modules", "**/node_modules", true],
  ["node_modules/pkg.js", "**/node_modules", true],
  ["proj/.git/config", "**/.git", true],
  ["proj/.git", "**/.git", true],
  [".git", "**/.git", true],
  ["proj/dist/bundle.js", "**/dist", true],
  ["proj/dist", "**/dist", true],
  ["proj/src/index.ts", "**/node_modules", false],
  ["proj/src/index.ts", "**/dist", false],
  ["proj/foo.js", "**/*.js", true],
  ["proj/foo.ts", "**/*.js", false],
  ["foonode_modules", "**/node_modules", false],
  ["bar.git", "**/.git", false],
];

console.log("=== pathMatchesAny / exclude patterns ===");
for (const [path, pattern, expected] of excludeCases) {
  const result = pathMatchesAny(path, parsePatterns(pattern));
  assert(`${path} ~ ${pattern} => ${expected}`, result === expected);
}

console.log("=== isPathExcluded (default settings) ===");
assert("node_modules file excluded", isPathExcluded("C:/app/node_modules/foo.js", settings));
assert(".git file excluded", isPathExcluded("C:/app/.git/HEAD", settings));
assert("dist file excluded", isPathExcluded("C:/app/dist/out.js", settings));
assert("src file visible", !isPathExcluded("C:/app/src/main.ts", settings));

console.log("=== isSearchExcluded ===");
assert("search excludes node_modules by default", isSearchExcluded("C:/app/node_modules/x.js", settings));
const includeIgnored = {
  ...settings,
  searchIncludeIgnored: true,
  filesExcludePatterns: "**/vendor",
  searchExcludePatterns: "**/build/**",
};
assert("filesExclude still hides explorer paths", isPathExcluded("C:/app/vendor/x.ts", includeIgnored));
assert(
  "includeIgnored allows search in filesExclude-only paths",
  !isSearchExcluded("C:/app/vendor/x.ts", includeIgnored),
);
assert("searchExclude still applies", isSearchExcluded("C:/app/build/out.js", includeIgnored));

// ── lineMatchesQuery ────────────────────────────────────────────────────────
console.log("=== lineMatchesQuery ===");
assert("plain substring", lineMatchesQuery("hello world", "world", settings));
assert("case insensitive", lineMatchesQuery("Hello", "hello", settings));
const caseSens = { ...settings, searchCaseSensitive: true };
assert("case sensitive miss", !lineMatchesQuery("Hello", "hello", caseSens));
assert("whole word hit", lineMatchesQuery("foo bar", "foo", { ...settings, searchWholeWord: true }));
assert("whole word miss", !lineMatchesQuery("foobar", "foo", { ...settings, searchWholeWord: true }));
const regex = { ...settings, searchUseRegex: true };
assert("regex digit", lineMatchesQuery("a1b", "\\d", regex));
assert("invalid regex", !lineMatchesQuery("a1b", "[", regex));
const regexWord = { ...settings, searchUseRegex: true, searchWholeWord: true };
assert("regex whole word", lineMatchesQuery("foo bar", "foo", regexWord));
assert("regex whole word miss", !lineMatchesQuery("foobar", "foo", regexWord));

// ── computeSearch ───────────────────────────────────────────────────────────
console.log("=== computeSearch ===");
type Node = { path: string; name: string; is_dir: boolean };
const searchNodes: Node[] = [
  { path: "/src/App.tsx", name: "App.tsx", is_dir: false },
  { path: "/src/node_modules/hidden.ts", name: "hidden.ts", is_dir: false },
  { path: "/src/App.test.tsx", name: "App.test.tsx", is_dir: false },
];
const searchTabs = [
  { path: "/src/App.tsx", name: "App.tsx", content: "const greeting = 'hello';\nexport {};\n" },
  { path: "/src/dist/out.js", name: "out.js", content: "console.log('hello');\n" },
];
const fileHits = computeSearch("App", searchTabs, searchNodes, settings);
assert("finds explorer file by name", fileHits.files.some((f) => f.name === "App.tsx"));
assert("skips search-excluded paths", !fileHits.files.some((f) => f.path.includes("node_modules")));
const contentHits = computeSearch("hello", searchTabs, searchNodes, settings);
assert("searches open editor content", contentHits.matches.some((m) => m.path === "/src/App.tsx"));
assert("skips excluded open tabs", !contentHits.matches.some((m) => m.path.includes("/dist/")));

// ── File nesting ────────────────────────────────────────────────────────────
console.log("=== buildExplorerDisplayRows ===");
const nestNodes: Node[] = [
  { path: "/src", name: "src", is_dir: true },
  { path: "/src/App.tsx", name: "App.tsx", is_dir: false },
  { path: "/src/App.test.tsx", name: "App.test.tsx", is_dir: false },
  { path: "/src/index.ts", name: "index.ts", is_dir: false },
];
const nestSettings = { ...settings, fileNestingEnabled: true };
const collapsed = buildExplorerDisplayRows(nestNodes, nestSettings, new Set());
assert(
  "collapsed hides nest child",
  collapsed.some((r) => r.node.name === "App.tsx") &&
    !collapsed.some((r) => r.node.name === "App.test.tsx"),
);
const expanded = buildExplorerDisplayRows(nestNodes, nestSettings, new Set(["/src/App.tsx"]));
assert(
  "expanded shows nest child",
  expanded.some((r) => r.node.name === "App.test.tsx" && r.isNestChild),
);
assert(
  "parent has nested children flag",
  collapsed.find((r) => r.node.name === "App.tsx")?.hasNestedChildren === true,
);
const disabled = buildExplorerDisplayRows(nestNodes, { ...settings, fileNestingEnabled: false }, new Set());
assert("nesting disabled shows all files", disabled.length === nestNodes.length);

// ── Symlinks ────────────────────────────────────────────────────────────────
console.log("=== symlink handling ===");
assert("expands normal dirs", shouldExpandSymlinkDirectory(false, settings));
assert("expands symlink dirs when enabled", shouldExpandSymlinkDirectory(true, { ...settings, searchFollowSymlinks: true }));
assert("blocks symlink dirs when disabled", !shouldExpandSymlinkDirectory(true, { ...settings, searchFollowSymlinks: false }));

console.log("=== globToRegExp samples ===");
console.log("**/node_modules =>", globToRegExp("**/node_modules").source);
console.log("**/.git =>", globToRegExp("**/.git").source);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);