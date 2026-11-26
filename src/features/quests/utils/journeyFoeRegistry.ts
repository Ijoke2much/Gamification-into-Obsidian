import type GamifiedObsidianPlugin from '../../../core/main';
import { ensureDefaultGateBosses } from '../data/defaultGateBosses';
import { JOURNEY_FOE_CATALOG, type JourneyFoeDefinition } from '../data/journeyFoeCatalog';
import { listBosses, type BossFileData } from './bossFile';
import { getVaultFoes } from './foesParser';

let mergedCache: JourneyFoeDefinition[] | null = null;
let vaultCache: JourneyFoeDefinition[] | null = null;

/** Journey-scale HP. The gate uses a separate task pool on the same note. */
const JOURNEY_HP: Record<JourneyFoeDefinition['difficulty'], number> = {
	easy: 80,
	medium: 100,
	hard: 140,
};

const JOURNEY_WINDOW_DAYS: Record<JourneyFoeDefinition['difficulty'], number> = {
	easy: 7,
	medium: 7,
	hard: 5,
};

const JOURNEY_LOOT: Record<JourneyFoeDefinition['difficulty'], JourneyFoeDefinition['lootTier']> = {
	easy: 'common',
	medium: 'uncommon',
	hard: 'rare',
};

const SPRITE_BY_ID = new Map(JOURNEY_FOE_CATALOG.map((foe) => [foe.id, foe.sprite]));

export function bossToJourneyFoe(boss: BossFileData): JourneyFoeDefinition {
	const difficulty = boss.difficulty;
	const sprite = SPRITE_BY_ID.get(boss.bossId);
	return {
		id: boss.bossId,
		name: boss.name,
		description: boss.description || `${boss.name} is faced on the road by finishing quests.`,
		emoji: boss.emoji || '👹',
		maxHp: JOURNEY_HP[difficulty],
		windowDays: JOURNEY_WINDOW_DAYS[difficulty],
		difficulty,
		lootTier: JOURNEY_LOOT[difficulty],
		pathWhisper: boss.description || 'Finished quests are the only thing that cuts this foe.',
		affinityRule: boss.affinityRule,
		...(sprite ? { sprite } : {}),
	};
}

function mergeFoes(
	defaults: JourneyFoeDefinition[],
	custom: JourneyFoeDefinition[]
): JourneyFoeDefinition[] {
	const map = new Map<string, JourneyFoeDefinition>();
	for (const f of defaults) map.set(f.id, f);
	for (const f of custom) map.set(f.id, f);
	return Array.from(map.values());
}

/** Boss notes, with Foes.md overrides winning by id. Sync; uses last refresh. */
export function getJourneyFoes(): JourneyFoeDefinition[] {
	return mergedCache ?? [];
}

export function getJourneyFoeById(id: string): JourneyFoeDefinition | undefined {
	return (
		getJourneyFoes().find((f) => f.id === id) ??
		JOURNEY_FOE_CATALOG.find((f) => f.id === id)
	);
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
	await ensureDefaultGateBosses(plugin.app);
	const bosses = await listBosses(plugin.app);
	const fromBosses = bosses.map(bossToJourneyFoe);
	const custom = await getVaultFoes(plugin);
	vaultCache = custom;
	mergedCache = mergeFoes(fromBosses, custom);
	return mergedCache;
}
