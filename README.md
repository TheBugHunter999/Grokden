# Grokden

Grokden is a desktop workspace for people who work with the Grok command-line tool. It combines a folder-based file explorer, a simple text editor, an integrated terminal, and a parallel agent view where you can run several Grok sessions at once in separate panes. The application is built with Tauri, Svelte, and TypeScript. It runs locally on your machine. Your project files and settings stay on your computer unless you choose to share them elsewhere.

## Who should use Grokden

Grokden is intended for developers, technical writers, researchers, and power users who already use or plan to use the official Grok CLI from xAI. If you want a single desktop window where you can open a repository, edit files, run shell commands, and launch multiple Grok agents side by side without switching between separate terminal windows, this application is for you.

Grokden is not a replacement for a full IDE such as Visual Studio Code or JetBrains products. It does not include a language server, debugger attachment, or extension marketplace. It is a focused environment built around local files and Grok CLI workflows.

You should not use Grokden as a general-purpose chat client. Conversation happens inside the integrated terminals through the Grok CLI itself. Grokden provides the layout, editor, and session management around that tool.

## Requirements

Before installing or running Grokden, install the Grok CLI using the official installer for your platform.

On Windows, in PowerShell:

```
irm https://x.ai/cli/install.ps1 | iex
```

On macOS or Linux:

```
curl -fsSL https://x.ai/cli/install.sh | bash
```

After installation, confirm the CLI works by opening a terminal and running:

```
grok --help
```

Grokden also requires a recent Windows 10 or Windows 11 system for the pre-built installer. Building from source additionally requires Node.js 20 or newer, Rust stable, and the Tauri prerequisites for your platform.

## What Grokden includes

The explorer panel lets you open a folder on disk and browse its contents. You can create files and folders, open text files in the editor, and save changes back to disk.

The editor supports common text and code file types with line numbers, word wrap, tab size configuration, and theme options available in Settings.

The integrated terminal uses a real pseudo-terminal on your system. It defaults to PowerShell on Windows. You can change the shell path in Settings. From the top bar or welcome screen you can open a single Grok session in this terminal.

The parallel agent swarm view lets you choose how many agent panes to open, up to four. Each pane starts its own terminal session and runs the Grok CLI. You type your own prompts directly in each pane. The mission board is an optional planning area where you can add, edit, and remove goals for your own reference. Goals are not sent to Grok automatically.

Settings cover appearance, editor behavior, search options, terminal options, layout, and other preferences. Settings are stored in local storage on your device.

## Releases

### Installing a release build

Download the latest Windows installer from the Releases page of this repository. Two formats may be available:

- **NSIS** — `Grokden_*_x64-setup.exe` (setup executable)
- **MSI (WiX)** — `Grokden_*_x64_en-US.msi` (per-machine or per-user install via Windows Installer)

Run the installer and follow the prompts. The NSIS installer lets you choose **current user** or **all users** (`installMode: both`). The MSI package follows standard Windows Installer behavior.

### WebView2 runtime

Grokden is a Tauri app and requires the Microsoft Edge **WebView2** runtime. Installers are configured with `embedBootstrapper`: if WebView2 is missing, the bootstrapper runs during setup (about 1.8 MB added to the installer). On Windows 10 (April 2018 or later) and Windows 11, WebView2 is often already present.

For fully offline installs (no internet during setup), rebuild with `webviewInstallMode.type` set to `offlineInstaller` in `src-tauri/tauri.conf.json` (~127 MB larger). See the [Tauri Windows installer guide](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options).

After installation, launch Grokden from the Start menu or desktop shortcut. Open a folder, then use Launch Grok CLI or Parallel Agents from the top bar.

### Verifying a local release build

After running `npm run tauri build`, maintainers can confirm that installers and the release binary were produced correctly:

```
.\scripts\verify-release.ps1
```

The script checks:

- `src-tauri/target/release/grokden.exe` exists
- NSIS installer (`.exe`) under `src-tauri/target/release/bundle/nsis/`
- MSI package (`.msi`) under `src-tauri/target/release/bundle/msi/`

For each installer it prints file size and a SHA-256 checksum. Copy those checksums into GitHub release notes so users can verify downloaded artifacts. The script exits with a non-zero status if any check fails.

## Building from source

Clone the repository:

```
git clone https://github.com/TheBugHunter999/AetherForge.git
cd AetherForge
```

The GitHub repository may still use the legacy folder name AetherForge. The application product name is Grokden.

Install JavaScript dependencies:

```
npm install
```

Run in development mode:

```
npm run tauri dev
```

Create a production build and installers:

```
npm run tauri build
```

### Windows installer outputs (WiX + NSIS)

Both installer types are produced on Windows when `bundle.targets` includes `msi` and `nsis` in `src-tauri/tauri.conf.json`:

| Format | Tool | Output path (example) |
|--------|------|------------------------|
| NSIS | NSIS 3 | `src-tauri/target/release/bundle/nsis/Grokden_0.1.0_x64-setup.exe` |
| MSI | WiX Toolset v3 | `src-tauri/target/release/bundle/msi/Grokden_0.1.0_x64_en-US.msi` |

**Build prerequisites on Windows:**

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) — Node.js 20+, Rust stable, Visual Studio C++ build tools, WebView2 (for dev)
- **NSIS** — installed by the Tauri CLI / bundler when needed
- **WiX (MSI)** — WiX Toolset v3; building MSI requires the **VBScript** optional Windows feature (Settings → Apps → Optional features → More Windows features). If `light.exe` fails, enable VBScript and retry.

**Runtime bundled by installers:** WebView2 bootstrapper (embedded). **Not** bundled: Grok CLI — install separately (see Requirements). The app binary and Tauri resources are included in each installer; no separate VC++ redistributable package is added (Windows 10/11 typically already have the required MSVC runtime).

To build only one format, set `bundle.targets` to `["nsis"]` or `["msi"]`.

## Security and privacy

Do not commit API keys, tokens, passwords, private logs, or signing certificates to this repository. Grokden stores workspace preferences locally. It does not upload your source code to Grokden servers because there are no Grokden servers. When you use Grok CLI inside Grokden, that traffic is handled by the Grok CLI and xAI according to their terms and your configuration.

## Contributing

See CONTRIBUTING.md for development guidelines.

## License

MIT