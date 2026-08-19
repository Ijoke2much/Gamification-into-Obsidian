import type { App } from 'obsidian';
import type { Quest } from './taskParser';
import { isRegularTaskQuest } from './questProjectUtils';
import {
	activateBoss,
	applyTaskCompletion,
	getBossHpPercent,
	readBoss,
	resetBossStats,
	resetBossStrikeTasks,
	resetBossTasksInFile,
	setBossTaskCompleted,
	settleArmorRegen,
	writeBossState,
	BOSS_UPDATED_EVENT,
	type BossFileData,
	type BossTaskResult,
} from './bossFile';
import {
	rollAffinityForRule,
	questMatchesAffinity,
	describeAffinity,
	type JourneyAffinity,
} from './journeyAffinity';
import { getAllSkills } from '../../../shared/utils/skillDiscovery';
import { getJourneyQuestKey } from './journeyRunService';
import {
	RAID_FOCUS_MAX,
	scheduleInitialBossStrike,
	clampRaidFocus,
} from './bossRaidPressure';

export const BOSS_RAID_STATE_KEY = 'gamification-boss-raid-v1';
export const BOSS_RAID_UPDATED_EVENT = 'gamification-boss-raid-updated';

export interface BossRaidDamageEntry {
	questId: string;
	questTitle: string;
	hpDamage: number;
	/** Boss HP immediately before this strike (for undo on quest uncomplete). */
	hpBefore: number;
	completedAt: string;
	grazed?: boolean;
}

export interface ActiveBossFileRaid {
	bossFilePath: string;
	lockDungeon: boolean;
	startedAt: string;
	affinity: JourneyAffinity;
	damageLog: BossRaidDamageEntry[];
	/** Vault quests that have struck this boss during the raid. */
	questsApplied: number;
	defeated: boolean;
	/** Boss felled outside the battle UI — open workspace to claim spoils. */
	pendingVictoryClaim: boolean;
	/** Raid-only focus meter (battle sandbox — not player energy). */
	raidFocus: number;
	raidFocusMax: number;
}

function emptyState(): ActiveBossFileRaid | null {
	return null;
}

function readState(): ActiveBossFileRaid | null {
	try {
		const raw = localStorage.getItem(BOSS_RAID_STATE_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw) as ActiveBossFileRaid;
		if (!parsed?.bossFilePath) return emptyState();
		return {
			...parsed,
			raidFocus: clampRaidFocus(parsed.raidFocus ?? RAID_FOCUS_MAX),
			raidFocusMax: parsed.raidFocusMax ?? RAID_FOCUS_MAX,
		};
	} catch {
		return emptyState();
	}
}

function saveState(raid: ActiveBossFileRaid | null): void {
	if (!raid) {
		localStorage.removeItem(BOSS_RAID_STATE_KEY);
	} else {
		localStorage.setItem(BOSS_RAID_STATE_KEY, JSON.stringify(raid));
	}
	window.dispatchEvent(new CustomEvent(BOSS_RAID_UPDATED_EVENT));
}

export function getActiveBossFileRaid(): ActiveBossFileRaid | null {
	return readState();
}

export function patchBossRaidFocus(focus: number): number {
	const raid = readState();
	if (!raid) return clampRaidFocus(focus);
	const next = clampRaidFocus(focus);
	raid.raidFocus = next;
	saveState(raid);
	return next;
}

export function getBossRaidFocus(): { focus: number; max: number } {
	const raid = readState();
	return {
		focus: clampRaidFocus(raid?.raidFocus ?? RAID_FOCUS_MAX),
		max: raid?.raidFocusMax ?? RAID_FOCUS_MAX,
	};
}

export function clearBossFileRaid(): void {
	saveState(null);
}

/** Keep active gate raids pointed at the boss note after a vault rename. */
export function migrateBossRaidFilePath(oldPath: string, newPath: string): void {
	const raid = readState();
	if (!raid) return;
	if (raid.bossFilePath === oldPath.trim()) {
		raid.bossFilePath = newPath.trim();
		saveState(raid);
	}
}

/** Reset a boss note to full HP/armor and an active fight (new gate attempt). */
export async function prepareBossForNewRaid(app: App, boss: BossFileData): Promise<BossFileData> {
	const now = Date.now();
	const armed = activateBoss(boss);
	const fresh: BossFileData = scheduleInitialBossStrike(
		{
			...armed,
			status: 'active',
			currentHp: armed.maxHp,
			currentArmor: armed.maxArmor,
			lastArmorRegenAt: now,
		},
		now
	);
	await writeBossState(app, fresh);
	return resetBossStrikeTasks(app, fresh);
}

/** Thrown when a standalone boss fight is started without a Boss Key. */
export class BossKeyRequiredError extends Error {
	constructor() {
		super('A Boss Key is required to challenge this boss. Win a dungeon raid to earn one.');
		this.name = 'BossKeyRequiredError';
	}
}

export interface StartBossFileRaidOptions {
	/** Open straight to the victory claim screen (vault felled the boss out of battle). */
	resumeClaim?: boolean;
}

/** Register (or resume) a file-backed boss raid when entering the gate. */
export async function startBossFileRaid(
	app: App,
	bossFilePath: string,
	lockDungeon: boolean,
	options?: StartBossFileRaidOptions
): Promise<ActiveBossFileRaid> {
	const normalized = bossFilePath.trim();
	const existing = readState();

	if (
		options?.resumeClaim &&
		existing?.bossFilePath === normalized &&
		existing.pendingVictoryClaim
	) {
		return existing;
	}

	// Resume an in-progress raid (partial vault strikes, boss still fighting).
	if (
		existing?.bossFilePath === normalized &&
		!existing.defeated &&
		!existing.pendingVictoryClaim
	) {
		const current = await readBoss(app, normalized);
		if (current && current.status === 'active' && current.currentHp > 0) {
			if (existing.lockDungeon !== lockDungeon) {
				existing.lockDungeon = lockDungeon;
				saveState(existing);
			}
			return existing;
		}
	}

	const skills = await getAllSkills(app.vault);
	const boss = await readBoss(app, normalized);
	if (!boss) {
		throw new Error(`Boss note not found: ${normalized}`);
	}

	// Standalone boss fights cost a Boss Key (earned from dungeon raid wins).
	// Dungeon gate raids (lockDungeon) stay free — they're the key *source*.
	// Spent only after the boss note is validated; no refund once the raid starts.
	if (!lockDungeon) {
		const { consumeKey, BOSS_KEY_NAME } = await import('../../../shared/utils/keyItems');
		const spent = await consumeKey(app, BOSS_KEY_NAME);
		if (!spent) {
			throw new BossKeyRequiredError();
		}
	}

	await prepareBossForNewRaid(app, boss);

	const affinity = rollAffinityForRule(boss.affinityRule, skills);
	const raid: ActiveBossFileRaid = {
		bossFilePath: normalized,
		lockDungeon,
		startedAt: new Date().toISOString(),
		affinity,
		damageLog: [],
		questsApplied: 0,
		defeated: false,
		pendingVictoryClaim: false,
		raidFocus: RAID_FOCUS_MAX,
		raidFocusMax: RAID_FOCUS_MAX,
	};
	saveState(raid);
	return raid;
}

export function clearBossRaidPendingVictory(): void {
	const raid = readState();
	if (!raid) return;
	raid.pendingVictoryClaim = false;
	saveState(raid);
}

export interface BossFileQuestHitResult {
	applied: boolean;
	hpDamage: number;
	defeated: boolean;
	grazed: boolean;
	hpPercentAfter: number;
	bossName?: string;
	pendingVictoryClaim?: boolean;
}

/**
 * Apply a completed vault quest to the active file-backed boss raid.
 * Each qualifying quest completion counts as one task strike (skill affinity applies).
 */
export async function recordBossFileQuestCompletion(
	app: App,
	quest: Quest
): Promise<BossFileQuestHitResult> {
	const noop: BossFileQuestHitResult = {
		applied: false,
		hpDamage: 0,
		defeated: false,
		grazed: false,
		hpPercentAfter: 100,
	};

	if (!isRegularTaskQuest(quest)) return noop;

	const raid = readState();
	if (!raid || raid.defeated) return noop;

	const boss = await readBoss(app, raid.bossFilePath);
	if (!boss || boss.status === 'defeated') {
		if (raid) {
			raid.defeated = true;
			saveState(raid);
		}
		return noop;
	}

	if (raid.questsApplied >= boss.requiredTasks) return noop;

	const questKey = getJourneyQuestKey(quest);
	if (raid.damageLog.some((e) => e.questId === questKey)) return noop;

	const matched = questMatchesAffinity(quest, raid.affinity);
	const settled = settleArmorRegen(boss);
	const hpBefore = settled.currentHp;
	const result = applyTaskCompletion(boss, matched);

	raid.damageLog = [
		{
			questId: questKey,
			questTitle: quest.title,
			hpDamage: result.hpDamage,
			hpBefore,
			completedAt: new Date().toISOString(),
			...(result.grazed ? { grazed: true } : {}),
		},
		...raid.damageLog,
	].slice(0, 50);
	raid.questsApplied += 1;

	const hpPercentAfter = getBossHpPercent(result.boss);

	if (result.defeated || raid.questsApplied >= boss.requiredTasks) {
		const finalBoss = result.defeated
			? result.boss
			: resetBossStats({ ...result.boss, currentHp: 0 });
		await writeBossState(app, finalBoss);
		await resetBossTasksInFile(app, finalBoss);
		raid.defeated = true;
		raid.pendingVictoryClaim = true;
		saveState(raid);
		window.dispatchEvent(new CustomEvent(BOSS_UPDATED_EVENT));
		return {
			applied: true,
			hpDamage: result.hpDamage,
			defeated: true,
			grazed: result.grazed,
			hpPercentAfter: 0,
			bossName: boss.name,
			pendingVictoryClaim: true,
		};
	}

	await writeBossState(app, result.boss);
	saveState(raid);
	window.dispatchEvent(new CustomEvent(BOSS_UPDATED_EVENT));

	return {
		applied: true,
		hpDamage: result.hpDamage,
		defeated: false,
		grazed: result.grazed,
		hpPercentAfter,
		bossName: boss.name,
	};
}

/** Undo a vault quest strike against the active gate raid (quest unchecked). */
export async function revertBossFileQuestCompletion(
	app: App,
	quest: Quest
): Promise<{ reverted: boolean; hpRestored: number }> {
	const noop = { reverted: false, hpRestored: 0 };
	if (!isRegularTaskQuest(quest)) return noop;

	const raid = readState();
	if (!raid) return noop;

	const questKey = getJourneyQuestKey(quest);
	const entryIdx = raid.damageLog.findIndex((e) => e.questId === questKey);
	if (entryIdx === -1) return noop;

	const entry = raid.damageLog[entryIdx];
	const boss = await readBoss(app, raid.bossFilePath);
	if (!boss) return noop;

	const hpBefore =
		entry.hpBefore ??
		Math.min(boss.maxHp, boss.currentHp + entry.hpDamage);

	const restoredBoss: BossFileData = {
		...activateBoss(boss),
		status: 'active',
		currentHp: Math.min(boss.maxHp, Math.max(1, hpBefore)),
	};

	raid.damageLog = raid.damageLog.filter((_, i) => i !== entryIdx);
	raid.questsApplied = Math.max(0, raid.questsApplied - 1);
	raid.defeated = false;
	raid.pendingVictoryClaim = false;

	await writeBossState(app, restoredBoss);
	saveState(raid);
	window.dispatchEvent(new CustomEvent(BOSS_UPDATED_EVENT));

	return { reverted: true, hpRestored: entry.hpDamage };
}

export function describeBossRaidAffinity(raid: ActiveBossFileRaid | null): string {
	if (!raid) return '';
	return describeAffinity(raid.affinity);
}

export interface BossFileBattleStrikeResult {
	boss: BossFileData;
	result: BossTaskResult;
	defeated: boolean;
}

/** Land an in-battle strike (tap a boss checklist row). Resets each new gate. */
export async function recordBossFileBattleStrike(
	app: App,
	boss: BossFileData,
	lineIndex: number,
	options?: { damageMultiplier?: number }
): Promise<BossFileBattleStrikeResult | null> {
	const fileTask = boss.tasks.find((t) => t.lineIndex === lineIndex);
	if (!fileTask || fileTask.completed) return null;

	await setBossTaskCompleted(app, boss, lineIndex, true);
	const result = applyTaskCompletion(boss, true, Date.now(), {
		damageMultiplier: options?.damageMultiplier,
	});

	const raid = readState();
	if (raid && raid.bossFilePath === boss.filePath && !raid.defeated) {
		raid.questsApplied += 1;
	}

	const hpPercentAfter = getBossHpPercent(result.boss);
	const allStrikesDone = raid ? raid.questsApplied >= boss.requiredTasks : false;

	if (result.defeated || allStrikesDone) {
		const finalBoss = result.defeated
			? result.boss
			: resetBossStats({ ...result.boss, currentHp: 0 });
		await writeBossState(app, finalBoss);
		await resetBossTasksInFile(app, finalBoss);
		if (raid) {
			raid.defeated = true;
			raid.pendingVictoryClaim = true;
			saveState(raid);
		}
		window.dispatchEvent(new CustomEvent(BOSS_UPDATED_EVENT));
		return { boss: finalBoss, result, defeated: true };
	}

	await writeBossState(app, result.boss);
	if (raid) saveState(raid);
	window.dispatchEvent(new CustomEvent(BOSS_UPDATED_EVENT));

	return { boss: result.boss, result, defeated: false };
}
