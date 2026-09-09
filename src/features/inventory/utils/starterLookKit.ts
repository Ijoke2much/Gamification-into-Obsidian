import type { App } from 'obsidian';
import type { ShopLikeItem } from '../../shop/utils/ShopParser';
import {
	GEAR_SLOTS,
	readHunterKit,
	writeHunterKit,
	type GearSlot,
} from './gearFile';
import { addOrIncrementInventoryItem, readInventory } from './updateInventoryFile';
import { InventoryOperations } from './inventoryOperations';
import { isImageIconPath } from '../../../shared/utils/pixelSprites';

export const STARTER_LOOK_BY_SLOT: Record<GearSlot, string> = {
	head: 'Worn Hood',
	body: 'Practice Vest',
	hands: 'Wrap Gloves',
	feet: 'Trail Boots',
	weapon: 'Practice Blade',
	accessory: 'Hunter Tag',
	tool: 'Field Notebook',
};

export const STARTER_LOADOUT_A = 'Pomodoro Timer';

const STARTER_ITEMS: ShopLikeItem[] = [
	{
		name: 'Worn Hood',
		price: 8,
		tags: ['equipment', 'common', 'head'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/gear/hood.png',
		description: 'Starter look. Light DEF.',
		effects: ['doll=worn-hood', 'dream:def=1', 'dream:hp=3'],
	},
	{
		name: 'Practice Vest',
		price: 12,
		tags: ['equipment', 'common', 'body'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/gear/vest.png',
		description: 'Quilted training coat.',
		effects: ['doll=practice-vest', 'dream:def=2', 'dream:hp=5'],
	},
	{
		name: 'Wrap Gloves',
		price: 6,
		tags: ['equipment', 'common', 'hands'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/gear/gloves.png',
		description: 'Wraps for a training grip.',
		effects: ['doll=wrap-gloves', 'dream:atk=1'],
	},
	{
		name: 'Trail Boots',
		price: 10,
		tags: ['equipment', 'common', 'feet'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/gear/boots.png',
		description: 'Scuffed starter boots.',
		effects: ['doll=trail-boots', 'dream:def=1', 'dream:hp=2'],
	},
	{
		name: 'Practice Blade',
		price: 14,
		tags: ['equipment', 'common', 'weapon'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/weapons/sword.png',
		description: 'Blunt training sword.',
		effects: ['doll=practice-blade', 'dream:atk=3'],
	},
	{
		name: 'Hunter Tag',
		price: 5,
		tags: ['equipment', 'common', 'accessory'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/gear/tag.png',
		description: 'Rank plaque.',
		effects: ['doll=hunter-tag', 'dream:atk=1', 'dream:def=1'],
	},
	{
		name: 'Field Notebook',
		price: 4,
		tags: ['equipment', 'common', 'tool'],
		rarity: 'common',
		category: 'equipment',
		icon: 'assets/sprites/gear/notebook.png',
		description: 'Look-slot notebook. Tiny ATK.',
		effects: ['doll=field-notebook', 'dream:atk=1'],
	},
	{
		name: 'Pomodoro Timer',
		price: 4,
		tags: ['tool', 'common'],
		rarity: 'common',
		category: 'tool',
		icon: 'assets/sprites/gear/timer.png',
		description: 'Loadout only — does not change the doll.',
		effects: [],
	},
];

function hasItem(inventory: { name: string }[], name: string): boolean {
	const key = name.trim().toLowerCase();
	return inventory.some((item) => item.name.trim().toLowerCase() === key);
}

/**
 * Grant E-rank starter look gear if missing, and fill empty look slots.
 * Never overwrites equipped pieces.
 */
export async function ensureStarterLookKit(app: App): Promise<void> {
	const inventory = await readInventory(app.vault);
	for (const item of STARTER_ITEMS) {
		if (!hasItem(inventory, item.name)) {
			await addOrIncrementInventoryItem(app, item, 1);
		}
	}

	const latest = await InventoryOperations.readEnhancedInventory(app);
	let iconsChanged = false;
	for (const template of STARTER_ITEMS) {
		const existing = latest.find(
			(entry) => entry.name.trim().toLowerCase() === template.name.toLowerCase()
		);
		if (!existing || !template.icon) continue;
		if (existing.icon && isImageIconPath(existing.icon) && !existing.icon.startsWith('assets/sprites/')) {
			continue;
		}
		if (existing.icon !== template.icon) {
			existing.icon = template.icon;
			iconsChanged = true;
		}
	}
	if (iconsChanged) {
		await InventoryOperations.writeEnhancedInventory(app, latest);
	}

	const kit = await readHunterKit(app.vault);
	let changed = false;
	for (const slot of GEAR_SLOTS) {
		if (kit.look[slot]) continue;
		kit.look[slot] = STARTER_LOOK_BY_SLOT[slot];
		changed = true;
	}
	if (!kit.loadout.a) {
		kit.loadout.a = STARTER_LOADOUT_A;
		changed = true;
	}
	if (changed) {
		await writeHunterKit(app.vault, kit);
	}
}
