import type { App } from 'obsidian';
import {
	BALANCED_GAMEPLAY_MODULES,
	type GamificationModules,
	type GamificationPluginSettings,
	type GameplayProfile,
} from '../../core/settings';
import type { PenaltyContext } from '../services/penaltyService';

export interface ResolvedGameplayConfig {
	profile: GameplayProfile;
	modules: Required<GamificationModules>;
	/** Master switch: any penalty/debt mechanics run */
	penaltiesEnabled: boolean;
}

/** Player tab keys in TabView */
export type PlayerTabKey =
	| 'player'
	| 'shop'
	| 'quests'
	| 'habits'
	| 'crafting'
	| 'achievements'
	| 'pomodoro'
	| 'analytics';

const PLUGIN_ID = 'Gamification-into-Obsidian';

export function getPluginSettingsFromApp(app?: App): GamificationPluginSettings | undefined {
	try {
		const obsidianApp =
			app ??
			(typeof window !== 'undefined'
				? (window as { app?: App }).app
				: undefined);
		const plugins = (obsidianApp as {
			plugins?: { plugins?: Record<string, { settings?: GamificationPluginSettings }> };
		})?.plugins?.plugins;
		return plugins?.[PLUGIN_ID]?.settings;
	} catch {
		return undefined;
	}
}

export function resolveGameplayConfig(
	settings?: Partial<GamificationPluginSettings> | null
): ResolvedGameplayConfig {
	const profile: GameplayProfile = settings?.gameplayProfile ?? 'balanced';
	const legacyAnalytics = settings?.featureFlags?.enableAnalyticsTab;

	const modules = {
		...BALANCED_GAMEPLAY_MODULES,
		...(settings?.modules ?? {}),
	} as Required<GamificationModules>;

	// Legacy featureFlags fallback for analytics until fully migrated
	if (
		settings?.modules?.enableAnalyticsTab === undefined &&
		legacyAnalytics !== undefined
	) {
		modules.enableAnalyticsTab = legacyAnalytics;
	}

	const penaltiesEnabled = modules.enablePenalties === true;

	return {
		profile,
		modules,
		penaltiesEnabled,
	};
}

export function isPenaltyTypeEnabled(
	config: ResolvedGameplayConfig,
	type: PenaltyContext['type']
): boolean {
	if (!config.penaltiesEnabled) {
		return false;
	}

	switch (type) {
		case 'quest_overdue':
			return config.modules.enableOverduePenalties === true;
		case 'boss_timeout':
			return config.modules.enableBossPenalties === true;
		case 'quest_attachment_expired':
			return config.modules.enablePomodoroPenalties === true;
		default:
			return false;
	}
}

export function isFailureDebtEnabled(settings?: Partial<GamificationPluginSettings> | null): boolean {
	const config = resolveGameplayConfig(settings);
	return config.penaltiesEnabled && config.modules.enableFailureDebt === true;
}

export function isPlayerTabEnabled(
	config: ResolvedGameplayConfig,
	tabKey: PlayerTabKey
): boolean {
	switch (tabKey) {
		case 'player':
		case 'quests':
			return true;
		case 'shop':
			return config.modules.enableShopTab === true;
		case 'crafting':
			return config.modules.enableCraftingTab === true;
		case 'habits':
			return config.modules.enableHabitsTab === true;
		case 'achievements':
			return config.modules.enableAchievementsTab === true;
		case 'pomodoro':
			return config.modules.enablePomodoroTab === true;
		case 'analytics':
			return config.modules.enableAnalyticsTab === true;
		default:
			return true;
	}
}

export function isBossBattlesEnabled(settings?: Partial<GamificationPluginSettings> | null): boolean {
	return resolveGameplayConfig(settings).modules.enableBossBattles === true;
}

export function isEnergySystemEnabled(settings?: Partial<GamificationPluginSettings> | null): boolean {
	return resolveGameplayConfig(settings).modules.enableEnergySystem === true;
}

export function isProductivityGearEnabled(settings?: Partial<GamificationPluginSettings> | null): boolean {
	return resolveGameplayConfig(settings).modules.enableProductivityGear === true;
}

export function isShopEnabled(settings?: Partial<GamificationPluginSettings> | null): boolean {
	return resolveGameplayConfig(settings).modules.enableShopTab === true;
}

export function getResolvedGameplayConfig(app?: App): ResolvedGameplayConfig {
	return resolveGameplayConfig(getPluginSettingsFromApp(app));
}
