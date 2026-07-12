import type { App } from 'obsidian';
import type { MobileSettings } from './types';

const DESKTOP_PLUGIN_DATA = '.obsidian/plugins/Gamification-into-Obsidian/data.json';

const DEFAULTS: MobileSettings = {
	xpPerTask: 10,
	coinPerTask: 5,
	currencyName: 'Coins',
	currencySymbol: '🪙',
	defaultQuestFilePath: 'GamifiedTasks.md',
	playerDataPath: 'SkillTree/PlayerData.md',
	hideCompletedQuests: false,
	skillTreeRoot: 'SkillTree',
};

export async function loadMobileSettings(app: App): Promise<MobileSettings> {
	try {
		const exists = await app.vault.adapter.exists(DESKTOP_PLUGIN_DATA);
		if (!exists) return { ...DEFAULTS };

		const raw = await app.vault.adapter.read(DESKTOP_PLUGIN_DATA);
		const parsed = JSON.parse(raw) as Partial<MobileSettings> & Record<string, unknown>;

		return {
			xpPerTask: numberOr(parsed.xpPerTask, DEFAULTS.xpPerTask),
			coinPerTask: numberOr(parsed.coinPerTask, DEFAULTS.coinPerTask),
			currencyName: stringOr(parsed.currencyName, DEFAULTS.currencyName),
			currencySymbol: stringOr(parsed.currencySymbol, DEFAULTS.currencySymbol),
			defaultQuestFilePath: stringOr(parsed.defaultQuestFilePath, DEFAULTS.defaultQuestFilePath),
			playerDataPath: DEFAULTS.playerDataPath,
			hideCompletedQuests: Boolean(parsed.hideCompletedQuests),
			skillTreeRoot: 'SkillTree',
		};
	} catch {
		return { ...DEFAULTS };
	}
}

function numberOr(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
