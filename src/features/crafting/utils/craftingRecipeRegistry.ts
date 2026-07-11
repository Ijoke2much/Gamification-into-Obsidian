import type GamifiedObsidianPlugin from '../../../core/main';
import type { CraftingRecipe } from '../types/CraftingTypes';
import { DEFAULT_CRAFTING_RECIPES } from '../data/defaultRecipes';
import { getVaultRecipes } from './recipesParser';

let mergedCache: CraftingRecipe[] | null = null;
let vaultCache: CraftingRecipe[] | null = null;

function mergeRecipes(defaults: CraftingRecipe[], custom: CraftingRecipe[]): CraftingRecipe[] {
	const map = new Map<string, CraftingRecipe>();
	for (const r of defaults) map.set(r.id, r);
	for (const r of custom) map.set(r.id, r);
	return Array.from(map.values());
}

export function getCraftingRecipes(): CraftingRecipe[] {
	return mergedCache ?? DEFAULT_CRAFTING_RECIPES;
}

export function getVaultRecipeOverrides(): CraftingRecipe[] {
	return vaultCache ?? [];
}

export function isVaultRecipe(recipeId: string): boolean {
	return vaultCache?.some((r) => r.id === recipeId) ?? false;
}

export function invalidateCraftingRecipeCache(): void {
	mergedCache = null;
	vaultCache = null;
}

export async function refreshCraftingRecipes(
	plugin: GamifiedObsidianPlugin
): Promise<CraftingRecipe[]> {
	const custom = await getVaultRecipes(plugin);
	vaultCache = custom;
	mergedCache = mergeRecipes(DEFAULT_CRAFTING_RECIPES, custom);
	return mergedCache;
}

export function findRecipeById(recipeId: string): CraftingRecipe | undefined {
	return getCraftingRecipes().find((r) => r.id === recipeId);
}
