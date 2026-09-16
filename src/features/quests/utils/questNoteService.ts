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
import {
	buildQuestFromTaskNotesContent,
	buildTaskNotesFrontmatter,
	isGamifiedTaskContent,
	isTaskNotesContent,
	overlayTaskNotesFields,
	hydrateQuestRewardsFromNote,
} from './taskNotesAdapter';

export type QuestStorageMode = 'list' | 'per-note';

export interface QuestLoadSettings {
	defaultQuestFilePath?: string;
	questSaveLocations?: { filePath?: string; label?: string }[];
	questStorageMode?: QuestStorageMode;
	taskNoteFolder?: string;
	taskNotesFolder?: string;
	taskNotesCompatibility?: boolean;
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
	const shared = settings.taskNotesFolder?.trim();
	if (shared) return normalizePath(shared);
	return normalizePath(settings.taskNoteFolder || 'Gamified/Tasks');
}

export function getSharedTaskNoteFolders(settings: QuestLoadSettings): string[] {
	const folders = new Set<string>();
	if (isPerNoteMode(settings)) {
		folders.add(normalizePath(settings.taskNoteFolder || 'Gamified/Tasks'));
	}
	if (settings.taskNotesCompatibility !== false) {
		const tn = settings.taskNotesFolder?.trim();
		if (tn) folders.add(normalizePath(tn));
		else if (isPerNoteMode(settings)) folders.add(getTaskNoteFolder(settings));
	}
	return Array.from(folders);
}

/** True when the file is a gamified quest note and/or a TaskNotes task. */
export function isTaskNoteContent(content: string): boolean {
	return isGamifiedTaskContent(content) || isTaskNotesContent(content);
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
	start?: string;
	recur?: string;
	estimatedTime?: string;
	energyCost?: number;
	activityProfile?: string;
	project?: string;
	banner?: string;
	bannerAlign?: string;
	timelineTheme?: string;
	customTags?: string[];
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

	const frontmatter = buildTaskNotesFrontmatter({
		id,
		title: input.title.trim(),
		xp: input.xp,
		cp: input.cp,
		coins,
		priority: input.priority,
		difficulty: input.difficulty,
		due: input.due,
		start: input.start,
		recur: input.recur,
		estimatedTime: input.estimatedTime,
		energyCost: input.energyCost,
		activityProfile: input.activityProfile,
		project: input.project,
		skills: skillNames,
		banner: input.banner,
		bannerAlign: input.bannerAlign,
		timelineTheme: input.timelineTheme,
		customTags: input.customTags,
	});

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
		start: input.start,
		recur: input.recur,
		estimatedTime: input.estimatedTime,
		energyCost: input.energyCost,
		activityProfile: input.activityProfile,
		project: input.project,
		customTags: input.customTags,
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
			let task: Quest | null = parsed.find((q) => q.title) ?? parsed[0] ?? null;
			if (task) {
				overlayTaskNotesFields(task, content);
			} else {
				task = buildQuestFromTaskNotesContent(content, file.path);
			}
			if (!task) continue;

			task.filePath = file.path;
			const lines = content.split('\n');
			const lineIdx = lines.findIndex(
				(line) => line.includes('#gamified-task') || /^-\s*\[[ xX]\]/.test(line)
			);
			if (lineIdx >= 0) task.lineNumber = lineIdx + 1;
			task.id = buildQuestStableId(file.path, task.lineNumber ?? 1, task.title);
			task = hydrateQuestRewardsFromNote(task, {
				app,
				file,
				content,
				taskLine: lineIdx >= 0 ? lines[lineIdx] : undefined,
			});

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
			if (parsed.length === 1) {
				const line =
					typeof quest.lineNumber === 'number' && quest.lineNumber > 0
						? content.split('\n')[quest.lineNumber - 1]
						: undefined;
				Object.assign(
					quest,
					hydrateQuestRewardsFromNote(quest, { app, file, content, taskLine: line })
				);
			}
			merged.push(quest);
		}
	}

	const seenNotePaths = new Set<string>();
	for (const folder of getSharedTaskNoteFolders(settings)) {
		const noteQuests = await loadQuestsFromNoteFolder(app, folder, listPathSet);
		for (const quest of noteQuests) {
			const path = quest.filePath || '';
			if (path && seenNotePaths.has(path)) continue;
			if (path) seenNotePaths.add(path);
			merged.push(quest);
		}
	}

	return merged.filter((quest) => !isCaptureQuest(quest));
}

/** Returns true when a vault file change should trigger a quest reload. */
export function shouldReloadQuestsOnFileChange(
	filePath: string,
	settings: QuestLoadSettings
): boolean {
	if (getConfiguredListQuestPaths(settings).includes(filePath)) return true;
	for (const folder of getSharedTaskNoteFolders(settings)) {
		if (filePath === folder || filePath.startsWith(`${folder}/`)) return true;
	}
	return false;
}

/** True when this quest lives as its own markdown note (TaskNotes / per-note), not a list file. */
export function isPerNoteQuestFile(
	filePath: string | undefined,
	settings: QuestLoadSettings
): boolean {
	const path = filePath?.trim();
	if (!path) return false;
	if (getConfiguredListQuestPaths(settings).includes(path)) return false;
	const folders = getSharedTaskNoteFolders(settings);
	if (folders.length === 0) return false;
	return folders.some((folder) => path === folder || path.startsWith(`${folder}/`));
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
