import { App, Notice } from 'obsidian';
import { addOrIncrementInventoryItem } from '../../features/inventory/utils/updateInventoryFile';
import { ShopItem } from '../../features/shop/utils/ShopParser';
import { MaterialRewardService } from './materialRewardService';
import { CraftingEngine } from '../../features/crafting/utils/craftingEngine';

export interface MaterialReward {
    name: string;
    icon: string;
    quality: string;
    rarity: string;
    category: string;
    baseValue: number;
    description?: string;
}

export class MaterialInventoryManager {
    // Add materials to inventory from quest completion
    static async addQuestMaterials(app: App, difficulty: string): Promise<{ materials: MaterialReward[], quality: string }> {
        try {
            const reward = MaterialRewardService.getQuestMaterials(difficulty);
            const materials: MaterialReward[] = [];

            // Select random materials from the available pool
            for (let i = 0; i < reward.quantity; i++) {
                const { materialId, quality } = MaterialRewardService.getRandomMaterial(reward.materials, reward.quality);

                // Get material details and add to inventory
                const materialDetails = this.getMaterialDetails(materialId, quality);

                if (materialDetails) {
                    const inventoryItem: ShopItem = {
                        name: materialDetails.name,
                        price: materialDetails.baseValue,
                        tags: [materialDetails.category, materialDetails.rarity],
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        description: materialDetails.description,
                        icon: materialDetails.icon
                    };

                    await addOrIncrementInventoryItem(app, inventoryItem, 1);

                    // Add to materials array for notification
                    materials.push({
                        name: materialDetails.name,
                        icon: materialDetails.icon,
                        quality: materialDetails.quality,
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        baseValue: materialDetails.baseValue
                    });
                }
            }

            return { materials, quality: reward.quality };
        } catch (error) {
            console.error('Error adding quest materials to inventory:', error);
            return { materials: [], quality: 'normal' };
        }
    }

    // Add materials to inventory from habit tree milestone
    static async addHabitTreeMaterials(app: App, treeStage: number): Promise<{ materials: MaterialReward[], quality: string }> {
        try {
            const reward = MaterialRewardService.getHabitTreeMaterials(treeStage);
            const materials: MaterialReward[] = [];

            // Select random materials from the available pool
            for (let i = 0; i < reward.quantity; i++) {
                const { materialId, quality } = MaterialRewardService.getRandomMaterial(reward.materials, reward.quality);

                // Get material details and add to inventory
                const materialDetails = this.getMaterialDetails(materialId, quality);
                if (materialDetails) {
                    const inventoryItem: ShopItem = {
                        name: materialDetails.name,
                        price: materialDetails.baseValue,
                        tags: [materialDetails.category, materialDetails.rarity],
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        description: materialDetails.description,
                        icon: materialDetails.icon
                    };

                    await addOrIncrementInventoryItem(app, inventoryItem, 1);

                    // Add to materials array for notification
                    materials.push({
                        name: materialDetails.name,
                        icon: materialDetails.icon,
                        quality: materialDetails.quality,
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        baseValue: materialDetails.baseValue
                    });
                }
            }

            return { materials, quality: reward.quality };
        } catch (error) {
            console.error('Error adding habit tree materials to inventory:', error);
            return { materials: [], quality: 'normal' };
        }
    }

    // Add materials to inventory from pomodoro session
    static async addPomodoroMaterials(app: App, sessionType: string, duration: number): Promise<{ materials: MaterialReward[], quality: string }> {
        try {
            const reward = MaterialRewardService.getPomodoroMaterials(sessionType, duration);
            const materials: MaterialReward[] = [];

            // Select random materials from the available pool
            for (let i = 0; i < reward.quantity; i++) {
                const { materialId, quality } = MaterialRewardService.getRandomMaterial(reward.materials, reward.quality);

                // Get material details and add to inventory
                const materialDetails = this.getMaterialDetails(materialId, quality);
                if (materialDetails) {
                    const inventoryItem: ShopItem = {
                        name: materialDetails.name,
                        price: materialDetails.baseValue,
                        tags: [materialDetails.category, materialDetails.rarity],
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        description: materialDetails.description,
                        icon: materialDetails.icon
                    };

                    await addOrIncrementInventoryItem(app, inventoryItem, 1);

                    // Add to materials array for notification
                    materials.push({
                        name: materialDetails.name,
                        icon: materialDetails.icon,
                        quality: materialDetails.quality,
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        baseValue: materialDetails.baseValue
                    });
                }
            }

            return { materials, quality: reward.quality };
        } catch (error) {
            console.error('Error adding pomodoro materials to inventory:', error);
            return { materials: [], quality: 'normal' };
        }
    }

    // Add materials to inventory from boss battles
    static async addBossMaterials(app: App, bossType: string, difficulty: string): Promise<{ materials: MaterialReward[], quality: string }> {
        try {
            const reward = MaterialRewardService.getBossMaterials(bossType, difficulty);
            const materials: MaterialReward[] = [];

            // Bosses always give at least one guaranteed boss-specific material
            const bossMaterial = this.getBossSpecificMaterial(bossType, difficulty);
            if (bossMaterial) {
                const inventoryItem: ShopItem = {
                    name: bossMaterial.name,
                    price: bossMaterial.baseValue,
                    tags: [bossMaterial.category, bossMaterial.rarity, 'boss_material'],
                    rarity: bossMaterial.rarity,
                    category: bossMaterial.category,
                    description: bossMaterial.description,
                    icon: bossMaterial.icon
                };

                await addOrIncrementInventoryItem(app, inventoryItem, 1);
                materials.push(bossMaterial);
            }

            // Add random materials based on boss type
            for (let i = 0; i < reward.quantity; i++) {
                const { materialId, quality } = MaterialRewardService.getRandomMaterial(reward.materials, reward.quality);
                const materialDetails = this.getMaterialDetails(materialId, quality);

                if (materialDetails) {
                    const inventoryItem: ShopItem = {
                        name: materialDetails.name,
                        price: materialDetails.baseValue,
                        tags: [materialDetails.category, materialDetails.rarity],
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        description: materialDetails.description,
                        icon: materialDetails.icon
                    };

                    await addOrIncrementInventoryItem(app, inventoryItem, 1);
                    materials.push({
                        name: materialDetails.name,
                        icon: materialDetails.icon,
                        quality: materialDetails.quality,
                        rarity: materialDetails.rarity,
                        category: materialDetails.category,
                        baseValue: materialDetails.baseValue
                    });
                }
            }

            return { materials, quality: reward.quality };
        } catch (error) {
            console.error('Error adding boss materials to inventory:', error);
            return { materials: [], quality: 'normal' };
        }
    }

    // Get boss-specific unique materials
    private static getBossSpecificMaterial(bossType: string, difficulty: string): MaterialReward | null {
        const bossMaterials = {
            'procrastination-beast': {
                name: 'Procrastination Essence',
                icon: '🌀',
                quality: 'rare',
                rarity: 'rare',
                category: 'essence',
                baseValue: 50,
                description: 'Crystallized essence of defeated procrastination'
            },
            'distraction-demon': {
                name: 'Focus Crystal',
                icon: '💎',
                quality: 'rare',
                rarity: 'rare',
                category: 'crystal',
                baseValue: 75,
                description: 'A pure crystal that enhances mental focus'
            },
            'perfectionism-dragon': {
                name: 'Dragon Scale of Progress',
                icon: '🐲',
                quality: 'epic',
                rarity: 'epic',
                category: 'mystical',
                baseValue: 150,
                description: 'A scale that teaches the value of progress over perfection'
            },
            'burnout-hydra': {
                name: 'Renewal Ember',
                icon: '🔥',
                quality: 'epic',
                rarity: 'epic',
                category: 'essence',
                baseValue: 100,
                description: 'An ember that restores energy and prevents burnout'
            },
            'chaos-lord': {
                name: 'Order Fragment',
                icon: '⚡',
                quality: 'legendary',
                rarity: 'legendary',
                category: 'mystical',
                baseValue: 300,
                description: 'A fragment of pure order torn from chaos itself'
            }
        };

        const material = bossMaterials[bossType as keyof typeof bossMaterials];
        if (!material) return null;

        // Enhance rarity based on difficulty
        const difficultyBonus = {
            'easy': 1,
            'medium': 1.2,
            'hard': 1.5,
            'nightmare': 2.0
        }[difficulty] || 1;

        return {
            ...material,
            baseValue: Math.floor(material.baseValue * difficultyBonus)
        };
    }

    // Show the custom material reward notification
    static showMaterialRewardNotification(materials: MaterialReward[], quality: string, source: string) {
        // For now, use a simple notice until we can properly integrate the React component
        const materialNames = materials.map(m => m.name).join(', ');
        new Notice(`🎉 Materials Earned from ${source}: ${materialNames} (${quality} quality)`, 5000);
    }

    // Get material details by ID and quality
    private static getMaterialDetails(materialId: string, quality: string): any {
        const allMaterials = CraftingEngine.getDefaultMaterials();
        const material = allMaterials.find((m: any) => m.id === materialId);

        if (material) {
            return {
                ...material,
                quality: quality
            };
        }

        return null;
    }

    // Get a formatted message for material rewards (fallback)
    static getMaterialRewardMessage(materials: string[], quality: string, source: string): string {
        const materialList = materials.join(', ');
        return `🎉 Earned ${materials.length} material(s) from ${source}: ${materialList} (${quality} quality)`;
    }
}
