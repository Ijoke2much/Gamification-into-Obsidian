import type { App, TFile } from 'obsidian';
import { TFile as ObsidianTFile } from 'obsidian';

/**
 * Path-first markdown resolve with session cache.
 * Avoids vault-wide getMarkdownFiles() on every Crafting/Shop open (mobile freeze).
 */
const cache = new Map<string, string | null>();

export function resolveVaultMarkdownFile(
	app: App,
	basename: string,
	candidatePaths: string[]
): TFile | undefined {
	const key = basename.toLowerCase();
	const cachedPath = cache.get(key);
	if (cachedPath) {
		const hit = app.vault.getAbstractFileByPath(cachedPath);
		if (hit instanceof ObsidianTFile) return hit;
		cache.delete(key);
	}

	for (const path of candidatePaths) {
		const file = app.vault.getAbstractFileByPath(path);
		if (file instanceof ObsidianTFile) {
			cache.set(key, file.path);
			return file;
		}
	}

	// Missing was cached — don't vault-scan again on every Crafting open
	if (cachedPath === null) {
		return undefined;
	}

	// Rare fallback — full scan once, then cache
	const found = app.vault
		.getMarkdownFiles()
		.find((f) => f.basename.toLowerCase() === key);
	cache.set(key, found ? found.path : null);
	return found;
}

export function clearVaultMarkdownFileCache(basename?: string): void {
	if (basename) cache.delete(basename.toLowerCase());
	else cache.clear();
}
