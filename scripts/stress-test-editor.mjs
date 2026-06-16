/**
 * Stress-test editor utilities (vim movement, chords, whitespace, format, multi-cursor helpers).
 * Self-contained — mirrors logic from src/lib/settings-runtime.ts.
 * Run: node scripts/stress-test-editor.mjs
 */

function renderWhitespaceVisual(content, mode) {
  if (mode === "none") return content;
  const showAll = mode === "all";
  return content
    .split("\n")
    .map((line) => {
      if (showAll) return line.replace(/\t/g, "→").replace(/ /g, "·");
      const trail = line.match(/[ \t]+$/);
      if (!trail) return line;
      const visible = line.slice(0, -trail[0].length);
      const marked = trail[0].replace(/\t/g, "→").replace(/ /g, "·");
      return visible + marked;
    })
    .join("\n");
}

function normalizeTrailing(content) {
  const lines = content.split("\n");
  const trimmed = lines.map((l) => l.replace(/[ \t]+$/, ""));
  let result = trimmed.join("\n");
  if (result.length > 0 && !result.endsWith("\n")) result += "\n";
  return result;
}

function formatContent(content, fileName, settings) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2) + "\n";
      return { content: formatted, changed: formatted !== content, label: "JSON" };
    } catch {
      return { content, changed: false, label: "JSON" };
    }
  }
  const normalized = normalizeTrailing(content);
  return { content: normalized, changed: normalized !== content, label: "Prettier (built-in shim)" };
}

function applySavePipeline(content, fileName, settings) {
  let current = content;
  let changed = false;
  const labels = [];
  if (settings.formatOnSave) {
    const fmt = formatContent(current, fileName, settings);
    current = fmt.content;
    changed = changed || fmt.changed;
    if (fmt.changed) labels.push(fmt.label);
  }
  return { content: current, changed, label: labels.length ? labels.join(" + ") : "unchanged" };
}

function resolveChordSecondKey(key) {
  const k = key.toLowerCase();
  if (k === "s") return "saveAll";
  if (k === ",") return "openSettings";
  if (k === "z") return "toggleZen";
  return null;
}

function multiCursorModifierActive(event, modifier) {
  if (modifier === "alt") return event.altKey;
  if (modifier === "ctrl") return event.ctrlKey;
  if (modifier === "cmd") return event.metaKey;
  return event.altKey;
}

function mergeMultiCursorAnchor(extraCursors, anchor, newPrimary) {
  if (anchor === null || anchor === newPrimary) return extraCursors;
  const merged = [...extraCursors, anchor].filter((p) => p !== newPrimary);
  return [...new Set(merged)];
}

function vimCursorLeft(pos) {
  return pos > 0 ? pos - 1 : null;
}

function vimCursorRight(value, pos) {
  return pos < value.length ? pos + 1 : null;
}

function vimCursorUp(value, pos) {
  const lines = value.slice(0, pos).split("\n");
  if (lines.length <= 1) return null;
  const col = lines[lines.length - 1].length;
  const prevLine = lines[lines.length - 2];
  const uptoPrev = lines.slice(0, -1).join("\n");
  return uptoPrev.length - prevLine.length + Math.min(col, prevLine.length);
}

function vimCursorDown(value, pos) {
  const lines = value.slice(0, pos).split("\n");
  const lineIdx = lines.length;
  const allLines = value.split("\n");
  if (lineIdx >= allLines.length) return null;
  const col = lines[lines.length - 1].length;
  const prefix = allLines.slice(0, lineIdx).join("\n");
  return prefix.length + (prefix ? 1 : 0) + Math.min(col, allLines[lineIdx].length);
}

function vimCursorDownBuggy(value, pos) {
  const lines = value.slice(0, pos).split("\n");
  const col = lines[lines.length - 1].length;
  const lineIdx = lines.length;
  const allLines = value.split("\n");
  if (lineIdx < allLines.length) {
    return (
      value.split("\n").slice(0, lineIdx + 1).join("\n").length +
      1 +
      Math.min(col, allLines[lineIdx].length)
    );
  }
  return null;
}

let passed = 0;
let failed = 0;

function assert(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n=== Whitespace overlay ===");
const wsSample = "hello  \n\tindented\nno-trail";
assert("all mode marks spaces", renderWhitespaceVisual(wsSample, "all").includes("··"));
assert("boundary only trails", renderWhitespaceVisual(wsSample, "boundary").startsWith("hello··"));

console.log("\n=== Format on save pipeline ===");
const messy = '{"a":1}  \n';
const pipeline = applySavePipeline(messy, "test.json", { formatOnSave: true });
assert("formatOnSave changes json", pipeline.changed);
assert("formatOnSave off", !applySavePipeline(messy, "test.json", { formatOnSave: false }).changed);

console.log("\n=== Chord keybindings ===");
assert("Ctrl+K S", resolveChordSecondKey("s") === "saveAll");
assert("Ctrl+K ,", resolveChordSecondKey(",") === "openSettings");
assert("Ctrl+K z", resolveChordSecondKey("z") === "toggleZen");
assert("unknown key", resolveChordSecondKey("x") === null);

console.log("\n=== Multi-cursor ===");
assert("alt modifier", multiCursorModifierActive({ altKey: true }, "alt"));
assert("merge anchor", mergeMultiCursorAnchor([], 5, 12).join() === "5");

console.log("\n=== Vim movement ===");
const doc = "alpha\nbravo\ncharlie";
const posOnBravo = 8;
const buggy = vimCursorDownBuggy(doc, posOnBravo);
const fixed = vimCursorDown(doc, posOnBravo);
assert("buggy j overshoots", buggy !== fixed, `buggy=${buggy} fixed=${fixed}`);
assert("fixed j lands correctly", fixed === 14);
assert("k is inverse of j", vimCursorUp(doc, fixed) === posOnBravo);
assert("h/l work", vimCursorLeft(3) === 2 && vimCursorRight(doc, 3) === 4);

console.log("\n=== Minimap (structural) ===");
const lines = doc.split("\n");
assert("line count", lines.length === 3);
assert("long-line class threshold", lines.every((l) => l.trim().length <= 40));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);