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

import type { Vault, App } from "obsidian";
import type { Quest } from "../../features/quests/utils/taskParser";
import { playerStore, type XPGainResult } from "../state/playerStore";
import {
	applyQuestWellbeingEffects,
	formatWellbeingDeltaLine,
	type WellbeingDeltas,
} from "./questWellbeingProfiles";
import { resolveEnergyHudConfig } from "./energyHudConfig";
import type { GamificationPluginSettings } from "../../core/settings";
import { distributeCPFromQuest } from "./progressUpdater";
import {
	loadJourneyState,
	markJourneyVictoryLootClaimed,
	recordJourneyQuestCompletion,
	revertJourneyQuestCompletion,
} from "../../features/quests/utils/journeyRunService";
import {
	recordBossFileQuestCompletion,
	revertBossFileQuestCompletion,
} from "../../features/quests/utils/bossRaidService";
import {
	buildJourneyVictoryNotice,
	grantJourneyVictoryLoot,
	type JourneyVictoryLoot,
} from "../../features/quests/utils/journeyLootService";
import { getJourneyFoeById } from "../../features/quests/utils/journeyFoeRegistry";
import {
	notifyJourneyHit,
	notifyBossRaidHit,
	notifyJourneyVictory,
	notifyQuestComplete,
	notifyDungeonUnlocked,
	processXPGainCeremonies,
} from "../services/ceremonyService";

export interface QuestRewardSettings {
	currencyName?: string;
	currencySymbol?: string;
	/** When set, gates energy drain and wellbeing deltas by HUD mode */
	energySettings?: Partial<GamificationPluginSettings> | null;
}

export interface QuestRewardResult {
	awardedXP: number;
	awardedCP: number;
	awardedCoins: number;
	xpGain?: XPGainResult;
	wellbeingDeltas?: WellbeingDeltas;
	wellbeingLine?: string | null;
	journeyDamage?: number;
	journeyDefeated?: boolean;
	/** Task missed the foe's affinity — only chip damage was dealt. */
	journeyGrazed?: boolean;
	journeyDungeonUnlocked?: boolean;
	journeyHpPercent?: number;
	journeyClearedCount?: number;
	journeyRequiredClears?: number;
	journeyVictoryLoot?: JourneyVictoryLoot;
	journeyVictoryNotice?: string;
	bossRaidDamage?: number;
	bossRaidDefeated?: boolean;
	bossRaidGrazed?: boolean;
	bossRaidHpPercent?: number;
	bossRaidBossName?: string;
	bossRaidPendingVictory?: boolean;
}

/** Default stamina cost when a quest has no `energyCost` in metadata. */
export const DEFAULT_QUEST_ENERGY_COST = 10;

/**
 * Resolve how much `stats.energy` to subtract when a quest is completed.
 */
export function getQuestEnergyCost(quest: Pick<Quest, "energyCost"> | null | undefined): number {
	const e = quest?.energyCost;
	if (typeof e === "number" && Number.isFinite(e) && e > 0) {
		return Math.min(100, Math.floor(e));
	}
	return DEFAULT_QUEST_ENERGY_COST;
}

/**
 * Subtract energy from player stats (clamped 0–100) after a quest completes.
 */
export async function applyQuestEnergyCost(quest: Pick<Quest, "energyCost">): Promise<void> {
	const cost = getQuestEnergyCost(quest);
	if (cost <= 0) return;

	await playerStore.update((data) => {
		const stats = { ...(data.stats || {}) };
		const cur = typeof stats.energy === "number" ? stats.energy : 100;
		stats.energy = Math.max(0, Math.min(100, cur - cost));
		return { ...data, stats };
	});
}

/**
 * Parse `energy` / `energyCost` from a raw gamified task markdown line (Pomodoro / legacy paths).
 */
export function parseEnergyCostFromMarkdownLine(line: string): number | undefined {
	const brace = line.match(/\{([^}]*)\}/);
	if (brace) {
		const m = brace[1].match(/(?:energy|energyCost)\s*:\s*(\d+)/i);
		if (m) return Math.min(100, parseInt(m[1], 10));
	}
	const m2 = line.match(/(?:\||\s)(?:energy|energyCost)\s*:\s*(\d+)/i);
	if (m2) return Math.min(100, parseInt(m2[1], 10));
	return undefined;
}

/**
 * Award XP, CP, and currency for a completed quest, and distribute CP to
 * linked skills/stats.  Does NOT write to the vault – it only updates the
 * player store and skill files.
 */
export async function awardQuestRewards(
	vault: Vault,
	quest: Quest,
	settings?: QuestRewardSettings | Partial<GamificationPluginSettings>,
	app?: App
): Promise<QuestRewardResult> {
	const rewardSettings = normalizeQuestRewardSettings(settings);
	const awardedXP = Math.max(0, Number.isFinite(quest.xp) ? (quest.xp as number) : 0);
	const awardedCP = Math.max(0, Number.isFinite(quest.cp) ? (quest.cp as number) : 0);
	const awardedCoins = Math.max(
		0,
		Number.isFinite(quest.coins) ? (quest.coins as number) : Math.round(awardedXP * 0.2)
	);

	let xpGain: XPGainResult | undefined;
	if (awardedXP > 0) {
		xpGain = await playerStore.addXP(awardedXP);
	}

	let wellbeingDeltas: WellbeingDeltas = {};
	let wellbeingLine: string | null = null;

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

	// Stamina + wellbeing — only for stats the user tracks in their HUD mode
	const hudConfig = resolveEnergyHudConfig(rewardSettings?.energySettings);
	if (hudConfig.trackEnergyCost) {
		await applyQuestEnergyCost(quest);
	}
	if (hudConfig.activeWellbeingStats.length > 0) {
		const wellbeing = await applyQuestWellbeingEffects(quest, rewardSettings?.energySettings);
		wellbeingDeltas = wellbeing.deltas;
		wellbeingLine = formatWellbeingDeltaLine(wellbeing.deltas);
	}

	const journeyHit = recordJourneyQuestCompletion(quest);

	let bossRaidHit: Awaited<ReturnType<typeof recordBossFileQuestCompletion>> = {
		applied: false,
		hpDamage: 0,
		defeated: false,
		grazed: false,
		hpPercentAfter: 100,
	};
	if (app) {
		bossRaidHit = await recordBossFileQuestCompletion(app, quest);
	}

	let journeyVictoryLoot: JourneyVictoryLoot | undefined;
	let journeyVictoryNotice: string | undefined;

	if (journeyHit.defeated) {
		const state = loadJourneyState();
		const run = state.activeRun;
		if (run && run.status === 'completed' && !run.victoryLootClaimed) {
			const foe = getJourneyFoeById(run.foeId);
			const loot = await grantJourneyVictoryLoot(vault, run, app);
			if (loot) {
				markJourneyVictoryLootClaimed();
				journeyVictoryLoot = loot;
				const currencySymbol = rewardSettings?.currencySymbol || '🪙';
				journeyVictoryNotice = buildJourneyVictoryNotice(
					foe?.name ?? 'Foe',
					loot,
					currencySymbol
				);
			}
		}
	}

	return {
		awardedXP,
		awardedCP,
		awardedCoins,
		...(xpGain ? { xpGain } : {}),
		...(wellbeingLine ? { wellbeingDeltas, wellbeingLine } : {}),
		...(journeyHit.applied
			? {
					journeyDamage: journeyHit.damage,
					journeyDefeated: journeyHit.defeated,
					journeyGrazed: journeyHit.grazed,
					journeyDungeonUnlocked: journeyHit.dungeonJustUnlocked,
					journeyHpPercent: journeyHit.hpPercentAfter,
					journeyClearedCount: journeyHit.clearedCount,
					journeyRequiredClears: journeyHit.requiredClears,
				}
			: {}),
		...(journeyVictoryLoot ? { journeyVictoryLoot, journeyVictoryNotice } : {}),
		...(bossRaidHit.applied
			? {
					bossRaidDamage: bossRaidHit.hpDamage,
					bossRaidDefeated: bossRaidHit.defeated,
					bossRaidGrazed: bossRaidHit.grazed,
					bossRaidHpPercent: bossRaidHit.hpPercentAfter,
					bossRaidBossName: bossRaidHit.bossName,
					bossRaidPendingVictory: bossRaidHit.pendingVictoryClaim,
				}
			: {}),
	};
}

/** Undo journey HP applied when a quest is unchecked. */
export function undoJourneyQuestCompletion(quest: Quest): { reverted: boolean; damage: number } {
	return revertJourneyQuestCompletion(quest);
}

/** Undo gate raid HP applied when a quest is unchecked. */
export async function undoBossFileQuestCompletion(
	app: App,
	quest: Quest
): Promise<{ reverted: boolean; hpRestored: number }> {
	return revertBossFileQuestCompletion(app, quest);
}

function normalizeQuestRewardSettings(
	settings?: QuestRewardSettings | Partial<GamificationPluginSettings>
): QuestRewardSettings {
	if (!settings) return {};
	if ("energySettings" in settings && settings.energySettings !== undefined) {
		return settings as QuestRewardSettings;
	}
	if ("energyHudMode" in settings || "modules" in settings) {
		const pluginSettings = settings as Partial<GamificationPluginSettings>;
		return {
			currencyName: pluginSettings.currencyName,
			currencySymbol: pluginSettings.currencySymbol,
			energySettings: pluginSettings,
		};
	}
	return settings as QuestRewardSettings;
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
	settings?: QuestRewardSettings | Partial<GamificationPluginSettings>
): string {
	const rewardSettings = normalizeQuestRewardSettings(settings);
	const currencyName = rewardSettings?.currencyName || "Coins";
	const currencySymbol = rewardSettings?.currencySymbol || "🪙";
	const lines = [
		`QUEST COMPLETE\n+${result.awardedXP} XP · +${result.awardedCP} CP · ${currencySymbol}${result.awardedCoins} ${currencyName}`,
	];
	if (result.wellbeingLine) {
		lines.push(result.wellbeingLine);
	}
	return lines.join('\n');
}

/**
 * Emit field/system notices and growth ceremonies after quest rewards are applied.
 */
export function emitQuestCompletionFeedback(
	result: QuestRewardResult,
	settings?: Partial<GamificationPluginSettings> | QuestRewardSettings
): void {
	if (result.journeyDamage != null) {
		notifyJourneyHit(result.journeyDamage, {
			defeated: result.journeyDefeated,
			grazed: result.journeyGrazed,
			hpPercentAfter: result.journeyHpPercent,
		});
	}
	if (result.journeyDungeonUnlocked) {
		notifyDungeonUnlocked(result.journeyClearedCount, result.journeyRequiredClears);
	}
	if (result.journeyVictoryNotice) {
		notifyJourneyVictory(result.journeyVictoryNotice);
	}
	if (result.bossRaidDamage != null) {
		notifyBossRaidHit(result.bossRaidDamage, {
			defeated: result.bossRaidDefeated,
			grazed: result.bossRaidGrazed,
			hpPercentAfter: result.bossRaidHpPercent,
			bossName: result.bossRaidBossName,
			pendingVictory: result.bossRaidPendingVictory,
		});
	}

	notifyQuestComplete(buildCompletionNoticeText(result, settings));

	if (result.xpGain) {
		const ceremonySettings =
			settings && ('visualTheme' in settings || 'modules' in settings)
				? (settings as Partial<GamificationPluginSettings>)
				: undefined;
		processXPGainCeremonies(result.xpGain, ceremonySettings);
	}
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
