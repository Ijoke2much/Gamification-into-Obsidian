import {
	App,
	normalizePath,
	stringifyYaml,
	TFile,
	TFolder,
} from 'obsidian';
import {
	generateMarkdownTask,
	parseQuestsFromMarkdown,
	buildQuestStableId,
	type Quest,
	type SkillMetadata,
} from './taskParser';
import { isCaptureQuest } from './captureService';

export type QuestStorageMode = 'list' | 'per-note';

export interface QuestLoadSettings {
	defaultQuestFilePath?: string;
	questSaveLocations?: { filePath?: string; label?: string }[];
	questStorageMode?: QuestStorageMode;
	taskNoteFolder?: string;
	projectsFilePath?: string;
}

export function getConfiguredListQuestPaths(settings: QuestLoadSettings): string[] {
	const paths = new Set<string>();
	paths.add(settings.defaultQuestFilePath || 'GamifiedTasks.md');
	if (settings.projectsFilePath?.trim()) {
		paths.add(settings.projectsFilePath.trim());
	}
	(settings.questSaveLocations ?? []).forEach((loc) => {
		if (loc.filePath) paths.add(loc.filePath);
	});
	return Array.from(paths);
}

export function isPerNoteMode(settings: QuestLoadSettings): boolean {
	return settings.questStorageMode === 'per-note';
}

export function getTaskNoteFolder(settings: QuestLoadSettings): string {
	return normalizePath(settings.taskNoteFolder || 'Gamified/Tasks');
}

/** True when file content is a gamified task note (frontmatter flag or body tag). */
export function isTaskNoteContent(content: string): boolean {
	const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (fmMatch && /gamified-task:\s*true/i.test(fmMatch[1])) {
		return true;
	}
	return /#gamified-task/.test(content);
}

export function slugifyNoteFilename(title: string): string {
	const cleaned = title
		.trim()
		.replace(/[\\/:*?"<>|]/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 80);
	return cleaned || 'Untitled Task';
}

async function ensureFolder(vault: App['vault'], folderPath: string): Promise<void> {
	const parts = folderPath.split('/').filter(Boolean);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!vault.getAbstractFileByPath(current)) {
			await vault.createFolder(current);
		}
	}
}

function collectMarkdownFiles(folder: TFolder): TFile[] {
	const files: TFile[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === 'md') {
			files.push(child);
		} else if (child instanceof TFolder) {
			files.push(...collectMarkdownFiles(child));
		}
	}
	return files;
}

import type { SkillMetadata as DiscoverySkillMetadata } from '../../../shared/utils/skillDiscovery';

export interface CreateQuestNoteInput {
	title: string;
	description?: string;
	subtasks: { text: string; completed: boolean; description?: string }[];
	skills: DiscoverySkillMetadata[];
	priority: string;
	difficulty: string;
	xp: number;
	cp: number;
	due?: string;
	recur?: string;
	estimatedTime?: string;
	energyCost?: number;
	activityProfile?: string;
	project?: string;
	banner?: string;
	bannerAlign?: string;
	timelineTheme?: string;
}

/** Create a new markdown note containing one gamified task. */
export async function createQuestNote(
	app: App,
	folderPath: string,
	input: CreateQuestNoteInput
): Promise<TFile> {
	const normalizedFolder = normalizePath(folderPath);
	await ensureFolder(app.vault, normalizedFolder);

	const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const baseName = slugifyNoteFilename(input.title);
	let filePath = normalizePath(`${normalizedFolder}/${baseName}.md`);

	let suffix = 0;
	while (app.vault.getAbstractFileByPath(filePath)) {
		suffix += 1;
		filePath = normalizePath(`${normalizedFolder}/${baseName} ${suffix}.md`);
	}

	const coins = Math.round(input.xp * 0.1);
	const skillNames = input.skills.map((s) => s.name).filter(Boolean);

	const frontmatter: Record<string, unknown> = {
		'gamified-task': true,
		id,
		title: input.title.trim(),
		xp: input.xp,
		cp: input.cp,
		coins,
	};
	if (input.priority) frontmatter.priority = input.priority;
	if (input.difficulty) frontmatter.difficulty = input.difficulty;
	if (input.due) frontmatter.due = input.due;
	if (input.recur) frontmatter.recur = input.recur;
	if (input.estimatedTime) frontmatter.estimatedTime = input.estimatedTime;
	if (input.energyCost) frontmatter.energyCost = input.energyCost;
	if (input.activityProfile) frontmatter.activityProfile = input.activityProfile;
	if (input.project) frontmatter.project = input.project;
	if (skillNames.length) frontmatter.skills = skillNames;
	if (input.banner) frontmatter.banner = input.banner;
	if (input.bannerAlign) frontmatter.bannerAlign = input.bannerAlign;
	if (input.timelineTheme) frontmatter.timelineTheme = input.timelineTheme;

	const bodyBlock = generateMarkdownTask({
		title: input.title.trim(),
		description: input.description,
		subtasks: input.subtasks,
		skills: input.skills as unknown as SkillMetadata[],
		priority: input.priority,
		difficulty: input.difficulty,
		xp: input.xp,
		cp: input.cp,
		due: input.due,
		recur: input.recur,
		estimatedTime: input.estimatedTime,
		energyCost: input.energyCost,
		activityProfile: input.activityProfile,
		project: input.project,
	});

	const yaml = stringifyYaml(frontmatter);
	const content = `---\n${yaml}---\n\n${bodyBlock}\n`;
	return app.vault.create(filePath, content);
}

/** Load quests from markdown notes under a folder (one primary task per note). */
export async function loadQuestsFromNoteFolder(
	app: App,
	folderPath: string,
	listFilePaths: Set<string> = new Set()
): Promise<Quest[]> {
	const normalizedFolder = normalizePath(folderPath);
	const folder = app.vault.getAbstractFileByPath(normalizedFolder);
	if (!(folder instanceof TFolder)) return [];

	const quests: Quest[] = [];

	for (const file of collectMarkdownFiles(folder)) {
		if (listFilePaths.has(file.path)) continue;

		try {
			const content = await app.vault.read(file);
			if (!isTaskNoteContent(content)) continue;

			const parsed = parseQuestsFromMarkdown(content);
			const task = parsed.find((q) => q.title) ?? parsed[0];
			if (!task) continue;

			task.filePath = file.path;
			task.id = buildQuestStableId(file.path, task.lineNumber ?? 1, task.title);

			const lines = content.split('\n');
			const lineIdx = lines.findIndex((line) => line.includes('#gamified-task'));
			if (lineIdx >= 0) task.lineNumber = lineIdx + 1;

			quests.push(task);
		} catch (error) {
			console.error(`Failed to load task note ${file.path}:`, error);
		}
	}

	return quests;
}

/** Load list-file quests plus optional per-note folder quests. */
export async function loadAllQuests(app: App, settings: QuestLoadSettings): Promise<Quest[]> {
	const merged: Quest[] = [];
	const listPaths = getConfiguredListQuestPaths(settings);
	const listPathSet = new Set(listPaths);

	for (const path of listPaths) {
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) continue;
		const content = await app.vault.read(file);
		const parsed = parseQuestsFromMarkdown(content);
		for (const quest of parsed) {
			if (!quest.filePath) quest.filePath = file.path;
			quest.id = buildQuestStableId(file.path, quest.lineNumber ?? 0, quest.title);
			merged.push(quest);
		}
	}

	if (isPerNoteMode(settings)) {
		const noteQuests = await loadQuestsFromNoteFolder(app, getTaskNoteFolder(settings), listPathSet);
		merged.push(...noteQuests);
	}

	return merged.filter((quest) => !isCaptureQuest(quest));
}

/** Returns true when a vault file change should trigger a quest reload. */
export function shouldReloadQuestsOnFileChange(
	filePath: string,
	settings: QuestLoadSettings
): boolean {
	if (getConfiguredListQuestPaths(settings).includes(filePath)) return true;
	if (!isPerNoteMode(settings)) return false;
	const folder = getTaskNoteFolder(settings);
	return filePath === folder || filePath.startsWith(`${folder}/`);
}

/** Subscribe to vault changes that affect quest / contract loading. */
export function registerQuestVaultWatchers(
	vault: App['vault'],
	settings: QuestLoadSettings,
	onReload: () => void
): () => void {
	const handleFile = (file: TFile) => {
		if (shouldReloadQuestsOnFileChange(file.path, settings)) onReload();
	};
	const handleRename = (file: TFile, oldPath: string) => {
		if (
			shouldReloadQuestsOnFileChange(file.path, settings) ||
			shouldReloadQuestsOnFileChange(oldPath, settings)
		) {
			onReload();
		}
	};

	vault.on('modify', handleFile as never);
	vault.on('create', handleFile as never);
	vault.on('delete', handleFile as never);
	vault.on('rename', handleRename as never);

	return () => {
		vault.off('modify', handleFile as never);
		vault.off('create', handleFile as never);
		vault.off('delete', handleFile as never);
		vault.off('rename', handleRename as never);
	};
}
