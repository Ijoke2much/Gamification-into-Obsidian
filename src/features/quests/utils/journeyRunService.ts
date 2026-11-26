import type { App } from 'obsidian';
import type { Quest } from './taskParser';
import { isRegularTaskQuest } from './questProjectUtils';
import type { JourneyFoeDefinition } from '../data/journeyFoeCatalog';
import type { BossFileData } from './bossFile';
import { grantBossFileDungeonLoot, type DungeonRaidLoot } from './journeyLootService';
import { getActiveBossFileRaid } from './bossRaidService';
import { getJourneyFoeById } from './journeyFoeRegistry';
import {
	JOURNEY_OFF_AFFINITY_MULTIPLIER,
	NEUTRAL_AFFINITY,
	questMatchesAffinity,
	type JourneyAffinity,
} from './journeyAffinity';

export const JOURNEY_STATE_KEY = 'gamification-journey-state-v1';
export const JOURNEY_UPDATED_EVENT = 'journey-run-updated';
/** Minimum Journey victories on the current board before the optional dungeon raid unlocks. */
export const JOURNEY_DUNGEON_MIN_CLEARED_FOES = 2;

export interface DungeonProgress {
	unlocked: boolean;
	clearedCount: number;
	required: number;
	clearedFoeIds: string[];
	/** Active run awaiting roster dismiss that counts toward progress. */
	pendingVictoryFoeId: string | null;
	/** True once the raid has been won this board cycle (locks until reshuffle). */
	clearedForCycle: boolean;
	/** True while a dungeon raid encounter is in progress. */
	raidActive: boolean;
	/** Foe the raid boss is (or would be) spawned from. */
	bossSourceFoeId: string | null;
}

export type DungeonRaidStatus = 'active' | 'won';

/** A single optional boss raid, spawned from a cleared Journey foe. */
export interface DungeonRaid {
	bossFoeId: string;
	bossName: string;
	emoji: string;
	currentHp: number;
	maxHp: number;
	status: DungeonRaidStatus;
	startedAt: string;
	strikes: number;
	lootTier: JourneyFoeDefinition['lootTier'];
	difficulty: JourneyFoeDefinition['difficulty'];
	lootClaimed?: boolean;
}

export interface JourneyDamageEntry {
	questId: string;
	questTitle: string;
	damage: number;
	completedAt: string;
	/** True when the task missed the foe's affinity and only chipped (reduced) damage. */
	grazed?: boolean;
}

export type JourneyRunStatus = 'active' | 'completed' | 'failed';

export interface JourneyRun {
	foeId: string;
	startedAt: string;
	endsAt: string;
	currentHp: number;
	maxHp: number;
	status: JourneyRunStatus;
	damageLog: JourneyDamageEntry[];
	tasksCompletedCount: number;
	totalDamageDealt: number;
	/** Weakness snapshot taken when the run started (board rerolls never affect it). */
	affinity?: JourneyAffinity;
	/** Set after victory loot is granted so the killing blow can't pay out twice. */
	victoryLootClaimed?: boolean;
}

export interface JourneyBoardEntry {
	foeId: string;
	affinity: JourneyAffinity;
}

/** One rolled "bulletin board" cycle: each foe's affinity for this window. */
export interface JourneyBoard {
	rolledAt: string;
	entries: JourneyBoardEntry[];
}

export interface JourneyPersistedState {
	activeRun: JourneyRun | null;
	clearedFoeIds: string[];
	board: JourneyBoard | null;
	/** Current optional dungeon raid encounter (spawned from a cleared foe). */
	dungeonRaid?: DungeonRaid | null;
	/** True after a raid win; locks the dungeon until the board reshuffles. */
	dungeonClearedForCycle?: boolean;
}

function emptyState(): JourneyPersistedState {
	return { activeRun: null, clearedFoeIds: [], board: null, dungeonRaid: null, dungeonClearedForCycle: false };
}

/** Stable key for deduping damage per quest within a run. */
export function getJourneyQuestKey(quest: Quest): string {
	const id = (quest.id || quest.title || '').trim();
	const path = (quest.filePath || '').trim();
	return path ? `${path}::${id}` : id;
}

function readRawState(): JourneyPersistedState {
	try {
		const raw = localStorage.getItem(JOURNEY_STATE_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw) as JourneyPersistedState;
		if (!parsed || typeof parsed !== 'object') return emptyState();
		return {
			activeRun: parsed.activeRun ?? null,
			clearedFoeIds: Array.isArray(parsed.clearedFoeIds) ? parsed.clearedFoeIds : [],
			board: parsed.board ?? null,
			dungeonRaid: parsed.dungeonRaid ?? null,
			dungeonClearedForCycle: parsed.dungeonClearedForCycle ?? false,
		};
	} catch {
		return emptyState();
	}
}

/** If the active run's window has elapsed, mark it failed (foe escaped). Returns true when changed. */
export function expireActiveJourneyRunIfNeeded(
	state: JourneyPersistedState,
	now = new Date()
): boolean {
	const run = state.activeRun;
	if (!run || run.status !== 'active') return false;
	const end = new Date(run.endsAt).getTime();
	if (Number.isNaN(end) || end > now.getTime()) return false;
	run.status = 'failed';
	state.activeRun = run;
	return true;
}

export function loadJourneyState(): JourneyPersistedState {
	const state = readRawState();
	if (expireActiveJourneyRunIfNeeded(state)) {
		saveJourneyState(state);
	}
	return state;
}

export function saveJourneyState(state: JourneyPersistedState): void {
	localStorage.setItem(JOURNEY_STATE_KEY, JSON.stringify(state));
	window.dispatchEvent(new CustomEvent(JOURNEY_UPDATED_EVENT));
}

export function notifyJourneyUpdated(): void {
	window.dispatchEvent(new CustomEvent(JOURNEY_UPDATED_EVENT));
}

export function clearClearedFoesForNewBoard(state: JourneyPersistedState): void {
	state.clearedFoeIds = [];
	state.dungeonRaid = null;
	state.dungeonClearedForCycle = false;
}

/** Difficulty ordering for picking the toughest cleared foe as the raid boss. */
const DIFFICULTY_RANK: Record<JourneyFoeDefinition['difficulty'], number> = {
	easy: 0,
	medium: 1,
	hard: 2,
};

/**
 * Choose which cleared foe the dungeon boss is spawned from: the toughest cleared
 * foe this cycle (ties broken by most-recently cleared / pending victory).
 */
export function getDungeonBossSource(state: JourneyPersistedState): JourneyFoeDefinition | null {
	const candidateIds = [...state.clearedFoeIds];
	const run = state.activeRun;
	if (run?.status === 'completed' && !candidateIds.includes(run.foeId)) {
		candidateIds.push(run.foeId);
	}
	if (candidateIds.length === 0) return null;

	let best: JourneyFoeDefinition | null = null;
	// Iterate in reverse so later (more recent) clears win ties.
	for (let i = candidateIds.length - 1; i >= 0; i--) {
		const foe = getJourneyFoeById(candidateIds[i]);
		if (!foe) continue;
		if (!best || DIFFICULTY_RANK[foe.difficulty] > DIFFICULTY_RANK[best.difficulty]) {
			best = foe;
		}
	}
	return best;
}

/** How many Journey victories are needed to open the dungeon this board cycle. */
export function getDungeonClearRequirement(foeCount: number): number {
	if (foeCount <= 0) return JOURNEY_DUNGEON_MIN_CLEARED_FOES;
	return Math.max(JOURNEY_DUNGEON_MIN_CLEARED_FOES, Math.floor(foeCount / 2));
}

/** Cleared roster foes plus a completed run not yet dismissed. */
export function getClearedFoeCount(state: JourneyPersistedState): number {
	let count = state.clearedFoeIds.length;
	const run = state.activeRun;
	if (run?.status === 'completed' && !state.clearedFoeIds.includes(run.foeId)) {
		count += 1;
	}
	return count;
}

export function getDungeonProgress(
	state: JourneyPersistedState,
	foeCount?: number
): DungeonProgress {
	const rosterSize = foeCount ?? state.board?.entries.length ?? 0;
	const required = getDungeonClearRequirement(rosterSize);
	const clearedCount = getClearedFoeCount(state);
	const run = state.activeRun;
	const pendingVictoryFoeId =
		run?.status === 'completed' && !state.clearedFoeIds.includes(run.foeId) ? run.foeId : null;
	const bossSource = getDungeonBossSource(state);

	return {
		unlocked: clearedCount >= required,
		clearedCount,
		required,
		clearedFoeIds: [...state.clearedFoeIds],
		pendingVictoryFoeId,
		clearedForCycle: state.dungeonClearedForCycle ?? false,
		raidActive: state.dungeonRaid?.status === 'active',
		bossSourceFoeId: bossSource?.id ?? null,
	};
}

export function isDungeonUnlocked(state: JourneyPersistedState, foeCount?: number): boolean {
	return getDungeonProgress(state, foeCount).unlocked;
}

export function getDaysRemainingForRun(run: JourneyRun, now = new Date()): number {
	const end = new Date(run.endsAt).getTime();
	const ms = end - now.getTime();
	return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isRunExpired(run: JourneyRun, now = new Date()): boolean {
	return new Date(run.endsAt).getTime() <= now.getTime();
}

export function getDayIndexForRun(run: JourneyRun, foe: JourneyFoeDefinition, now = new Date()): number {
	const start = new Date(run.startedAt).getTime();
	const elapsed = Math.max(0, now.getTime() - start);
	const day = Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1;
	return Math.min(foe.windowDays, day);
}

export function computeJourneyDamage(quest: Quest): number {
	const diff = (quest.difficulty || 'medium').toLowerCase();
	const diffBonus: Record<string, number> = { easy: 0, medium: 2, hard: 5, epic: 8, none: 1 };
	const energy = quest.energyCost ?? 10;
	const base = 4 + (diffBonus[diff] ?? 2) + Math.floor(energy / 25);
	return Math.min(14, Math.max(3, base));
}

export function getBoardAffinityForFoe(
	board: JourneyBoard | null,
	foeId: string
): JourneyAffinity | undefined {
	return board?.entries.find((e) => e.foeId === foeId)?.affinity;
}

export function startJourneyRun(foeId: string): { ok: true } | { ok: false; reason: string } {
	const foe = getJourneyFoeById(foeId);
	if (!foe) return { ok: false, reason: 'Unknown foe.' };

	const state = loadJourneyState();
	if (state.activeRun) {
		if (state.activeRun.status === 'active') {
			return { ok: false, reason: 'Finish or leave your current Journey run first.' };
		}
		return { ok: false, reason: 'Dismiss your previous Journey run before facing a new foe.' };
	}

	const affinity = getBoardAffinityForFoe(state.board, foe.id) ?? NEUTRAL_AFFINITY;

	const startedAt = new Date();
	const endsAt = new Date(startedAt.getTime() + foe.windowDays * 24 * 60 * 60 * 1000);

	state.activeRun = {
		foeId: foe.id,
		startedAt: startedAt.toISOString(),
		endsAt: endsAt.toISOString(),
		currentHp: foe.maxHp,
		maxHp: foe.maxHp,
		status: 'active',
		damageLog: [],
		tasksCompletedCount: 0,
		totalDamageDealt: 0,
		affinity,
		victoryLootClaimed: false,
	};
	saveJourneyState(state);
	return { ok: true };
}

export function abandonJourneyRun(): void {
	const state = loadJourneyState();
	if (!state.activeRun) return;
	state.activeRun = null;
	saveJourneyState(state);
}

export function dismissCompletedJourneyRun(foeCount?: number): {
	dungeonJustUnlocked: boolean;
	clearedCount: number;
	required: number;
} {
	const state = loadJourneyState();
	const run = state.activeRun;
	if (!run || run.status !== 'completed') {
		const progress = getDungeonProgress(state, foeCount);
		return { dungeonJustUnlocked: false, clearedCount: progress.clearedCount, required: progress.required };
	}

	const wasUnlocked = isDungeonUnlocked(state, foeCount);
	if (!state.clearedFoeIds.includes(run.foeId)) {
		state.clearedFoeIds.push(run.foeId);
	}
	state.activeRun = null;
	saveJourneyState(state);

	const progress = getDungeonProgress(state, foeCount);
	return {
		dungeonJustUnlocked: !wasUnlocked && progress.unlocked,
		clearedCount: progress.clearedCount,
		required: progress.required,
	};
}

export function dismissFailedJourneyRun(): void {
	const state = loadJourneyState();
	const run = state.activeRun;
	if (!run || run.status !== 'failed') return;
	state.activeRun = null;
	saveJourneyState(state);
}

export function markJourneyVictoryLootClaimed(): void {
	const state = loadJourneyState();
	const run = state.activeRun;
	if (!run || run.status !== 'completed' || run.victoryLootClaimed) return;
	run.victoryLootClaimed = true;
	state.activeRun = run;
	saveJourneyState(state);
}

export function recordJourneyQuestCompletion(quest: Quest): {
	applied: boolean;
	damage: number;
	defeated: boolean;
	grazed: boolean;
	dungeonJustUnlocked: boolean;
	hpPercentAfter: number;
	clearedCount?: number;
	requiredClears?: number;
} {
	if (!isRegularTaskQuest(quest)) {
		return { applied: false, damage: 0, defeated: false, grazed: false, dungeonJustUnlocked: false, hpPercentAfter: 100 };
	}

	const state = readRawState();
	expireActiveJourneyRunIfNeeded(state);
	const run = state.activeRun;
	if (!run || run.status !== 'active') {
		if (expireActiveJourneyRunIfNeeded(state)) saveJourneyState(state);
		return { applied: false, damage: 0, defeated: false, grazed: false, dungeonJustUnlocked: false, hpPercentAfter: 100 };
	}

	const questKey = getJourneyQuestKey(quest);
	if (run.damageLog.some((e) => e.questId === questKey)) {
		return { applied: false, damage: 0, defeated: false, grazed: false, dungeonJustUnlocked: false, hpPercentAfter: getFoeHpPercent(run) };
	}

	const matched = questMatchesAffinity(quest, run.affinity);
	const baseDamage = computeJourneyDamage(quest);
	const damage = matched
		? baseDamage
		: Math.max(1, Math.round(baseDamage * JOURNEY_OFF_AFFINITY_MULTIPLIER));
	const rosterSize = state.board?.entries.length ?? 0;
	const wasDungeonUnlocked = isDungeonUnlocked(state, rosterSize);
	const newHp = Math.max(0, run.currentHp - damage);
	const hpAfterRatio = newHp / Math.max(1, run.maxHp);
	const entry: JourneyDamageEntry = {
		questId: questKey,
		questTitle: quest.title,
		damage,
		completedAt: new Date().toISOString(),
		...(matched ? {} : { grazed: true }),
	};

	run.damageLog = [entry, ...run.damageLog].slice(0, 50);
	run.tasksCompletedCount += 1;
	run.totalDamageDealt += damage;
	run.currentHp = newHp;

	if (newHp <= 0) {
		run.status = 'completed';
		run.currentHp = 0;
	}

	state.activeRun = run;
	saveJourneyState(state);

	const progress = getDungeonProgress(state, rosterSize);
	const dungeonJustUnlocked = run.status === 'completed' && !wasDungeonUnlocked && progress.unlocked;

	return {
		applied: true,
		damage,
		defeated: run.status === 'completed',
		grazed: !matched,
		dungeonJustUnlocked,
		hpPercentAfter: Math.round(hpAfterRatio * 100),
		clearedCount: progress.clearedCount,
		requiredClears: progress.required,
	};
}

export function revertJourneyQuestCompletion(quest: Quest): {
	reverted: boolean;
	damage: number;
} {
	if (!isRegularTaskQuest(quest)) {
		return { reverted: false, damage: 0 };
	}

	const state = readRawState();
	const run = state.activeRun;
	if (!run || run.status === 'failed') {
		return { reverted: false, damage: 0 };
	}

	const questKey = getJourneyQuestKey(quest);
	const entryIdx = run.damageLog.findIndex((e) => e.questId === questKey);
	if (entryIdx === -1) return { reverted: false, damage: 0 };

	const [entry] = run.damageLog.splice(entryIdx, 1);
	run.currentHp = Math.min(run.maxHp, run.currentHp + entry.damage);
	run.tasksCompletedCount = Math.max(0, run.tasksCompletedCount - 1);
	run.totalDamageDealt = Math.max(0, run.totalDamageDealt - entry.damage);

	if (run.status === 'completed' && run.currentHp > 0) {
		run.status = 'active';
	}

	state.activeRun = run;
	saveJourneyState(state);
	return { reverted: true, damage: entry.damage };
}

export function getJourneyHpSegmentFill(currentHp: number, maxHp: number, segments = 8): number {
	return Math.round((currentHp / Math.max(1, maxHp)) * segments);
}

export function getFoeHpPercent(run: JourneyRun): number {
	return Math.round((run.currentHp / Math.max(1, run.maxHp)) * 100);
}

/* ── Dungeon raid ─────────────────────────────────────────────────────────── */

/** Raid bosses are beefier than their field form. */
export const DUNGEON_BOSS_HP_MULTIPLIER = 1.75;

export function getDungeonRaidHpPercent(raid: DungeonRaid): number {
	return Math.round((raid.currentHp / Math.max(1, raid.maxHp)) * 100);
}

/** True when the dungeon can be entered right now (unlocked, not cleared, no active raid). */
export function canEnterDungeon(state: JourneyPersistedState, foeCount?: number): boolean {
	const progress = getDungeonProgress(state, foeCount);
	return progress.unlocked && !progress.clearedForCycle && !progress.raidActive;
}

/**
 * Spawn a raid boss from the toughest cleared Journey foe. One raid per board cycle.
 */
export function startDungeonRaid(
	foeCount?: number
): { ok: true; raid: DungeonRaid } | { ok: false; reason: string } {
	const state = loadJourneyState();
	const progress = getDungeonProgress(state, foeCount);

	if (!progress.unlocked) {
		return { ok: false, reason: 'Clear more Journey foes to unlock the dungeon first.' };
	}
	if (progress.clearedForCycle) {
		return { ok: false, reason: 'Raid already cleared this cycle. It reopens when the board reshuffles.' };
	}
	if (state.dungeonRaid?.status === 'active') {
		return { ok: false, reason: 'A raid is already in progress.' };
	}

	const source = getDungeonBossSource(state);
	if (!source) {
		return { ok: false, reason: 'No cleared foe to raise as a raid boss.' };
	}

	const maxHp = Math.round(source.maxHp * DUNGEON_BOSS_HP_MULTIPLIER);
	const raid: DungeonRaid = {
		bossFoeId: source.id,
		bossName: source.name,
		emoji: source.emoji,
		currentHp: maxHp,
		maxHp,
		status: 'active',
		startedAt: new Date().toISOString(),
		strikes: 0,
		lootTier: source.lootTier,
		difficulty: source.difficulty,
		lootClaimed: false,
	};

	state.dungeonRaid = raid;
	saveJourneyState(state);
	return { ok: true, raid };
}

/** Default per-strike damage: tuned so a raid takes ~5 hits regardless of boss size. */
function computeDungeonStrikeDamage(raid: DungeonRaid): number {
	const base = raid.maxHp / 5;
	const variance = 0.8 + Math.random() * 0.4; // 0.8×–1.2×
	return Math.max(1, Math.round(base * variance));
}

/**
 * Land a strike on the raid boss. Returns the damage dealt and whether the boss fell.
 */
export function strikeDungeonBoss(damage?: number): {
	applied: boolean;
	damage: number;
	defeated: boolean;
	hpPercentAfter: number;
} {
	const state = loadJourneyState();
	const raid = state.dungeonRaid;
	if (!raid || raid.status !== 'active') {
		return { applied: false, damage: 0, defeated: false, hpPercentAfter: 0 };
	}

	const dmg = damage != null ? Math.max(1, Math.round(damage)) : computeDungeonStrikeDamage(raid);
	raid.currentHp = Math.max(0, raid.currentHp - dmg);
	raid.strikes += 1;

	if (raid.currentHp <= 0) {
		raid.currentHp = 0;
		raid.status = 'won';
	}

	state.dungeonRaid = raid;
	saveJourneyState(state);

	return {
		applied: true,
		damage: dmg,
		defeated: raid.status === 'won',
		hpPercentAfter: getDungeonRaidHpPercent(raid),
	};
}

/** Retreat from an in-progress raid (no loot, boss can be re-entered). */
export function abandonDungeonRaid(): void {
	const state = loadJourneyState();
	if (!state.dungeonRaid || state.dungeonRaid.status !== 'active') return;
	state.dungeonRaid = null;
	saveJourneyState(state);
}

/** Mark raid loot claimed so a win only pays out once. */
export function markDungeonRaidLootClaimed(): void {
	const state = loadJourneyState();
	const raid = state.dungeonRaid;
	if (!raid || raid.status !== 'won' || raid.lootClaimed) return;
	raid.lootClaimed = true;
	state.dungeonRaid = raid;
	saveJourneyState(state);
}

/** Close out a won raid: lock the dungeon until the next board reshuffle. */
export function completeDungeonRaid(): void {
	const state = loadJourneyState();
	if (state.dungeonRaid?.status !== 'won') return;
	state.dungeonClearedForCycle = true;
	state.dungeonRaid = null;
	saveJourneyState(state);
}

/**
 * Lock the dungeon for the current board cycle without an in-memory DungeonRaid.
 * Used by the file-backed boss fight, which owns its own HP/armor state.
 */
export function markDungeonClearedForCycle(): void {
	const state = loadJourneyState();
	state.dungeonClearedForCycle = true;
	state.dungeonRaid = null;
	saveJourneyState(state);
}

/**
 * Pay out file-backed dungeon raid spoils once per board cycle, then seal the gate.
 * Returns null when loot was already claimed this cycle.
 */
export async function completeFileBackedDungeonRaid(
	app: App,
	boss: BossFileData
): Promise<DungeonRaidLoot | null> {
	const state = loadJourneyState();
	if (state.dungeonClearedForCycle) return null;

	const gateFoe = getDungeonBossSource(state);
	const raidAffinity = getActiveBossFileRaid()?.affinity ?? null;
	const loot = await grantBossFileDungeonLoot(app, boss, gateFoe, raidAffinity);
	markDungeonClearedForCycle();
	return loot;
}

/** Dev helper: deal a huge strike to instantly win the active raid. */
export function debugWinDungeonRaid(): { ok: boolean; reason?: string } {
	const state = loadJourneyState();
	const raid = state.dungeonRaid;
	if (!raid || raid.status !== 'active') {
		return { ok: false, reason: 'No active raid to win.' };
	}
	strikeDungeonBoss(raid.currentHp);
	return { ok: true };
}

/** Dev helper: simulate completing one task against the active run (unique id each click). */
export function debugSimulateJourneyTaskHit(options?: {
	/** When true, tags the fake task with the run's affinity for full damage. Default true. */
	matchAffinity?: boolean;
	/** When true, each hit deals enough damage to defeat the foe. Default false. */
	forceDefeat?: boolean;
}): ReturnType<typeof recordJourneyQuestCompletion> {
	const matchAffinity = options?.matchAffinity !== false;
	const state = readRawState();
	expireActiveJourneyRunIfNeeded(state);
	const run = state.activeRun;
	if (!run || run.status !== 'active') {
		if (expireActiveJourneyRunIfNeeded(state)) saveJourneyState(state);
		return { applied: false, damage: 0, defeated: false, grazed: false, dungeonJustUnlocked: false, hpPercentAfter: 100 };
	}

	const n = run.tasksCompletedCount + 1;
	const fakeQuest: Quest = {
		id: `debug-journey-${Date.now()}-${n}`,
		title: `[Debug] Simulated task #${n}`,
		className: '',
		stats: [],
		xp: 0,
		cp: 0,
		coins: 0,
		subtasks: [],
		completed: true,
		difficulty: 'medium',
		energyCost: 10,
	};

	if (matchAffinity && run.affinity?.target) {
		if (run.affinity.kind === 'skill') {
			fakeQuest.skills = [run.affinity.target];
		} else if (run.affinity.kind === 'class') {
			fakeQuest.className = run.affinity.target;
		}
	}

	if (options?.forceDefeat) {
		fakeQuest.difficulty = 'epic';
		fakeQuest.energyCost = 100;
	}

	return recordJourneyQuestCompletion(fakeQuest);
}

/** Dev helper: push a cleared foe id without a full run (dungeon progress testing). */
export function debugAddClearedFoe(foeId: string, foeCount?: number): {
	added: boolean;
	dungeonJustUnlocked: boolean;
	progress: DungeonProgress;
} {
	const state = loadJourneyState();
	if (state.clearedFoeIds.includes(foeId)) {
		const progress = getDungeonProgress(state, foeCount);
		return { added: false, dungeonJustUnlocked: false, progress };
	}

	const wasUnlocked = isDungeonUnlocked(state, foeCount);
	state.clearedFoeIds.push(foeId);
	saveJourneyState(state);
	const progress = getDungeonProgress(state, foeCount);
	return {
		added: true,
		dungeonJustUnlocked: !wasUnlocked && progress.unlocked,
		progress,
	};
}

/** Dev helper: wipe cleared-foe progress (and any raid) for the current board cycle. */
export function debugResetDungeonClears(): DungeonProgress {
	const state = loadJourneyState();
	state.clearedFoeIds = [];
	state.dungeonRaid = null;
	state.dungeonClearedForCycle = false;
	saveJourneyState(state);
	return getDungeonProgress(state);
}

/**
 * Reopen the dungeon gate for this board cycle without wiping Journey clears.
 * Use after claiming spoils when you want another raid in the same cycle.
 */
export function reopenDungeonGateThisCycle(): { ok: boolean; wasSealed: boolean } {
	const state = loadJourneyState();
	const wasSealed = state.dungeonClearedForCycle === true;
	state.dungeonClearedForCycle = false;
	saveJourneyState(state);
	return { ok: true, wasSealed };
}

/** Dev helper: mark active run completed and dismiss to roster (full victory flow). */
export function debugSimulateVictoryDismiss(foeCount?: number): {
	ok: boolean;
	reason?: string;
	dungeonJustUnlocked: boolean;
	progress: DungeonProgress;
} {
	const state = loadJourneyState();
	const run = state.activeRun;
	if (!run) {
		return {
			ok: false,
			reason: 'No active Journey run.',
			dungeonJustUnlocked: false,
			progress: getDungeonProgress(state, foeCount),
		};
	}
	if (run.status !== 'completed') {
		run.status = 'completed';
		run.currentHp = 0;
		state.activeRun = run;
		saveJourneyState(state);
	}

	const result = dismissCompletedJourneyRun(foeCount);
	return {
		ok: true,
		dungeonJustUnlocked: result.dungeonJustUnlocked,
		progress: getDungeonProgress(loadJourneyState(), foeCount),
	};
}
