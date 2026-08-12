import type { App } from 'obsidian';

const PLUGIN_ID = 'Gamification-into-Obsidian';

/** Plugin-bundled image paths (live under `<plugin>/assets/`, not in main.js). */
export const PLUGIN_ASSETS = {
	journeyOverworldBanner: 'assets/journey-overworld-banner.png',
	journeyBattleBanner: 'assets/journey-battle-banner.png',
	projectsGuildBanner: 'assets/projects-guild-banner.png',
	treeStage: (stage: number) => `assets/trees/tree_stage_${stage}.png`,
	treeStages: () =>
		[1, 2, 3, 4, 5].map((n) => `assets/trees/tree_stage_${n}.png`),
} as const;

/**
 * Resolve a file under the plugin folder to a URL Obsidian can load in <img src>.
 * Assets must be shipped beside main.js (see npm run build copy step).
 */
export function getPluginAssetUrl(relativePath: string, app?: App): string {
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
