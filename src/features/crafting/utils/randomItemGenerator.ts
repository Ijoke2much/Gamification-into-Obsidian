import { App } from 'obsidian';
import { RandomItemTemplate, RandomItemEffect, GeneratedRandomItem } from '../types/CraftingTypes';
import { InventoryItem, addOrIncrementInventoryItem, readInventory, dropItem } from '../../inventory/utils/updateInventoryFile';
import { ShopItem } from '../../shop/utils/ShopParser';
import { MaterialUtils } from '../../../shared/utils/materialUtils';
import { pixelNotice } from '../../../shared/utils/noticeUtils';

export class RandomItemGenerator {
    private static readonly RANDOM_ITEM_TEMPLATES: RandomItemTemplate[] = [
        // Productivity Enhancers
        {
            id: 'focus_crystal',
            name: 'Focus Crystal',
            description: 'A crystal that enhances mental clarity',
            category: 'consumable',
            rarity: 'uncommon',
            icon: '🔮',
            materialRequirements: {
                categories: ['crystal', 'essence', 'mineral'],
                minRarity: 'common',
                quantity: 2
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: 'Deep focus session - work without distractions',
                    realWorldActivity: 'Deep focus work session',
                    activityDuration: 25
                },
                {
                    type: 'buff',
                    description: 'Enhanced learning speed',
                    buffType: 'xp',
                    multiplier: 1.5,
                    buffDuration: '1h'
                }
            ],
            weight: 10
        },

        // Energy Boosters
        {
            id: 'vitality_elixir',
            name: 'Vitality Elixir',
            description: 'Restores energy and motivation',
            category: 'consumable',
            rarity: 'common',
            icon: '⚡',
            materialRequirements: {
                categories: ['herb', 'essence', 'organic'],
                minRarity: 'common',
                quantity: 3
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: 'Take a 10-minute energizing break',
                    realWorldActivity: 'Energizing break - stretch, walk, or breathe',
                    activityDuration: 10
                },
                {
                    type: 'currency',
                    description: 'Instant energy boost',
                    amount: 50
                }
            ],
            weight: 15
        },

        // Crafting Enhancers
        {
            id: 'artisan_blessing',
            name: 'Artisan\'s Blessing',
            description: 'Improves crafting abilities temporarily',
            category: 'enhancement',
            rarity: 'rare',
            icon: '🛠️',
            materialRequirements: {
                categories: ['mineral', 'mystical', 'crystal'],
                minRarity: 'uncommon',
                quantity: 2
            },
            possibleEffects: [
                {
                    type: 'crafting_bonus',
                    description: 'Increased crafting success rate',
                    craftingBonus: {
                        type: 'success_rate',
                        value: 25,
                        duration: '2h'
                    }
                },
                {
                    type: 'crafting_bonus',
                    description: 'Better material efficiency',
                    craftingBonus: {
                        type: 'material_efficiency',
                        value: 20,
                        duration: '1h'
                    }
                }
            ],
            weight: 8
        },

        // Meditation/Mindfulness Items
        {
            id: 'zen_stone',
            name: 'Zen Stone',
            description: 'Promotes inner peace and mindfulness',
            category: 'artifact',
            rarity: 'uncommon',
            icon: '🪨',
            materialRequirements: {
                categories: ['mineral', 'essence', 'organic'],
                minRarity: 'common',
                quantity: 1
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: '5-minute mindfulness meditation',
                    realWorldActivity: 'Mindfulness meditation session',
                    activityDuration: 5
                },
                {
                    type: 'buff',
                    description: 'Stress reduction boost',
                    buffType: 'rewards',
                    multiplier: 1.2,
                    buffDuration: '30m'
                }
            ],
            weight: 12
        },

        // Study/Learning Items
        {
            id: 'scholars_tome',
            name: 'Scholar\'s Tome',
            description: 'Enhances learning and knowledge retention',
            category: 'artifact',
            rarity: 'rare',
            icon: '📚',
            materialRequirements: {
                categories: ['essence', 'mystical'],
                minRarity: 'uncommon',
                quantity: 2
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: '30-minute focused study session',
                    realWorldActivity: 'Concentrated study/learning session',
                    activityDuration: 30
                },
                {
                    type: 'buff',
                    description: 'Enhanced learning efficiency',
                    buffType: 'xp',
                    multiplier: 1.8,
                    buffDuration: '2h'
                }
            ],
            weight: 6
        },

        // Exercise/Health Items
        {
            id: 'athletes_charm',
            name: 'Athlete\'s Charm',
            description: 'Motivates physical activity and wellness',
            category: 'consumable',
            rarity: 'uncommon',
            icon: '💪',
            materialRequirements: {
                categories: ['organic', 'essence'],
                minRarity: 'common',
                quantity: 2
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: '15-minute workout or exercise',
                    realWorldActivity: 'Physical exercise session',
                    activityDuration: 15
                },
                {
                    type: 'currency',
                    description: 'Health and vitality bonus',
                    amount: 75
                }
            ],
            weight: 11
        },

        // High-tier items
        {
            id: 'productivity_crown',
            name: 'Crown of Productivity',
            description: 'The ultimate productivity enhancer',
            category: 'equipment',
            rarity: 'legendary',
            icon: '👑',
            materialRequirements: {
                categories: ['mystical', 'crystal'],
                minRarity: 'epic',
                quantity: 1
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: '2-hour deep work session',
                    realWorldActivity: 'Extended productive work session',
                    activityDuration: 120
                },
                {
                    type: 'buff',
                    description: 'Master productivity boost',
                    buffType: 'xp',
                    multiplier: 2.0,
                    buffDuration: '4h'
                }
            ],
            weight: 2,
            unlockLevel: 10
        },

        // Creative/Inspiration Items
        {
            id: 'muse_pendant',
            name: 'Muse\'s Pendant',
            description: 'Sparks creativity and inspiration',
            category: 'artifact',
            rarity: 'rare',
            icon: '🎨',
            materialRequirements: {
                categories: ['essence', 'mystical', 'crystal'],
                minRarity: 'rare',
                quantity: 1
            },
            possibleEffects: [
                {
                    type: 'real_world_activity',
                    description: '45-minute creative session',
                    realWorldActivity: 'Creative work - art, writing, music, etc.',
                    activityDuration: 45
                },
                {
                    type: 'buff',
                    description: 'Creative inspiration boost',
                    buffType: 'rewards',
                    multiplier: 1.6,
                    buffDuration: '90m'
                }
            ],
            weight: 5,
            unlockLevel: 5
        }
    ];

    // Check if player has required materials for generation
    static async canGenerateRandomItem(app: App, template: RandomItemTemplate): Promise<{ canGenerate: boolean; availableMaterials: InventoryItem[] }> {
        const inventory = await readInventory(app.vault);

        const availableMaterials = inventory.filter(item => {
            // Check if item is a crafting material and in required categories
            if (!MaterialUtils.isCraftingMaterial(item)) return false;

            // Check if item category matches requirements
            const itemCategory = item.category || '';
            if (!template.materialRequirements.categories.includes(itemCategory)) return false;

            // Check rarity requirement
            const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
            const itemRarity = rarityOrder[item.rarity as keyof typeof rarityOrder] || 0;
            const minRarity = rarityOrder[template.materialRequirements.minRarity];

            return itemRarity >= minRarity && (item.quantity || 1) > 0;
        });

        const canGenerate = availableMaterials.length >= template.materialRequirements.quantity;
        return { canGenerate, availableMaterials };
    }

    // Generate a random item from available materials
    static async generateRandomItem(app: App, playerLevel: number = 1): Promise<GeneratedRandomItem | null> {
        try {
            // Get available templates based on player level
            const availableTemplates = this.RANDOM_ITEM_TEMPLATES.filter(template =>
                !template.unlockLevel || playerLevel >= template.unlockLevel
            );

            // Check which templates can be crafted
            const craftableTemplates = [];
            for (const template of availableTemplates) {
                const { canGenerate } = await this.canGenerateRandomItem(app, template);
                if (canGenerate) {
                    craftableTemplates.push(template);
                }
            }

            if (craftableTemplates.length === 0) {
                pixelNotice('❌ No materials available for random item generation', 3000);
                return null;
            }

            // Select template based on weights
            const totalWeight = craftableTemplates.reduce((sum, template) => sum + template.weight, 0);
            let random = Math.random() * totalWeight;

            let selectedTemplate: RandomItemTemplate | null = null;
            for (const template of craftableTemplates) {
                random -= template.weight;
                if (random <= 0) {
                    selectedTemplate = template;
                    break;
                }
            }

            if (!selectedTemplate) return null;

            // Get available materials for this template
            const { availableMaterials } = await this.canGenerateRandomItem(app, selectedTemplate);

            // Randomly select materials to consume
            const materialsToUse = this.selectRandomMaterials(availableMaterials, selectedTemplate.materialRequirements.quantity);

            // Consume materials from inventory
            await this.consumeMaterials(app, materialsToUse);

            // Select random effect
            const randomEffect = selectedTemplate.possibleEffects[Math.floor(Math.random() * selectedTemplate.possibleEffects.length)];

            // Generate the item
            const generatedItem: GeneratedRandomItem = {
                id: `${selectedTemplate.id}_${Date.now()}`,
                templateId: selectedTemplate.id,
                name: selectedTemplate.name,
                description: `${selectedTemplate.description}\n\nEffect: ${randomEffect.description}`,
                category: selectedTemplate.category,
                rarity: selectedTemplate.rarity,
                icon: selectedTemplate.icon,
                effect: randomEffect,
                createdAt: new Date().toISOString(),
                materialsUsed: materialsToUse.map(m => ({ name: m.name, quantity: 1 }))
            };

            // Add to inventory as a usable item
            await this.addGeneratedItemToInventory(app, generatedItem);

            pixelNotice(`✨ Generated: ${generatedItem.name}! ${randomEffect.description}`, 5000);
            return generatedItem;

        } catch (error) {
            console.error('Error generating random item:', error);
            pixelNotice('❌ Failed to generate random item', 3000);
            return null;
        }
    }

    private static selectRandomMaterials(materials: InventoryItem[], count: number): InventoryItem[] {
        const shuffled = [...materials].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, materials.length));
    }

    private static async consumeMaterials(app: App, materials: InventoryItem[]): Promise<void> {
        for (const material of materials) {
            await dropItem(app, material.name);
        }
    }

    private static async addGeneratedItemToInventory(app: App, item: GeneratedRandomItem): Promise<void> {
        const effects: string[] = [];

        // Convert effect to inventory effect format
        switch (item.effect.type) {
            case 'real_world_activity':
                effects.push(`artifact:${item.effect.realWorldActivity}:${item.effect.activityDuration}:productivity`);
                break;
            case 'buff':
                effects.push(`buff:${item.effect.buffType};mult=${item.effect.multiplier};dur=${item.effect.buffDuration}`);
                break;
            case 'currency':
                effects.push(`coins:+${item.effect.amount}`);
                break;
            case 'xp':
                effects.push(`xp:+${item.effect.amount}`);
                break;
            case 'crafting_bonus':
                // Store as a special buff that crafting system can recognize
                effects.push(`buff:crafting;mult=${1 + (item.effect.craftingBonus!.value / 100)};dur=${item.effect.craftingBonus!.duration};source=${item.name}`);
                break;
        }

        const shopLikeItem: ShopItem = {
            name: item.name,
            price: this.calculateItemValue(item),
            tags: [item.category, item.rarity, 'generated'],
            rarity: item.rarity,
            category: item.category,
            description: item.description,
            icon: item.icon,
            rawEffectLines: effects
        };

        await addOrIncrementInventoryItem(app, shopLikeItem, 1);
    }

    private static calculateItemValue(item: GeneratedRandomItem): number {
        const baseValues = { common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 250 };
        return baseValues[item.rarity as keyof typeof baseValues] || 10;
    }

    // Get all available templates for UI display
    static getAvailableTemplates(playerLevel: number = 1): RandomItemTemplate[] {
        return this.RANDOM_ITEM_TEMPLATES.filter(template =>
            !template.unlockLevel || playerLevel >= template.unlockLevel
        );
    }

    // Get craftable templates for current materials
    static async getCraftableTemplates(app: App, playerLevel: number = 1): Promise<RandomItemTemplate[]> {
        const availableTemplates = this.getAvailableTemplates(playerLevel);
        const craftableTemplates = [];

        for (const template of availableTemplates) {
            const { canGenerate } = await this.canGenerateRandomItem(app, template);
            if (canGenerate) {
                craftableTemplates.push(template);
            }
        }

        return craftableTemplates;
    }
}
