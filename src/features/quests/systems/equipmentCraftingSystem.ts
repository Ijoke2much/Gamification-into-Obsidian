import { Notice } from 'obsidian';
import { productivityEquipmentSystem, ProductivityEquipment, EquipmentRarity } from './productivityEquipmentSystem';
import { currencyDisplay } from '../../../shared/services/currencyDisplayService';

/**
 * Equipment Crafting System
 * Handles crafting of productivity equipment using materials and recipes
 * Provides progression-based crafting with skill requirements
 */
export class EquipmentCraftingSystem {
    private static instance: EquipmentCraftingSystem;
    private craftingRecipes: Map<string, CraftingRecipe> = new Map();
    private playerMaterials: Map<string, number> = new Map();
    private craftingLevel: number = 1;
    private craftingExperience: number = 0;
    private unlockedRecipes: Set<string> = new Set();
    private craftingBonuses: Map<string, CraftingBonus> = new Map();

    private constructor() {
        this.initializeCraftingRecipes();
        this.loadCraftingProgress();
        this.initializeCraftingBonuses();
    }

    static getInstance(): EquipmentCraftingSystem {
        if (!EquipmentCraftingSystem.instance) {
            EquipmentCraftingSystem.instance = new EquipmentCraftingSystem();
        }
        return EquipmentCraftingSystem.instance;
    }

    /**
     * Initialize all crafting recipes
     */
    private initializeCraftingRecipes(): void {
        // === BASIC PRODUCTIVITY TOOLS ===
        this.craftingRecipes.set('pomodoro-timer', {
            id: 'pomodoro-timer',
            name: 'Pomodoro Timer',
            description: 'A precision timer for focused work sessions',
            category: 'productivity-tools',
            rarity: 'common',
            materials: {
                'timer-component': 1,
                'focus-crystal': 1,
                'productivity-essence': 2
            },
            coins: 50,
            craftingLevel: 1,
            craftingTime: 30, // seconds
            experience: 25,
            successRate: 0.95,
            unlockConditions: {
                level: 1,
                prerequisiteRecipes: [],
                achievements: []
            }
        });

        this.craftingRecipes.set('noise-canceling-headphones', {
            id: 'noise-canceling-headphones',
            name: 'Noise-Canceling Headphones',
            description: 'Premium headphones that block all distractions',
            category: 'focus-equipment',
            rarity: 'uncommon',
            materials: {
                'headphone-driver': 2,
                'noise-canceling-chip': 1,
                'comfort-padding': 1,
                'focus-crystal': 3,
                'silence-essence': 1
            },
            coins: 150,
            craftingLevel: 3,
            craftingTime: 90,
            experience: 75,
            successRate: 0.85,
            unlockConditions: {
                level: 3,
                prerequisiteRecipes: ['pomodoro-timer'],
                achievements: ['focus_master']
            }
        });

        this.craftingRecipes.set('standing-desk', {
            id: 'standing-desk',
            name: 'Adjustable Standing Desk',
            description: 'Ergonomic workspace for sustained productivity',
            category: 'workspace-equipment',
            rarity: 'rare',
            materials: {
                'desk-frame': 1,
                'adjustment-mechanism': 1,
                'ergonomic-mat': 1,
                'endurance-crystal': 2,
                'stability-core': 1,
                'productivity-essence': 5
            },
            coins: 300,
            craftingLevel: 5,
            craftingTime: 180,
            experience: 150,
            successRate: 0.75,
            unlockConditions: {
                level: 5,
                prerequisiteRecipes: ['noise-canceling-headphones'],
                achievements: ['productivity_enthusiast']
            }
        });

        // === ADVANCED DIGITAL TOOLS ===
        this.craftingRecipes.set('project-management-app', {
            id: 'project-management-app',
            name: 'Project Management App',
            description: 'AI-powered tool for organizing complex projects',
            category: 'digital-tools',
            rarity: 'uncommon',
            materials: {
                'app-license': 1,
                'cloud-storage': 1,
                'organization-algorithm': 1,
                'productivity-essence': 3,
                'data-crystal': 2
            },
            coins: 100,
            craftingLevel: 2,
            craftingTime: 60,
            experience: 50,
            successRate: 0.90,
            unlockConditions: {
                level: 2,
                prerequisiteRecipes: [],
                achievements: []
            }
        });

        this.craftingRecipes.set('ai-writing-assistant', {
            id: 'ai-writing-assistant',
            name: 'AI Writing Assistant',
            description: 'Advanced AI tool for enhanced writing productivity',
            category: 'digital-tools',
            rarity: 'epic',
            materials: {
                'ai-core': 1,
                'language-model': 1,
                'creativity-crystal': 3,
                'intelligence-essence': 2,
                'neural-network': 1,
                'productivity-essence': 8
            },
            coins: 500,
            craftingLevel: 8,
            craftingTime: 300,
            experience: 300,
            successRate: 0.65,
            unlockConditions: {
                level: 8,
                prerequisiteRecipes: ['project-management-app', 'standing-desk'],
                achievements: ['writing_master', 'tech_innovator']
            }
        });

        // === CONSUMABLE PRODUCTIVITY BOOSTERS ===
        this.craftingRecipes.set('energy-drink', {
            id: 'energy-drink',
            name: 'Natural Energy Drink',
            description: 'Healthy energy boost for immediate productivity',
            category: 'consumables',
            rarity: 'common',
            materials: {
                'natural-caffeine': 1,
                'vitamin-b': 1,
                'energy-essence': 1
            },
            coins: 25,
            craftingLevel: 1,
            craftingTime: 15,
            experience: 10,
            successRate: 0.98,
            unlockConditions: {
                level: 1,
                prerequisiteRecipes: [],
                achievements: []
            }
        });

        this.craftingRecipes.set('focus-potion', {
            id: 'focus-potion',
            name: 'Deep Focus Elixir',
            description: 'Magical potion that enhances concentration',
            category: 'consumables',
            rarity: 'rare',
            materials: {
                'focus-crystal': 2,
                'meditation-herb': 1,
                'clarity-water': 1,
                'concentration-essence': 2,
                'mindfulness-powder': 1
            },
            coins: 75,
            craftingLevel: 4,
            craftingTime: 120,
            experience: 100,
            successRate: 0.80,
            unlockConditions: {
                level: 4,
                prerequisiteRecipes: ['energy-drink'],
                achievements: ['meditation_practitioner']
            }
        });

        // === LEGENDARY EQUIPMENT ===
        this.craftingRecipes.set('productivity-suite', {
            id: 'productivity-suite',
            name: 'Complete Productivity Suite',
            description: 'Ultimate productivity setup combining all tools',
            category: 'legendary-equipment',
            rarity: 'legendary',
            materials: {
                'pomodoro-timer': 1,
                'noise-canceling-headphones': 1,
                'project-management-app': 1,
                'standing-desk': 1,
                'productivity-crystal': 1,
                'mastery-essence': 3,
                'legendary-core': 1,
                'time-management-matrix': 1
            },
            coins: 1000,
            craftingLevel: 10,
            craftingTime: 600,
            experience: 500,
            successRate: 0.50,
            unlockConditions: {
                level: 10,
                prerequisiteRecipes: ['pomodoro-timer', 'noise-canceling-headphones', 'standing-desk', 'project-management-app'],
                achievements: ['productivity_master', 'legendary_crafter']
            }
        });

        // Unlock basic recipes
        this.unlockedRecipes.add('pomodoro-timer');
        this.unlockedRecipes.add('project-management-app');
        this.unlockedRecipes.add('energy-drink');
    }

    /**
     * Initialize crafting bonuses based on player achievements and level
     */
    private initializeCraftingBonuses(): void {
        this.craftingBonuses.set('efficiency_bonus', {
            id: 'efficiency_bonus',
            name: 'Crafting Efficiency',
            description: 'Reduces crafting time by 10%',
            type: 'time_reduction',
            value: 0.1,
            unlockLevel: 3,
            unlocked: this.craftingLevel >= 3
        });

        this.craftingBonuses.set('success_bonus', {
            id: 'success_bonus',
            name: 'Master Craftsman',
            description: 'Increases success rate by 15%',
            type: 'success_rate',
            value: 0.15,
            unlockLevel: 5,
            unlocked: this.craftingLevel >= 5
        });

        this.craftingBonuses.set('material_efficiency', {
            id: 'material_efficiency',
            name: 'Resource Conservation',
            description: '20% chance to refund 50% of materials',
            type: 'material_refund',
            value: 0.2,
            unlockLevel: 7,
            unlocked: this.craftingLevel >= 7
        });

        this.craftingBonuses.set('bulk_crafting', {
            id: 'bulk_crafting',
            name: 'Bulk Production',
            description: 'Can craft multiple items at once',
            type: 'bulk_crafting',
            value: 1,
            unlockLevel: 6,
            unlocked: this.craftingLevel >= 6
        });
    }

    /**
     * Attempt to craft an item
     */
    async craftItem(recipeId: string, quantity: number = 1): Promise<CraftingResult> {
        const recipe = this.craftingRecipes.get(recipeId);
        if (!recipe) {
            return {
                success: false,
                error: `Recipe "${recipeId}" not found`,
                itemsCrafted: 0,
                materialsUsed: {},
                experienceGained: 0,
                coinsSpent: 0
            };
        }

        // Check if recipe is unlocked
        if (!this.isRecipeUnlocked(recipeId)) {
            return {
                success: false,
                error: `Recipe "${recipe.name}" is not unlocked yet`,
                itemsCrafted: 0,
                materialsUsed: {},
                experienceGained: 0,
                coinsSpent: 0
            };
        }

        // Check bulk crafting capability
        if (quantity > 1 && !this.canBulkCraft()) {
            return {
                success: false,
                error: 'Bulk crafting not unlocked yet (requires level 6)',
                itemsCrafted: 0,
                materialsUsed: {},
                experienceGained: 0,
                coinsSpent: 0
            };
        }

        // Check if player has enough materials and coins
        const canCraft = this.canCraftItem(recipeId, quantity);
        if (!canCraft.canCraft) {
            return {
                success: false,
                error: `Missing requirements: ${canCraft.missingMaterials.join(', ')}`,
                itemsCrafted: 0,
                materialsUsed: {},
                experienceGained: 0,
                coinsSpent: 0
            };
        }

        let totalItemsCrafted = 0;
        let totalExperienceGained = 0;
        let totalCoinsSpent = 0;
        const totalMaterialsUsed: Record<string, number> = {};

        // Attempt to craft each item
        for (let i = 0; i < quantity; i++) {
            const success = this.calculateCraftingSuccess(recipe);

            if (success) {
                // Consume materials and coins
                const materialsUsed = this.consumeCraftingMaterials(recipe);
                const coinsSpent = recipe.coins;

                // Apply material refund bonus
                if (this.hasCraftingBonus('material_efficiency') && Math.random() < 0.2) {
                    // Refund 50% of materials
                    for (const [material, amount] of Object.entries(materialsUsed)) {
                        const refund = Math.floor(amount * 0.5);
                        this.playerMaterials.set(material, (this.playerMaterials.get(material) || 0) + refund);
                    }
                    new Notice(`🎁 Material efficiency! Refunded 50% of materials`, 3000);
                }

                // Add item to inventory
                productivityEquipmentSystem.addToInventory(recipeId, 1);

                totalItemsCrafted++;
                totalExperienceGained += recipe.experience;
                totalCoinsSpent += coinsSpent;

                // Track materials used
                for (const [material, amount] of Object.entries(materialsUsed)) {
                    totalMaterialsUsed[material] = (totalMaterialsUsed[material] || 0) + amount;
                }
            } else {
                // Crafting failed - still consume some materials (50%)
                const materialsUsed = this.consumeCraftingMaterials(recipe, 0.5);
                const coinsSpent = Math.floor(recipe.coins * 0.3); // Only lose 30% of coins on failure

                totalCoinsSpent += coinsSpent;

                for (const [material, amount] of Object.entries(materialsUsed)) {
                    totalMaterialsUsed[material] = (totalMaterialsUsed[material] || 0) + amount;
                }
            }
        }

        // Gain crafting experience
        this.gainCraftingExperience(totalExperienceGained);

        // Save progress
        this.saveCraftingProgress();

        const result: CraftingResult = {
            success: totalItemsCrafted > 0,
            error: totalItemsCrafted === 0 ? 'All crafting attempts failed' : undefined,
            itemsCrafted: totalItemsCrafted,
            materialsUsed: totalMaterialsUsed,
            experienceGained: totalExperienceGained,
            coinsSpent: totalCoinsSpent,
            craftingLevel: this.craftingLevel,
            totalAttempts: quantity,
            successRate: totalItemsCrafted / quantity
        };

        // Show result notification
        this.showCraftingNotification(recipe, result);

        return result;
    }

    /**
     * Calculate crafting success based on recipe and bonuses
     */
    private calculateCraftingSuccess(recipe: CraftingRecipe): boolean {
        let successRate = recipe.successRate;

        // Apply success rate bonus
        if (this.hasCraftingBonus('success_bonus')) {
            successRate = Math.min(0.95, successRate + 0.15); // Cap at 95%
        }

        // Level bonus (1% per level above minimum)
        const levelBonus = Math.max(0, (this.craftingLevel - recipe.craftingLevel) * 0.01);
        successRate = Math.min(0.95, successRate + levelBonus);

        return Math.random() < successRate;
    }

    /**
     * Consume materials for crafting
     */
    private consumeCraftingMaterials(recipe: CraftingRecipe, multiplier: number = 1): Record<string, number> {
        const materialsUsed: Record<string, number> = {};

        for (const [material, amount] of Object.entries(recipe.materials)) {
            const actualAmount = Math.ceil(amount * multiplier);
            const current = this.playerMaterials.get(material) || 0;
            this.playerMaterials.set(material, Math.max(0, current - actualAmount));
            materialsUsed[material] = actualAmount;
        }

        // Consume coins
        const currentCoins = this.getPlayerCoins();
        const coinsToSpend = Math.floor(recipe.coins * multiplier);
        this.setPlayerCoins(Math.max(0, currentCoins - coinsToSpend));

        return materialsUsed;
    }

    /**
     * Check if player can craft an item
     */
    canCraftItem(recipeId: string, quantity: number = 1): { canCraft: boolean; missingMaterials: string[] } {
        const recipe = this.craftingRecipes.get(recipeId);
        if (!recipe) {
            return { canCraft: false, missingMaterials: ['Recipe not found'] };
        }

        const missingMaterials: string[] = [];

        // Check materials
        for (const [material, required] of Object.entries(recipe.materials)) {
            const available = this.playerMaterials.get(material) || 0;
            const totalRequired = required * quantity;
            if (available < totalRequired) {
                missingMaterials.push(`${material} (need ${totalRequired}, have ${available})`);
            }
        }

        // Check coins
        const requiredCoins = recipe.coins * quantity;
        const availableCoins = this.getPlayerCoins();
        if (availableCoins < requiredCoins) {
            missingMaterials.push(`${currencyDisplay.getCurrencyName()} (need ${requiredCoins}, have ${availableCoins})`);
        }

        // Check crafting level
        if (this.craftingLevel < recipe.craftingLevel) {
            missingMaterials.push(`Crafting level ${recipe.craftingLevel} required (current: ${this.craftingLevel})`);
        }

        return {
            canCraft: missingMaterials.length === 0,
            missingMaterials
        };
    }

    /**
     * Check if a recipe is unlocked
     */
    isRecipeUnlocked(recipeId: string): boolean {
        const recipe = this.craftingRecipes.get(recipeId);
        if (!recipe) return false;

        // Check if explicitly unlocked
        if (this.unlockedRecipes.has(recipeId)) return true;

        // Check unlock conditions
        const conditions = recipe.unlockConditions;

        // Check level requirement
        if (this.craftingLevel < conditions.level) return false;

        // Check prerequisite recipes
        for (const prereq of conditions.prerequisiteRecipes) {
            if (!this.unlockedRecipes.has(prereq)) return false;
        }

        // Check achievements (simplified for now)
        // In a real implementation, this would check actual achievements

        return true;
    }

    /**
     * Unlock a recipe manually (e.g., through achievements)
     */
    unlockRecipe(recipeId: string): boolean {
        const recipe = this.craftingRecipes.get(recipeId);
        if (!recipe) return false;

        this.unlockedRecipes.add(recipeId);
        this.saveCraftingProgress();

        new Notice(`🔓 Recipe unlocked: ${recipe.name}`, 5000);
        return true;
    }

    /**
     * Gain crafting experience and check for level up
     */
    private gainCraftingExperience(amount: number): void {
        this.craftingExperience += amount;

        const requiredXP = this.getRequiredExperienceForLevel(this.craftingLevel + 1);
        if (this.craftingExperience >= requiredXP) {
            this.levelUpCrafting();
        }
    }

    /**
     * Level up crafting
     */
    private levelUpCrafting(): void {
        this.craftingLevel++;

        // Update crafting bonuses
        this.initializeCraftingBonuses();

        // Unlock level-based recipes
        this.checkLevelBasedUnlocks();

        new Notice(`🎉 Crafting Level Up! Now level ${this.craftingLevel}`, 5000);
    }

    /**
     * Check for level-based recipe unlocks
     */
    private checkLevelBasedUnlocks(): void {
        for (const [recipeId, recipe] of this.craftingRecipes.entries()) {
            if (!this.unlockedRecipes.has(recipeId) && this.isRecipeUnlocked(recipeId)) {
                this.unlockRecipe(recipeId);
            }
        }
    }

    /**
     * Calculate required experience for a level
     */
    private getRequiredExperienceForLevel(level: number): number {
        // Exponential curve: 100 * level^1.5
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    /**
     * Add materials to player inventory
     */
    addMaterials(materials: Record<string, number>): void {
        for (const [material, amount] of Object.entries(materials)) {
            const current = this.playerMaterials.get(material) || 0;
            this.playerMaterials.set(material, current + amount);
        }
        this.saveCraftingProgress();
    }

    /**
     * Get all crafting recipes
     */
    getAllRecipes(): CraftingRecipe[] {
        return Array.from(this.craftingRecipes.values());
    }

    /**
     * Get unlocked crafting recipes
     */
    getUnlockedRecipes(): CraftingRecipe[] {
        return Array.from(this.craftingRecipes.values()).filter(recipe =>
            this.isRecipeUnlocked(recipe.id)
        );
    }

    /**
     * Get player materials
     */
    getPlayerMaterials(): Map<string, number> {
        return new Map(this.playerMaterials);
    }

    /**
     * Get crafting stats
     */
    getCraftingStats(): CraftingStats {
        const totalRecipes = this.craftingRecipes.size;
        const unlockedRecipes = this.getUnlockedRecipes().length;

        return {
            level: this.craftingLevel,
            experience: this.craftingExperience,
            experienceToNext: this.getRequiredExperienceForLevel(this.craftingLevel + 1) - this.craftingExperience,
            totalRecipes,
            unlockedRecipes,
            unlockProgress: unlockedRecipes / totalRecipes,
            activeBonuses: Array.from(this.craftingBonuses.values()).filter(bonus => bonus.unlocked)
        };
    }

    /**
     * Check if player has a crafting bonus
     */
    private hasCraftingBonus(bonusId: string): boolean {
        const bonus = this.craftingBonuses.get(bonusId);
        return bonus ? bonus.unlocked : false;
    }

    /**
     * Check if bulk crafting is available
     */
    private canBulkCraft(): boolean {
        return this.hasCraftingBonus('bulk_crafting');
    }

    /**
     * Show crafting result notification
     */
    private showCraftingNotification(recipe: CraftingRecipe, result: CraftingResult): void {
        if (result.success) {
            const message = result.itemsCrafted === result.totalAttempts
                ? `✅ Successfully crafted ${result.itemsCrafted}x ${recipe.name}!`
                : `⚠️ Crafted ${result.itemsCrafted}/${result.totalAttempts} ${recipe.name}`;

            new Notice(message, 4000);

            if (result.experienceGained > 0) {
                new Notice(`📈 +${result.experienceGained} Crafting XP`, 3000);
            }
        } else {
            new Notice(`❌ Failed to craft ${recipe.name}: ${result.error}`, 5000);
        }
    }

    /**
     * Get player coins (integration point with currency system)
     */
    private getPlayerCoins(): number {
        // This would integrate with the actual currency system
        // For now, return a placeholder
        return parseInt(localStorage.getItem('player-coins') || '0');
    }

    /**
     * Set player coins (integration point with currency system)
     */
    private setPlayerCoins(amount: number): void {
        // This would integrate with the actual currency system
        localStorage.setItem('player-coins', amount.toString());
    }

    /**
     * Save crafting progress to localStorage
     */
    private saveCraftingProgress(): void {
        try {
            const data = {
                level: this.craftingLevel,
                experience: this.craftingExperience,
                materials: Array.from(this.playerMaterials.entries()),
                unlockedRecipes: Array.from(this.unlockedRecipes)
            };
            localStorage.setItem('crafting-progress', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save crafting progress:', error);
        }
    }

    /**
     * Load crafting progress from localStorage
     */
    private loadCraftingProgress(): void {
        try {
            const saved = localStorage.getItem('crafting-progress');
            if (saved) {
                const data = JSON.parse(saved);
                this.craftingLevel = data.level || 1;
                this.craftingExperience = data.experience || 0;
                this.playerMaterials = new Map(data.materials || []);
                this.unlockedRecipes = new Set(data.unlockedRecipes || []);
            }
        } catch (error) {
            console.error('Failed to load crafting progress:', error);
        }
    }
}

// Type definitions
export interface CraftingRecipe {
    id: string;
    name: string;
    description: string;
    category: string;
    rarity: EquipmentRarity;
    materials: Record<string, number>;
    coins: number;
    craftingLevel: number;
    craftingTime: number; // seconds
    experience: number;
    successRate: number; // 0-1
    unlockConditions: {
        level: number;
        prerequisiteRecipes: string[];
        achievements: string[];
    };
}

export interface CraftingResult {
    success: boolean;
    error?: string;
    itemsCrafted: number;
    materialsUsed: Record<string, number>;
    experienceGained: number;
    coinsSpent: number;
    craftingLevel?: number;
    totalAttempts?: number;
    successRate?: number;
}

export interface CraftingBonus {
    id: string;
    name: string;
    description: string;
    type: 'time_reduction' | 'success_rate' | 'material_refund' | 'bulk_crafting';
    value: number;
    unlockLevel: number;
    unlocked: boolean;
}

export interface CraftingStats {
    level: number;
    experience: number;
    experienceToNext: number;
    totalRecipes: number;
    unlockedRecipes: number;
    unlockProgress: number;
    activeBonuses: CraftingBonus[];
}

// Export singleton instance
export const equipmentCraftingSystem = EquipmentCraftingSystem.getInstance();
