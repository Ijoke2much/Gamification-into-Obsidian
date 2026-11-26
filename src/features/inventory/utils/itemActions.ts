import type { InventoryItem } from './updateInventoryFile';
import { MaterialUtils } from '../../../shared/utils/materialUtils';

/**
 * Per-type action gating for the inventory detail panel.
 * Materials craft, gear equips, consumables get used, artifacts activate,
 * keys are spent automatically by the systems that need them.
 */

export type ItemKind = 'material' | 'gear' | 'key' | 'artifact' | 'consumable';

export interface AllowedItemActions {
	kind: ItemKind;
	use: boolean;
	equip: boolean;
	sell: boolean;
	drop: boolean;
	/** Label override for the Use button (artifacts "Activate"). */
	useLabel: string;
	/** Shown where actions are hidden, so gating reads as intent, not a bug. */
	hint?: string;
}

function hasTag(item: InventoryItem, tag: string): boolean {
	return (item.tags ?? []).some((t) => t.replace(/^#/, '').toLowerCase() === tag);
}

export function getItemKind(item: InventoryItem): ItemKind {
	const category = (item.category ?? '').toLowerCase();

	if (category === 'key' || hasTag(item, 'key')) return 'key';
	if (category === 'artifact' || hasTag(item, 'artifact')) return 'artifact';
	if (category === 'equipment' || hasTag(item, 'weapon') || hasTag(item, 'armor')) return 'gear';
	if (MaterialUtils.isCraftingMaterial(item)) return 'material';
	return 'consumable';
}

export function getAllowedActions(item: InventoryItem): AllowedItemActions {
	const kind = getItemKind(item);
	const isEquipped = hasTag(item, 'equipped');

	switch (kind) {
		case 'material':
			return {
				kind,
				use: false,
				equip: false,
				sell: true,
				drop: true,
				useLabel: 'Use',
				hint: 'Crafting ingredient — combine it in the Workshop.',
			};
		case 'gear':
			return {
				kind,
				use: false,
				equip: true,
				// Unequip before selling — prevents selling gear you're wearing.
				sell: !isEquipped,
				drop: !isEquipped,
				useLabel: 'Use',
				hint: isEquipped ? 'Currently equipped — unequip it to sell or drop.' : undefined,
			};
		case 'key':
			return {
				kind,
				use: false,
				equip: false,
				sell: false,
				drop: true,
				useLabel: 'Use',
				hint: 'A key opens something. It will be spent where it fits — boss gates, lootboxes…',
			};
		case 'artifact':
			return {
				kind,
				use: true,
				equip: false,
				sell: false,
				drop: true,
				useLabel: 'Activate',
				hint: 'Activating starts its real-world reward.',
			};
		case 'consumable':
		default:
			return { kind, use: true, equip: false, sell: true, drop: true, useLabel: 'Use' };
	}
}
