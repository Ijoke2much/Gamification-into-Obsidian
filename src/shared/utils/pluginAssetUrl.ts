import type { App } from 'obsidian';
import { BUNDLED_PLUGIN_ASSET_URLS } from './bundledPluginAssets';

const PLUGIN_ID = 'Gamification-into-Obsidian';

/** Logical paths for bundled images (inlined into main.js for BRAT installs). */
export const PLUGIN_ASSETS = {
	journeyOverworldBanner: 'assets/journey-overworld-banner.png',
	journeyBattleBanner: 'assets/journey-battle-banner.png',
	projectsGuildBanner: 'assets/projects-guild-banner.png',
	treeStage: (stage: number) => `assets/trees/tree_stage_${stage}.png`,
	treeStages: () =>
		[1, 2, 3, 4, 5].map((n) => `assets/trees/tree_stage_${n}.png`),
	weaponSprite: (id: string) => `assets/sprites/weapons/${id}.png`,
	gearSprite: (id: string) => `assets/sprites/gear/${id}.png`,
	foeSprite: (id: string) => `assets/sprites/foes/${id}.png`,
	focusStage: 'assets/focus-stage.jpg',
} as const;

function bundledUrl(relativePath: string): string {
	const normalized = relativePath.replace(/^\//, '');
	return BUNDLED_PLUGIN_ASSET_URLS[normalized] ?? '';
}

/**
 * URL for a plugin image. Prefers inlined data URLs so BRAT's 3-file install
 * still shows sprites; falls back to files beside main.js when present.
 */
export function getPluginAssetUrl(relativePath: string, app?: App): string {
	const inlined = bundledUrl(relativePath);
	if (inlined) return inlined;

	try {
		const obsidianApp =
			app ??
			(typeof window !== 'undefined' ? (window as { app?: App }).app : undefined);
		if (!obsidianApp) return '';

		const plugins = (
			obsidianApp as {
				plugins?: { plugins?: Record<string, { manifest?: { dir?: string } }> };
			}
		).plugins?.plugins;
		const dir = plugins?.[PLUGIN_ID]?.manifest?.dir;
		if (!dir) return '';

		const normalized = relativePath.replace(/^\//, '');
		const fullPath = `${dir}/${normalized}`.replace(/\\/g, '/');
		return obsidianApp.vault.adapter.getResourcePath(fullPath);
	} catch {
		return '';
	}
}

export function getPluginTreeStageUrls(app?: App): string[] {
	return PLUGIN_ASSETS.treeStages().map((path) => getPluginAssetUrl(path, app));
}
