import { TFile, Vault } from 'obsidian';

/**
 * Best-effort snapshot of plugin-managed data files (Inventory / Recipes /
 * Materials) before a rewrite, plus a unified listing/restore surface that
 * also includes the existing PlayerData backups.
 *
 * Uses the vault adapter directly so backups can live in a hidden folder that
 * Obsidian doesn't index (keeps search / graph clean).
 */

const BACKUP_ROOT = '.gamification-backups';
const MAX_BACKUPS_PER_FILE = 5;
/** Skip re-snapshotting a file that was backed up moments ago (burst writes). */
const MIN_BACKUP_INTERVAL_MS = 60_000;

/** Legacy PlayerData backups (playerDataUtils.ts) — included in listing/restore. */
const PLAYERDATA_BACKUP_DIR = 'SkillTree/.playerdata_backups';
const PLAYERDATA_SOURCE_PATH = 'SkillTree/PlayerData.md';

const lastBackupAt = new Map<string, number>();

function timestamp(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Vault paths are flattened into one folder name per source file. */
function encodeSourcePath(p: string): string {
	return p.replace(/\//g, '__');
}

function decodeSourcePath(folderName: string): string {
	return folderName.replace(/__/g, '/');
}

/**
 * Snapshot the file's current content before an overwrite. Never throws —
 * a failed backup must not block the actual write.
 */
export async function backupVaultFileBeforeWrite(vault: Vault, file: TFile): Promise<void> {
	try {
		const now = Date.now();
		if (now - (lastBackupAt.get(file.path) ?? 0) < MIN_BACKUP_INTERVAL_MS) return;

		const content = await vault.read(file);
		// An empty file has nothing worth preserving.
		if (!content || content.trim().length === 0) return;

		const adapter = vault.adapter;
		const dir = `${BACKUP_ROOT}/${encodeSourcePath(file.path)}`;
		if (!(await adapter.exists(BACKUP_ROOT))) await adapter.mkdir(BACKUP_ROOT);
		if (!(await adapter.exists(dir))) await adapter.mkdir(dir);

		await adapter.write(`${dir}/${timestamp()}.md`, content);
		lastBackupAt.set(file.path, now);

		// Retention: timestamped names sort chronologically.
		const listing = await adapter.list(dir);
		const files = [...listing.files].sort();
		while (files.length > MAX_BACKUPS_PER_FILE) {
			const oldest = files.shift();
			if (oldest) {
				try { await adapter.remove(oldest); } catch { /* ignore */ }
			}
		}
	} catch (error) {
		console.warn('Gamification: backup before write failed (write continues):', error);
	}
}

/** `vault.modify` with a safety snapshot of the previous content. */
export async function modifyWithBackup(vault: Vault, file: TFile, content: string): Promise<void> {
	await backupVaultFileBeforeWrite(vault, file);
	await vault.modify(file, content);
}

export interface DataBackupEntry {
	/** Adapter path of the backup snapshot. */
	backupPath: string;
	/** Vault path the snapshot should restore into. */
	sourcePath: string;
	/** Human-readable label for pickers, newest first. */
	label: string;
}

function labelFor(sourcePath: string, backupFileName: string): string {
	// 20260814-213905.md → 2026-08-14 21:39
	const m = backupFileName.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
	const when = m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : backupFileName.replace(/\.md$/, '');
	const base = sourcePath.split('/').pop() ?? sourcePath;
	return `${base} — ${when}`;
}

/** All known data backups (new shared folder + legacy PlayerData dir), newest first. */
export async function listAllDataBackups(vault: Vault): Promise<DataBackupEntry[]> {
	const adapter = vault.adapter;
	const entries: DataBackupEntry[] = [];

	try {
		if (await adapter.exists(BACKUP_ROOT)) {
			const root = await adapter.list(BACKUP_ROOT);
			for (const folder of root.folders) {
				const folderName = folder.split('/').pop() ?? '';
				const sourcePath = decodeSourcePath(folderName);
				const listing = await adapter.list(folder);
				for (const backupPath of listing.files) {
					const fileName = backupPath.split('/').pop() ?? '';
					entries.push({ backupPath, sourcePath, label: labelFor(sourcePath, fileName) });
				}
			}
		}
	} catch { /* folder may not exist yet */ }

	try {
		if (await adapter.exists(PLAYERDATA_BACKUP_DIR)) {
			const listing = await adapter.list(PLAYERDATA_BACKUP_DIR);
			for (const backupPath of listing.files) {
				const fileName = backupPath.split('/').pop() ?? '';
				entries.push({
					backupPath,
					sourcePath: PLAYERDATA_SOURCE_PATH,
					label: labelFor(PLAYERDATA_SOURCE_PATH, fileName.replace(/^PlayerData\./, '')),
				});
			}
		}
	} catch { /* ignore */ }

	// Newest first (backup filenames are sortable timestamps).
	return entries.sort((a, b) => b.backupPath.localeCompare(a.backupPath));
}

/** Write a snapshot back into its source file (recreates the file if it was deleted). */
export async function restoreDataBackup(vault: Vault, entry: DataBackupEntry): Promise<void> {
	const content = await vault.adapter.read(entry.backupPath);
	if (!content || content.trim().length === 0) {
		throw new Error('Backup file is empty — refusing to restore.');
	}
	const target = vault.getAbstractFileByPath(entry.sourcePath);
	if (target instanceof TFile) {
		await vault.modify(target, content);
	} else {
		await vault.create(entry.sourcePath, content);
	}

	// Nudge open views to re-read.
	try {
		document.dispatchEvent(new Event('player-data-updated'));
		window.dispatchEvent(new CustomEvent('inventory-updated'));
	} catch { /* ignore */ }
}
