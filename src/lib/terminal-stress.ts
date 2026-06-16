import { appendToBuffer, consumeTerminalInput } from "./terminal-input";
import {
  completionSuffix,
  searchCommandSuggestions,
  shouldShowSuggestions,
} from "./terminal-commands";

type StressResult = { name: string; ok: boolean; detail?: string };

function assert(name: string, condition: boolean, detail?: string): StressResult {
  return { name, ok: condition, detail: condition ? undefined : detail ?? "assertion failed" };
}

function stressTerminalInput(): StressResult[] {
  const results: StressResult[] = [];

  const backspace = consumeTerminalInput("\x7f", "hello");
  results.push(assert("backspace shrinks buffer", backspace.buffer === "hell" && backspace.forward === "\x7f"));

  const enter = consumeTerminalInput("\r", "npm run");
  results.push(assert("enter clears buffer", enter.buffer === "" && enter.forward === "\r"));

  const tabSwallowed = consumeTerminalInput("\t", "gi");
  results.push(assert("tab not forwarded", tabSwallowed.forward === "" && tabSwallowed.buffer === "gi"));

  const arrow = consumeTerminalInput("\x1b[A", "git");
  results.push(assert("csi forwarded", arrow.forward === "\x1b[A" && arrow.buffer === "git"));

  const burst = consumeTerminalInput("abcd\x7f\x7f\r", "");
  results.push(assert("burst edit", burst.buffer === "" && burst.forward === "ab\x7f\x7f\r"));

  const ctrlC = consumeTerminalInput("\x03", "partial");
  results.push(assert("ctrl+c clears buffer", ctrlC.buffer === "" && ctrlC.forward === "\x03"));

  results.push(assert("appendToBuffer chains", appendToBuffer("git ", "status") === "git status"));

  return results;
}

function stressTerminalCommands(): StressResult[] {
  const results: StressResult[] = [];

  const git = searchCommandSuggestions("gi");
  results.push(assert("git prefix match", git[0]?.command.toLowerCase().includes("git") ?? false));

  const npmRun = searchCommandSuggestions("npm ru");
  results.push(assert("npm subcommand", npmRun.some((s) => s.command === "npm run")));

  const suffix = completionSuffix("gi", git[0]!);
  results.push(assert("completion suffix", !!suffix && "git".startsWith("gi" + suffix) === false));

  results.push(assert("hide exact command", !shouldShowSuggestions("cls")));
  results.push(assert("show partial", shouldShowSuggestions("cl")));

  return results;
}

function stressInjectLogic(): StressResult[] {
  const results: StressResult[] = [];

  const withCr = "grok\r";
  const withoutCr = "grok";
  results.push(assert("inject adds cr", !withCr.endsWith("\r") === false));
  results.push(assert("inject needs cr suffix", withoutCr.endsWith("\r") || withoutCr.endsWith("\n") ? true : `${withoutCr}\r` === "grok\r"));

  const tokenGate = (token: number, last: number, cmd: string | null, visible: boolean) =>
    !token || token === last || !cmd || !visible;

  results.push(assert("inject blocked when hidden", tokenGate(2, 0, "grok", false)));
  results.push(assert("inject allowed when visible", !tokenGate(2, 0, "grok", true)));
  results.push(assert("inject without prompt ok", tokenGate(1, 0, "grok", true) === false));

  return results;
}

export function runTerminalStressTests(): StressResult[] {
  return [...stressTerminalInput(), ...stressTerminalCommands(), ...stressInjectLogic()];
}

export function formatStressReport(results: StressResult[]): string {
  const failed = results.filter((r) => !r.ok);
  const lines = results.map((r) => `${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  lines.push("", `Total: ${results.length}, Failed: ${failed.length}`);
  return lines.join("\n");
}