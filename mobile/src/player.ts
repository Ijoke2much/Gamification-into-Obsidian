import { TFile, type Vault } from 'obsidian';
import type { MobilePlayerSnapshot, MobileSettings } from './types';
import { parseFrontmatter, writeFrontmatter } from './yaml';
import { getRankFromLevel } from './rank';
import { loadMasterClassProgress } from './masterClass';
import { distributeQuestCP } from './progress';

const DEFAULT_SNAPSHOT: MobilePlayerSnapshot = {
	name: 'Player',
	level: 1,
	xp: 0,
	xpRequired: 100,
	coins: 0,
	cp: 0,
	rank: 'E',
	masterClass: 'Adventurer',
	energy: 100,
	masterProgress: null,
};

export async function readPlayerSnapshot(
	vault: Vault,
	settings: MobileSettings
): Promise<MobilePlayerSnapshot> {
	const file = vault.getAbstractFileByPath(settings.playerDataPath);
	if (!(file instanceof TFile)) {
		return { ...DEFAULT_SNAPSHOT };
	}

	try {
		const content = await vault.read(file);
		const { data } = parseFrontmatter(content);

		const level = numberField(data.level, 1);
		const xp = numberField(data.xp, 0);
		const xpRequired = numberField(data.xpRequired, 100);
		const coins = numberField(data.coins, 0);
		const cp = numberField(data.cp, 0);
		const masterClass = stringField(data.masterClass, DEFAULT_SNAPSHOT.masterClass);

		let energy = 100;
		if (data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)) {
			const stats = data.stats as Record<string, unknown>;
			energy = numberField(stats.energy, 100);
		} else if (typeof data.energy === 'number') {
			energy = numberField(data.energy, 100);
		}

		const masterProgress = await loadMasterClassProgress(vault, masterClass);

		return {
			name: stringField(data.name, DEFAULT_SNAPSHOT.name),
			level,
			xp,
			xpRequired: xpRequired > 0 ? xpRequired : 100,
			coins,
			cp,
			rank: stringField(data.rank, getRankFromLevel(level)),
			masterClass,
			energy: Math.max(0, Math.min(100, energy)),
			masterProgress,
		};
	} catch {
		return { ...DEFAULT_SNAPSHOT };
	}
}

export interface AwardResult {
	leveledUp: boolean;
	newLevel: number;
	newXp: number;
	newCoins: number;
	newCp: number;
	newRank: string;
	skillLevelUps: string[];
}

export async function awardPlayerRewards(
	vault: Vault,
	settings: MobileSettings,
	xp: number,
	coins: number,
	cp = 0,
	options?: {
		energyCost?: number;
		skills?: string[];
		stats?: string[];
	}
): Promise<AwardResult> {
	const file = vault.getAbstractFileByPath(settings.playerDataPath);
	if (!(file instanceof TFile)) {
		throw new Error(`Player data not found at ${settings.playerDataPath}`);
	}

	const content = await vault.read(file);
	const { data } = parseFrontmatter(content);

	let level = numberField(data.level, 1);
	let currentXp = numberField(data.xp, 0);
	let xpRequired = numberField(data.xpRequired, 100);
	let currentCoins = numberField(data.coins, 0);
	let currentCp = numberField(data.cp, 0);
	const totalExp = numberField(data.total_exp, 0);

	currentXp += xp;
	currentCoins += coins;
	currentCp += cp;
	let total = totalExp + xp;
	let leveledUp = false;

	while (xpRequired > 0 && currentXp >= xpRequired) {
		currentXp -= xpRequired;
		level += 1;
		leveledUp = true;
		xpRequired = Math.max(100, level * 100);
	}

	const rank = getRankFromLevel(level);
	const nextData: Record<string, unknown> = {
		...data,
		level,
		xp: currentXp,
		xpRequired,
		coins: currentCoins,
		cp: currentCp,
		total_exp: total,
		rank,
	};

	if (typeof options?.energyCost === 'number' && options.energyCost > 0) {
		const stats =
			data.stats && typeof data.stats === 'object' && !Array.isArray(data.stats)
				? { ...(data.stats as Record<string, unknown>) }
				: {};
		const currentEnergy = numberField(stats.energy, 100);
		stats.energy = Math.max(0, Math.min(100, currentEnergy - options.energyCost));
		nextData.stats = stats;
	}

	const { body } = parseFrontmatter(content);
	await vault.modify(file, writeFrontmatter(nextData, body));

	const skillLevelUps = options?.skills || options?.stats
		? await distributeQuestCP(vault, cp, options.skills || [], options.stats || [])
		: [];

	return {
		leveledUp,
		newLevel: level,
		newXp: currentXp,
		newCoins: currentCoins,
		newCp: currentCp,
		newRank: rank,
		skillLevelUps,
	};
}

function numberField(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
		return Number(value);
	}
	return fallback;
}

function stringField(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
