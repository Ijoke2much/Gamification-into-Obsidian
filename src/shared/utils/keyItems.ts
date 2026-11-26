import type { App, Vault } from 'obsidian';
import type { ShopLikeItem } from '../../features/shop/utils/ShopParser';
import {
	addOrIncrementInventoryItem,
	dropItem,
	readInventory,
} from '../../features/inventory/utils/updateInventoryFile';

/**
 * Earned keys:
 * - Lootbox Key — drops when a journey foe falls; spent in the shop's Lootbox tab.
 * - Boss Key — drops when a dungeon raid is won; spent to start a standalone boss fight.
 * Keys are never sold or "used" manually; the consuming feature spends them.
 */

export const LOOTBOX_KEY_NAME = 'Lootbox Key';
export const BOSS_KEY_NAME = 'Boss Key';

/** Held boss keys cap so they keep meaning; lootbox keys can pile up freely. */
export const BOSS_KEY_CAP = 3;

const KEY_ITEMS: Record<string, ShopLikeItem> = {
	[LOOTBOX_KEY_NAME]: {
		name: LOOTBOX_KEY_NAME,
		price: 0,
		tags: ['key', 'lootbox-key'],
		rarity: 'uncommon',
		category: 'key',
		icon: '🗝️',
		description: 'Pried from a defeated foe. The shop keeps caches this fits.',
	} as ShopLikeItem,
	[BOSS_KEY_NAME]: {
		name: BOSS_KEY_NAME,
		price: 0,
		tags: ['key', 'boss-key'],
		rarity: 'rare',
		category: 'key',
		icon: '🔑',
		description: 'Torn from a dungeon gate. Unlocks one boss challenge — spent when the fight begins.',
	} as ShopLikeItem,
};

export async function countKeys(vault: Vault, keyName: string): Promise<number> {
	try {
		const inventory = await readInventory(vault);
		const item = inventory.find((it) => it.name === keyName);
		if (!item) return 0;
		return Math.max(0, Number(item.quantity ?? 1));
	} catch {
		return 0;
	}
}

/** Grant a key. Boss keys respect the cap. Returns true if actually granted. */
export async function grantKey(app: App, keyName: string, quantity = 1): Promise<boolean> {
	const def = KEY_ITEMS[keyName];
	if (!def) return false;
	if (keyName === BOSS_KEY_NAME) {
		const held = await countKeys(app.vault, BOSS_KEY_NAME);
		if (held >= BOSS_KEY_CAP) return false;
		quantity = Math.min(quantity, BOSS_KEY_CAP - held);
	}
	await addOrIncrementInventoryItem(app, def, quantity);
	return true;
}

/** Spend one key. Returns false (and consumes nothing) if none are held. */
export async function consumeKey(app: App, keyName: string): Promise<boolean> {
	const held = await countKeys(app.vault, keyName);
	if (held <= 0) return false;
	await dropItem(app, keyName);
	return true;
}
