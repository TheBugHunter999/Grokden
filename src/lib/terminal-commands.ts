export type CommandSuggestion = {
  command: string;
  desc: string;
  category: string;
  example?: string;
  aliases?: string[];
  subcommands?: string[];
};

export const TERMINAL_COMMANDS: CommandSuggestion[] = [
  { command: "cd", desc: "Change directory", category: "Navigation", example: "cd C:\\Projects", aliases: ["chdir", "sl", "Set-Location"] },
  { command: "pwd", desc: "Print working directory", category: "Navigation", example: "pwd", aliases: ["Get-Location", "gl"] },
  { command: "dir", desc: "List directory contents", category: "Navigation", example: "dir", aliases: ["ls", "gci", "Get-ChildItem"] },
  { command: "tree", desc: "Display folder structure", category: "Navigation", example: "tree /F" },
  { command: "pushd", desc: "Push directory onto stack", category: "Navigation", example: "pushd C:\\Temp" },
  { command: "popd", desc: "Pop directory from stack", category: "Navigation", example: "popd" },

  { command: "mkdir", desc: "Create a folder", category: "Files", example: "mkdir src", aliases: ["md", "New-Item", "ni"] },
  { command: "rmdir", desc: "Remove an empty folder", category: "Files", example: "rmdir old", aliases: ["rd"] },
  { command: "copy", desc: "Copy files or folders", category: "Files", example: "copy file.txt backup.txt", aliases: ["cp", "Copy-Item", "cpi"] },
  { command: "move", desc: "Move or rename files", category: "Files", example: "move a.txt b.txt", aliases: ["mv", "Move-Item", "mi"] },
  { command: "ren", desc: "Rename a file", category: "Files", example: "ren old.txt new.txt", aliases: ["rename", "Rename-Item", "rni"] },
  { command: "del", desc: "Delete files", category: "Files", example: "del file.txt", aliases: ["erase", "Remove-Item", "ri", "rm"] },
  { command: "type", desc: "Print file contents", category: "Files", example: "type README.md", aliases: ["cat", "Get-Content", "gc"] },
  { command: "notepad", desc: "Open file in Notepad", category: "Files", example: "notepad notes.txt" },
  { command: "more", desc: "Page through file output", category: "Files", example: "type log.txt | more" },

  { command: "cls", desc: "Clear the screen", category: "Shell", example: "cls", aliases: ["clear", "Clear-Host"] },
  { command: "echo", desc: "Print text", category: "Shell", example: "echo Hello", aliases: ["Write-Output"] },
  { command: "exit", desc: "Close the shell session", category: "Shell", example: "exit" },
  { command: "help", desc: "Show command help", category: "Shell", example: "help cd", aliases: ["Get-Help"] },
  { command: "where", desc: "Locate a program on PATH", category: "Shell", example: "where git", aliases: ["where.exe", "Get-Command", "gcm"] },
  { command: "set", desc: "Show or set environment variables", category: "Shell", example: "set PATH" },

  { command: "git", desc: "Version control", category: "Git", example: "git status", subcommands: [
    "add", "am", "archive", "bisect", "branch", "bundle", "checkout", "cherry-pick", "clean", "clone",
    "commit", "config", "describe", "diff", "fetch", "format-patch", "gc", "grep", "init", "log",
    "merge", "mv", "pull", "push", "rebase", "remote", "reset", "restore", "revert", "rm", "show",
    "stash", "status", "submodule", "switch", "tag", "worktree",
  ] },
  { command: "npm", desc: "Node package manager", category: "Node", example: "npm install", subcommands: [
    "access", "adduser", "audit", "bugs", "cache", "ci", "completion", "config", "dedupe", "deprecate",
    "diff", "dist-tag", "docs", "doctor", "edit", "exec", "explain", "explore", "find-dupes", "fund",
    "help", "hook", "init", "install", "link", "login", "logout", "ls", "org", "outdated", "owner",
    "pack", "ping", "pkg", "prefix", "profile", "publish", "query", "rebuild", "repo", "restart",
    "root", "run", "sbom", "search", "set", "shrinkwrap", "star", "stars", "start", "stop", "team",
    "test", "token", "uninstall", "unpublish", "update", "version", "view", "whoami", "why",
  ] },
  { command: "npx", desc: "Run npm package binaries", category: "Node", example: "npx vite", subcommands: ["create", "exec", "run"] },
  { command: "node", desc: "Run JavaScript", category: "Node", example: "node app.js" },
  { command: "cargo", desc: "Rust build tool", category: "Rust", example: "cargo build", subcommands: [
    "add", "bench", "build", "check", "clean", "clippy", "doc", "fetch", "fix", "fmt", "generate",
    "init", "install", "locate-project", "login", "logout", "metadata", "new", "owner", "package",
    "publish", "remove", "report", "run", "rustdoc", "search", "test", "tree", "uninstall", "update", "vendor", "yank",
  ] },
  { command: "rustc", desc: "Compile a Rust file", category: "Rust", example: "rustc main.rs" },

  { command: "Get-ChildItem", desc: "List files and folders", category: "PowerShell", example: "Get-ChildItem -Recurse", aliases: ["gci", "dir", "ls"] },
  { command: "Get-Content", desc: "Read file content", category: "PowerShell", example: "Get-Content app.log", aliases: ["gc", "cat", "type"] },
  { command: "Get-Process", desc: "List running processes", category: "PowerShell", example: "Get-Process", aliases: ["gps"] },
  { command: "Stop-Process", desc: "Stop a running process", category: "PowerShell", example: "Stop-Process -Name notepad", aliases: ["spps"] },
  { command: "Start-Process", desc: "Launch a program", category: "PowerShell", example: "Start-Process notepad.exe", aliases: ["start", "saps"] },
  { command: "Select-String", desc: "Search text in files", category: "PowerShell", example: "Select-String -Path *.ts -Pattern foo", aliases: ["sls"] },
  { command: "Set-Location", desc: "Change directory", category: "PowerShell", example: "Set-Location C:\\", aliases: ["cd", "sl", "chdir"] },
  { command: "New-Item", desc: "Create file or folder", category: "PowerShell", example: "New-Item -ItemType Directory -Name src", aliases: ["ni", "mkdir"] },
  { command: "Remove-Item", desc: "Delete files or folders", category: "PowerShell", example: "Remove-Item temp -Recurse", aliases: ["ri", "rm", "del"] },
  { command: "Copy-Item", desc: "Copy items", category: "PowerShell", example: "Copy-Item a.txt b.txt", aliases: ["cpi", "copy", "cp"] },
  { command: "Move-Item", desc: "Move items", category: "PowerShell", example: "Move-Item a.txt dest\\", aliases: ["mi", "move", "mv"] },
  { command: "Rename-Item", desc: "Rename an item", category: "PowerShell", example: "Rename-Item old.txt new.txt", aliases: ["rni", "ren"] },
  { command: "Get-Command", desc: "List available commands", category: "PowerShell", example: "Get-Command git", aliases: ["gcm", "where"] },
  { command: "Get-Help", desc: "Show cmdlet help", category: "PowerShell", example: "Get-Help Get-Process", aliases: ["help"] },
  { command: "Invoke-WebRequest", desc: "Download from the web", category: "PowerShell", example: "Invoke-WebRequest https://example.com", aliases: ["iwr", "curl", "wget"] },

  { command: "tasklist", desc: "List running tasks", category: "System", example: "tasklist" },
  { command: "taskkill", desc: "End a running task", category: "System", example: "taskkill /IM notepad.exe /F" },
  { command: "systeminfo", desc: "Show system information", category: "System", example: "systeminfo" },
  { command: "whoami", desc: "Show current user", category: "System", example: "whoami" },
  { command: "hostname", desc: "Show computer name", category: "System", example: "hostname" },

  { command: "ipconfig", desc: "Show network configuration", category: "Network", example: "ipconfig /all" },
  { command: "ping", desc: "Test network reachability", category: "Network", example: "ping google.com" },
  { command: "tracert", desc: "Trace route to host", category: "Network", example: "tracert google.com" },
  { command: "netstat", desc: "Show network connections", category: "Network", example: "netstat -an" },
  { command: "nslookup", desc: "Query DNS records", category: "Network", example: "nslookup example.com" },

  { command: "explorer", desc: "Open File Explorer", category: "Apps", example: "explorer ." },
  { command: "code", desc: "Open Visual Studio Code", category: "Apps", example: "code ." },
  { command: "wt", desc: "Open Windows Terminal", category: "Apps", example: "wt" },
  { command: "powershell", desc: "Start PowerShell session", category: "Apps", example: "powershell" },
  { command: "cmd", desc: "Start Command Prompt", category: "Apps", example: "cmd" },
];

const SUBCOMMAND_HINTS: Record<string, string> = {
  "git add": "Stage changes",
  "git commit": "Record a commit",
  "git push": "Upload commits",
  "git pull": "Download and merge",
  "git status": "Show working tree status",
  "git clone": "Clone a repository",
  "git branch": "List or create branches",
  "git checkout": "Switch branches",
  "git switch": "Switch branches",
  "git merge": "Merge branches",
  "git log": "Show commit history",
  "git diff": "Show changes",
  "git reset": "Reset current HEAD",
  "git stash": "Stash changes",
  "npm install": "Install dependencies",
  "npm run": "Run a package script",
  "npm start": "Start package",
  "npm test": "Run tests",
  "npm publish": "Publish package",
  "npm init": "Create package.json",
  "cargo build": "Compile project",
  "cargo run": "Build and run",
  "cargo test": "Run tests",
  "cargo check": "Fast compile check",
  "cargo clippy": "Run linter",
  "cargo fmt": "Format code",
  "cargo add": "Add dependency",
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function scoreMatch(token: string, candidate: string): number {
  const t = normalizeToken(token);
  const c = normalizeToken(candidate);
  if (!t) return 0;
  if (c === t) return 1000;
  if (c.startsWith(t)) return 900 - (c.length - t.length);
  if (c.includes(t)) return 500;
  return 0;
}

function expandEntry(entry: CommandSuggestion): CommandSuggestion[] {
  const results: CommandSuggestion[] = [{ ...entry, command: entry.command }];
  for (const alias of entry.aliases ?? []) {
    results.push({ ...entry, command: alias });
  }
  return results;
}

export function searchCommandSuggestions(input: string, limit = 6): CommandSuggestion[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? "";
  const partial = parts[parts.length - 1] ?? "";

  if (parts.length === 1) {
    const ranked = TERMINAL_COMMANDS.flatMap(expandEntry)
      .map((entry) => ({
        entry,
        score: Math.max(
          scoreMatch(first, entry.command),
          ...(entry.aliases ?? []).map((alias) => scoreMatch(first, alias)),
        ),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.command.length - b.entry.command.length);

    const seen = new Set<string>();
    const output: CommandSuggestion[] = [];
    for (const row of ranked) {
      const key = normalizeToken(row.entry.command);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(row.entry);
      if (output.length >= limit) break;
    }
    return output;
  }

  const base = normalizeToken(parts[0]);
  const parent = TERMINAL_COMMANDS.find(
    (entry) =>
      normalizeToken(entry.command) === base ||
      (entry.aliases ?? []).some((alias) => normalizeToken(alias) === base),
  );

  if (!parent?.subcommands?.length) {
    return searchCommandSuggestions(first, limit);
  }

  const prefix = parts.length > 2 ? partial : parts[1] ?? "";
  const suggestions = parent.subcommands
    .filter((sub) => !prefix || sub.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((sub) => {
      const full = `${parent.command} ${sub}`;
      return {
        command: full,
        desc: SUBCOMMAND_HINTS[full] ?? `${parent.command} ${sub}`,
        category: parent.category,
        example: full,
      } satisfies CommandSuggestion;
    });

  return suggestions.slice(0, limit);
}

export function shouldShowSuggestions(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const suggestions = searchCommandSuggestions(trimmed);
  if (!suggestions.length) return false;

  const lower = trimmed.toLowerCase();

  if (suggestions.some((s) => s.command.toLowerCase() === lower)) return false;

  if (!trimmed.includes(" ")) {
    const isExact = TERMINAL_COMMANDS.flatMap(expandEntry).some(
      (entry) => entry.command.toLowerCase() === lower,
    );
    if (isExact) return false;
  }

  const suffix = completionSuffix(trimmed, suggestions[0]);
  return !!(suffix && suffix.length > 0);
}

export function completionSuffix(input: string, suggestion: CommandSuggestion): string | null {
  const trimmed = input.trim();
  if (!trimmed) return suggestion.command;

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    if (suggestion.command.toLowerCase().startsWith(parts[0].toLowerCase())) {
      return suggestion.command.slice(parts[0].length);
    }
    return null;
  }

  const full = suggestion.command;
  if (full.toLowerCase().startsWith(trimmed.toLowerCase())) {
    return full.slice(trimmed.length);
  }

  const last = parts[parts.length - 1] ?? "";
  const prefix = parts.slice(0, -1).join(" ") + " ";
  if (full.toLowerCase().startsWith(prefix.toLowerCase()) && full.toLowerCase().startsWith(trimmed.toLowerCase())) {
    return full.slice(trimmed.length);
  }

  const sub = full.split(" ").pop() ?? "";
  if (sub.toLowerCase().startsWith(last.toLowerCase())) {
    return sub.slice(last.length);
  }

  return null;
}