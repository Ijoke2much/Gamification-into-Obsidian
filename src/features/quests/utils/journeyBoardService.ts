import type GamifiedObsidianPlugin from '../../../core/main';
import { getAllSkills } from '../../../shared/utils/skillDiscovery';
import { rollAffinityForRule, type JourneyAffinity } from './journeyAffinity';
import { refreshJourneyFoes } from './journeyFoeRegistry';
import {
	clearClearedFoesForNewBoard,
	loadJourneyState,
	saveJourneyState,
	type JourneyBoard,
	type JourneyBoardEntry,
} from './journeyRunService';

/** How long a rolled board stays before affinities reroll. */
export const JOURNEY_BOARD_REFRESH_DAYS = 7;

function boardIsExpired(board: JourneyBoard, now = new Date()): boolean {
	const rolled = new Date(board.rolledAt).getTime();
	if (Number.isNaN(rolled)) return true;
	return now.getTime() - rolled >= JOURNEY_BOARD_REFRESH_DAYS * 24 * 60 * 60 * 1000;
}

function boardCoversFoes(board: JourneyBoard, foeIds: string[]): boolean {
	const boardIds = new Set(board.entries.map((e) => e.foeId));
	return foeIds.every((id) => boardIds.has(id)) && boardIds.size === foeIds.length;
}

export function getBoardDaysRemaining(board: JourneyBoard | null, now = new Date()): number {
	if (!board) return 0;
	const rolled = new Date(board.rolledAt).getTime();
	if (Number.isNaN(rolled)) return 0;
	const expires = rolled + JOURNEY_BOARD_REFRESH_DAYS * 24 * 60 * 60 * 1000;
	return Math.max(0, Math.ceil((expires - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * Make sure the journey board is rolled and current:
 * - refreshes the foe registry from the vault (Foes.md)
 * - rerolls affinities when the board is missing, expired, or the foe set changed
 *
 * The active run is never touched — it carries its own affinity snapshot.
 */
export async function ensureJourneyBoard(
	plugin: GamifiedObsidianPlugin,
	options?: { force?: boolean; rerollFoeIds?: string[] }
): Promise<JourneyBoard> {
	const foes = await refreshJourneyFoes(plugin);
	const foeIds = foes.map((f) => f.id);

	const state = loadJourneyState();
	const existing = state.board;
	// A fresh board keeps its rolls; only new/explicitly-rerolled foes get new affinities.
	const keepExistingRolls = !options?.force && existing != null && !boardIsExpired(existing);

	if (
		keepExistingRolls &&
		boardCoversFoes(existing, foeIds) &&
		!options?.rerollFoeIds?.length
	) {
		return existing;
	}

	let skills: Awaited<ReturnType<typeof getAllSkills>> = [];
	try {
		skills = await getAllSkills(plugin.app.vault);
	} catch (error) {
		console.error('[journeyBoard] Failed to discover skills, rolling neutral board', error);
	}

	const rerollIds = new Set(options?.rerollFoeIds ?? []);
	const entries: JourneyBoardEntry[] = foes.map((foe) => {
		if (keepExistingRolls && !rerollIds.has(foe.id)) {
			const prior = existing.entries.find((e) => e.foeId === foe.id);
			if (prior) return prior;
		}
		return { foeId: foe.id, affinity: rollAffinityForRule(foe.affinityRule, skills) };
	});

	// Variety guard: always keep at least one foe anyone can fight. Only demote
	// a randomly-rolled entry — never override neutral/fixed author intent.
	const hasNeutral = entries.some((e) => e.affinity.kind === 'neutral');
	if (!hasNeutral) {
		const demotable = entries.find((e) => {
			const foe = foes.find((f) => f.id === e.foeId);
			return foe && foe.affinityRule.kind.startsWith('random');
		});
		if (demotable) {
			demotable.affinity = { kind: 'neutral' } satisfies JourneyAffinity;
		}
	}

	const board: JourneyBoard = {
		rolledAt: keepExistingRolls ? existing.rolledAt : new Date().toISOString(),
		entries,
	};

	if (!keepExistingRolls) {
		clearClearedFoesForNewBoard(state);
	}

	state.board = board;
	saveJourneyState(state);
	return board;
}
