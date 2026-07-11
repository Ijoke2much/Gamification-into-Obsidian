import type { GamificationPluginSettings } from '../../core/settings';

export type EnergyHudMode = 'off' | 'simple' | 'focus' | 'full';

export type WellbeingStatKey = 'energy' | 'focus' | 'motivation' | 'calm' | 'stress';

export const ENERGY_HUD_MODE_STATS: Record<Exclude<EnergyHudMode, 'off'>, WellbeingStatKey[]> = {
	simple: ['energy', 'stress'],
	focus: ['focus', 'motivation'],
	full: ['energy', 'focus', 'motivation', 'calm', 'stress'],
};

export interface ResolvedEnergyHudConfig {
	mode: EnergyHudMode;
	visibleStats: WellbeingStatKey[];
	/** Show the Player-tab energy card */
	showHud: boolean;
	/** Smart recommendation panel in HUD */
	showRecommendations: boolean;
	/** Apply quest energy drain on completion */
	trackEnergyCost: boolean;
	/** Apply wellbeing deltas for these stats only */
	activeWellbeingStats: WellbeingStatKey[];
	hudTitle: string;
}

export function resolveEnergyHudMode(
	settings?: Partial<GamificationPluginSettings> | null
): EnergyHudMode {
	if (settings?.modules?.enableEnergySystem === false) {
		return 'off';
	}
	if (settings?.energyHudMode) {
		return settings.energyHudMode;
	}
	// Legacy: enableEnergyHUD false meant hidden but system could still run
	if (settings?.enableEnergyHUD === false) {
		return 'off';
	}
	return 'simple';
}

export function resolveEnergyHudConfig(
	settings?: Partial<GamificationPluginSettings> | null
): ResolvedEnergyHudConfig {
	const mode = resolveEnergyHudMode(settings);

	if (mode === 'off') {
		return {
			mode,
			visibleStats: [],
			showHud: false,
			showRecommendations: false,
			trackEnergyCost: false,
			activeWellbeingStats: [],
			hudTitle: 'Energy',
		};
	}

	const visibleStats = [...ENERGY_HUD_MODE_STATS[mode]];

	return {
		mode,
		visibleStats,
		showHud: settings?.enableEnergyHUD !== false,
		showRecommendations: mode === 'full',
		trackEnergyCost: visibleStats.includes('energy'),
		activeWellbeingStats: visibleStats.filter((s) => s !== 'energy'),
		hudTitle: mode === 'simple' ? 'Energy & Stress' : mode === 'focus' ? 'Focus & Motivation' : 'Energy Management',
	};
}

export function isWellbeingStatTracked(
	settings: Partial<GamificationPluginSettings> | null | undefined,
	stat: WellbeingStatKey
): boolean {
	const config = resolveEnergyHudConfig(settings);
	if (stat === 'energy') {
		return config.trackEnergyCost;
	}
	return config.activeWellbeingStats.includes(stat);
}

export function filterWellbeingDeltas<T extends Partial<Record<WellbeingStatKey, number>>>(
	deltas: T,
	settings?: Partial<GamificationPluginSettings> | null
): T {
	const active = new Set(resolveEnergyHudConfig(settings).activeWellbeingStats);
	const filtered = { ...deltas };
	(['focus', 'motivation', 'calm', 'stress'] as const).forEach((stat) => {
		if (!active.has(stat) && stat in filtered) {
			delete filtered[stat];
		}
	});
	return filtered;
}
