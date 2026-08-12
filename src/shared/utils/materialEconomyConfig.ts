/**
 * Materials economy knobs — drop chance + quantity for the live crafting inventory.
 * Tuned so daily quests/pomos feed craft sinks without flooding rares.
 */

export type QuestDifficultyKey =
	| 'easy'
	| 'medium'
	| 'hard'
	| 'epic'
	| 'legendary'
	| 'default';

/** Chance that a completed quest grants any materials (main awardQuestRewards path). */
export const QUEST_MATERIAL_DROP_CHANCE: Record<QuestDifficultyKey, number> = {
	easy: 0.55,
	medium: 0.65,
	hard: 0.75,
	epic: 0.85,
	legendary: 0.9,
	default: 0.5,
};

/** Chance a finished pomodoro grants materials. */
export const POMODORO_MATERIAL_DROP_CHANCE = 0.7;

/** Chance a long session rolls a rare bonus mat (on top of base grant). */
export const POMODORO_RARE_BONUS_CHANCE = 0.28;

/** Habit tree milestones are rare — keep grants reliable. */
export const HABIT_TREE_MATERIAL_DROP_CHANCE = 1;

export function normalizeQuestDifficulty(difficulty: string | undefined): QuestDifficultyKey {
	const d = (difficulty || '').toLowerCase().trim();
	if (d === 'easy' || d === 'medium' || d === 'hard' || d === 'epic' || d === 'legendary') {
		return d;
	}
	return 'default';
}

export function rollChance(chance: number): boolean {
	if (chance >= 1) return true;
	if (chance <= 0) return false;
	return Math.random() < chance;
}
