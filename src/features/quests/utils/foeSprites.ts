import { TFile, normalizePath } from 'obsidian';
import type GamifiedObsidianPlugin from '../../../core/main';
import type { JourneyFoeDefinition } from '../data/journeyFoeCatalog';
import { getPluginAssetUrl } from '../../../shared/utils/pluginAssetUrl';
import { bundledFoeSpritePath, isPluginSpritePath } from '../../../shared/utils/pixelSprites';

/** Where uploaded foe sprites are stored in the vault. */
export const FOE_SPRITE_FOLDER = 'GamifiedSprites/foes';

/**
 * Resolve a foe's sprite to a renderable URL.
 * Vault uploads win, then the foe's sprite path, then a bundled pixel template.
 */
export function resolveFoeSpriteUrl(
	plugin: GamifiedObsidianPlugin,
	foe: JourneyFoeDefinition | undefined
): string | null {
	if (!foe) return null;

	if (foe.sprite) {
		const path = normalizePath(foe.sprite);
		if (isPluginSpritePath(path)) {
			const bundled = getPluginAssetUrl(path, plugin.app);
			if (bundled) return bundled;
		}
		const file = plugin.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			return plugin.app.vault.getResourcePath(file);
		}
	}

	const bundledPath = bundledFoeSpritePath(foe.id);
	if (bundledPath) {
		const url = getPluginAssetUrl(bundledPath, plugin.app);
		if (url) return url;
	}
	return null;
}

async function ensureSpriteFolder(plugin: GamifiedObsidianPlugin): Promise<void> {
	const segments = FOE_SPRITE_FOLDER.split('/');
	let current = '';
	for (const segment of segments) {
		current = current ? `${current}/${segment}` : segment;
		if (!plugin.app.vault.getAbstractFileByPath(current)) {
			try {
				await plugin.app.vault.createFolder(current);
			} catch {
				// folder may have been created concurrently
			}
		}
	}
}

/**
 * Save an uploaded image into the vault sprite folder.
 * Overwrites an existing file with the same name. Returns the vault path.
 */
export async function saveFoeSpriteToVault(
	plugin: GamifiedObsidianPlugin,
	file: File
): Promise<string> {
	await ensureSpriteFolder(plugin);

	const sanitized = file.name.replace(/[^\w.-]+/g, '-').toLowerCase() || 'foe-sprite.png';
	const path = normalizePath(`${FOE_SPRITE_FOLDER}/${sanitized}`);
	const data = await file.arrayBuffer();

	const existing = plugin.app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await plugin.app.vault.modifyBinary(existing, data);
	} else {
		await plugin.app.vault.createBinary(path, data);
	}
	return path;
}
