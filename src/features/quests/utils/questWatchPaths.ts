import { normalizePath, TFile, TFolder, type App } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import {
	getConfiguredListQuestPaths,
	getTaskNoteFolder,
	isPerNoteMode,
	type QuestLoadSettings,
} from './questNoteService';
import { getCaptureFilePath } from './captureService';

type WatchSettings = QuestLoadSettings &
	Pick<
		GamificationPluginSettings,
		'taskNotesFolder' | 'externalWatchPaths' | 'taskNotesCompatibility' | 'captureFilePath'
	>;

function collectMarkdownInFolder(folder: TFolder): string[] {
	const paths: string[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === 'md') {
			paths.push(child.path);
		} else if (child instanceof TFolder) {
			paths.push(...collectMarkdownInFolder(child));
		}
	}
	return paths;
}

export function getTaskNotesFolder(settings: QuestLoadSettings & Pick<GamificationPluginSettings, 'taskNotesFolder'>): string {
	const custom = settings.taskNotesFolder?.trim();
	if (custom) return normalizePath(custom);
	if (isPerNoteMode(settings)) return getTaskNoteFolder(settings);
	return '';
}

/** List-file paths plus optional per-note / TaskNotes folders and extra watch paths. */
export function getQuestWatchListPaths(settings: WatchSettings): string[] {
	const paths = new Set<string>(getConfiguredListQuestPaths(settings));

	const capturePath = getCaptureFilePath(settings as GamificationPluginSettings);
	paths.delete(capturePath);

	if (isPerNoteMode(settings)) {
		paths.add(getTaskNoteFolder(settings));
	}

	if (settings.taskNotesCompatibility !== false) {
		const tnFolder = getTaskNotesFolder(settings);
		if (tnFolder) paths.add(tnFolder);
	}

	for (const raw of settings.externalWatchPaths ?? []) {
		const p = raw?.trim();
		if (p) paths.add(normalizePath(p));
	}

	return Array.from(paths);
}

export function shouldWatchFileForCompletions(filePath: string, settings: WatchSettings): boolean {
	if (filePath === getCaptureFilePath(settings)) return false;

	const watchPaths = getQuestWatchListPaths(settings);
	for (const watchPath of watchPaths) {
		if (filePath === watchPath) return true;
		const folder = watchPath.endsWith('/') ? watchPath.slice(0, -1) : watchPath;
		if (filePath.startsWith(`${folder}/`)) return true;
	}
	return false;
}

export async function cacheAllWatchedFiles(
	app: App,
	settings: WatchSettings,
	cache: Map<string, string>
): Promise<void> {
	const watchPaths = getQuestWatchListPaths(settings);

	for (const watchPath of watchPaths) {
		const abstract = app.vault.getAbstractFileByPath(watchPath);
		if (abstract instanceof TFile && abstract.extension === 'md') {
			try {
				cache.set(abstract.path, await app.vault.read(abstract));
			} catch {
				/* skip unreadable */
			}
			continue;
		}

		if (abstract instanceof TFolder) {
			for (const filePath of collectMarkdownInFolder(abstract)) {
				try {
					const file = app.vault.getAbstractFileByPath(filePath);
					if (file instanceof TFile) {
						cache.set(file.path, await app.vault.read(file));
					}
				} catch {
					/* skip */
				}
			}
		}
	}
}
