import { invoke } from "@tauri-apps/api/core";

/** Official Grok CLI installer for Windows (PowerShell). */
export const GROK_CLI_INSTALL_WINDOWS = "irm https://x.ai/cli/install.ps1 | iex";

/** Official Grok CLI installer for macOS and Linux. */
export const GROK_CLI_INSTALL_UNIX = "curl -fsSL https://x.ai/cli/install.sh | bash";

/** Returns whether the `grok` executable is available on PATH for this app process. */
export async function isGrokCliAvailable(): Promise<boolean> {
  try {
    return await invoke<boolean>("grok_cli_available");
  } catch (error) {
    console.warn("[Grokden] Grok CLI detection failed:", error);
    return false;
  }
}