import type GamifiedObsidianPlugin from '../../../core/main';
import type { CraftingMaterial } from '../types/CraftingTypes';
import { DEFAULT_CRAFTING_MATERIALS } from '../data/defaultMaterials';
import { getRemovedMaterialIds, getVaultMaterials, notifyCraftingDataUpdated } from './materialsParser';

let mergedCache: CraftingMaterial[] | null = null;
let vaultCache: CraftingMaterial[] | null = null;
let removedIds = new Set<string>();

function mergeMaterials(defaults: CraftingMaterial[], custom: CraftingMaterial[]): CraftingMaterial[] {
	const map = new Map<string, CraftingMaterial>();
	for (const m of defaults) map.set(m.id, m);
	for (const m of custom) map.set(m.id, m);
	return Array.from(map.values());
}

/** Synchronous access — returns cache if loaded, otherwise built-in defaults only. */
export function getCraftingMaterials(): CraftingMaterial[] {
	const list = mergedCache ?? DEFAULT_CRAFTING_MATERIALS;
	return list.filter((material) => !removedIds.has(material.id));
}

export function getVaultMaterialOverrides(): CraftingMaterial[] {
	return vaultCache ?? [];
}

export function isVaultMaterial(materialId: string): boolean {
	return vaultCache?.some((m) => m.id === materialId) ?? false;
}

export function invalidateCraftingMaterialCache(): void {
	mergedCache = null;
	vaultCache = null;
	removedIds = new Set();
}

export async function refreshCraftingMaterials(
	plugin: GamifiedObsidianPlugin
): Promise<CraftingMaterial[]> {
	const custom = await getVaultMaterials(plugin);
	vaultCache = custom;
	removedIds = new Set(await getRemovedMaterialIds(plugin));
	mergedCache = mergeMaterials(DEFAULT_CRAFTING_MATERIALS, custom).filter(
		(material) => !removedIds.has(material.id)
	);
	return mergedCache;
}

export async function refreshCraftingMaterialsAndNotify(
	plugin: GamifiedObsidianPlugin
): Promise<CraftingMaterial[]> {
	const materials = await refreshCraftingMaterials(plugin);
	notifyCraftingDataUpdated();
	return materials;
}

export function findMaterialByIdOrName(
	materials: CraftingMaterial[],
	key: string
): CraftingMaterial | undefined {
	const normalized = key.trim().toLowerCase();
	return materials.find(
		(m) =>
			m.id.toLowerCase() === normalized ||
			m.name.toLowerCase() === normalized ||
			m.id.toLowerCase() === normalized.replace(/\s+/g, '-')
	);
}
