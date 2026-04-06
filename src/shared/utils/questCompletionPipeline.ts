/**
 * Shared quest completion pipeline.
 *
 * Single source of truth for:
 *   - awarding XP / CP / currency on quest completion
 *   - distributing CP to associated skills / stats
 *   - building the standard completion notice text
 *
 * Every entry-point (sidebar, main tab, tracker, calendar, modal, drag actions)
 * should call `awardQuestRewards` instead of duplicating reward logic.
 */

import type { Vault } from "obsidian";
import type { Quest } from "../../features/quests/utils/taskParser";
import { playerStore } from "../state/playerStore";
import { distributeCPFromQuest } from "./progressUpdater";

export interface QuestRewardSettings {
	currencyName?: string;
	currencySymbol?: string;
}

export interface QuestRewardResult {
	awardedXP: number;
	awardedCP: number;
	awardedCoins: number;
}

/**
 * Award XP, CP, and currency for a completed quest, and distribute CP to
 * linked skills/stats.  Does NOT write to the vault – it only updates the
 * player store and skill files.
 */
export async function awardQuestRewards(
	vault: Vault,
	quest: Quest,
	settings?: QuestRewardSettings
): Promise<QuestRewardResult> {
	const awardedXP = Math.max(0, Number.isFinite(quest.xp) ? (quest.xp as number) : 0);
	const awardedCP = Math.max(0, Number.isFinite(quest.cp) ? (quest.cp as number) : 0);
	const awardedCoins = Math.max(
		0,
		Number.isFinite(quest.coins) ? (quest.coins as number) : Math.round(awardedXP * 0.2)
	);

	if (awardedXP > 0) await playerStore.addXP(awardedXP);

	if (awardedCP > 0) {
		await playerStore.update((data) => ({
			...data,
			cp: (data.cp || 0) + awardedCP,
		}));
	}

	if (awardedCoins > 0) await playerStore.addCoins(awardedCoins);

	if (awardedCP > 0 && (quest.skills?.length || quest.stats?.length)) {
		await distributeCPFromQuest(vault, {
			skills: quest.skills || [],
			stats: quest.stats || [],
			cp: awardedCP,
		});
	}

	return { awardedXP, awardedCP, awardedCoins };
}

/** Tactical raid: move + finisher bonuses (call before standard `awardQuestRewards` on quest complete). */
export async function applyTacticalBattleBonuses(bonusXP: number, bonusCoins: number): Promise<void> {
	const x = Math.max(0, Math.floor(bonusXP));
	const c = Math.max(0, Math.floor(bonusCoins));
	if (x > 0) await playerStore.addXP(x);
	if (c > 0) await playerStore.addCoins(c);
}

/**
 * Build the standard "Quest Complete!" notice string.
 *
 * Example:  ✅ Quest Complete! +50 XP, +10 CP, 🪙10 Boogers
 */
export function buildCompletionNoticeText(
	result: QuestRewardResult,
	settings?: QuestRewardSettings
): string {
	const currencyName = settings?.currencyName || "Coins";
	const currencySymbol = settings?.currencySymbol || "🪙";
	return `✅ Quest Complete! +${result.awardedXP} XP, +${result.awardedCP} CP, +${currencySymbol}${result.awardedCoins} ${currencyName}`;
}

/**
 * Resolve plugin settings from an opaque `App` reference (used in services
 * that only receive an `App` instance, not the plugin directly).
 */
export function resolvePluginSettings(app: unknown): QuestRewardSettings {
	const pluginAny = app as {
		plugins?: {
			plugins?: Record<
				string,
				{ settings?: { currencyName?: string; currencySymbol?: string } }
			>;
		};
	};
	const s = pluginAny.plugins?.plugins?.["Gamification-into-Obsidian"]?.settings;
	return {
		currencyName: s?.currencyName || "Coins",
		currencySymbol: s?.currencySymbol || "🪙",
	};
}
