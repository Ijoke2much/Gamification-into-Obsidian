import { CLASSIC_PRESET } from './classic';
import { SYSTEM_HUNTER_PRESET } from './systemHunter';
import { CLAY_PRESET } from './clay';
import type { VisualThemePreset, VisualThemePresetId } from '../types';

export { CLASSIC_PRESET } from './classic';
export { SYSTEM_HUNTER_PRESET } from './systemHunter';
export { CLAY_PRESET } from './clay';

export const VISUAL_THEME_PRESETS: Record<VisualThemePresetId, VisualThemePreset> = {
	classic: CLASSIC_PRESET,
	'system-hunter': SYSTEM_HUNTER_PRESET,
	clay: CLAY_PRESET,
};

export const VISUAL_THEME_PRESET_LIST: VisualThemePreset[] = Object.values(VISUAL_THEME_PRESETS);

export function getVisualThemePreset(id: VisualThemePresetId): VisualThemePreset {
	return VISUAL_THEME_PRESETS[id] ?? CLASSIC_PRESET;
}
