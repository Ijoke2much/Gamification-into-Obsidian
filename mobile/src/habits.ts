import { TFile, TFolder, Vault } from 'obsidian';
import type { MobileHabitItem } from './types';
import { parseFrontmatter, writeFrontmatter } from './yaml';
import { awardPlayerRewards } from './player';
import type { MobileSettings } from './types';

const HABITS_FOLDER = 'SkillTree/Habits';

export async function loadHabits(vault: Vault): Promise<MobileHabitItem[]> {
	const folder = vault.getAbstractFileByPath(HABITS_FOLDER);
	if (!(folder instanceof TFolder)) return [];

	const today = formatDate();
	const habits: MobileHabitItem[] = [];

	const files: TFile[] = [];
	Vault.recurseChildren(folder, (f) => {
		if (f instanceof TFile && f.extension === 'md') files.push(f);
	});

	for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
		const habit = await readHabitFile(vault, file, today);
		if (habit) habits.push(habit);
	}

	return habits.sort((a, b) => a.name.localeCompare(b.name));
}

async function readHabitFile(vault: Vault, file: TFile, today: string): Promise<MobileHabitItem | null> {
	const raw = await vault.read(file);
	const { data } = parseFrontmatter(raw);
	if (data.habit !== true) return null;

	const completedDates = Array.isArray(data.completedDates)
		? data.completedDates.map(String)
		: [];
	const streak = numberField(data.streak, completedDates.length);

	return {
		id: String(data.id || file.basename),
		name: String(data.name || file.basename),
		emoji: String(data.emoji || '⭐'),
		streak,
		doneToday: completedDates.includes(today),
		filePath: file.path,
		rewardXp: numberField(data.rewardXP, 10),
		rewardCp: numberField(data.rewardCP, 5),
		rewardCoins: numberField(data.rewardCoins, 2),
		treeStage: numberField(data.currentTreeStage, Math.min(5, Math.floor(streak / 7))),
	};
}

export async function toggleHabitToday(
	vault: Vault,
	settings: MobileSettings,
	habit: MobileHabitItem
): Promise<{ completed: boolean; rewards?: { xp: number; cp: number; coins: number } }> {
	const file = vault.getAbstractFileByPath(habit.filePath);
	if (!(file instanceof TFile)) throw new Error('Habit file missing');

	const today = formatDate();
	const raw = await vault.read(file);
	const { data, body } = parseFrontmatter(raw);
	const completedDates = Array.isArray(data.completedDates)
		? data.completedDates.map(String)
		: [];

	const isDone = completedDates.includes(today);
	let nextDates: string[];
	let completed: boolean;

	if (isDone) {
		nextDates = completedDates.filter((d) => d !== today);
		completed = false;
	} else {
		nextDates = [...completedDates, today];
		completed = true;
	}

	const streak = calculateStreak(nextDates);
	const next = {
		...data,
		completedDates: nextDates,
		streak,
		lastCompleted: completed ? today : data.lastCompleted,
		totalCompletions: numberField(data.totalCompletions, 0) + (completed ? 1 : -1),
	};

	await vault.modify(file, writeFrontmatter(next, body));

	if (completed) {
		const award = await awardPlayerRewards(vault, settings, habit.rewardXp, habit.rewardCoins, habit.rewardCp);
		return {
			completed: true,
			rewards: { xp: habit.rewardXp, cp: habit.rewardCp, coins: habit.rewardCoins },
		};
	}

	return { completed: false };
}

function calculateStreak(dates: string[]): number {
	if (dates.length === 0) return 0;
	const sorted = [...new Set(dates)].sort();
	let streak = 1;
	for (let i = sorted.length - 1; i > 0; i--) {
		const cur = new Date(sorted[i]);
		const prev = new Date(sorted[i - 1]);
		const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
		if (diff === 1) streak += 1;
		else break;
	}
	return streak;
}

function formatDate(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

function numberField(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
	return fallback;
}
