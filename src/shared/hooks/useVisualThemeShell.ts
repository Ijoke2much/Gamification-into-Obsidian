import { useEffect, useMemo, useState } from 'react';
import type { VisualThemePresetId } from '../themes/types';
import { getAppliedVisualTheme } from '../utils/visualThemeManager';
import { onSettingsUpdated } from '../utils/settingsEvents';

/**
 * Resolve whether Solo Leveling / System Hunter chrome should be used.
 * Theme is independent of mobile layout — never derive this from isMobile.
 */
export function useVisualThemeShell(presetProp?: VisualThemePresetId) {
	const [themeRevision, setThemeRevision] = useState(0);

	useEffect(() => onSettingsUpdated(() => setThemeRevision((n) => n + 1)), []);

	const applied = useMemo(() => getAppliedVisualTheme(), [themeRevision, presetProp]);

	const htmlPreset =
		typeof document !== 'undefined'
			? (document.documentElement.getAttribute(
					'data-gamification-visual-theme'
				) as VisualThemePresetId | null)
			: null;

	const preset: VisualThemePresetId =
		presetProp === 'system-hunter' ||
		applied.preset === 'system-hunter' ||
		htmlPreset === 'system-hunter'
			? 'system-hunter'
			: (presetProp ?? applied.preset ?? 'classic');

	const isSystemTheme = preset === 'system-hunter';
	const isClayTheme = preset === 'clay';
	const shell = isSystemTheme
		? 'system'
		: isClayTheme || applied.shell === 'modern'
			? 'modern'
			: applied.shell === 'system'
				? 'system'
				: 'pixel';

	return {
		preset,
		shell,
		isSystemTheme,
		isClayTheme,
		themeRevision,
	};
}
