import type { App } from 'obsidian';
import type { ShopLikeItem } from './ShopParser';
import { getCraftingMaterials } from '../../crafting/utils/craftingMaterialRegistry';
import {
	addOrIncrementInventoryItem,
	BUFF_PRESETS,
} from '../../inventory/utils/updateInventoryFile';
import { consumeKey, countKeys, LOOTBOX_KEY_NAME } from '../../../shared/utils/keyItems';

/**
 * Supply Cache — the shop's lootbox. Opened with a Lootbox Key earned by
 * defeating journey foes. One weighted table, guaranteed drop (never empty):
 * mostly materials, sometimes a booster, rarely an artifact.
 */

export interface LootboxReward {
	name: string;
	icon: string;
	rarity: string;
	description: string;
	/** 'material' | 'consumable' | 'artifact' — drives the reveal styling. */
	slot: 'material' | 'consumable' | 'artifact';
}

export interface LootboxOpenResult {
	ok: boolean;
	reward?: LootboxReward;
	keysLeft: number;
	error?: string;
}

/** Rare artifact pull — a real-world reward, pre-wired to the artifact system. */
const ARTIFACT_PULLS: ShopLikeItem[] = [
	{
		name: 'Mystery Tape',
		price: 0,
		tags: ['artifact', 'rare'],
		rarity: 'rare',
		category: 'artifact',
		icon: '📼',
		description: 'A worn tape from the cache. Activate it to watch one episode, guilt-free.',
		effects: ['artifact:Watch one episode:45:entertainment'],
	},
	{
		name: 'Snack Voucher',
		price: 0,
		tags: ['artifact', 'rare'],
		rarity: 'rare',
		category: 'artifact',
		icon: '🍫',
		description: 'Redeemable for one treat of your choosing. Activate when cravings strike.',
		effects: ['artifact:Enjoy a treat:15:food'],
	},
	{
		name: 'Free Hour Pass',
		price: 0,
		tags: ['artifact', 'epic'],
		rarity: 'epic',
		category: 'artifact',
		icon: '🎟️',
		description: 'One hour, zero obligations. Activate to spend it however you want.',
		effects: ['artifact:Free hour - anything goes:60:leisure'],
	},
];

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function materialToShopItem(mat: {
	name: string;
	icon: string;
	rarity: string;
	category: string;
	description: string;
	baseValue: number;
}): ShopLikeItem {
	return {
		name: mat.name,
		price: mat.baseValue,
		tags: [mat.category, mat.rarity],
		rarity: mat.rarity,
		category: mat.category,
		icon: mat.icon,
		description: mat.description,
	};
}

function rollReward(): { item: ShopLikeItem; slot: LootboxReward['slot'] } {
	const materials = getCraftingMaterials();
	const commonPool = materials.filter((m) => m.rarity === 'common' || m.rarity === 'uncommon');
	const rarePool = materials.filter(
		(m) => m.rarity === 'rare' || m.rarity === 'epic' || m.rarity === 'legendary'
	);

	const roll = Math.random();
	// 5% artifact, then 15% rare material, then 30% booster, rest common material.
	if (roll < 0.05) {
		return { item: pick(ARTIFACT_PULLS), slot: 'artifact' };
	}
	if (roll < 0.2 && rarePool.length > 0) {
		return { item: materialToShopItem(pick(rarePool)), slot: 'material' };
	}
	if (roll < 0.5) {
		const preset = pick(Object.values(BUFF_PRESETS));
		return {
			item: { ...preset, effects: preset.effectLines } as unknown as ShopLikeItem,
			slot: 'consumable',
		};
	}
	const pool = commonPool.length > 0 ? commonPool : materials;
	return { item: materialToShopItem(pick(pool)), slot: 'material' };
}

export async function getLootboxKeyCount(app: App): Promise<number> {
	return countKeys(app.vault, LOOTBOX_KEY_NAME);
}

/** Spend one Lootbox Key and grant a rolled reward. Key is only consumed on success. */
export async function openLootbox(app: App): Promise<LootboxOpenResult> {
	const held = await countKeys(app.vault, LOOTBOX_KEY_NAME);
	if (held <= 0) {
		return { ok: false, keysLeft: 0, error: 'No Lootbox Keys — defeat foes on your Journey to earn them.' };
	}

	const { item, slot } = rollReward();

	// Grant first, then consume — a failed grant must not eat the key.
	await addOrIncrementInventoryItem(app, item, 1);
	await consumeKey(app, LOOTBOX_KEY_NAME);

	return {
		ok: true,
		keysLeft: Math.max(0, held - 1),
		reward: {
			name: item.name,
			icon: item.icon ?? '📦',
			rarity: item.rarity,
			description: item.description ?? '',
			slot,
		},
	};
}
