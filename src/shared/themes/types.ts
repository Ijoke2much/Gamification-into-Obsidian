/** Built-in visual theme presets for the gamification plugin UI. */
export type VisualThemePresetId = 'classic' | 'system-hunter';

/** UI shell layout personality (fonts, borders, shadows). */
export type GamificationShell = 'pixel' | 'system' | 'modern' | 'minimal';

export type VisualCeremonyLevel = 'off' | 'minimal' | 'full';

/** CSS custom properties injected by {@link VisualThemeManager}. */
export type VisualThemeTokens = Record<string, string>;

export interface VisualThemePreset {
	id: VisualThemePresetId;
	name: string;
	description: string;
	/** When false, preset appears in settings but cannot be selected yet. */
	available: boolean;
	shell: GamificationShell;
	tokens: VisualThemeTokens;
	typography: {
		ui: string;
		notices: string;
	};
}

export interface VisualThemeSettings {
	preset: VisualThemePresetId;
	ceremonyLevel?: VisualCeremonyLevel;
	/** Optional per-token overrides (advanced / future custom themes). */
	overrides?: Partial<VisualThemeTokens>;
}

export interface ResolvedVisualTheme {
	preset: VisualThemePresetId;
	shell: GamificationShell;
	ceremonyLevel: VisualCeremonyLevel;
	tokens: VisualThemeTokens;
	typography: VisualThemePreset['typography'];
}

export const DEFAULT_VISUAL_THEME_SETTINGS: VisualThemeSettings = {
	preset: 'classic',
	ceremonyLevel: 'minimal',
};
