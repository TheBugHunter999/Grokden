import { invoke } from "@tauri-apps/api/core";

export type TelemetryStorageInfo = {
  enabled: boolean;
  directory: string;
  events_file: string;
  event_count: number;
  file_size_bytes: number;
};

export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  try {
    await invoke("telemetry_set_enabled", { enabled });
  } catch {
    // Browser preview has no Tauri invoke bridge; telemetry must never block UX.
  }
}

export async function recordTelemetryEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    await invoke("telemetry_record", { event, properties: properties ?? null });
  } catch {
    // Telemetry must never block UX.
  }
}

export async function getTelemetryStorageInfo(): Promise<TelemetryStorageInfo | null> {
  try {
    return await invoke<TelemetryStorageInfo>("telemetry_get_storage_info");
  } catch {
    return null;
  }
}

export async function clearTelemetry(): Promise<void> {
  try {
    await invoke("telemetry_clear");
  } catch {
    // Browser preview has no Tauri invoke bridge; telemetry must never block UX.
  }
}
