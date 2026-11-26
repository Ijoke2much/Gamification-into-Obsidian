import { TFile, type Vault } from 'obsidian';
import type GamifiedObsidianPlugin from '../../core/main';
import type { GamificationPluginSettings } from '../../core/settings';
import { hydrateSettings, serializeSettings } from './settingsBackup';

export const VAULT_EXPORT_KIND = 'gamification-vault-export';
const EXPORT_VERSION = 1;
const MAX_FILE_CHARS = 1_500_000;

export interface VaultExportFile {
	path: string;
	content: string;
}

export interface VaultExportBundle {
	kind: typeof VAULT_EXPORT_KIND;
	version: number;
	exportedAt: string;
	pluginVersion?: string;
	settings: Record<string, unknown>;
	files: VaultExportFile[];
}

function safePath(path: string): string | null {
	const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '').trim();
	if (!normalized || normalized.includes('..')) return null;
	if (normalized.startsWith('.obsidian/')) return null;
	if (normalized.includes('/.gamification-backups/')) return null;
	if (normalized.includes('/.playerdata_backups/')) return null;
	return normalized;
}

function isTextPath(path: string): boolean {
	return /\.(md|canvas|json|txt|csv)$/i.test(path);
}

async function readIfExists(vault: Vault, path: string, into: Map<string, string>): Promise<void> {
	const safe = safePath(path);
	if (!safe || into.has(safe)) return;
	const file = vault.getAbstractFileByPath(safe);
	if (!(file instanceof TFile) || !isTextPath(safe)) return;
	if (file.stat.size > MAX_FILE_CHARS) return;
	const content = await vault.read(file);
	if (content.length > MAX_FILE_CHARS) return;
	into.set(safe, content);
}

async function readFolder(vault: Vault, folderPath: string, into: Map<string, string>): Promise<void> {
	const root = safePath(folderPath.replace(/\/+$/, ''));
	if (!root) return;
	const prefix = `${root}/`;
	const files = vault.getFiles().filter((file) => {
		const path = file.path.replace(/\\/g, '/');
		return (path === root || path.startsWith(prefix)) && isTextPath(path);
	});
	for (const file of files) {
		await readIfExists(vault, file.path, into);
	}
}

const PLUGIN_NOTES = [
	'Inventory.md',
	'Gear.md',
	'Foes.md',
	'Shop.md',
	'Recipes.md',
	'Materials.md',
	'GamifiedTasks.md',
	'GamifiedProjects.md',
	'Capture.md',
	'CheckIns.md',
	'ShopTemplates.md',
	'CustomMetrics.md',
	'QuestLog.md',
];

/** Store every plugin note under Gamified/, including notes that still live at the vault root. */
export function toGamifiedPath(path: string): string {
	const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
	if (!normalized || normalized.startsWith('Gamified/')) return normalized;
	if (normalized === 'SkillTree' || normalized.startsWith('SkillTree/')) return `Gamified/${normalized}`;
	if (normalized === 'Bosses' || normalized.startsWith('Bosses/')) return `Gamified/${normalized}`;
	if (normalized === 'Gamification' || normalized.startsWith('Gamification/')) {
		return `Gamified/${normalized.slice('Gamification/'.length)}`;
	}
	const fileName = normalized.split('/').pop() || normalized;
	if (!normalized.includes('/') && PLUGIN_NOTES.includes(fileName)) return `Gamified/${fileName}`;
	if (PLUGIN_NOTES.includes(fileName) && normalized.split('/').length === 1) return `Gamified/${fileName}`;
	return normalized.includes('/') ? normalized : `Gamified/${normalized}`;
}

function namedNotes(settings: GamificationPluginSettings): string[] {
	const paths = [
		settings.inventoryFilePath || 'Gamified/Inventory.md',
		settings.playerDataFilePath || 'Gamified/SkillTree/PlayerData.md',
		'SkillTree/PlayerData.md',
		settings.habitsFolderPath || 'Gamified/SkillTree/Habits',
		'SkillTree/Habits',
		settings.habitsFilePath || 'Gamified/SkillTree/Habits.md',
		'SkillTree/Habits.md',
		'Gear.md',
		'Gamified/Gear.md',
		'Foes.md',
		'Gamified/Foes.md',
		'Shop.md',
		'Gamified/Shop.md',
		'Recipes.md',
		'Gamified/Recipes.md',
		'Materials.md',
		'Gamified/Materials.md',
		settings.defaultQuestFilePath || 'Gamified/GamifiedTasks.md',
		settings.projectsFilePath || 'Gamified/GamifiedProjects.md',
		settings.captureFilePath || 'Gamified/Capture.md',
		settings.focusCheckInLogPath || 'Gamified/CheckIns.md',
		...(settings.questSaveLocations || []).map((entry) => entry.filePath),
	];
	return paths;
}

function relocateSettings(settings: Record<string, unknown>): Record<string, unknown> {
	const next = { ...settings };
	const keys = [
		'inventoryFilePath',
		'skillTreeRoot',
		'masterClassFolder',
		'classFolder',
		'skillFolder',
		'statFolder',
		'defaultQuestFilePath',
		'projectsFilePath',
		'captureFilePath',
		'focusCheckInLogPath',
		'taskNoteFolder',
		'playerDataFilePath',
		'habitsFolderPath',
		'habitsFilePath',
	];
	for (const key of keys) {
		const value = next[key];
		if (typeof value === 'string' && value.trim()) next[key] = toGamifiedPath(value);
	}
	if (Array.isArray(next.questSaveLocations)) {
		next.questSaveLocations = next.questSaveLocations.map((entry) => {
			if (!entry || typeof entry !== 'object') return entry;
			const filePath = (entry as { filePath?: string }).filePath;
			if (!filePath) return entry;
			return { ...(entry as object), filePath: toGamifiedPath(filePath) };
		});
	}
	return next;
}

function relocateContent(content: string): string {
	return content
		.replaceAll('Gamified/SkillTree/', '\u0000')
		.replaceAll('SkillTree/', 'Gamified/SkillTree/')
		.replaceAll('\u0000', 'Gamified/SkillTree/')
		.replaceAll('Gamified/Bosses/', '\u0001')
		.replaceAll('Bosses/', 'Gamified/Bosses/')
		.replaceAll('\u0001', 'Gamified/Bosses/');
}

export async function buildVaultExport(plugin: GamifiedObsidianPlugin): Promise<VaultExportBundle> {
	const settings = plugin.settings;
	const vault = plugin.app.vault;
	const files = new Map<string, string>();

	const folders = [
		'SkillTree',
		'Bosses',
		settings.skillTreeRoot || 'Gamified/SkillTree',
		settings.masterClassFolder || 'Gamified/SkillTree/Master-Class',
		settings.classFolder || 'Gamified/SkillTree/Master-Class/Class',
		settings.skillFolder || 'Gamified/SkillTree/Master-Class/Class/Skills',
		settings.statFolder || 'Gamified/SkillTree/Master-Class/Stats',
		'Gamified/Bosses',
		settings.taskNoteFolder || 'Gamified/Tasks',
	];
	for (const folder of folders) {
		await readFolder(vault, folder, files);
	}

	for (const path of namedNotes(settings)) {
		const safe = safePath(path);
		if (!safe) continue;
		const abstract = vault.getAbstractFileByPath(safe);
		if (abstract instanceof TFile) {
			await readIfExists(vault, safe, files);
		} else if (abstract) {
			await readFolder(vault, safe, files);
		}
	}

	const bundled = new Map<string, string>();
	for (const [path, content] of files) {
		const dest = safePath(toGamifiedPath(path).startsWith('Gamified/') ? toGamifiedPath(path) : `Gamified/${toGamifiedPath(path)}`);
		if (!dest) continue;
		bundled.set(dest, relocateContent(content));
	}

	const parsedSettings = relocateSettings(JSON.parse(serializeSettings(settings)) as Record<string, unknown>);
	return {
		kind: VAULT_EXPORT_KIND,
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		pluginVersion: plugin.manifest.version,
		settings: parsedSettings,
		files: [...bundled.entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([path, content]) => ({ path, content })),
	};
}

export function downloadVaultExport(bundle: VaultExportBundle): void {
	const json = `${JSON.stringify(bundle, null, 2)}\n`;
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	const day = bundle.exportedAt.slice(0, 10);
	link.href = url;
	link.download = `gamification-vault-export-${day}.json`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseVaultExport(raw: string): VaultExportBundle {
	const parsed = JSON.parse(raw) as Partial<VaultExportBundle>;
	if (!parsed || parsed.kind !== VAULT_EXPORT_KIND || !Array.isArray(parsed.files)) {
		throw new Error('This file is not a gamification vault export.');
	}
	return parsed as VaultExportBundle;
}

export function isVaultExport(raw: string): boolean {
	try {
		return parseVaultExport(raw).kind === VAULT_EXPORT_KIND;
	} catch {
		return false;
	}
}

async function ensureParentFolders(vault: Vault, path: string): Promise<void> {
	const parts = path.split('/').slice(0, -1);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (vault.getAbstractFileByPath(current)) continue;
		try {
			await vault.createFolder(current);
		} catch {
			/* exists */
		}
	}
}

export async function importVaultExport(
	plugin: GamifiedObsidianPlugin,
	bundle: VaultExportBundle
): Promise<{ files: number; settings: boolean }> {
	const vault = plugin.app.vault;
	let files = 0;
	for (const entry of bundle.files) {
		const raw = safePath(entry.path);
		if (!raw || typeof entry.content !== 'string' || !isTextPath(raw)) continue;
		const path = safePath(raw.startsWith('Gamified/') ? raw : toGamifiedPath(raw));
		if (!path?.startsWith('Gamified/')) continue;
		await ensureParentFolders(vault, path);
		const existing = vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			await vault.modify(existing, entry.content);
		} else if (!existing) {
			await vault.create(path, entry.content);
		}
		files += 1;
	}

	let settings = false;
	if (bundle.settings && typeof bundle.settings === 'object') {
		const next = hydrateSettings(relocateSettings(bundle.settings));
		plugin.settings = next;
		await plugin.saveData(next);
		settings = true;
	}
	return { files, settings };
}
