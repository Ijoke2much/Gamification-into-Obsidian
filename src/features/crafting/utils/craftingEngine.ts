import { pixelNotice } from '../../../shared/utils/noticeUtils';
import {
    CraftingRecipe,
    CraftingSession,
    CraftingMaterial,
    RandomCraftingResult,
    CraftingSkill,
    GatheringLocation,
    RecipeFragment,
    CraftingStation,
    MaterialQuality
} from '../types/CraftingTypes';
import { PlayerData } from '../../../data/models/PlayerData';
import { readInventory, dropItem, addOrIncrementInventoryItem } from '../../inventory/utils/updateInventoryFile';
import type { ShopItem, ShopLikeItem } from '../../shop/utils/ShopParser';
import { App } from 'obsidian';
import { DEFAULT_CRAFTING_MATERIALS } from '../data/defaultMaterials';
import { DEFAULT_CRAFTING_RECIPES } from '../data/defaultRecipes';
import { getCraftingMaterials, findMaterialByIdOrName } from './craftingMaterialRegistry';
import { getCraftingRecipes, findRecipeById } from './craftingRecipeRegistry';

export class CraftingEngine {
    private static readonly STORAGE_KEY = 'crafting-sessions';
    private static readonly RECIPES_KEY = 'crafting-recipes';
    private static readonly MATERIALS_KEY = 'crafting-materials';
    private static readonly SKILLS_KEY = 'crafting-skills';
    private static readonly LOCATIONS_KEY = 'gathering-locations';
    private static readonly FRAGMENTS_KEY = 'recipe-fragments';
    private static readonly STATIONS_KEY = 'crafting-stations';
    private static readonly EVENTS_KEY = 'crafting-events';

    // Material quality definitions
    static getMaterialQualities(): MaterialQuality[] {
        return [
            { name: 'fresh', multiplier: 1.5, color: '#10b981', description: 'Freshly gathered materials', effects: ['+50% success rate', '+25% quality chance'] },
            { name: 'normal', multiplier: 1.0, color: '#ffffff', description: 'Standard quality materials', effects: ['Standard crafting'] },
            { name: 'dried', multiplier: 0.8, color: '#f59e0b', description: 'Dried or aged materials', effects: ['-20% success rate', 'Unique properties'] },
            { name: 'refined', multiplier: 1.3, color: '#3b82f6', description: 'Processed materials', effects: ['+30% success rate', '+15% quality chance'] },
            { name: 'masterwork', multiplier: 2.0, color: '#a855f7', description: 'Exceptional quality materials', effects: ['+100% success rate', '+50% quality chance', 'Critical success bonus'] }
        ];
    }

    // Add custom material to the crafting inventory
    static async addMaterialToInventory(app: App, material: CraftingMaterial, quantity: number = 1): Promise<void> {
        try {
            // Add the material as an inventory item that can be used in crafting
            await addOrIncrementInventoryItem(app, {
                name: material.name,
                category: 'material',
                rarity: material.rarity,
                description: material.description,
                icon: material.icon,
                price: 0, // Quest rewards are free
                tags: [material.category, material.rarity, 'crafting-material', material.quality],
            }, quantity);

            console.log('🔨 [Crafting Engine] Added material to inventory:', material.name, 'x' + quantity);

            // Show notification
            pixelNotice(`🔨 Crafting Material Acquired: ${material.icon} ${material.name} x${quantity}`, 3000);
        } catch (error) {
            console.error('🔨 [Crafting Engine] Error adding material to inventory:', error);
            throw error;
        }
    }

    // Default crafting materials with quality
    static getDefaultMaterials(): CraftingMaterial[] {
        return [...DEFAULT_CRAFTING_MATERIALS];
    }

    // Gathering locations
    static getGatheringLocations(): GatheringLocation[] {
        return [
            {
                id: 'forest',
                name: 'Mystical Forest',
                type: 'forest',
                description: 'A dense forest filled with herbs and wood',
                icon: '🌲',
                materials: [
                    { materialId: 'wood', chance: 80, quality: 'normal' },
                    { materialId: 'herb', chance: 60, quality: 'fresh' },
                    { materialId: 'essence', chance: 20, quality: 'fresh' }
                ],
                cooldown: 30
            },
            {
                id: 'mountain',
                name: 'Crystal Mountains',
                type: 'mountain',
                description: 'Rocky peaks rich in minerals and crystals',
                icon: '⛰️',
                materials: [
                    { materialId: 'stone', chance: 90, quality: 'normal' },
                    { materialId: 'iron', chance: 70, quality: 'normal' },
                    { materialId: 'silver', chance: 40, quality: 'refined' },
                    { materialId: 'gold', chance: 20, quality: 'refined' }
                ],
                cooldown: 45
            },
            {
                id: 'cave',
                name: 'Ancient Cave',
                type: 'cave',
                description: 'Dark caverns with rare minerals and gems',
                icon: '🕳️',
                materials: [
                    { materialId: 'iron', chance: 80, quality: 'normal' },
                    { materialId: 'crystal', chance: 50, quality: 'normal' },
                    { materialId: 'diamond', chance: 10, quality: 'masterwork' }
                ],
                requirements: { level: 5 },
                cooldown: 60
            },
            {
                id: 'garden',
                name: 'Enchanted Garden',
                type: 'garden',
                description: 'A magical garden with rare herbs and essences',
                icon: '🌸',
                materials: [
                    { materialId: 'herb', chance: 90, quality: 'fresh' },
                    { materialId: 'essence', chance: 60, quality: 'fresh' },
                    { materialId: 'phoenix', chance: 5, quality: 'fresh' }
                ],
                requirements: { level: 3 },
                cooldown: 20
            }
        ];
    }

    // Crafting stations
    static getCraftingStations(): CraftingStation[] {
        return [
            {
                id: 'basic_workbench',
                name: 'Basic Workbench',
                description: 'A simple wooden workbench for basic crafting',
                icon: '🔨',
                type: 'workbench',
                level: 1,
                bonuses: {
                    successRate: 0,
                    qualityChance: 0,
                    criticalChance: 0,
                    timeReduction: 0
                },
                requirements: {
                    materials: [],
                    skill: 0,
                    level: 1
                },
                unlocked: true
            },
            {
                id: 'forge',
                name: 'Blacksmith Forge',
                description: 'A hot forge for metalworking and weapon crafting',
                icon: '🔥',
                type: 'forge',
                level: 1,
                bonuses: {
                    successRate: 10,
                    qualityChance: 15,
                    criticalChance: 5,
                    timeReduction: 20
                },
                requirements: {
                    materials: [
                        { materialId: 'stone', quantity: 10 },
                        { materialId: 'iron', quantity: 5 }
                    ],
                    skill: 5,
                    level: 3
                },
                unlocked: false
            },
            {
                id: 'alchemy_lab',
                name: 'Alchemy Laboratory',
                description: 'A mystical lab for potion brewing and enchanting',
                icon: '🧪',
                type: 'alchemy_lab',
                level: 1,
                bonuses: {
                    successRate: 15,
                    qualityChance: 20,
                    criticalChance: 10,
                    timeReduction: 15
                },
                requirements: {
                    materials: [
                        { materialId: 'crystal', quantity: 3 },
                        { materialId: 'essence', quantity: 5 }
                    ],
                    skill: 8,
                    level: 5
                },
                unlocked: false
            }
        ];
    }

    // Recipe fragments for discovery
    static getRecipeFragments(): RecipeFragment[] {
        return [
            {
                id: 'sword_fragment_1',
                name: 'Sword Blueprint Fragment',
                description: 'Part 1 of an ancient sword crafting recipe',
                icon: '📜',
                recipeId: 'ancient_sword',
                fragmentNumber: 1,
                totalFragments: 3,
                location: 'forest',
                rarity: 'uncommon'
            },
            {
                id: 'sword_fragment_2',
                name: 'Sword Blueprint Fragment',
                description: 'Part 2 of an ancient sword crafting recipe',
                icon: '📜',
                recipeId: 'ancient_sword',
                fragmentNumber: 2,
                totalFragments: 3,
                location: 'mountain',
                rarity: 'uncommon'
            },
            {
                id: 'sword_fragment_3',
                name: 'Sword Blueprint Fragment',
                description: 'Part 3 of an ancient sword crafting recipe',
                icon: '📜',
                recipeId: 'ancient_sword',
                fragmentNumber: 3,
                totalFragments: 3,
                location: 'cave',
                rarity: 'uncommon'
            }
        ];
    }

    // Enhanced crafting recipes
    static getDefaultRecipes(): CraftingRecipe[] {
        return [...DEFAULT_CRAFTING_RECIPES];
    }

    // Get player's crafting skill
    static getPlayerCraftingSkill(playerData: PlayerData): CraftingSkill {
        try {
            const stored = localStorage.getItem(this.SKILLS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            // Fall through to default
        }

        // Default skill for new players
        return {
            level: 1,
            experience: 0,
            experienceToNext: 100,
            specialties: [],
            mastery: 0,
            unlockedRecipes: ['basic-sword', 'random-treasure']
        };
    }

    // Save player's crafting skill
    static savePlayerCraftingSkill(skill: CraftingSkill): void {
        localStorage.setItem(this.SKILLS_KEY, JSON.stringify(skill));
    }

    // Add experience to crafting skill
    static addCraftingExperience(playerData: PlayerData, xp: number): CraftingSkill {
        const skill = this.getPlayerCraftingSkill(playerData);
        skill.experience += xp;

        // Level up logic with safety check to prevent infinite loops
        let levelUps = 0;
        const maxLevelUps = 10; // Safety limit

        while (skill.experience >= skill.experienceToNext && levelUps < maxLevelUps) {
            skill.experience -= skill.experienceToNext;
            skill.level += 1;
            skill.experienceToNext = Math.floor(skill.experienceToNext * 1.5);
            skill.mastery = Math.min(100, skill.mastery + 5);
            levelUps++;
        }

        this.savePlayerCraftingSkill(skill);
        return skill;
    }

    // Get player's available materials (from actual inventory)
    static async getPlayerMaterialsFromInventory(
        app: App
    ): Promise<Array<CraftingMaterial & { quantity: number }>> {
        const allMaterials = getCraftingMaterials();
        const playerMaterials: Array<CraftingMaterial & { quantity: number }> = [];

        try {
            const inventory = await readInventory(app.vault);

            for (const inventoryItem of inventory) {
                const material = findMaterialByIdOrName(allMaterials, inventoryItem.name);

                if (material) {
                    playerMaterials.push({
                        ...material,
                        quantity: Math.max(1, inventoryItem.quantity || 1),
                    });
                }
            }
        } catch (error) {
            console.error('Error reading inventory:', error);
        }

        return playerMaterials;
    }

    // Keep the old function for backward compatibility
    static getPlayerMaterials(playerData: PlayerData): CraftingMaterial[] {
        const allMaterials = getCraftingMaterials();
        const playerMaterials: CraftingMaterial[] = [];

        // For now, give players some basic materials to start with
        // In a real implementation, this would come from their inventory
        const starterMaterials = ['wood', 'stone', 'herb', 'iron'];
        starterMaterials.forEach(materialId => {
            const material = allMaterials.find(m => m.id === materialId);
            if (material) {
                playerMaterials.push(material);
            }
        });

        return playerMaterials;
    }

    // Consume materials from inventory when crafting
    static async consumeMaterialsForCrafting(app: App, recipe: CraftingRecipe): Promise<boolean> {
        try {
            const inventory = await readInventory(app.vault);

            const allMaterials = getCraftingMaterials();

            // Check if we have enough of each required material
            for (const requirement of recipe.materials) {
                if (requirement.required) {
                    const def = findMaterialByIdOrName(allMaterials, requirement.materialId);
                    const lookupName = def?.name ?? requirement.materialId;
                    const inventoryItem = inventory.find(
                        (item) => item.name.toLowerCase() === lookupName.toLowerCase()
                    );

                    if (!inventoryItem || (inventoryItem.quantity || 1) < requirement.quantity) {
                        console.log(`Not enough ${requirement.materialId} for crafting`);
                        return false;
                    }
                }
            }

            // Consume the materials (quantity-aware)
            for (const requirement of recipe.materials) {
                if (requirement.required) {
                    const def = findMaterialByIdOrName(allMaterials, requirement.materialId);
                    const lookupName = def?.name ?? requirement.materialId;
                    for (let i = 0; i < requirement.quantity; i++) {
                        await dropItem(app, lookupName);
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error consuming materials:', error);
            return false;
        }
    }

    // Add crafted item to inventory (effects must be machine-readable inventory lines)
    static async addCraftedItemToInventory(app: App, craftedItem: RandomCraftingResult): Promise<void> {
        try {
            const effectLines = (craftedItem.effects || [])
                .map((e) => String(e).trim())
                .filter(Boolean);

            const inventoryItem: ShopLikeItem & { rawEffectLines?: string[] } = {
                name: craftedItem.name,
                price: this.calculateItemValue(craftedItem),
                tags: [craftedItem.category, craftedItem.rarity],
                rarity: craftedItem.rarity,
                category: craftedItem.category,
                description: craftedItem.description,
                icon: craftedItem.icon,
                effects: effectLines,
                rawEffectLines: effectLines,
            };

            await addOrIncrementInventoryItem(app, inventoryItem, 1);
        } catch (error) {
            console.error('Error adding crafted item to inventory:', error);
        }
    }

    // Calculate item value based on quality and rarity
    private static calculateItemValue(item: RandomCraftingResult): number {
        const baseValue = 10; // Base value for crafted items

        // Quality multiplier
        const qualityMultiplier = {
            'basic': 1.0,
            'fine': 1.5,
            'superior': 2.0,
            'masterwork': 3.0,
            'legendary': 5.0
        }[item.quality || 'basic'] || 1.0;

        // Rarity multiplier
        const rarityMultiplier = {
            'common': 1.0,
            'uncommon': 2.0,
            'rare': 5.0,
            'epic': 10.0,
            'legendary': 25.0
        }[item.rarity || 'common'] || 1.0;

        return Math.floor(baseValue * qualityMultiplier * rarityMultiplier);
    }

    // Materials-only gate (no crafting skill / level tree)
    static canCraftRecipe(
        recipe: CraftingRecipe,
        playerMaterials: Array<CraftingMaterial & { quantity?: number }>,
        _playerData?: PlayerData
    ): { canCraft: boolean; missingMaterials: string[]; missingRequirements: string[] } {
        const missingMaterials: string[] = [];
        const missingRequirements: string[] = [];

        for (const requirement of recipe.materials) {
            if (!requirement.required) continue;
            const owned = playerMaterials.find((m) => m.id === requirement.materialId);
            const qty = owned?.quantity ?? (owned ? 1 : 0);
            if (!owned || qty < requirement.quantity) {
                const short = requirement.quantity - qty;
                missingMaterials.push(
                    short > 0
                        ? `${requirement.materialId}×${short}`
                        : requirement.materialId
                );
            }
        }

        return {
            canCraft: missingMaterials.length === 0,
            missingMaterials,
            missingRequirements
        };
    }

    // Gather materials from a location (for backward compatibility)
    static gatherMaterials(locationId: string, playerData: PlayerData): { materials: CraftingMaterial[], boogers: number } {
        const locations = this.getGatheringLocations();
        const location = locations.find(l => l.id === locationId);

        if (!location) {
            return { materials: [], boogers: 0 };
        }

        // Check cooldown
        const now = Date.now();
        if (location.lastGathered && (now - location.lastGathered) < (location.cooldown * 60 * 1000)) {
            return { materials: [], boogers: 0 };
        }

        // Update last gathered time
        location.lastGathered = now;
        this.saveGatheringLocations(locations);

        // Generate materials based on chances
        const gatheredMaterials: CraftingMaterial[] = [];
        const allMaterials = getCraftingMaterials();

        location.materials.forEach(materialChance => {
            if (Math.random() * 100 < materialChance.chance) {
                const material = allMaterials.find(m => m.id === materialChance.materialId);
                if (material) {
                    gatheredMaterials.push({
                        ...material,
                        quality: materialChance.quality as 'fresh' | 'normal' | 'dried' | 'refined' | 'masterwork'
                    });
                }
            }
        });

        // Award XP and CP
        const boogers = gatheredMaterials.length * 2;

        return { materials: gatheredMaterials, boogers };
    }

    // Gather materials from a location and add to inventory
    static async gatherMaterialsToInventory(app: App, locationId: string, playerData: PlayerData): Promise<{ materials: CraftingMaterial[], boogers: number }> {
        const locations = this.getGatheringLocations();
        const location = locations.find(l => l.id === locationId);

        if (!location) {
            return { materials: [], boogers: 0 };
        }

        // Check cooldown
        const now = Date.now();
        if (location.lastGathered && (now - location.lastGathered) < (location.cooldown * 60 * 1000)) {
            return { materials: [], boogers: 0 };
        }

        // Update last gathered time
        location.lastGathered = now;
        this.saveGatheringLocations(locations);

        // Generate materials based on chances
        const gatheredMaterials: CraftingMaterial[] = [];
        const allMaterials = getCraftingMaterials();

        location.materials.forEach(materialChance => {
            if (Math.random() * 100 < materialChance.chance) {
                const material = allMaterials.find(m => m.id === materialChance.materialId);
                if (material) {
                    gatheredMaterials.push({
                        ...material,
                        quality: materialChance.quality as 'fresh' | 'normal' | 'dried' | 'refined' | 'masterwork'
                    });
                }
            }
        });

        // Add gathered materials to inventory
        for (const material of gatheredMaterials) {
            try {
                const inventoryItem: ShopItem = {
                    name: material.name,
                    price: material.baseValue,
                    tags: [material.category, material.rarity],
                    rarity: material.rarity,
                    category: material.category,
                    description: material.description,
                    icon: material.icon
                };

                await addOrIncrementInventoryItem(app, inventoryItem, 1);
            } catch (error) {
                console.error('Error adding gathered material to inventory:', error);
            }
        }

        // Award XP and CP
        const boogers = gatheredMaterials.length * 2;

        return { materials: gatheredMaterials, boogers };
    }

    // Craft an item from a recipe with enhanced mechanics
    static async craftItemWithInventory(app: App, recipe: CraftingRecipe, playerData: PlayerData): Promise<RandomCraftingResult | null> {
        try {
            // Get materials from actual inventory
            const playerMaterials = await this.getPlayerMaterialsFromInventory(app);

            // Check if player can craft
            const { canCraft, missingMaterials } = this.canCraftRecipe(recipe, playerMaterials, playerData);
            if (!canCraft) {
                // Show failure notification for missing materials
                pixelNotice(`❌ Crafting Failed: Missing materials: ${missingMaterials.join(', ')}`, 3000);
                return null;
            }

            // Consume materials from inventory
            const materialsConsumed = await this.consumeMaterialsForCrafting(app, recipe);
            if (!materialsConsumed) {
                pixelNotice(`❌ Crafting Failed: Unable to consume materials from inventory`, 3000);
                return null;
            }

            // Calculate success chance based on materials and skill
            const skill = this.getPlayerCraftingSkill(playerData);
            const materialQuality = this.calculateMaterialQuality(recipe, playerMaterials);
            const successChance = Math.min(95, 70 + skill.level * 2 + materialQuality.bonus);

            // Check if crafting succeeds
            const craftingRoll = Math.random() * 100;
            if (craftingRoll > successChance) {
                // Crafting failed - show failure notification
                pixelNotice(`❌ Crafting Failed: ${recipe.name} (${Math.round(successChance)}% chance)`, 3000);

                // Award some XP even on failure
                const failureXP = Math.floor(recipe.xpReward * 0.25);
                if (failureXP > 0) {
                    this.awardCraftingExperience(playerData, failureXP);
                    pixelNotice(`🛠️ Crafting Skill Gained: +${failureXP} XP!`, 2000);
                }

                return null;
            }

            // Determine item quality
            const quality = this.determineItemQuality(recipe, playerMaterials, skill);

            // Check for critical success
            const criticalSuccess = Math.random() * 100 < (skill.mastery / 10 + materialQuality.criticalBonus);

            // If guaranteed item, return it
            if (recipe.guaranteedItem) {
                const result = {
                    ...recipe.guaranteedItem,
                    quality,
                    criticalSuccess,
                    materialBonus: this.getMaterialBonus(recipe, playerMaterials)
                };

                // Add to inventory
                await this.addCraftedItemToInventory(app, result);

                // Award crafting experience
                const xpGained = Math.floor(recipe.xpReward * (criticalSuccess ? 1.5 : 1.0));
                this.awardCraftingExperience(playerData, xpGained);

                // Show success notification
                const criticalText = result.criticalSuccess ? ' ✨CRITICAL SUCCESS!✨' : '';
                pixelNotice(`✅ Crafted ${result.icon} ${result.name}${criticalText}! +${xpGained} XP`, 4000);

                // Trigger achievement events
                try {
                    const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');

                    // Crafting milestone achievement
                    await achievementEventService.processGameEvent({
                        type: 'crafting_milestone',
                        data: {
                            rarity: result.rarity || 'common',
                            efficiency: criticalSuccess ? 100 : Math.floor(successChance),
                            itemName: result.name,
                            quality: result.quality
                        },
                        timestamp: new Date()
                    });
                } catch (error) {
                    console.warn('Failed to process crafting achievement events:', error);
                }

                return result;
            }

            // If random results, pick one based on weights
            if (recipe.possibleResults && recipe.possibleResults.length > 0) {
                const totalWeight = recipe.possibleResults.reduce((sum, result) => sum + result.weight, 0);
                let random = Math.random() * totalWeight;

                for (const result of recipe.possibleResults) {
                    random -= result.weight;
                    if (random <= 0) {
                        const craftedResult = {
                            ...result,
                            quality: criticalSuccess ? 'masterwork' : quality,
                            criticalSuccess,
                            materialBonus: this.getMaterialBonus(recipe, playerMaterials)
                        };

                        // Add to inventory
                        await this.addCraftedItemToInventory(app, craftedResult);

                        // Award crafting experience
                        const xpGained = Math.floor(recipe.xpReward * (criticalSuccess ? 1.5 : 1.0));
                        this.awardCraftingExperience(playerData, xpGained);

                        // Show success notification
                        const criticalText = craftedResult.criticalSuccess ? ' ✨CRITICAL SUCCESS!✨' : '';
                        pixelNotice(`✅ Crafted ${craftedResult.icon} ${craftedResult.name}${criticalText}! +${xpGained} XP`, 4000);

                        // Trigger achievement events
                        try {
                            const { achievementEventService } = await import('../../../features/achievements/services/achievementEventService');

                            // Crafting milestone achievement
                            await achievementEventService.processGameEvent({
                                type: 'crafting_milestone',
                                data: {
                                    rarity: craftedResult.rarity || 'common',
                                    efficiency: criticalSuccess ? 100 : Math.floor(successChance),
                                    itemName: craftedResult.name,
                                    quality: craftedResult.quality
                                },
                                timestamp: new Date()
                            });
                        } catch (error) {
                            console.warn('Failed to process crafting achievement events:', error);
                        }

                        return craftedResult;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error during crafting with inventory:', error);
            return null;
        }
    }

    // Calculate material quality bonus
    private static calculateMaterialQuality(recipe: CraftingRecipe, playerMaterials: CraftingMaterial[]): { bonus: number; criticalBonus: number } {
        let totalBonus = 0;
        let criticalBonus = 0;

        recipe.materials.forEach(requirement => {
            const material = playerMaterials.find(m => m.id === requirement.materialId);
            if (material) {
                totalBonus += (material.qualityMultiplier - 1) * 10;
                if (material.quality === 'masterwork') {
                    criticalBonus += 5;
                }
            }
        });

        return { bonus: totalBonus, criticalBonus };
    }

    // Determine item quality based on materials and skill
    private static determineItemQuality(recipe: CraftingRecipe, playerMaterials: CraftingMaterial[], skill: CraftingSkill): 'basic' | 'fine' | 'superior' | 'masterwork' | 'legendary' {
        const materialQuality = this.calculateMaterialQuality(recipe, playerMaterials);
        const qualityRoll = Math.random() * 100 + materialQuality.bonus + skill.mastery;

        if (qualityRoll > 95) return 'legendary';
        if (qualityRoll > 85) return 'masterwork';
        if (qualityRoll > 70) return 'superior';
        if (qualityRoll > 50) return 'fine';
        return 'basic';
    }

    // Get material bonus effect
    private static getMaterialBonus(recipe: CraftingRecipe, playerMaterials: CraftingMaterial[]): string | undefined {
        const rareMaterials = playerMaterials.filter(m => m.rarity === 'rare' || m.rarity === 'epic' || m.rarity === 'legendary');

        if (rareMaterials.length > 0) {
            const bonusMaterial = rareMaterials[0];
            return `Enhanced by ${bonusMaterial.name} (+1 to all effects)`;
        }

        return undefined;
    }

    // Start a crafting session
    static startCrafting(recipeId: string, playerData: PlayerData): CraftingSession {
        const recipe = findRecipeById(recipeId);

        const session: CraftingSession = {
            id: `session_${Date.now()}`,
            recipeId,
            startTime: Date.now(),
            status: 'active',
            materialsUsed: [],
            quality: 'basic',
            skillGained: recipe ? recipe.skillXp : 0
        };

        this.saveCraftingSession(session);
        return session;
    }

    // Complete a crafting session
    static completeCrafting(sessionId: string, result: RandomCraftingResult): void {
        const sessions = this.getCraftingSessions();
        const session = sessions.find(s => s.id === sessionId);

        if (session) {
            session.status = 'completed';
            session.endTime = Date.now();
            session.result = result;
            session.quality = result.quality || 'basic';
            session.criticalSuccess = result.criticalSuccess;
            this.saveCraftingSessions(sessions);
        }
    }

    // Get all crafting sessions
    static getCraftingSessions(): CraftingSession[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    // Save crafting session
    private static saveCraftingSession(session: CraftingSession): void {
        const sessions = this.getCraftingSessions();
        sessions.push(session);
        this.saveCraftingSessions(sessions);
    }

    // Save all crafting sessions
    private static saveCraftingSessions(sessions: CraftingSession[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    }

    // Get recipes (vault + built-in merge when cache loaded)
    static getRecipes(): CraftingRecipe[] {
        return getCraftingRecipes();
    }

    // Save recipes
    static saveRecipes(recipes: CraftingRecipe[]): void {
        localStorage.setItem(this.RECIPES_KEY, JSON.stringify(recipes));
    }

    // Save gathering locations
    private static saveGatheringLocations(locations: GatheringLocation[]): void {
        localStorage.setItem(this.LOCATIONS_KEY, JSON.stringify(locations));
    }

    // Helper function to award crafting experience
    private static awardCraftingExperience(playerData: PlayerData, xp: number): void {
        // This would typically update the player's crafting skill
        // For now, we'll just console log it
        console.log(`Awarded ${xp} crafting XP to player`);

        // In a real implementation, you would update the player data:
        // playerData.craftingSkill = (playerData.craftingSkill || 0) + xp;
    }

}

