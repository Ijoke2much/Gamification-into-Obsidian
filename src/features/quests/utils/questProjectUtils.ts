import type { Quest } from './taskParser';
import type { App } from 'obsidian';
import { normalizePath, TFile } from 'obsidian';
import type { SkillMetadata } from '../../../shared/utils/skillDiscovery';
import {
	createQuestNote,
	getTaskNoteFolder,
	isPerNoteMode,
	type QuestLoadSettings,
} from './questNoteService';
import {
	generateMarkdownTask,
	normalizeDifficultyTier,
	rollQuestRewardCp,
	rollQuestRewardXp,
} from './questUtils';

/** Settings slice used when resolving where contract headers are stored. */
export type ProjectsFileSettings = QuestLoadSettings & {
	projectsFilePath?: string;
	questSaveLocations?: { label?: string; filePath?: string }[];
};

/** Resolve the markdown file for project contract headers. */
export function getProjectsFilePath(settings: ProjectsFileSettings): string {
	const explicit = settings.projectsFilePath?.trim();
	if (explicit) return explicit;

	const locations = settings.questSaveLocations ?? [];
	const projectLocation = locations.find(
		(loc) => /project/i.test(loc.label || '') || /project/i.test(loc.filePath || '')
	);
	return projectLocation?.filePath || settings.defaultQuestFilePath || 'GamifiedTasks.md';
}

/** Open contract titles for quest-modal / step linking pickers. */
export function listOpenContractTitles(
	summaries: ProjectSummary[],
	isClosed: (project: ProjectSummary) => boolean
): string[] {
	return summaries.filter((project) => !isClosed(project)).map((project) => project.title);
}

/**
 * Create a task step linked to a contract — inherits priority/difficulty/skills from the
 * contract header when present; rolls XP/CP like the create-quest modal.
 */
export async function appendProjectStep(
	app: App,
	settings: ProjectsFileSettings,
	project: ProjectSummary,
	stepTitle: string,
	allSkills: SkillMetadata[]
): Promise<void> {
	const trimmed = stepTitle.trim();
	if (!trimmed) return;

	const header = project.headerQuest;
	const priority = header?.priority || 'Medium';
	const difficulty = header?.difficulty || 'Medium';
	const xp = rollQuestRewardXp(priority);
	const cp = rollQuestRewardCp(difficulty);
	const skillNames = header?.skills?.length ? [...header.skills] : [];
	const skills = skillNames.length
		? allSkills.filter((skill) => skillNames.includes(skill.name))
		: [];

	if (isPerNoteMode(settings)) {
		await createQuestNote(app, getTaskNoteFolder(settings), {
			title: trimmed,
			subtasks: [],
			skills,
			priority,
			difficulty,
			xp,
			cp,
			project: project.title,
		});
		return;
	}

	const markdownTask = generateMarkdownTask({
		title: trimmed,
		subtasks: [],
		skills: skillNames,
		priority,
		difficulty,
		xp,
		cp,
		project: project.title,
	});
	const projectSlugTag = `#project/${slugifyProjectId(project.title)}`;
	const markdownWithTag = markdownTask.includes(projectSlugTag)
		? markdownTask
		: `${markdownTask} ${projectSlugTag}`;

	const path = settings.defaultQuestFilePath || 'GamifiedTasks.md';
	const file = app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) {
		const content = await app.vault.read(file);
		const base = content.replace(/\n*$/, '');
		await app.vault.modify(file, `${base}\n\n${markdownWithTag}\n`);
		return;
	}

	await app.vault.create(path, `${markdownWithTag}\n`);
}

/** Alias — creates a new linked waypoint quest on the contract. */
export const appendProjectWaypoint = appendProjectStep;

function questTitleLineRegex(title: string): RegExp | null {
	const trimmed = title.trim();
	if (!trimmed) return null;
	const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`-\\s*\\[[ xX]\\]\\s*${escaped}(?:\\s|#|\\[|$)`);
}

function lineMatchesQuestTitle(line: string, quest: Quest): boolean {
	const titleRe = questTitleLineRegex(quest.title || '');
	return Boolean(titleRe && line.includes('#gamified-task') && titleRe.test(line));
}

export function findQuestLineIndex(lines: string[], quest: Quest): number {
	const title = (quest.title || '').trim();
	const projectSlug = getQuestProjectSlug(quest);
	const titleRe = questTitleLineRegex(title);

	if (titleRe) {
		const titleMatches: number[] = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes('#gamified-task') && titleRe.test(line)) {
				titleMatches.push(i);
			}
		}

		if (titleMatches.length === 1) return titleMatches[0];

		if (titleMatches.length > 1) {
			const projectName = (quest.project || '').trim();
			for (const idx of titleMatches) {
				const line = lines[idx];
				if (
					(projectName && line.includes(`[project:: ${projectName}]`)) ||
					(projectSlug && line.includes(`#project/${projectSlug}`))
				) {
					return idx;
				}
			}
			for (const idx of titleMatches) {
				const line = lines[idx];
				if (line.includes('[project::') || line.includes('#project/')) {
					return idx;
				}
			}
		}

		if (titleMatches.length > 0) return titleMatches[0];
	}

	if (typeof quest.lineNumber === 'number' && quest.lineNumber > 0) {
		const idx = quest.lineNumber - 1;
		if (idx >= 0 && idx < lines.length && lineMatchesQuestTitle(lines[idx], quest)) {
			return idx;
		}
	}

	const id = (quest.id || '').trim();
	if (id) {
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.includes('#gamified-task') && line.includes(id)) {
				return i;
			}
		}
	}

	return -1;
}

function findSubtaskInsertIndex(lines: string[], questLineIndex: number): number {
	let insertAt = questLineIndex + 1;
	for (let i = questLineIndex + 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === '') continue;
		if (!/^[ \t]/.test(line)) break;
		insertAt = i + 1;
	}
	return insertAt;
}

/** Append an indented checklist item under a waypoint quest line in its note/file. */
export async function appendWaypointChecklistItem(
	app: App,
	quest: Quest,
	text: string
): Promise<void> {
	const trimmed = text.trim();
	if (!trimmed) return;

	const path = normalizePath(quest.filePath || '');
	if (!path) throw new Error('Waypoint has no file path');

	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) throw new Error(`Waypoint file not found: ${path}`);

	const lines = (await app.vault.read(file)).split('\n');
	const questLineIndex = findQuestLineIndex(lines, quest);
	if (questLineIndex === -1) throw new Error(`Waypoint line not found in ${path}`);

	const insertAt = findSubtaskInsertIndex(lines, questLineIndex);
	lines.splice(insertAt, 0, `  - [ ] ${trimmed}`);
	await app.vault.modify(file, lines.join('\n'));
}

export function isSameQuest(a: Quest, b: Quest | null | undefined): boolean {
	if (!b) return false;
	if (
		a.filePath &&
		b.filePath &&
		a.lineNumber != null &&
		b.lineNumber != null &&
		a.filePath === b.filePath &&
		a.lineNumber === b.lineNumber
	) {
		return true;
	}
	if (a.id && b.id && a.id === b.id) return true;
	return a.title === b.title;
}

/** Open linked waypoints after the current one. */
export function getUpcomingWaypoints(project: ProjectSummary, current: Quest | null): Quest[] {
	if (!current) {
		return project.tasks.filter((task) => !task.completed);
	}
	return project.tasks.filter((task) => !task.completed && !isSameQuest(task, current));
}

/** Normalize contract header difficulty for reward tiers (Easy / Medium / Hard). */
export function contractHeaderDifficultyTier(header: Quest | null | undefined): string {
	if (!header?.difficulty?.trim()) return 'Medium';
	return normalizeDifficultyTier(header.difficulty);
}

/** Quest tab hub sections (Phase 1 IA). */
export type QuestHubSection = 'tasks' | 'projects' | 'journey' | 'dungeon';

export const QUEST_HUB_SECTION_KEY = 'gamification-quest-hub-section';

export function parseQuestHubSection(raw: string | null): QuestHubSection {
	if (raw === 'projects' || raw === 'journey' || raw === 'dungeon') return raw;
	return 'tasks';
}

/** Header row in GamifiedTasks: `[type:: project]`, `type: project`, or tag `#type/project`. */
export function isProjectHeaderQuest(quest: Quest): boolean {
	const type = (quest.type || '').toLowerCase();
	if (type === 'project') return true;
	return (quest.tags || []).some((t) => t.toLowerCase() === 'type/project' || t.toLowerCase() === 'project');
}

/** Slug/id linking a task to a project (`[project:: Name]`, pipe `project:`, or tag `project/foo`). */
export function getQuestProjectSlug(quest: Quest): string | null {
	const direct = (quest.project || '').trim();
	if (direct) return slugifyProjectId(direct);

	for (const tag of quest.tags || []) {
		const lower = tag.toLowerCase();
		if (lower.startsWith('project/')) {
			return slugifyProjectId(tag.slice('project/'.length));
		}
	}
	return null;
}

export function slugifyProjectId(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export interface ProjectSummary {
	id: string;
	title: string;
	/** Explicit project header quest, if any. */
	headerQuest: Quest | null;
	tasks: Quest[];
	completedCount: number;
	totalCount: number;
	progressPercent: number;
}

function projectTitleFromSlug(slug: string): string {
	return slug
		.split('-')
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function countProgressForQuest(quest: Quest): { done: number; total: number } {
	if (quest.subtasks.length > 0) {
		const done = quest.subtasks.filter((s) => s.completed).length;
		return { done, total: quest.subtasks.length };
	}
	return { done: quest.completed ? 1 : 0, total: 1 };
}

/**
 * Build project cards from vault quests.
 * - Headers: `[type:: project]`, pipe `type: project`, or project tag on header row.
 * - Members: `[project:: Name]`, pipe `project: Name`, or `#project/name` on tasks.
 */
export function buildProjectSummaries(allQuests: Quest[]): ProjectSummary[] {
	const byId = new Map<string, ProjectSummary>();

	const ensure = (id: string, title: string, headerQuest: Quest | null): ProjectSummary => {
		const existing = byId.get(id);
		if (existing) {
			if (headerQuest && !existing.headerQuest) {
				existing.headerQuest = headerQuest;
				existing.title = headerQuest.title;
			}
			return existing;
		}
		const summary: ProjectSummary = {
			id,
			title,
			headerQuest,
			tasks: [],
			completedCount: 0,
			totalCount: 0,
			progressPercent: 0,
		};
		byId.set(id, summary);
		return summary;
	};

	for (const quest of allQuests) {
		if (isProjectHeaderQuest(quest)) {
			const id = slugifyProjectId(quest.title) || quest.id;
			ensure(id, quest.title, quest);
		}
	}

	for (const quest of allQuests) {
		if (isProjectHeaderQuest(quest)) continue;
		const slug = getQuestProjectSlug(quest);
		if (!slug) continue;
		const summary = ensure(slug, projectTitleFromSlug(slug), null);
		summary.tasks.push(quest);
	}

	for (const summary of byId.values()) {
		const headerProgress = summary.headerQuest ? countProgressForQuest(summary.headerQuest) : null;
		let done = headerProgress?.done ?? 0;
		let total = headerProgress?.total ?? 0;

		for (const task of summary.tasks) {
			const p = countProgressForQuest(task);
			done += p.done;
			total += p.total;
		}

		summary.completedCount = done;
		summary.totalCount = total;
		summary.progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
	}

	return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
}

/** Tasks view: hide project header rows from inbox/calendar. */
export function isRegularTaskQuest(quest: Quest): boolean {
	return !isProjectHeaderQuest(quest);
}

export interface ContractHeaderInput {
	name: string;
	description?: string;
	due?: string;
	xp: number;
	cp: number;
	coins: number;
	difficulty?: string;
	priority?: string;
	skillName: string;
	skillClass?: string;
}

function priorityEmoji(priority: string): string {
	switch (priority) {
		case 'Highest':
			return '🔺';
		case 'High':
			return '⏫';
		case 'Medium':
			return '🔼';
		case 'Low':
			return '🔽';
		case 'Lowest':
			return '⏬';
		default:
			return '';
	}
}

function difficultyEmoji(difficulty: string): string {
	switch (difficulty.toLowerCase()) {
		case 'hard':
			return '🔥';
		case 'easy':
			return '🌱';
		case 'medium':
			return '⚖️';
		default:
			return '';
	}
}

/** Markdown block for a new project contract header (turn-in rewards live on this line). */
export function buildContractHeaderMarkdown(input: ContractHeaderInput): string {
	const title = input.name.trim();
	const meta: string[] = [`⭐${input.cp}`, `✨${input.xp}`, `🪙${input.coins}`];

	const pEmoji = priorityEmoji(input.priority || 'Medium');
	if (pEmoji) meta.push(pEmoji);

	const dEmoji = input.difficulty ? difficultyEmoji(input.difficulty) : '';
	if (dEmoji) meta.push(dEmoji);

	if (input.due) meta.push(`📅${input.due}`);
	if (input.skillName) meta.push(`🛠️[${input.skillName}]`);

	const tags = [`#skill/${input.skillName.replace(/\s+/g, '-')}`];
	if (input.skillClass?.trim()) {
		tags.push(`#class/${input.skillClass.trim().replace(/\s+/g, '-')}`);
	}

	let line = `- [ ] ${title} #gamified-task ${meta.join(' ')} ${tags.join(' ')} [type:: project]`;
	if (input.difficulty) {
		line += ` [difficulty:: ${input.difficulty}]`;
	}

	if (input.description?.trim()) {
		line += `\n  💭 ${input.description.trim()}`;
	}

	return line;
}
