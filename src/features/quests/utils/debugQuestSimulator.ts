import type { App } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import type { Quest } from '../utils/taskParser';
import { getPluginSettingsFromApp } from '../../../shared/utils/gameplayConfig';
import { playerStore, type XPGainResult } from '../../../shared/state/playerStore';
import { getRankFromLevel } from '../../player/utils/playerRank';
import { processXPGainCeremonies } from '../../../shared/services/ceremonyService';
import {
	openCompletionSummaryModal,
	type CompletedQuestSummaryItem,
} from '../modals/CompletionSummaryModal';

const DEBUG_QUESTS: Array<
	Pick<Quest, 'title' | 'xp' | 'cp' | 'coins' | 'difficulty' | 'skills' | 'stats' | 'subtasks'>
> = [
	{
		title: 'Debug: Clear the training grounds',
		xp: 50,
		cp: 5,
		coins: 5,
		difficulty: 'easy',
		skills: ['Focus'],
		stats: [],
		subtasks: [],
	},
	{
		title: 'Debug: Forge a practice blade',
		xp: 75,
		cp: 8,
		coins: 8,
		difficulty: 'medium',
		skills: ['Crafting'],
		stats: [],
		subtasks: [],
	},
	{
		title: 'Debug: Report to the guild master',
		xp: 40,
		cp: 4,
		coins: 4,
		difficulty: 'easy',
		skills: [],
		stats: [],
		subtasks: [],
	},
];

function getXpRequired(level: number): number {
	return level * level * 1000 - (level - 1) * (level - 1) * 1000;
}

let debugRunning = false;

export function isDebugQuestSimulationRunning(): boolean {
	return debugRunning;
}

/**
 * Simulate completing fake quests — awards real XP/CP/currency in one batched write
 * and shows the summary modal. Does not modify vault task files.
 */
export async function simulateDebugQuestRewards(app: App): Promise<void> {
	if (debugRunning) return;
	debugRunning = true;

	try {
		const settings = getPluginSettingsFromApp(app) as GamificationPluginSettings | undefined;

		const totalXP = DEBUG_QUESTS.reduce((sum, q) => sum + q.xp, 0);
		const totalCP = DEBUG_QUESTS.reduce((sum, q) => sum + q.cp, 0);
		const totalCoins = DEBUG_QUESTS.reduce((sum, q) => sum + q.coins, 0);

		const before = await playerStore.get();
		const oldLevel = before?.level || 1;
		const oldRank = getRankFromLevel(oldLevel);

		// One vault write instead of 9+ sequential writes from awardQuestRewards × 3
		await playerStore.update((data) => {
			let currentXP = (data.xp || 0) + totalXP;
			let currentLevel = data.level || 1;
			let currentXPRequired = data.xpRequired || getXpRequired(currentLevel);

			while (currentXP >= currentXPRequired) {
				currentXP -= currentXPRequired;
				currentLevel++;
				currentXPRequired = getXpRequired(currentLevel);
			}

			return {
				...data,
				xp: currentXP,
				level: currentLevel,
				xpRequired: currentXPRequired,
				total_exp: (data.total_exp || 0) + totalXP,
				cp: (data.cp || 0) + totalCP,
				coins: (data.coins || 0) + totalCoins,
			};
		});

		const after = await playerStore.get();
		const newLevel = after?.level || oldLevel;
		const newRank = getRankFromLevel(newLevel);
		const xpGain: XPGainResult | undefined =
			newLevel > oldLevel
				? {
						leveledUp: true,
						oldLevel,
						newLevel,
						rankChanged: newRank !== oldRank,
						oldRank,
						newRank,
					}
				: undefined;

		const completed: CompletedQuestSummaryItem[] = DEBUG_QUESTS.map((quest) => ({
			title: quest.title,
			result: {
				awardedXP: quest.xp,
				awardedCP: quest.cp,
				awardedCoins: quest.coins,
			},
		}));

		// Yield so the UI can paint before opening the modal / ceremonies
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		if (settings?.externalCompletionSummary !== false) {
			openCompletionSummaryModal(app, completed, settings, 'Debug quest simulation');
		}

		if (xpGain?.leveledUp) {
			requestAnimationFrame(() => {
				processXPGainCeremonies(xpGain, settings);
			});
		}
	} finally {
		debugRunning = false;
	}
}
