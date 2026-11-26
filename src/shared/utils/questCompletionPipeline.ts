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
import {
	resolveActivityEnergy,
	type ActivityEnergyRule,
} from "./activityEnergy";
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
import { recordDailyActivity } from "./dailyActivityStreak";
import { MaterialInventoryManager } from "../services/materialInventoryManager";
import { applyDreamBattleOnQuestComplete } from "../../features/player/utils/dreamBattleTick";
import {
	overdueKeepFraction,
	payableQuestRewards,
} from "./overdueRewardScale";
import { getPluginSettingsFromApp } from "./gameplayConfig";

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
	/** Crafting materials granted (chance-based). */
	materialsGranted?: { name: string; icon: string }[];
	/** Dream survival tick — flavor only; never blocks completion. */
	dreamNotice?: string;
	dreamOutcome?: 'survived' | 'wrecked';
	dreamLootDown?: number;
	/** Set when overdue penalties shrunk this payout. */
	overdueDaysLate?: number;
}

/** Default stamina cost when a quest has no `energyCost` in metadata. */
export const DEFAULT_QUEST_ENERGY_COST = 10;

/**
 * Signed energy change when a quest is completed.
 * Positive spends. Negative restores. The activity type supplies the number
 * unless this quest locked its own.
 */
export function getQuestEnergyCost(
	quest: Pick<Quest, "energyCost" | "activityProfile" | "energyLocked"> | null | undefined,
	rules?: ActivityEnergyRule[] | null
): number {
	return resolveActivityEnergy(quest, rules);
}

/**
 * Move `stats.energy` by the quest's signed cost (clamped 0–100).
 */
export async function applyQuestEnergyCost(
	quest: Pick<Quest, "energyCost" | "activityProfile" | "energyLocked">,
	rules?: ActivityEnergyRule[] | null
): Promise<void> {
	const cost = getQuestEnergyCost(quest, rules);
	if (!Number.isFinite(cost) || cost === 0) return;

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
	const signed = line.match(/(?:energy|energyCost)\s*:\s*(-?\d+)/i);
	if (signed) {
		const n = parseInt(signed[1], 10);
		if (Number.isFinite(n)) return Math.max(-100, Math.min(100, n));
	}
	const emoji = line.match(/🔋\s*(-?\d+)/);
	if (emoji) {
		const n = parseInt(emoji[1], 10);
		if (Number.isFinite(n)) return Math.max(-100, Math.min(100, n));
	}
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
	const payable = payableQuestRewards(quest, resolveGameplaySettings(settings, app), new Date(), {
		ignoreCompleted: true,
	});
	const awardedXP = payable.xp;
	const awardedCP = payable.cp;
	const awardedCoins = payable.coins;
	const overdueDaysLate = payable.reduced ? payable.daysLate : undefined;

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
		await applyQuestEnergyCost(quest, rewardSettings?.energySettings?.activityEnergyRules);
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
	let materialsGranted: { name: string; icon: string }[] | undefined;
	let dreamTick: Awaited<ReturnType<typeof applyDreamBattleOnQuestComplete>> = null;

	if (app) {
		dreamTick = await applyDreamBattleOnQuestComplete(app, settings as { bookOfEasy?: boolean } | null);
	}

	// Live crafting inventory — chance-based mats on the main quest path
	if (app) {
		try {
			const difficulty = String(quest.difficulty || 'medium');
			const matResult = await MaterialInventoryManager.addQuestMaterials(
				app,
				difficulty,
				dreamTick?.lootStepsDown ?? 0
			);
			if (matResult.materials.length > 0) {
				materialsGranted = matResult.materials.map((m) => ({
					name: m.name,
					icon: m.icon,
				}));
			}
		} catch (error) {
			console.warn('[awardQuestRewards] Material grant failed:', error);
		}
	}

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
				// Every felled foe drops a Lootbox Key — spend it in the shop's Lootbox tab.
				if (app) {
					try {
						const { grantKey, LOOTBOX_KEY_NAME } = await import('./keyItems');
						if (await grantKey(app, LOOTBOX_KEY_NAME)) {
							journeyVictoryNotice += ' · 🗝️ +1 Lootbox Key';
						}
					} catch (error) {
						console.warn('[awardQuestRewards] Lootbox key grant failed:', error);
					}
				}
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
		...(materialsGranted?.length ? { materialsGranted } : {}),
		...(dreamTick
			? {
					dreamNotice: dreamTick.notice,
					dreamOutcome: dreamTick.outcome,
					dreamLootDown: dreamTick.lootStepsDown,
				}
			: {}),
		...(overdueDaysLate ? { overdueDaysLate } : {}),
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

function resolveGameplaySettings(
	settings?: QuestRewardSettings | Partial<GamificationPluginSettings>,
	app?: App
): Partial<GamificationPluginSettings> | null {
	if (settings && ("modules" in settings || "gameplayProfile" in settings)) {
		return settings as Partial<GamificationPluginSettings>;
	}
	if (settings && "energySettings" in settings && settings.energySettings) {
		return settings.energySettings;
	}
	return getPluginSettingsFromApp(app) ?? null;
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

/** Extra flavor that belongs on the same toast as XP — not a second notice. */
export function appendQuestCompletionFlavor(
	lines: string[],
	result: QuestRewardResult
): void {
	if (result.materialsGranted?.length) {
		const summary = result.materialsGranted
			.map((m) => `${m.icon} ${m.name}`)
			.join(', ');
		lines.push(`📦 ${summary}`);
	}
	if (result.journeyDamage != null && !result.journeyDefeated) {
		if (result.journeyGrazed) {
			lines.push(`Journey graze −${result.journeyDamage} HP`);
		} else {
			const hp =
				result.journeyHpPercent != null ? ` · foe ${result.journeyHpPercent}%` : '';
			lines.push(`Journey −${result.journeyDamage} HP${hp}`);
		}
	}
	if (result.bossRaidDamage != null && !result.bossRaidDefeated) {
		const label = result.bossRaidBossName || 'Gate boss';
		if (result.bossRaidGrazed) {
			lines.push(`Raid graze −${result.bossRaidDamage} HP vs ${label}`);
		} else {
			const hp =
				result.bossRaidHpPercent != null ? ` · ${result.bossRaidHpPercent}%` : '';
			lines.push(`Raid −${result.bossRaidDamage} HP vs ${label}${hp}`);
		}
	}
}

/**
 * Build the standard "Quest Complete!" notice string.
 *
 * Example:  ✅ QUEST COMPLETE!\n+50 XP · +10 CP · 🪙10 Coins
 */
export function buildCompletionNoticeText(
	result: QuestRewardResult,
	settings?: QuestRewardSettings | Partial<GamificationPluginSettings>
): string {
	const rewardSettings = normalizeQuestRewardSettings(settings);
	const currencyName = rewardSettings?.currencyName || "Coins";
	const currencySymbol = rewardSettings?.currencySymbol || "🪙";
	const lines = [
		`✅ QUEST COMPLETE!\n+${result.awardedXP} XP · +${result.awardedCP} CP · ${currencySymbol}${result.awardedCoins} ${currencyName}`,
	];
	if (result.overdueDaysLate && result.overdueDaysLate > 0) {
		const kept = Math.round(overdueKeepFraction(result.overdueDaysLate) * 100);
		const dayLabel = result.overdueDaysLate === 1 ? '1 day late' : `${result.overdueDaysLate} days late`;
		lines.push(`${dayLabel} · ${kept}% of the reward`);
	}
	if (result.wellbeingLine) {
		lines.push(result.wellbeingLine);
	}
	if (result.dreamNotice) {
		lines.push(result.dreamNotice);
	}
	appendQuestCompletionFlavor(lines, result);
	return lines.join('\n');
}

/**
 * Emit field/system notices and growth ceremonies after quest rewards are applied.
 */
export function emitQuestCompletionFeedback(
	result: QuestRewardResult,
	settings?: Partial<GamificationPluginSettings> | QuestRewardSettings
): void {
	if (result.journeyDefeated && result.journeyDamage != null) {
		notifyJourneyHit(result.journeyDamage, {
			defeated: true,
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
	if (result.bossRaidDefeated && result.bossRaidDamage != null) {
		notifyBossRaidHit(result.bossRaidDamage, {
			defeated: true,
			grazed: result.bossRaidGrazed,
			hpPercentAfter: result.bossRaidHpPercent,
			bossName: result.bossRaidBossName,
			pendingVictory: result.bossRaidPendingVictory,
		});
	}

	notifyQuestComplete(buildCompletionNoticeText(result, settings));
	recordDailyActivity();

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
