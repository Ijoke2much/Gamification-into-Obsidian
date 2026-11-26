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

function namedNotes(settings: GamificationPluginSettings): string[] {
	const paths = [
		settings.inventoryFilePath || 'Inventory.md',
		'Gear.md',
		'Foes.md',
		'Shop.md',
		'shop.md',
		'Recipes.md',
		'recipes.md',
		'Materials.md',
		'materials.md',
		'Gamification/Shop.md',
		'Gamification/Recipes.md',
		'Gamification/Materials.md',
		'Gamified/Recipes.md',
		'Gamified/Materials.md',
		settings.defaultQuestFilePath || 'GamifiedTasks.md',
		settings.projectsFilePath || 'GamifiedProjects.md',
		settings.captureFilePath || 'Capture.md',
		settings.focusCheckInLogPath || 'CheckIns.md',
		...(settings.questSaveLocations || []).map((entry) => entry.filePath),
		...(settings.externalWatchPaths || []),
	];
	if (settings.taskNotesFolder) paths.push(settings.taskNotesFolder);
	return paths;
}

export async function buildVaultExport(plugin: GamifiedObsidianPlugin): Promise<VaultExportBundle> {
	const settings = plugin.settings;
	const vault = plugin.app.vault;
	const files = new Map<string, string>();

	await readFolder(vault, settings.skillTreeRoot || 'SkillTree', files);
	await readFolder(vault, settings.masterClassFolder || 'SkillTree/Master-Class', files);
	await readFolder(vault, settings.classFolder || 'SkillTree/Master-Class/Class', files);
	await readFolder(vault, settings.skillFolder || 'SkillTree/Master-Class/Class/Skills', files);
	await readFolder(vault, settings.statFolder || 'SkillTree/Master-Class/Stats', files);
	await readFolder(vault, 'Bosses', files);
	await readFolder(vault, settings.taskNoteFolder || 'Gamified/Tasks', files);

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

	const parsedSettings = JSON.parse(serializeSettings(settings)) as Record<string, unknown>;
	return {
		kind: VAULT_EXPORT_KIND,
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		pluginVersion: plugin.manifest.version,
		settings: parsedSettings,
		files: [...files.entries()]
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
		const path = safePath(entry.path);
		if (!path || typeof entry.content !== 'string' || !isTextPath(path)) continue;
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
		const next = hydrateSettings(bundle.settings);
		plugin.settings = next;
		await plugin.saveData(next);
		settings = true;
	}
	return { files, settings };
}
