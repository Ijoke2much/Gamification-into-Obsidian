import type GamifiedObsidianPlugin from '../../../core/main';
import { JOURNEY_FOE_CATALOG, type JourneyFoeDefinition } from '../data/journeyFoeCatalog';
import { getVaultFoes } from './foesParser';

let mergedCache: JourneyFoeDefinition[] | null = null;
let vaultCache: JourneyFoeDefinition[] | null = null;

function mergeFoes(
	defaults: JourneyFoeDefinition[],
	custom: JourneyFoeDefinition[]
): JourneyFoeDefinition[] {
	const map = new Map<string, JourneyFoeDefinition>();
	for (const f of defaults) map.set(f.id, f);
	for (const f of custom) map.set(f.id, f);
	return Array.from(map.values());
}

/** Merged foes (built-in defaults + Foes.md overrides). Sync; uses last refresh. */
export function getJourneyFoes(): JourneyFoeDefinition[] {
	return mergedCache ?? JOURNEY_FOE_CATALOG;
}

export function getJourneyFoeById(id: string): JourneyFoeDefinition | undefined {
	return getJourneyFoes().find((f) => f.id === id);
}

export function isVaultFoe(foeId: string): boolean {
	return vaultCache?.some((f) => f.id === foeId) ?? false;
}

export function invalidateJourneyFoeCache(): void {
	mergedCache = null;
	vaultCache = null;
}

export async function refreshJourneyFoes(
	plugin: GamifiedObsidianPlugin
): Promise<JourneyFoeDefinition[]> {
	const custom = await getVaultFoes(plugin);
	vaultCache = custom;
	mergedCache = mergeFoes(JOURNEY_FOE_CATALOG, custom);
	return mergedCache;
}
