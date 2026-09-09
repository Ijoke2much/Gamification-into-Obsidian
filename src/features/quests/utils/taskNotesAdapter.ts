import { parseYaml, stringifyYaml } from 'obsidian';
import type { App, TFile } from 'obsidian';
import type { Quest } from './taskParser';
import { appendCompletedDate, removeCompletedDate } from './taskParser';

const XP_PROPERTY_KEYS = ['xp', 'XP', 'exp', 'experience'];
const CP_PROPERTY_KEYS = ['cp', 'CP', 'classPoints', 'class-points', 'class_points'];
const COIN_PROPERTY_KEYS = ['coins', 'Coins', 'currency', 'gold'];

const DONE_STATUSES = new Set(['done', 'complete', 'completed', 'cancelled', 'canceled']);

export interface TaskNotesFrontmatter {
	status?: string;
	title?: string;
	xp?: number;
	cp?: number;
	coins?: number;
	priority?: string;
	difficulty?: string;
	due?: string;
	scheduled?: string;
	project?: string;
	projects?: string[];
	tags?: string[];
	skills?: string[];
	recur?: string;
	recurrence?: string;
	estimatedTime?: string;
	timeEstimate?: number;
	energyCost?: number;
	activityProfile?: string;
	completedDate?: string;
	dateCreated?: string;
	dateModified?: string;
	'gamified-task'?: boolean;
	id?: string;
}

export type CreateTaskNotesFields = {
	id: string;
	title: string;
	xp: number;
	cp: number;
	coins: number;
	priority?: string;
	difficulty?: string;
	due?: string;
	recur?: string;
	estimatedTime?: string;
	energyCost?: number;
	activityProfile?: string;
	project?: string;
	skills?: string[];
	banner?: string;
	bannerAlign?: string;
	timelineTheme?: string;
	customTags?: string[];
};

function asString(value: unknown): string | undefined {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const n = parseInt(value, 10);
		if (!Number.isNaN(n)) return n;
	}
	return undefined;
}

function lookupRaw(raw: Record<string, unknown>, keys: string[]): unknown {
	for (const key of keys) {
		if (raw[key] !== undefined) return raw[key];
	}
	const lower = new Map(Object.keys(raw).map((key) => [key.toLowerCase(), raw[key]]));
	for (const key of keys) {
		const value = lower.get(key.toLowerCase());
		if (value !== undefined) return value;
	}
	return undefined;
}

export function pickRewardNumber(source: Record<string, unknown> | null | undefined, keys: string[]): number | undefined {
	if (!source) return undefined;
	return asNumber(lookupRaw(source, keys));
}

export function applyFrontmatterRewardFields(
	quest: Quest,
	source: Record<string, unknown> | TaskNotesFrontmatter | null | undefined
): void {
	if (!source) return;
	const raw = source as Record<string, unknown>;
	const xp = pickRewardNumber(raw, XP_PROPERTY_KEYS);
	const cp = pickRewardNumber(raw, CP_PROPERTY_KEYS);
	const coins = pickRewardNumber(raw, COIN_PROPERTY_KEYS);
	if (xp !== undefined) quest.xp = xp;
	if (cp !== undefined) quest.cp = cp;
	if (coins !== undefined) {
		quest.coins = coins;
	} else if (xp !== undefined) {
		quest.coins = Math.round(xp * 0.1);
	}
}

/** Line parse is the fallback when Properties omit a field. */
export function applyLineRewardFallback(quest: Quest, line: string | undefined): void {
	if (!line) return;
	const xpMatch = line.match(/✨\uFE0F?(\d+)/u);
	const cpMatch = line.match(/⭐\uFE0F?(\d+)/u) || line.match(/🧠(\d+)/);
	const coinsMatch = line.match(/🪙\uFE0F?(\d+)/u) || line.match(/💰(\d+)/);
	if (xpMatch) quest.xp = parseInt(xpMatch[1], 10);
	if (cpMatch) quest.cp = parseInt(cpMatch[1], 10);
	if (coinsMatch) {
		quest.coins = parseInt(coinsMatch[1], 10);
	} else if (xpMatch && !(Number.isFinite(quest.coins) && (quest.coins as number) > 0)) {
		quest.coins = Math.round((quest.xp as number) * 0.1);
	}
}

/**
 * True when this file is one quest (per-note / TaskNotes), so file Properties
 * can be treated as that quest's rewards. List files with many tasks are skipped.
 */
export function shouldApplyNoteProperties(content: string): boolean {
	if (countGamifiedTaskMarkers(content) > 1) return false;
	return isSingleQuestNoteContent(content) || Boolean(splitFrontmatter(content));
}

/**
 * Properties (YAML / Obsidian metadata cache) win; the task line fills gaps.
 */
export function hydrateQuestRewardsFromNote(
	quest: Quest,
	options: {
		app?: App;
		file?: TFile;
		content: string;
		taskLine?: string;
	}
): Quest {
	const next: Quest = { ...quest };
	applyLineRewardFallback(next, options.taskLine);
	if (!shouldApplyNoteProperties(options.content)) {
		return next;
	}

	overlayTaskNotesFields(next, options.content);

	if (options.app && options.file) {
		const cache = options.app.metadataCache.getFileCache(options.file)?.frontmatter;
		if (cache && typeof cache === 'object') {
			applyFrontmatterRewardFields(next, cache as Record<string, unknown>);
		}
	}

	return next;
}

function asStringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((item) => asString(item)).filter((item): item is string => Boolean(item));
	}
	if (typeof value === 'string' && value.trim()) {
		return value
			.split(',')
			.map((part) => part.trim())
			.filter(Boolean);
	}
	return [];
}

function stripWikilink(raw: string): string {
	const match = raw.trim().match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
	return match ? match[1].trim() : raw.trim().replace(/^\[\[|\]\]$/g, '');
}

export function toTaskNotesPriority(priority?: string): string | undefined {
	if (!priority) return undefined;
	const key = priority.toLowerCase();
	if (key === 'lowest' || key === 'low') return 'low';
	if (key === 'medium' || key === 'normal') return 'normal';
	if (key === 'high' || key === 'highest' || key === 'urgent') return 'high';
	return 'normal';
}

export function fromTaskNotesPriority(priority?: string): string | undefined {
	if (!priority) return undefined;
	const key = priority.toLowerCase();
	if (key === 'low') return 'low';
	if (key === 'normal' || key === 'none' || key === 'medium') return 'medium';
	if (key === 'high' || key === 'highest') return 'high';
	return priority;
}

export function toTimeEstimateMinutes(raw?: string): number | undefined {
	if (!raw) return undefined;
	const match = raw.trim().match(/(\d+)/);
	if (!match) return undefined;
	const n = parseInt(match[1], 10);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

function splitDueAndScheduled(due?: string): { due?: string; scheduled?: string } {
	if (!due) return {};
	const trimmed = due.trim();
	if (!trimmed) return {};
	if (trimmed.includes('T')) {
		return { due: trimmed.slice(0, 10), scheduled: trimmed };
	}
	return { due: trimmed };
}

function formatIsoDate(date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

export function splitFrontmatter(content: string): { yaml: string; body: string } | null {
	if (!content.startsWith('---')) return null;
	const end = content.indexOf('\n---', 3);
	if (end < 0) return null;
	const yaml = content.slice(4, end);
	const after = content.slice(end + 4);
	const body = after.startsWith('\n') ? after.slice(1) : after;
	return { yaml, body };
}

export function parseTaskNotesFrontmatter(content: string): TaskNotesFrontmatter | null {
	const split = splitFrontmatter(content);
	if (!split) return null;

	let raw: Record<string, unknown> = {};
	try {
		raw = (parseYaml(split.yaml) as Record<string, unknown>) || {};
	} catch {
		return parseFrontmatterBlock(content);
	}

	const tags = asStringList(raw.tags);
	const projects = asStringList(raw.projects);
	const skills = asStringList(raw.skills);
	const gamified = raw['gamified-task'];

	const fm: TaskNotesFrontmatter = {
		status: asString(raw.status)?.toLowerCase(),
		title: asString(raw.title),
		xp: pickRewardNumber(raw, XP_PROPERTY_KEYS),
		cp: pickRewardNumber(raw, CP_PROPERTY_KEYS),
		coins: pickRewardNumber(raw, COIN_PROPERTY_KEYS),
		priority: asString(raw.priority),
		difficulty: asString(raw.difficulty),
		due: asString(raw.due),
		scheduled: asString(raw.scheduled),
		project: asString(raw.project),
		projects: projects.length ? projects : undefined,
		tags: tags.length ? tags : undefined,
		skills: skills.length ? skills : undefined,
		recur: asString(raw.recur),
		recurrence: asString(raw.recurrence),
		estimatedTime: asString(raw.estimatedTime),
		timeEstimate: asNumber(raw.timeEstimate),
		energyCost: asNumber(raw.energyCost),
		activityProfile: asString(raw.activityProfile),
		completedDate: asString(raw.completedDate),
		dateCreated: asString(raw.dateCreated),
		dateModified: asString(raw.dateModified),
		id: asString(raw.id),
		'gamified-task': gamified === true || gamified === 'true',
	};
	return fm;
}

/** Line-oriented fallback when YAML parse fails. */
export function parseFrontmatterBlock(content: string): TaskNotesFrontmatter | null {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;

	const fm: TaskNotesFrontmatter = {};
	for (const line of match[1].split('\n')) {
		const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
		if (!kv) continue;
		const [, key, rawValue] = kv;
		const value = rawValue.trim().replace(/^["']|["']$/g, '');
		if (key === 'gamified-task') {
			fm['gamified-task'] = value === 'true';
		} else if (key === 'status') {
			fm.status = value.toLowerCase();
		} else if (key === 'title') {
			fm.title = value;
		} else if (/^(xp|exp|experience|cp|class[-_]?points|coins|currency|gold)$/i.test(key)) {
			const num = parseInt(value, 10);
			if (Number.isNaN(num)) continue;
			const lower = key.toLowerCase();
			if (lower === 'xp' || lower === 'exp' || lower === 'experience') fm.xp = num;
			else if (lower === 'coins' || lower === 'currency' || lower === 'gold') fm.coins = num;
			else fm.cp = num;
		}
	}
	return fm;
}

export function isTaskNotesContent(content: string): boolean {
	const fm = parseTaskNotesFrontmatter(content);
	if (!fm) return false;
	if (typeof fm.status === 'string' && fm.status.length > 0) return true;
	return Boolean(fm.tags?.some((tag) => tag.toLowerCase() === 'task' || tag.toLowerCase() === '#task'));
}

export function countGamifiedTaskMarkers(content: string): number {
	return content.match(/#gamified-task/g)?.length ?? 0;
}

export function isGamifiedTaskContent(content: string): boolean {
	if (/#gamified-task/.test(content)) return true;
	const fm = parseTaskNotesFrontmatter(content);
	return fm?.['gamified-task'] === true;
}

/**
 * True only for a one-quest note (TaskNotes / per-note), not a list file
 * that happens to contain `#gamified-task` lines.
 */
export function isSingleQuestNoteContent(content: string): boolean {
	if (countGamifiedTaskMarkers(content) > 1) return false;
	if (isTaskNotesContent(content)) return true;
	const fm = parseTaskNotesFrontmatter(content);
	return fm?.['gamified-task'] === true;
}

export function isSharedTaskNoteContent(content: string): boolean {
	return isSingleQuestNoteContent(content);
}

export function isTaskLineDone(line: string): boolean {
	return /^\s*[-*+]\s*\[[xX]\]/.test(line);
}

export function isTaskLineOpen(line: string): boolean {
	return /^\s*[-*+]\s*\[\s\]/.test(line);
}

export function markTaskLineComplete(line: string, date = new Date()): string {
	if (isTaskLineDone(line)) return appendCompletedDate(line, date);
	const next = line.replace(/^(\s*[-*+]\s*)\[\s\]/, '$1[x]');
	return appendCompletedDate(next, date);
}

export function markTaskLineOpen(line: string): string {
	return removeCompletedDate(line.replace(/^(\s*[-*+]\s*)\[[xX]\]/, '$1[ ]'));
}

export function isStatusDone(status: string | undefined): boolean {
	if (!status) return false;
	return DONE_STATUSES.has(status.toLowerCase());
}

export function detectTaskNotesStatusCompletion(oldContent: string, newContent: string): boolean {
	const oldFm = parseTaskNotesFrontmatter(oldContent);
	const newFm = parseTaskNotesFrontmatter(newContent);
	if (!oldFm?.status || !newFm?.status) return false;
	return !isStatusDone(oldFm.status) && isStatusDone(newFm.status);
}

export function detectSharedNoteCompletion(oldContent: string, newContent: string): boolean {
	if (detectTaskNotesStatusCompletion(oldContent, newContent)) return true;

	const oldLines = oldContent.split('\n');
	const newLines = newContent.split('\n');
	const oldIdx = findPrimaryTaskLineIndex(oldLines);
	const newIdx = findPrimaryTaskLineIndex(newLines);
	if (oldIdx < 0 || newIdx < 0) return false;
	return isTaskLineOpen(oldLines[oldIdx]) && isTaskLineDone(newLines[newIdx]);
}

export function noteCompletionKey(filePath: string): string {
	return `${filePath}:note`;
}

export function findPrimaryTaskLineIndex(lines: string[], preferOpen = false): number {
	let first = -1;
	for (let i = 0; i < lines.length; i++) {
		if (!/^\s*[-*+]\s*\[[ xX]\]/.test(lines[i])) continue;
		if (first === -1) first = i;
		if (preferOpen && isTaskLineOpen(lines[i])) return i;
	}
	return first;
}

export function buildTaskNotesFrontmatter(input: CreateTaskNotesFields): Record<string, unknown> {
	const now = new Date().toISOString();
	const { due, scheduled } = splitDueAndScheduled(input.due);
	const timeEstimate = toTimeEstimateMinutes(input.estimatedTime);
	const tags = new Set<string>(['task']);
	for (const tag of input.customTags ?? []) {
		const slug = tag.trim().replace(/^#/, '');
		if (slug) tags.add(slug);
	}

	const frontmatter: Record<string, unknown> = {
		tags: Array.from(tags),
		title: input.title.trim(),
		status: 'open',
		'gamified-task': true,
		id: input.id,
		xp: input.xp,
		cp: input.cp,
		coins: input.coins,
		dateCreated: now,
		dateModified: now,
	};

	const tnPriority = toTaskNotesPriority(input.priority);
	if (tnPriority) frontmatter.priority = tnPriority;
	if (input.difficulty) frontmatter.difficulty = input.difficulty;
	if (due) frontmatter.due = due;
	if (scheduled) frontmatter.scheduled = scheduled;
	if (input.recur) {
		frontmatter.recur = input.recur;
		if (/^FREQ=/i.test(input.recur.trim())) {
			frontmatter.recurrence = input.recur.trim();
		}
	}
	if (input.estimatedTime) frontmatter.estimatedTime = input.estimatedTime;
	if (timeEstimate) frontmatter.timeEstimate = timeEstimate;
	if (input.energyCost) frontmatter.energyCost = input.energyCost;
	if (input.activityProfile) frontmatter.activityProfile = input.activityProfile;
	if (input.skills?.length) frontmatter.skills = input.skills;
	if (input.banner) frontmatter.banner = input.banner;
	if (input.bannerAlign) frontmatter.bannerAlign = input.bannerAlign;
	if (input.timelineTheme) frontmatter.timelineTheme = input.timelineTheme;
	if (input.project?.trim()) {
		const name = input.project.trim();
		frontmatter.project = name;
		frontmatter.projects = [`[[${name.replace(/^\[\[|\]\]$/g, '')}]]`];
	}

	return frontmatter;
}

export function patchFrontmatter(
	content: string,
	patch: Record<string, unknown>
): string {
	const split = splitFrontmatter(content);
	let data: Record<string, unknown> = {};

	if (split) {
		try {
			data = (parseYaml(split.yaml) as Record<string, unknown>) || {};
		} catch {
			data = {};
		}
	}

	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) {
			delete data[key];
		} else {
			data[key] = value;
		}
	}

	const yaml = stringifyYaml(data);
	const body = split ? split.body : content.replace(/^\s+/, '');
	return `---\n${yaml}---\n${body.startsWith('\n') ? body : `\n${body}`}`;
}

export function applySharedNoteCompletion(content: string, completed: boolean, date = new Date()): string {
	let next = content;
	if (isSingleQuestNoteContent(content)) {
		next = patchFrontmatter(
			next,
			completed
				? {
						status: 'done',
						completedDate: formatIsoDate(date),
						dateModified: date.toISOString(),
					}
				: {
						status: 'open',
						completedDate: undefined,
						dateModified: date.toISOString(),
					}
		);
	}

	const lines = next.split('\n');
	const idx = findPrimaryTaskLineIndex(lines, completed);
	if (idx >= 0) {
		if (completed && isTaskLineOpen(lines[idx])) {
			lines[idx] = markTaskLineComplete(lines[idx], date);
		} else if (!completed && isTaskLineDone(lines[idx])) {
			lines[idx] = markTaskLineOpen(lines[idx]);
		}
		next = lines.join('\n');
	}

	return next;
}

export function overlayTaskNotesFields(quest: Quest, content: string): Quest {
	const fm = parseTaskNotesFrontmatter(content);
	if (!fm) return quest;

	if (fm.title) quest.title = fm.title;
	applyFrontmatterRewardFields(quest, fm as Record<string, unknown>);
	if (fm.priority) quest.priority = fromTaskNotesPriority(fm.priority) || fm.priority;
	if (fm.difficulty) quest.difficulty = fm.difficulty;
	if (fm.due) quest.due = fm.due;
	if (fm.scheduled) quest.scheduled = fm.scheduled;
	if (fm.skills?.length) quest.skills = fm.skills;
	if (fm.energyCost) quest.energyCost = fm.energyCost;
	if (fm.activityProfile) quest.activityProfile = fm.activityProfile;
	if (fm.estimatedTime) quest.estimatedTime = fm.estimatedTime;
	else if (typeof fm.timeEstimate === 'number') quest.estimatedTime = String(fm.timeEstimate);
	if (fm.recur) quest.recur = fm.recur;
	else if (fm.recurrence) quest.recur = fm.recurrence;
	if (fm.tags?.length) quest.tags = fm.tags;
	if (fm.status) quest.status = fm.status;
	if (isStatusDone(fm.status)) quest.completed = true;

	const projectName = fm.project || (fm.projects?.[0] ? stripWikilink(fm.projects[0]) : undefined);
	if (projectName && !quest.project) quest.project = projectName;

	return quest;
}

export function buildQuestFromTaskNotesContent(content: string, filePath: string): Quest | null {
	const fm = parseTaskNotesFrontmatter(content);
	const lines = content.split('\n');
	const taskLineIdx = findPrimaryTaskLineIndex(lines);
	const taskLine = taskLineIdx >= 0 ? lines[taskLineIdx] : undefined;

	let title = fm?.title?.trim() || '';
	let xp = 0;
	let cp = 0;
	let coins = 0;
	const lineNumber = taskLineIdx >= 0 ? taskLineIdx + 1 : 1;

	if (taskLine) {
		const titleMatch = taskLine.match(/- \[[ xX]\] (.+)/);
		if (titleMatch && !title) {
			title = titleMatch[1].split(/[#✨⭐🔥⚖️🌱]/)[0].trim();
		}
		const scratch: Quest = { xp: 0, cp: 0, coins: 0 } as Quest;
		applyLineRewardFallback(scratch, taskLine);
		xp = scratch.xp || 0;
		cp = scratch.cp || 0;
		coins = scratch.coins || Math.round(xp * 0.1);
	}

	if (!title) {
		const base = filePath.split('/').pop() || 'Unknown Quest';
		title = base.replace(/\.md$/i, '');
	}

	const completed = Boolean(
		isStatusDone(fm?.status) || (taskLine && /-\s*\[[xX]\]/.test(taskLine))
	);

	const quest: Quest = {
		id: filePath,
		title,
		className: '',
		filePath,
		lineNumber,
		xp,
		cp,
		coins,
		skills: fm?.skills ?? [],
		stats: [],
		priority: fromTaskNotesPriority(fm?.priority) || fm?.priority || 'medium',
		difficulty: fm?.difficulty || (taskLine?.includes('🔥') ? 'hard' : taskLine?.includes('🌱') ? 'easy' : 'medium'),
		subtasks: [],
		completed,
		status: fm?.status,
		due: fm?.due,
		scheduled: fm?.scheduled,
		project: fm?.project || (fm?.projects?.[0] ? stripWikilink(fm.projects[0]) : undefined),
		tags: fm?.tags,
		estimatedTime: fm?.estimatedTime || (typeof fm?.timeEstimate === 'number' ? String(fm.timeEstimate) : undefined),
		recur: fm?.recur || fm?.recurrence,
		energyCost: fm?.energyCost,
		activityProfile: fm?.activityProfile,
	};

	return overlayTaskNotesFields(quest, content);
}
