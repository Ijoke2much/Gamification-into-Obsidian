import type GamifiedObsidianPlugin from '../../../core/main';
import { refreshCraftingMaterials } from './craftingMaterialRegistry';
import { refreshCraftingRecipes } from './craftingRecipeRegistry';
import { notifyCraftingDataUpdated } from './materialsParser';

export async function refreshAllCraftingData(plugin: GamifiedObsidianPlugin): Promise<void> {
	await Promise.all([refreshCraftingMaterials(plugin), refreshCraftingRecipes(plugin)]);
}

export async function refreshAllCraftingDataAndNotify(
	plugin: GamifiedObsidianPlugin
): Promise<void> {
	await refreshAllCraftingData(plugin);
	notifyCraftingDataUpdated();
}
