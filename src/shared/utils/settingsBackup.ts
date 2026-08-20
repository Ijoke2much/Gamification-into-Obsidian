import type { Vault } from 'obsidian';
import type GamifiedObsidianPlugin from '../../core/main';
import {
	BALANCED_GAMEPLAY_MODULES,
	DEFAULT_SETTINGS,
	type GamificationPluginSettings,
} from '../../core/settings';
import { migrateVisualThemeSettings } from './visualThemeManager';

/**
 * Plugin settings snapshots (data.json), kept separate from Inventory /
 * PlayerData backups. Hidden folder so search/graph stay clean.
 */

const SETTINGS_BACKUP_DIR = '.gamification-backups/settings';
const MAX_SETTINGS_BACKUPS = 5;
const MIN_SETTINGS_BACKUP_INTERVAL_MS = 60_000;

let lastSettingsBackupAt = 0;

export interface SettingsBackupEntry {
	backupPath: string;
	label: string;
}

function timestamp(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function labelFor(fileName: string): string {
	const m = fileName.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
	const when = m
		? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`
		: fileName.replace(/\.json$/, '');
	return `Settings — ${when}`;
}

function serializeSettings(payload: unknown): string {
	return `${JSON.stringify(payload ?? {}, null, 2)}\n`;
}

function parseSettingsJson(raw: string): Record<string, unknown> {
	const parsed = JSON.parse(raw) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Settings backup is not a JSON object.');
	}
	return parsed as Record<string, unknown>;
}

/** Merge a raw snapshot the same way loadSettings does. */
export function hydrateSettings(loaded: Record<string, unknown> | null | undefined): GamificationPluginSettings {
	const settings = Object.assign({}, DEFAULT_SETTINGS, loaded) as GamificationPluginSettings;
	settings.modules = {
		...BALANCED_GAMEPLAY_MODULES,
		...((loaded?.modules as object) ?? {}),
	};
	settings.visualTheme = migrateVisualThemeSettings(loaded as Partial<GamificationPluginSettings>);
	if (loaded && loaded.gameplayOnboardingComplete === undefined) {
		settings.gameplayOnboardingComplete = true;
	}
	if (loaded && loaded.energyHudMode === undefined) {
		settings.energyHudMode = 'full';
	}
	return settings;
}

async function ensureDir(vault: Vault, dir: string): Promise<void> {
	const adapter = vault.adapter;
	if (!(await adapter.exists('.gamification-backups'))) {
		await adapter.mkdir('.gamification-backups');
	}
	if (!(await adapter.exists(dir))) {
		await adapter.mkdir(dir);
	}
}

export async function listSettingsBackups(vault: Vault): Promise<SettingsBackupEntry[]> {
	const adapter = vault.adapter;
	try {
		if (!(await adapter.exists(SETTINGS_BACKUP_DIR))) return [];
		const listing = await adapter.list(SETTINGS_BACKUP_DIR);
		return listing.files
			.filter((p) => p.endsWith('.json'))
			.sort((a, b) => b.localeCompare(a))
			.map((backupPath) => ({
				backupPath,
				label: labelFor(backupPath.split('/').pop() ?? ''),
			}));
	} catch {
		return [];
	}
}

/** Snapshot the given settings object. `force` skips the 60s throttle (manual backup). */
export async function backupPluginSettings(
	vault: Vault,
	payload: unknown,
	opts?: { force?: boolean }
): Promise<boolean> {
	try {
		const now = Date.now();
		if (!opts?.force && now - lastSettingsBackupAt < MIN_SETTINGS_BACKUP_INTERVAL_MS) {
			return false;
		}
		const json = serializeSettings(payload);
		if (!json.trim() || json.trim() === '{}') return false;

		await ensureDir(vault, SETTINGS_BACKUP_DIR);
		await vault.adapter.write(`${SETTINGS_BACKUP_DIR}/${timestamp()}.json`, json);
		lastSettingsBackupAt = now;

		const listing = await vault.adapter.list(SETTINGS_BACKUP_DIR);
		const files = [...listing.files].filter((p) => p.endsWith('.json')).sort();
		while (files.length > MAX_SETTINGS_BACKUPS) {
			const oldest = files.shift();
			if (oldest) {
				try { await vault.adapter.remove(oldest); } catch { /* ignore */ }
			}
		}
		return true;
	} catch (error) {
		console.warn('Gamification: settings backup failed:', error);
		return false;
	}
}

/** Throttled snapshot of whatever is currently on disk, then caller saves. */
export async function backupSettingsBeforeSave(plugin: GamifiedObsidianPlugin): Promise<void> {
	try {
		const onDisk = await plugin.loadData();
		await backupPluginSettings(plugin.app.vault, onDisk ?? plugin.settings);
	} catch (error) {
		console.warn('Gamification: settings auto-backup skipped:', error);
	}
}

export async function restoreSettingsBackup(
	plugin: GamifiedObsidianPlugin,
	backupPath: string
): Promise<void> {
	const raw = await plugin.app.vault.adapter.read(backupPath);
	if (!raw || !raw.trim()) {
		throw new Error('Settings backup is empty — refusing to restore.');
	}
	const parsed = parseSettingsJson(raw);
	const next = hydrateSettings(parsed);
	plugin.settings = next;
	await plugin.saveData(next);
}

export async function exportSettingsToVault(
	vault: Vault,
	payload: unknown
): Promise<string> {
	const path = 'Gamification-settings-export.json';
	await vault.adapter.write(path, serializeSettings(payload));
	return path;
}

export async function importSettingsFromJson(
	plugin: GamifiedObsidianPlugin,
	raw: string
): Promise<void> {
	const parsed = parseSettingsJson(raw);
	const next = hydrateSettings(parsed);
	plugin.settings = next;
	await plugin.saveData(next);
}
