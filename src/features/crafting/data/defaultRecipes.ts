import type { CraftingRecipe } from '../types/CraftingTypes';

export const DEFAULT_CRAFTING_RECIPES: CraftingRecipe[] = [
            {
                id: 'basic-sword',
                name: 'Basic Sword',
                description: 'A simple wooden sword',
                icon: '⚔️',
                category: 'weapon',
                materials: [
                    { materialId: 'wood', quantity: 3, required: true, qualityRequired: 'normal' },
                    { materialId: 'stone', quantity: 1, required: true, qualityRequired: 'normal' }
                ],
                craftingTime: 30,
                difficulty: 'easy',
                skillRequired: 1,
                craftingStation: 'workbench',
                guaranteedItem: {
                    name: 'Basic Sword',
                    category: 'weapon',
                    rarity: 'common',
                    effects: ['Attack +5'],
                    icon: '⚔️',
                    description: 'A simple but effective weapon',
                    quality: 'basic'
                },
                xpReward: 10,
                boogersReward: 5,
                skillXp: 5
            },
            {
                id: 'mystical-potion',
                name: 'Mystical Potion',
                description: 'A potion with random magical effects',
                icon: '🧪',
                category: 'consumable',
                materials: [
                    { materialId: 'herb', quantity: 2, required: true, qualityRequired: 'fresh' },
                    { materialId: 'essence', quantity: 1, required: true, qualityRequired: 'fresh' },
                    { materialId: 'crystal', quantity: 1, required: false, qualityRequired: 'normal' }
                ],
                craftingTime: 60,
                difficulty: 'medium',
                skillRequired: 3,
                craftingStation: 'alchemy_lab',
                possibleResults: [
                    { name: 'Healing Potion', category: 'consumable', rarity: 'common', effects: ['Restore 50 HP'], icon: '❤️', description: 'Basic healing', weight: 40, quality: 'basic' },
                    { name: 'Mana Potion', category: 'consumable', rarity: 'common', effects: ['Restore 50 MP'], icon: '🔮', description: 'Basic mana restoration', weight: 30, quality: 'basic' },
                    { name: 'Strength Elixir', category: 'consumable', rarity: 'uncommon', effects: ['Attack +10 for 1 hour'], icon: '💪', description: 'Temporary strength boost', weight: 20, duration: 3600, quality: 'fine' },
                    { name: 'Invisibility Potion', category: 'consumable', rarity: 'rare', effects: ['Invisible for 30 minutes'], icon: '👻', description: 'Become invisible', weight: 10, duration: 1800, quality: 'superior' }
                ],
                xpReward: 25,
                boogersReward: 15,
                skillXp: 15
            },
            {
                id: 'random-treasure',
                name: 'Random Treasure',
                description: 'Craft something completely random!',
                icon: '🎁',
                category: 'mystical',
                materials: [
                    { materialId: 'wood', quantity: 1, required: true, qualityRequired: 'normal' },
                    { materialId: 'stone', quantity: 1, required: true, qualityRequired: 'normal' },
                    { materialId: 'herb', quantity: 1, required: true, qualityRequired: 'fresh' }
                ],
                craftingTime: 45,
                difficulty: 'easy',
                skillRequired: 1,
                craftingStation: 'workbench',
                possibleResults: [
                    { name: 'Mystery Box', category: 'mystical', rarity: 'common', effects: ['Random effect'], icon: '📦', description: 'Who knows what\'s inside?', weight: 50, quality: 'basic' },
                    { name: 'Lucky Charm', category: 'mystical', rarity: 'uncommon', effects: ['Luck +5'], icon: '🍀', description: 'Brings good fortune', weight: 30, quality: 'fine' },
                    { name: 'Ancient Artifact', category: 'mystical', rarity: 'rare', effects: ['All stats +3'], icon: '🏺', description: 'Mysterious ancient power', weight: 15, quality: 'superior' },
                    { name: 'Legendary Relic', category: 'mystical', rarity: 'epic', effects: ['Immortality for 1 minute'], icon: '👑', description: 'Brief taste of immortality', weight: 5, duration: 60, quality: 'masterwork' }
                ],
                xpReward: 15,
                boogersReward: 10,
                skillXp: 10
            },
            // === ENHANCED CONSUMABLES ===
            {
                id: 'health_potion_minor',
                name: 'Minor Health Potion',
                description: 'A simple healing draught that restores vitality',
                icon: '🧪',
                category: 'consumable',
                materials: [
                    { materialId: 'herb', quantity: 2, required: true, qualityRequired: 'fresh' }
                ],
                craftingTime: 20,
                difficulty: 'easy',
                skillRequired: 1,
                craftingStation: 'alchemy_lab',
                guaranteedItem: {
                    name: 'Minor Health Potion',
                    category: 'consumable',
                    rarity: 'common',
                    effects: ['Restore 25 Energy'],
                    icon: '🧪',
                    description: 'A simple healing draught that restores some vitality',
                    quality: 'basic'
                },
                xpReward: 15,
                boogersReward: 8,
                skillXp: 10
            },
            {
                id: 'focus_elixir',
                name: 'Focus Elixir',
                description: 'A blue concoction that sharpens the mind',
                icon: '💙',
                category: 'consumable',
                materials: [
                    { materialId: 'crystal', quantity: 1, required: true, qualityRequired: 'normal' },
                    { materialId: 'herb', quantity: 3, required: true, qualityRequired: 'fresh' }
                ],
                craftingTime: 45,
                difficulty: 'medium',
                skillRequired: 3,
                craftingStation: 'alchemy_lab',
                guaranteedItem: {
                    name: 'Focus Elixir',
                    category: 'consumable',
                    rarity: 'uncommon',
                    effects: ['Focus +50% for 1 hour'],
                    icon: '💙',
                    description: 'A blue concoction that sharpens the mind and enhances concentration',
                    quality: 'fine'
                },
                xpReward: 30,
                boogersReward: 15,
                skillXp: 20
            },
            {
                id: 'energy_bar',
                name: 'Energy Bar',
                description: 'A nutritious bar that provides sustained energy',
                icon: '🍫',
                category: 'consumable',
                materials: [
                    { materialId: 'herb', quantity: 1, required: true, qualityRequired: 'fresh' },
                    { materialId: 'wood', quantity: 1, required: true, qualityRequired: 'normal' }
                ],
                craftingTime: 15,
                difficulty: 'easy',
                skillRequired: 1,
                craftingStation: 'workbench',
                guaranteedItem: {
                    name: 'Energy Bar',
                    category: 'consumable',
                    rarity: 'common',
                    effects: ['Restore 15 Energy', 'Motivation +20% for 30 minutes'],
                    icon: '🍫',
                    description: 'A nutritious bar that provides sustained energy',
                    quality: 'basic'
                },
                xpReward: 12,
                boogersReward: 6,
                skillXp: 8
            },
            {
                id: 'scroll_knowledge',
                name: 'Scroll of Knowledge',
                description: 'An ancient scroll that imparts wisdom',
                icon: '📜',
                category: 'consumable',
                materials: [
                    { materialId: 'essence', quantity: 1, required: true, qualityRequired: 'normal' },
                    { materialId: 'crystal', quantity: 1, required: true, qualityRequired: 'normal' }
                ],
                craftingTime: 90,
                difficulty: 'medium',
                skillRequired: 5,
                craftingStation: 'enchanting_table',
                guaranteedItem: {
                    name: 'Scroll of Knowledge',
                    category: 'consumable',
                    rarity: 'rare',
                    effects: ['Instant +100 XP'],
                    icon: '📜',
                    description: 'An ancient scroll that imparts wisdom and experience',
                    quality: 'superior'
                },
                xpReward: 50,
                boogersReward: 25,
                skillXp: 30
            },
            {
                id: 'dragons_vigor',
                name: "Dragon's Vigor",
                description: 'A legendary potion brewed from dragon essence',
                icon: '🔥',
                category: 'consumable',
                materials: [
                    { materialId: 'dragon', quantity: 1, required: true, qualityRequired: 'masterwork' },
                    { materialId: 'essence', quantity: 2, required: true, qualityRequired: 'refined' }
                ],
                craftingTime: 180,
                difficulty: 'hard',
                skillRequired: 8,
                craftingStation: 'alchemy_lab',
                guaranteedItem: {
                    name: "Dragon's Vigor",
                    category: 'consumable',
                    rarity: 'epic',
                    effects: ['XP +100% for 2 hours', 'Fully restore energy'],
                    icon: '🔥',
                    description: 'A legendary potion brewed from dragon essence that grants immense power',
                    quality: 'masterwork'
                },
                xpReward: 150,
                boogersReward: 75,
                skillXp: 100
            }
];
