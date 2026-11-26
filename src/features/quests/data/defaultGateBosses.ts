import type { App } from 'obsidian';
import {
	createBossFile,
	getRequiredTasks,
	listBosses,
	buildDefaultBossStrikeTasks,
	type BossDifficulty,
} from '../utils/bossFile';

export const MIN_GATE_BOSS_COUNT = 3;

export interface DefaultGateBossTemplate {
	name: string;
	emoji: string;
	description: string;
	skill: string;
	difficulty: BossDifficulty;
}

/** Starter gate bosses seeded into `Bosses/` when the roster has fewer than three. */
export const DEFAULT_GATE_BOSS_TEMPLATES: DefaultGateBossTemplate[] = [
	{
		name: 'Stink Fiend',
		emoji: '👺',
		description: 'A foul spirit born from procrastinated chores. Only finished tasks banish its stench.',
		skill: 'neutral',
		difficulty: 'easy',
	},
	{
		name: 'Inbox Hydra',
		emoji: '🐍',
		description: 'Every cleared message sprouts two more — until you commit to deep work.',
		skill: 'random-skill',
		difficulty: 'hard',
	},
	{
		name: 'Deadline Wraith',
		emoji: '⏳',
		description: 'Feeds on approaching due dates. Completed quests are the only spell that lands.',
		skill: 'random',
		difficulty: 'hard',
	},
	{
		name: 'Sloth Ghost',
		emoji: '👻',
		description: 'Drifts through lazy afternoons and open tabs. Momentum is its weakness.',
		skill: 'neutral',
		difficulty: 'easy',
	},
];

function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Ensures at least `min` boss notes exist in the vault.
 * Skips templates whose names already match an existing boss (case-insensitive).
 */
export async function ensureDefaultGateBosses(
	app: App,
	min = MIN_GATE_BOSS_COUNT
): Promise<void> {
	let bosses = await listBosses(app);
	if (bosses.length >= min) return;

	const existingNames = new Set(bosses.map((b) => normalizeName(b.name)));

	for (const template of DEFAULT_GATE_BOSS_TEMPLATES) {
		if (bosses.length >= min) break;
		if (existingNames.has(normalizeName(template.name))) continue;

		const count = getRequiredTasks(template.difficulty);
		await createBossFile(app, {
			name: template.name,
			emoji: template.emoji,
			description: template.description,
			skill: template.skill,
			difficulty: template.difficulty,
			tasks: buildDefaultBossStrikeTasks(count, template.name),
		});
		existingNames.add(normalizeName(template.name));
		bosses = await listBosses(app);
	}
}
