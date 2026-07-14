import { App, TFile } from 'obsidian';
import type { GamificationPluginSettings } from '../../../core/settings';
import {
	buildQuestStableId,
	parseQuestsFromMarkdown,
	type Quest,
} from './taskParser';

export const CAPTURE_TAG = 'capture';
export const CAPTURE_LAST_TAG_KEY = 'gamification.capture.lastTag';

const DEFAULT_CAPTURE_TAGS = ['idea', 'work', 'plugin', 'personal', 'read-later'];
const HIDDEN_CAPTURE_TAGS = new Set(['gamified-task', 'capture']);

export function isCaptureQuest(quest: { tags?: string[] }): boolean {
	return (quest.tags ?? []).includes(CAPTURE_TAG);
}

export function getCaptureFilePath(settings: Pick<GamificationPluginSettings, 'captureFilePath'>): string {
	return settings.captureFilePath?.trim() || 'Capture.md';
}

export function getDefaultQuestFilePath(settings: Pick<GamificationPluginSettings, 'defaultQuestFilePath'>): string {
	return settings.defaultQuestFilePath?.trim() || 'GamifiedTasks.md';
}

export function getCaptureTagPresets(settings: Pick<GamificationPluginSettings, 'captureTags'>): string[] {
	const tags = settings.captureTags?.length ? settings.captureTags : DEFAULT_CAPTURE_TAGS;
	return tags.map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
}

export type CaptureDescriptionFormat = 'thought' | 'dataview' | 'both';

export function buildCaptureLine(
	text: string,
	optionalTag?: string,
	description?: string,
	descriptionFormat: CaptureDescriptionFormat = 'thought'
): string {
	const trimmed = text.trim();
	if (!trimmed) return '';

	const tags = ['#gamified-task', '#capture'];
	if (optionalTag) {
		const normalized = optionalTag.replace(/^#/, '').trim();
		if (
			normalized &&
			normalized !== 'gamified-task' &&
			normalized !== 'capture'
		) {
			tags.push(`#${normalized}`);
		}
	}

	const desc = description?.trim();
	let line = `- [ ] ${trimmed} ${tags.join(' ')}`;
	if (desc) {
		if (descriptionFormat === 'thought' || descriptionFormat === 'both') {
			line += `\n  💭 ${desc}`;
		}
		if (descriptionFormat === 'dataview' || descriptionFormat === 'both') {
			line += `\n  [description:: ${desc}]`;
		}
	}
	return line;
}

function toTodayISO(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Quest line for today's inbox — matches sidebar group-move metadata. */
export function buildTodayInboxLine(quest: Quest): string {
	const categoryTags = (quest.tags ?? [])
		.filter((tag) => !HIDDEN_CAPTURE_TAGS.has(tag))
		.map((tag) => `#${tag}`)
		.join(' ');
	const todayISO = toTodayISO();
	const tagSuffix = categoryTags ? ` ${categoryTags}` : '';
	let line = `- [ ] ${quest.title.trim()} #gamified-task 📅${todayISO} // due: ${todayISO} | today: true | modified: ${new Date().toISOString()} #today/true #status/active${tagSuffix}`;
	const desc = quest.description?.toString().trim();
	if (desc) {
		line += `\n  💭 ${desc}`;
	}
	return line;
}

export async function appendCaptureLine(
	app: App,
	settings: Pick<
		GamificationPluginSettings,
		'captureFilePath' | 'captureDescriptionFormat'
	>,
	text: string,
	optionalTag?: string,
	description?: string
): Promise<boolean> {
	const format = settings.captureDescriptionFormat ?? 'thought';
	const line = buildCaptureLine(text, optionalTag, description, format);
	if (!line) return false;

	const path = getCaptureFilePath(settings);
	const existing = app.vault.getAbstractFileByPath(path);
	let file: TFile;

	if (existing instanceof TFile) {
		file = existing;
	} else {
		const header =
			'# Capture\n\n' +
			'Brain dump — triage later. Items tagged `#capture` stay out of the quest board until promoted.\n\n';
		const created = await app.vault.create(path, header);
		if (!(created instanceof TFile)) return false;
		file = created;
	}

	const content = await app.vault.read(file);
	const suffix = content.endsWith('\n') ? '' : '\n';
	await app.vault.modify(file, `${content}${suffix}${line}\n`);
	return true;
}

export function rememberCaptureTag(tag: string | undefined): void {
	try {
		if (tag) {
			localStorage.setItem(CAPTURE_LAST_TAG_KEY, tag.replace(/^#/, ''));
		} else {
			localStorage.removeItem(CAPTURE_LAST_TAG_KEY);
		}
	} catch {
		/* ignore storage errors */
	}
}

export function loadRememberedCaptureTag(): string | undefined {
	try {
		return localStorage.getItem(CAPTURE_LAST_TAG_KEY) || undefined;
	} catch {
		return undefined;
	}
}

export async function loadCaptures(
	app: App,
	settings: Pick<GamificationPluginSettings, 'captureFilePath'>
): Promise<Quest[]> {
	const path = getCaptureFilePath(settings);
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) return [];

	const content = await app.vault.read(file);
	const parsed = parseQuestsFromMarkdown(content);

	return parsed
		.filter((quest) => isCaptureQuest(quest) && !quest.completed)
		.map((quest) => ({
			...quest,
			filePath: file.path,
			id: buildQuestStableId(file.path, quest.lineNumber ?? 0, quest.title),
		}));
}

export async function removeCaptureLine(
	app: App,
	settings: Pick<GamificationPluginSettings, 'captureFilePath'>,
	quest: Quest
): Promise<boolean> {
	const path = quest.filePath || getCaptureFilePath(settings);
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) return false;

	const lines = (await app.vault.read(file)).split('\n');
	const lineIndex = quest.lineNumber
		? quest.lineNumber - 1
		: lines.findIndex((line) => line.includes('#capture') && line.includes(quest.title));
	if (lineIndex < 0 || lineIndex >= lines.length) return false;

	lines.splice(lineIndex, 1);
	while (lineIndex < lines.length && /^\s+/.test(lines[lineIndex])) {
		lines.splice(lineIndex, 1);
	}

	await app.vault.modify(file, lines.join('\n'));
	return true;
}

export async function promoteCaptureToTodayInbox(
	app: App,
	settings: Pick<GamificationPluginSettings, 'captureFilePath' | 'defaultQuestFilePath'>,
	quest: Quest
): Promise<boolean> {
	const questPath = getDefaultQuestFilePath(settings);
	const existingQuestFile = app.vault.getAbstractFileByPath(questPath);
	let questFile: TFile;

	if (existingQuestFile instanceof TFile) {
		questFile = existingQuestFile;
	} else {
		const created = await app.vault.create(questPath, '');
		if (!(created instanceof TFile)) return false;
		questFile = created;
	}

	const line = buildTodayInboxLine(quest);
	const content = await app.vault.read(questFile);
	const suffix = content.endsWith('\n') || content.length === 0 ? '' : '\n';
	await app.vault.modify(questFile, `${content}${suffix}${line}\n`);

	return removeCaptureLine(app, settings, quest);
}

export async function openCaptureFile(
	app: App,
	settings: Pick<GamificationPluginSettings, 'captureFilePath'>
): Promise<void> {
	const path = getCaptureFilePath(settings);
	const existing = app.vault.getAbstractFileByPath(path);
	let file: TFile;

	if (existing instanceof TFile) {
		file = existing;
	} else {
		const header =
			'# Capture\n\n' +
			'Brain dump — triage later. Items tagged `#capture` stay out of the quest board until promoted.\n\n';
		const created = await app.vault.create(path, header);
		if (!(created instanceof TFile)) return;
		file = created;
	}

	const leaf = app.workspace.getLeaf(false);
	await leaf.openFile(file);
}

export function shouldReloadCapturesOnFileChange(
	filePath: string,
	settings: Pick<GamificationPluginSettings, 'captureFilePath'>
): boolean {
	return filePath === getCaptureFilePath(settings);
}
