import type { CraftingMaterial } from '../types/CraftingTypes';

export const DEFAULT_CRAFTING_MATERIALS: CraftingMaterial[] = [
	{ id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common', category: 'organic', description: 'Basic wooden material', baseValue: 1, quality: 'normal', qualityMultiplier: 1.0, source: 'gathering', location: 'forest' },
	{ id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common', category: 'mineral', description: 'Basic stone material', baseValue: 1, quality: 'normal', qualityMultiplier: 1.0, source: 'gathering', location: 'mountain' },
	{ id: 'herb', name: 'Herb', icon: '🌿', rarity: 'common', category: 'herb', description: 'Common medicinal herb', baseValue: 2, quality: 'fresh', qualityMultiplier: 1.5, source: 'gathering', location: 'garden' },
	{ id: 'iron', name: 'Iron Ore', icon: '⛏️', rarity: 'common', category: 'mineral', description: 'Basic metal ore', baseValue: 3, quality: 'normal', qualityMultiplier: 1.0, source: 'gathering', location: 'cave' },
	{ id: 'silver', name: 'Silver', icon: '🥈', rarity: 'uncommon', category: 'mineral', description: 'Precious metal', baseValue: 8, quality: 'refined', qualityMultiplier: 1.3, source: 'gathering', location: 'mountain' },
	{ id: 'crystal', name: 'Crystal', icon: '💎', rarity: 'uncommon', category: 'crystal', description: 'Magical crystal', baseValue: 10, quality: 'normal', qualityMultiplier: 1.0, source: 'gathering', location: 'cave' },
	{ id: 'essence', name: 'Life Essence', icon: '✨', rarity: 'uncommon', category: 'essence', description: 'Pure life energy', baseValue: 12, quality: 'fresh', qualityMultiplier: 1.5, source: 'gathering', location: 'garden' },
	{ id: 'gold', name: 'Gold', icon: '🥇', rarity: 'rare', category: 'mineral', description: 'Precious gold', baseValue: 25, quality: 'refined', qualityMultiplier: 1.3, source: 'gathering', location: 'mountain' },
	{ id: 'diamond', name: 'Diamond', icon: '💎', rarity: 'rare', category: 'crystal', description: 'Rare gemstone', baseValue: 30, quality: 'masterwork', qualityMultiplier: 2.0, source: 'gathering', location: 'cave' },
	{ id: 'phoenix', name: 'Phoenix Feather', icon: '🔥', rarity: 'rare', category: 'mystical', description: 'Legendary feather', baseValue: 50, quality: 'fresh', qualityMultiplier: 1.5, source: 'reward', location: 'quest' },
	{ id: 'dragon', name: 'Dragon Scale', icon: '🐉', rarity: 'epic', category: 'mystical', description: 'Ancient dragon scale', baseValue: 100, quality: 'masterwork', qualityMultiplier: 2.0, source: 'quest', location: 'dragon_lair' },
	{ id: 'star', name: 'Stardust', icon: '⭐', rarity: 'epic', category: 'essence', description: 'Cosmic energy', baseValue: 150, quality: 'refined', qualityMultiplier: 1.3, source: 'gathering', location: 'observatory' },
	{ id: 'void', name: 'Void Essence', icon: '🌌', rarity: 'legendary', category: 'mystical', description: 'Pure void energy', baseValue: 500, quality: 'masterwork', qualityMultiplier: 2.0, source: 'quest', location: 'void_realm' },
	{ id: 'time', name: 'Time Crystal', icon: '⏰', rarity: 'legendary', category: 'crystal', description: 'Frozen time itself', baseValue: 1000, quality: 'masterwork', qualityMultiplier: 2.0, source: 'quest', location: 'time_temple' },
];
