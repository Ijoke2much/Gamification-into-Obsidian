import { App, TFile } from 'obsidian';
import type { Quest } from './taskParser';
import { findQuestLineIndex } from './questProjectUtils';

/** Feeling-based lanes for untimed quests. Timed quests stay on the day plan. */
export type SprintLaneId = 'on_fire' | 'coming_up' | 'draining' | 'wants' | 'unsorted';

export type SprintPlacement = SprintLaneId | 'clock';

export const SPRINT_CHECKPOINT_HOUR = 16;
export const SPRINT_COMING_UP_DAYS = 3;

export const SPRINT_LANES: { id: Exclude<SprintLaneId, 'unsorted'>; label: string }[] = [
	{ id: 'on_fire', label: 'On fire' },
	{ id: 'coming_up', label: 'Coming up' },
	{ id: 'draining', label: 'Draining' },
	{ id: 'wants', label: 'Wants to' },
];

export const SPRINT_UNSORTED_LABEL = 'Needs a lane';

const LANE_IDS = new Set<string>(['on_fire', 'coming_up', 'draining', 'wants', 'unsorted']);

export function sprintLaneLabel(id: SprintLaneId): string {
	if (id === 'unsorted') return SPRINT_UNSORTED_LABEL;
	return SPRINT_LANES.find((lane) => lane.id === id)?.label ?? id;
}

export function questHasFixedTime(due?: string): boolean {
	return Boolean(due && due.includes('T'));
}

function tagBody(tag: string): string {
	return tag.replace(/^#/, '').trim().toLowerCase();
}

export function readSprintOverride(tags?: string[]): SprintLaneId | null {
	for (const tag of tags || []) {
		const match = tagBody(tag).match(/^sprint\/([a-z_]+)$/);
		if (match && LANE_IDS.has(match[1]) && match[1] !== 'unsorted') {
			return match[1] as SprintLaneId;
		}
	}
	return null;
}

/** Day stamp from `#win/YYYY-MM-DD`, if the quest is pinned as that day's win. */
export function readWinDay(tags?: string[]): string | null {
	for (const tag of tags || []) {
		const match = tagBody(tag).match(/^win\/(\d{4}-\d{2}-\d{2})$/);
		if (match) return match[1];
	}
	return null;
}

/**
 * Whole local calendar days: due day minus ref day.
 * Date-only strings use local midnight, matching the inbox.
 */
export function sprintDueDayDiff(dueStr: string, ref: Date): number {
	let dueStart: Date;
	if (dueStr.includes('T')) {
		const due = new Date(dueStr);
		if (Number.isNaN(due.getTime())) return 0;
		dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
	} else {
		const match = dueStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (!match) return 0;
		dueStart = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	}
	const refStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
	return Math.round((dueStart.getTime() - refStart.getTime()) / 86400000);
}

export function classifySprint(
	quest: Pick<Quest, 'due' | 'tags' | 'activityProfile' | 'today' | 'now' | 'completed'>,
	now: Date
): SprintPlacement {
	if (quest.completed) return 'clock';
	if (questHasFixedTime(quest.due)) return 'clock';

	const override = readSprintOverride(quest.tags);
	if (override) return override;

	if (quest.due) {
		const diff = sprintDueDayDiff(quest.due, now);
		if (diff <= 0) return 'on_fire';
		if (diff <= SPRINT_COMING_UP_DAYS) return 'coming_up';
	} else if (quest.today || quest.now) {
		return 'on_fire';
	}

	if (quest.activityProfile === 'chore') return 'draining';
	if (quest.activityProfile === 'deep_work') return 'wants';
	return 'unsorted';
}

export function sprintStatusLine(args: {
	locked: boolean;
	started: boolean;
	hasWin: boolean;
}): string {
	if (args.locked) return "4:00. Today's win is still open.";
	if (args.started) return "Today's win is started. Any lane is open.";
	if (args.hasWin) return 'Pick a lane. The win can wait until 4:00.';
	return 'Pin a win from a lane. It takes over at 4:00.';
}

export function applySprintTagToLine(line: string, lane: SprintLaneId): string {
	let updated = line.replace(/\s+#sprint\/[^\s]+/gi, '');
	if (lane !== 'unsorted') updated = `${updated} #sprint/${lane}`;
	return updated.replace(/[ \t]{2,}/g, ' ').trim();
}

export function applyWinTagToLine(line: string, dayISO: string | null): string {
	let updated = line.replace(/\s+#win\/\d{4}-\d{2}-\d{2}/gi, '');
	if (dayISO) updated = `${updated} #win/${dayISO}`;
	return updated.replace(/[ \t]{2,}/g, ' ').trim();
}

async function rewriteQuestLines(
	app: App,
	edits: { quest: Quest; mapLine: (line: string) => string }[]
): Promise<void> {
	const byPath = new Map<string, { quest: Quest; mapLine: (line: string) => string }[]>();
	for (const edit of edits) {
		const path = edit.quest.filePath || 'Gamified/GamifiedTasks.md';
		const list = byPath.get(path) ?? [];
		list.push(edit);
		byPath.set(path, list);
	}

	for (const [path, group] of byPath) {
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new Error(`Quest file not found: ${path}`);
		}
		const lines = (await app.vault.read(file)).split('\n');
		let changed = false;
		for (const edit of group) {
			const index = findQuestLineIndex(lines, edit.quest);
			if (index === -1) {
				throw new Error(`Could not find quest line for "${edit.quest.title}"`);
			}
			const next = edit.mapLine(lines[index]);
			if (next !== lines[index]) {
				lines[index] = next;
				changed = true;
			}
		}
		if (changed) await app.vault.modify(file, lines.join('\n'));
	}
}

export async function persistSprintLane(app: App, quest: Quest, lane: SprintLaneId): Promise<void> {
	await rewriteQuestLines(app, [
		{ quest, mapLine: (line) => applySprintTagToLine(line, lane) },
	]);
}

/** Pin one quest as today's win and clear the tag on the others. */
export async function persistDailyWin(
	app: App,
	quest: Quest,
	todayISO: string,
	previous: Quest[]
): Promise<void> {
	const clears = previous.filter((other) => other.id !== quest.id || other.lineNumber !== quest.lineNumber);
	await rewriteQuestLines(app, [
		...clears.map((other) => ({
			quest: other,
			mapLine: (line: string) => applyWinTagToLine(line, null),
		})),
		{ quest, mapLine: (line) => applyWinTagToLine(line, todayISO) },
	]);
}
