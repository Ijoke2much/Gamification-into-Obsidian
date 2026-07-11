import type { App, Vault } from 'obsidian';
import type { JourneyFoeDefinition } from '../data/journeyFoeCatalog';
import type { BossDifficulty, BossFileData } from './bossFile';
import { playerStore } from '../../../shared/state/playerStore';
import { MaterialInventoryManager } from '../../../shared/services/materialInventoryManager';
import { getJourneyFoeById } from './journeyFoeRegistry';
import type { DungeonRaid, JourneyRun } from './journeyRunService';
import type { JourneyAffinity } from './journeyAffinity';
import {
	resolveCpSkillsFromAffinity,
	resolveCpSkillsFromBossSkillTag,
	rollAffinityForRule,
} from './journeyAffinity';
import { distributeCPFromQuest } from '../../../shared/utils/progressUpdater';
import { getAllSkills } from '../../../shared/utils/skillDiscovery';

export interface JourneyVictoryLoot {
	xp: number;
	cp: number;
	coins: number;
	materialNames: string[];
}

const LOOT_TIER_XP: Record<JourneyFoeDefinition['lootTier'], number> = {
	common: 25,
	uncommon: 45,
	rare: 75,
};

const LOOT_TIER_COINS: Record<JourneyFoeDefinition['lootTier'], number> = {
	common: 8,
	uncommon: 15,
	rare: 28,
};

const LOOT_TIER_CP: Record<JourneyFoeDefinition['lootTier'], number> = {
	common: 10,
	uncommon: 18,
	rare: 32,
};

const DIFFICULTY_XP_BONUS: Record<JourneyFoeDefinition['difficulty'], number> = {
	easy: 0,
	medium: 10,
	hard: 25,
};

const DIFFICULTY_COINS_BONUS: Record<JourneyFoeDefinition['difficulty'], number> = {
	easy: 0,
	medium: 4,
	hard: 12,
};

const DIFFICULTY_CP_BONUS: Record<JourneyFoeDefinition['difficulty'], number> = {
	easy: 0,
	medium: 6,
	hard: 15,
};

/** Map foe loot tier → material roll difficulty for the shared material reward tables. */
const LOOT_TIER_MATERIAL_DIFFICULTY: Record<JourneyFoeDefinition['lootTier'], string> = {
	common: 'easy',
	uncommon: 'medium',
	rare: 'hard',
};

export function computeJourneyVictoryLoot(foe: JourneyFoeDefinition): JourneyVictoryLoot {
	return {
		xp: LOOT_TIER_XP[foe.lootTier] + DIFFICULTY_XP_BONUS[foe.difficulty],
		cp: LOOT_TIER_CP[foe.lootTier] + DIFFICULTY_CP_BONUS[foe.difficulty],
		coins: LOOT_TIER_COINS[foe.lootTier] + DIFFICULTY_COINS_BONUS[foe.difficulty],
		materialNames: [],
	};
}

export function buildJourneyVictoryNotice(
	foeName: string,
	loot: JourneyVictoryLoot,
	currencySymbol = '🪙'
): string {
	const parts = [`🏆 ${foeName} defeated!`, `+${loot.xp} XP`, `+${loot.cp} CP`, `+${currencySymbol}${loot.coins}`];
	if (loot.materialNames.length > 0) {
		parts.push(`materials: ${loot.materialNames.join(', ')}`);
	}
	return parts.join(' · ');
}

/**
 * Grant victory loot once per run. Returns the loot granted, or null if already claimed / invalid.
 */
export async function grantJourneyVictoryLoot(
	vault: Vault,
	run: JourneyRun,
	app?: App | null
): Promise<JourneyVictoryLoot | null> {
	if (run.status !== 'completed' || run.victoryLootClaimed) return null;

	const foe = getJourneyFoeById(run.foeId);
	if (!foe) return null;

	const loot = computeJourneyVictoryLoot(foe);

	if (loot.xp > 0) await playerStore.addXP(loot.xp);
	if (loot.cp > 0) {
		await playerStore.update((data) => ({
			...data,
			cp: (data.cp || 0) + loot.cp,
		}));
	}
	if (loot.coins > 0) await playerStore.addCoins(loot.coins);

	if (app) {
		const matDiff = LOOT_TIER_MATERIAL_DIFFICULTY[foe.lootTier];
		const { materials } = await MaterialInventoryManager.addQuestMaterials(app, matDiff);
		loot.materialNames = materials.map((m) => m.name);
	}

	void vault; // reserved for future vault-backed loot notes
	return loot;
}

/* ── Dungeon raid loot ─────────────────────────────────────────────────────── */

export interface DungeonRaidLoot {
	xp: number;
	cp: number;
	coins: number;
	materialNames: string[];
	/** Skill/class names that received distributed CP from this raid. */
	cpSkillTargets?: string[];
}

/** Raid spoils are richer than the field victory — a premium payout for the gate boss. */
const DUNGEON_LOOT_MULTIPLIER = 2.25;

async function grantPlayerLoot(loot: Pick<DungeonRaidLoot, 'xp' | 'cp' | 'coins'>): Promise<void> {
	if (loot.xp > 0) await playerStore.addXP(loot.xp);
	if (loot.cp > 0) {
		await playerStore.update((data) => ({
			...data,
			cp: (data.cp || 0) + loot.cp,
		}));
	}
	if (loot.coins > 0) await playerStore.addCoins(loot.coins);
}

export function computeDungeonRaidLoot(raid: Pick<DungeonRaid, 'lootTier' | 'difficulty'>): DungeonRaidLoot {
	const baseXp = LOOT_TIER_XP[raid.lootTier] + DIFFICULTY_XP_BONUS[raid.difficulty];
	const baseCp = LOOT_TIER_CP[raid.lootTier] + DIFFICULTY_CP_BONUS[raid.difficulty];
	const baseCoins = LOOT_TIER_COINS[raid.lootTier] + DIFFICULTY_COINS_BONUS[raid.difficulty];
	return {
		xp: Math.round(baseXp * DUNGEON_LOOT_MULTIPLIER),
		cp: Math.round(baseCp * DUNGEON_LOOT_MULTIPLIER),
		coins: Math.round(baseCoins * DUNGEON_LOOT_MULTIPLIER),
		materialNames: [],
	};
}

export function buildDungeonRaidNotice(
	bossName: string,
	loot: DungeonRaidLoot,
	currencySymbol = '🪙'
): string {
	const parts = [
		`🏰 Raid cleared — ${bossName} fell!`,
		`+${loot.xp} XP`,
		`+${loot.cp} CP`,
		`+${currencySymbol}${loot.coins}`,
	];
	if (loot.materialNames.length > 0) {
		parts.push(`materials: ${loot.materialNames.join(', ')}`);
	}
	if (loot.cpSkillTargets && loot.cpSkillTargets.length > 0) {
		parts.push(`CP → ${loot.cpSkillTargets.join(', ')}`);
	}
	return parts.join(' · ');
}

/** Map boss note difficulty → material tier when no gate foe is linked. */
const BOSS_DIFFICULTY_LOOT_TIER: Record<BossDifficulty, JourneyFoeDefinition['lootTier']> = {
	easy: 'common',
	medium: 'uncommon',
	hard: 'rare',
};

export function resolveBossFileRaidLootParams(
	boss: Pick<BossFileData, 'difficulty'>,
	gateFoe?: JourneyFoeDefinition | null
): Pick<DungeonRaid, 'lootTier' | 'difficulty'> {
	return {
		lootTier: gateFoe?.lootTier ?? BOSS_DIFFICULTY_LOOT_TIER[boss.difficulty],
		difficulty: gateFoe?.difficulty ?? boss.difficulty,
	};
}

export function computeBossFileRaidLoot(
	boss: Pick<BossFileData, 'difficulty'>,
	gateFoe?: JourneyFoeDefinition | null
): DungeonRaidLoot {
	return computeDungeonRaidLoot(resolveBossFileRaidLootParams(boss, gateFoe));
}

/** Grant premium raid spoils for a file-backed dungeon win (materials rolled here). */
export async function grantBossFileDungeonLoot(
	app: App,
	boss: BossFileData,
	gateFoe?: JourneyFoeDefinition | null,
	raidAffinity?: JourneyAffinity | null
): Promise<DungeonRaidLoot> {
	const loot = computeBossFileRaidLoot(boss, gateFoe);

	await grantPlayerLoot(loot);

	let cpSkills = resolveCpSkillsFromAffinity(raidAffinity ?? undefined);
	if (cpSkills.length === 0) {
		cpSkills = resolveCpSkillsFromBossSkillTag(boss.skill);
	}
	if (cpSkills.length === 0 && boss.affinityRule) {
		const skills = await getAllSkills(app.vault);
		const rolled = rollAffinityForRule(boss.affinityRule, skills);
		cpSkills = resolveCpSkillsFromAffinity(rolled);
	}

	if (loot.cp > 0 && cpSkills.length > 0) {
		await distributeCPFromQuest(app.vault, { skills: cpSkills, cp: loot.cp });
		loot.cpSkillTargets = cpSkills;
	}

	const matDiff = LOOT_TIER_MATERIAL_DIFFICULTY[resolveBossFileRaidLootParams(boss, gateFoe).lootTier];
	const { materials } = await MaterialInventoryManager.addQuestMaterials(app, matDiff);
	loot.materialNames = materials.map((m) => m.name);

	return loot;
}

/**
 * Grant raid loot once per won raid. Returns loot granted, or null if invalid / already claimed.
 */
export async function grantDungeonRaidLoot(
	raid: DungeonRaid,
	app?: App | null
): Promise<DungeonRaidLoot | null> {
	if (raid.status !== 'won' || raid.lootClaimed) return null;

	const loot = computeDungeonRaidLoot(raid);

	await grantPlayerLoot(loot);

	if (app) {
		const matDiff = LOOT_TIER_MATERIAL_DIFFICULTY[raid.lootTier];
		const { materials } = await MaterialInventoryManager.addQuestMaterials(app, matDiff);
		loot.materialNames = materials.map((m) => m.name);
	}

	return loot;
}
