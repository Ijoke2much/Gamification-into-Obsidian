import type { GamificationPluginSettings } from '../../core/settings';

/** Stable JSON snapshot for dirty-state comparison in settings UI. */
export function serializeSettingsSnapshot(settings: GamificationPluginSettings): string {
  return JSON.stringify(settings);
}

export function areSettingsEqual(
  a: GamificationPluginSettings,
  b: GamificationPluginSettings
): boolean {
  return serializeSettingsSnapshot(a) === serializeSettingsSnapshot(b);
}
