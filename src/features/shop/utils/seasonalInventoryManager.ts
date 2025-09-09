// Seasonal and Dynamic Inventory Management System
// Works with existing shop templates and generates seasonal/rotating items

import type GamifiedObsidianPlugin from "../../../core/main";
import { ShopItem, ShopItemEffect, getAllShopTemplates, getAllShopItems, writeShopItems } from "./ShopParser";
import { Notice } from "obsidian";

export interface SeasonalConfig {
    season: 'spring' | 'summer' | 'autumn' | 'winter' | 'festival' | 'event';
    name: string;
    startMonth: number; // 1-12, or -1 for manual trigger
    endMonth: number;   // 1-12, or -1 for manual trigger
    isActive?: boolean; // For manual events
    rotationDays?: number; // How often to rotate (default: 7)
}

export interface ItemTemplate {
    baseTemplate: string; // Name from ShopTemplates.md
    seasonalVariations: SeasonalVariation[];
    categories: string[];
    rarityWeights: Record<string, number>; // probability weights for each rarity
}

export interface SeasonalVariation {
    season: string;
    namePrefix?: string;
    nameSuffix?: string;
    priceMultiplier: number;
    stockMultiplier?: number;
    effectModifiers?: Record<string, number>;
    specialTags?: string[];
    availabilityBonus?: number; // Chance to appear (0-1)
}

export interface RotatingInventory {
    dailySpecials: ShopItem[];
    weeklyRotation: ShopItem[];
    seasonalItems: ShopItem[];
    permanentStock: ShopItem[];
    lastRotation: Date;
    currentSeason: string;
}

// Extended ShopItem with seasonal properties
export interface SeasonalShopItem extends ShopItem {
    seasonal?: {
        season: string;
        originalItem: string;
        variation: number;
        expiresAt: Date;
    };
    special?: {
        type: 'daily' | 'weekly' | 'seasonal';
        discount: number;
        expiresAt: Date;
    };
}

export class SeasonalInventoryManager {
    private plugin: GamifiedObsidianPlugin;
    private baseTemplates: ShopItem[] = [];
    private rotatingInventory: RotatingInventory;
    private seasonalConfigs: SeasonalConfig[] = [];

    constructor(plugin: GamifiedObsidianPlugin) {
        this.plugin = plugin;
        this.rotatingInventory = {
            dailySpecials: [],
            weeklyRotation: [],
            seasonalItems: [],
            permanentStock: [],
            lastRotation: new Date(),
            currentSeason: this.getCurrentSeason()
        };
        this.initializeSeasonalConfigs();
    }

    private initializeSeasonalConfigs() {
        this.seasonalConfigs = [
            {
                season: 'spring',
                name: 'Spring Awakening',
                startMonth: 3,
                endMonth: 5,
                rotationDays: 7
            },
            {
                season: 'summer',
                name: 'Summer Heat',
                startMonth: 6,
                endMonth: 8,
                rotationDays: 5
            },
            {
                season: 'autumn',
                name: 'Harvest Season',
                startMonth: 9,
                endMonth: 11,
                rotationDays: 7
            },
            {
                season: 'winter',
                name: 'Winter Frost',
                startMonth: 12,
                endMonth: 2,
                rotationDays: 10
            },
            {
                season: 'festival',
                name: 'Dragon Festival',
                startMonth: -1,
                endMonth: -1,
                isActive: false,
                rotationDays: 3
            }
        ];
    }

    /**
     * Initialize the seasonal system by loading templates and setting up inventory
     */
    async initialize(): Promise<void> {
        try {
            // Load base templates from your existing ShopTemplates.md
            await this.loadBaseTemplates();

            // Generate initial seasonal inventory
            await this.generateSeasonalInventory();

            console.log('Seasonal inventory manager initialized');
        } catch (error) {
            console.error('Failed to initialize seasonal inventory:', error);
            throw error;
        }
    }

    /**
 * Load base templates from ShopTemplates.md in vault root
 */
    private async loadBaseTemplates(): Promise<void> {
        try {
            const templates = await getAllShopTemplates(this.plugin);
            this.baseTemplates = templates;
            console.log(`Loaded ${templates.length} base templates for seasonal generation`);
        } catch (error) {
            console.warn('Could not load shop templates:', error);
            // Fallback to empty array - system will still work with default items
            this.baseTemplates = [];
        }
    }

    /**
     * Generate seasonal variations of base templates
     */
    private generateSeasonalVariations(baseItem: ShopItem, season: string): ShopItem[] {
        const variations: ShopItem[] = [];
        const currentSeason = this.getCurrentSeasonConfig();

        // Define seasonal modifiers
        const seasonalMods = this.getSeasonalModifiers(season);

        // Generate 1-3 variations per base item
        const variationCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < variationCount; i++) {
            const variation: SeasonalShopItem = {
                ...baseItem,
                name: this.generateSeasonalName(baseItem.name, season, i),
                price: Math.round(baseItem.price * seasonalMods.priceMultiplier),
                tags: [...baseItem.tags, `seasonal`, `${season}`],
                effects: this.modifyEffects(baseItem.effects, seasonalMods),
                stock: Math.floor((baseItem.stock || 10) * (seasonalMods.stockMultiplier || 1)),
                seasonal: {
                    season,
                    originalItem: baseItem.name,
                    variation: i,
                    expiresAt: this.getSeasonEndDate()
                }
            };

            variations.push(variation);
        }

        return variations;
    }

    /**
     * Generate seasonal name variants
     */
    private generateSeasonalName(baseName: string, season: string, variation: number): string {
        const seasonalPrefixes: Record<string, string[]> = {
            spring: ['🌱 Fresh', '🌸 Blooming', '🌿 Verdant'],
            summer: ['☀️ Energizing', '🔥 Blazing', '🌞 Radiant'],
            autumn: ['🍂 Harvest', '🎃 Autumn', '🌾 Golden'],
            winter: ['❄️ Icy', '🌨️ Frosty', '⛄ Winter'],
            festival: ['🐉 Festival', '🎊 Celebration', '🎆 Grand']
        };

        const prefixes = seasonalPrefixes[season] || ['✨ Special'];
        const prefix = prefixes[variation % prefixes.length];

        return `${prefix} ${baseName}`;
    }

    /**
     * Get seasonal modifiers for pricing and effects
     */
    private getSeasonalModifiers(season: string): SeasonalVariation {
        const modifiers: Record<string, SeasonalVariation> = {
            spring: {
                season: 'spring',
                priceMultiplier: 0.8, // Spring sales!
                stockMultiplier: 1.2,
                effectModifiers: { energy: 1.1, health: 1.2 },
                availabilityBonus: 0.1
            },
            summer: {
                season: 'summer',
                priceMultiplier: 1.0,
                stockMultiplier: 1.0,
                effectModifiers: { energy: 1.3, attack: 1.1 },
                availabilityBonus: 0.0
            },
            autumn: {
                season: 'autumn',
                priceMultiplier: 1.1, // Harvest season premium
                stockMultiplier: 1.5, // Abundant harvest
                effectModifiers: { xp: 1.2, coins: 1.1 },
                availabilityBonus: 0.15
            },
            winter: {
                season: 'winter',
                priceMultiplier: 1.3, // Winter scarcity
                stockMultiplier: 0.7,
                effectModifiers: { defense: 1.2, cold_resistance: 2.0 },
                availabilityBonus: -0.1
            },
            festival: {
                season: 'festival',
                priceMultiplier: 0.6, // Festival discounts!
                stockMultiplier: 2.0,
                effectModifiers: { xp: 1.5, coins: 1.3, luck: 2.0 },
                availabilityBonus: 0.3
            }
        };

        return modifiers[season] || modifiers['summer'];
    }

    /**
 * Modify item effects based on seasonal modifiers
 */
    private modifyEffects(originalEffects: ShopItemEffect[] | undefined, seasonalMods: SeasonalVariation): ShopItemEffect[] | undefined {
        if (!originalEffects || !seasonalMods.effectModifiers) return originalEffects;

        return originalEffects.map(effect => {
            if (effect.type === 'stat' && seasonalMods.effectModifiers?.[effect.stat]) {
                const multiplier = seasonalMods.effectModifiers[effect.stat];
                return {
                    ...effect,
                    amount: Math.round(effect.amount * multiplier)
                };
            }
            if (effect.type === 'xp' && seasonalMods.effectModifiers?.['xp']) {
                const multiplier = seasonalMods.effectModifiers['xp'];
                return {
                    ...effect,
                    amount: Math.round(effect.amount * multiplier)
                };
            }
            if (effect.type === 'coins' && seasonalMods.effectModifiers?.['coins']) {
                const multiplier = seasonalMods.effectModifiers['coins'];
                return {
                    ...effect,
                    amount: Math.round(effect.amount * multiplier)
                };
            }
            return effect;
        });
    }

    /**
     * Get current season based on date
     */
    private getCurrentSeason(): string {
        const month = new Date().getMonth() + 1; // 1-12

        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    /**
     * Get current season configuration
     */
    private getCurrentSeasonConfig(): SeasonalConfig | null {
        const currentSeason = this.getCurrentSeason();
        return this.seasonalConfigs.find(config =>
            config.season === currentSeason &&
            (config.isActive !== false)
        ) || null;
    }

    /**
     * Get when current season ends
     */
    private getSeasonEndDate(): Date {
        const seasonConfig = this.getCurrentSeasonConfig();
        if (!seasonConfig || seasonConfig.endMonth === -1) {
            // Default to 30 days from now for manual events
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            return endDate;
        }

        const currentYear = new Date().getFullYear();
        const endDate = new Date(currentYear, seasonConfig.endMonth, 0); // Last day of end month

        // If we've passed the end date this year, it ends next year
        if (endDate < new Date()) {
            endDate.setFullYear(currentYear + 1);
        }

        return endDate;
    }

    /**
     * Check if inventory needs rotation
     */
    shouldRotateInventory(): boolean {
        const now = new Date();
        const lastRotation = this.rotatingInventory.lastRotation;
        const daysSinceRotation = Math.floor((now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24));

        // Use settings rotation days, fallback to season config, then default to 7
        const rotationDays = this.plugin.settings.shopRotationDays ||
            this.getCurrentSeasonConfig()?.rotationDays || 7;

        return daysSinceRotation >= rotationDays;
    }

    /**
     * Generate complete seasonal inventory
     */
    async generateSeasonalInventory(): Promise<void> {
        const currentSeason = this.getCurrentSeason();

        // Clear seasonal items
        this.rotatingInventory.seasonalItems = [];
        this.rotatingInventory.weeklyRotation = [];
        this.rotatingInventory.dailySpecials = [];

        // Generate seasonal variations from base templates
        for (const baseItem of this.baseTemplates) {
            const seasonalVariations = this.generateSeasonalVariations(baseItem, currentSeason);
            this.rotatingInventory.seasonalItems.push(...seasonalVariations);
        }

        // Generate daily specials (25% discount, limited stock)
        this.generateDailySpecials();

        // Generate weekly rotation
        this.generateWeeklyRotation();

        // Keep permanent stock from base templates
        this.rotatingInventory.permanentStock = [...this.baseTemplates];

        // Update rotation timestamp
        this.rotatingInventory.lastRotation = new Date();
        this.rotatingInventory.currentSeason = currentSeason;

        console.log(`Generated seasonal inventory for ${currentSeason}:`,
            `${this.rotatingInventory.seasonalItems.length} seasonal items,`,
            `${this.rotatingInventory.dailySpecials.length} daily specials,`,
            `${this.rotatingInventory.weeklyRotation.length} weekly items`
        );
    }

    /**
     * Generate daily special offers
     */
    private generateDailySpecials(): void {
        const available = [...this.baseTemplates, ...this.rotatingInventory.seasonalItems];
        const specialCount = Math.min(3, available.length);

        // Pick random items for daily specials
        const shuffled = available.sort(() => 0.5 - Math.random());

        for (let i = 0; i < specialCount; i++) {
            const item = shuffled[i];
            const special: SeasonalShopItem = {
                ...item,
                name: `💫 Daily Special: ${item.name}`,
                price: Math.round(item.price * 0.75), // 25% discount
                stock: Math.max(1, Math.floor((item.stock || 10) * 0.3)), // Limited stock
                tags: [...item.tags, 'daily_special', 'limited_time'],
                special: {
                    type: 'daily',
                    discount: 0.25,
                    expiresAt: this.getTomorrowMidnight()
                }
            };

            this.rotatingInventory.dailySpecials.push(special);
        }
    }

    /**
     * Generate weekly rotation items
     */
    private generateWeeklyRotation(): void {
        const currentSeason = this.getCurrentSeason();
        const weeklyCount = 5;

        // Generate some unique weekly items
        for (let i = 0; i < weeklyCount; i++) {
            if (this.baseTemplates.length > i) {
                const baseItem = this.baseTemplates[i];
                const weeklyItem: SeasonalShopItem = {
                    ...baseItem,
                    name: `⭐ Weekly: ${this.generateSeasonalName(baseItem.name, currentSeason, i)}`,
                    price: Math.round(baseItem.price * 1.1), // Slight premium
                    tags: [...baseItem.tags, 'weekly_rotation', currentSeason],
                    special: {
                        type: 'weekly',
                        discount: 0,
                        expiresAt: this.getNextWeek()
                    }
                };

                this.rotatingInventory.weeklyRotation.push(weeklyItem);
            }
        }
    }

    /**
     * Get all current shop items
     */
    getCurrentShopInventory(): ShopItem[] {
        return [
            ...this.rotatingInventory.permanentStock,
            ...this.rotatingInventory.seasonalItems,
            ...this.rotatingInventory.weeklyRotation,
            ...this.rotatingInventory.dailySpecials
        ];
    }

    /**
     * Force refresh the inventory
     */
    async refreshInventory(): Promise<void> {
        await this.loadBaseTemplates();
        await this.generateSeasonalInventory();

        // Update the actual shop file
        await this.updateShopFile();

        new Notice(`🛒 Shop inventory refreshed for ${this.getCurrentSeason()}!`);
    }

    /**
     * Update ShopItems.md with current inventory
     */
    private async updateShopFile(): Promise<void> {
        try {
            const currentInventory = this.getCurrentShopInventory();
            await writeShopItems(this.plugin, currentInventory);
            console.log('Updated ShopItems.md with seasonal inventory');
        } catch (error) {
            console.error('Failed to update shop file:', error);
        }
    }

    /**
     * Trigger a special event (like festivals)
     */
    async triggerSpecialEvent(eventName: string, duration: number = 7): Promise<void> {
        const eventConfig: SeasonalConfig = {
            season: 'event',
            name: eventName,
            startMonth: -1,
            endMonth: -1,
            isActive: true,
            rotationDays: 1 // Daily rotation during events
        };

        // Temporarily add the event
        this.seasonalConfigs.push(eventConfig);

        await this.generateSeasonalInventory();
        await this.updateShopFile();

        new Notice(`🎉 Special Event: ${eventName} has begun!`);

        // Remove event after duration
        setTimeout(() => {
            this.seasonalConfigs = this.seasonalConfigs.filter(c => c !== eventConfig);
            this.refreshInventory();
            new Notice(`🎉 Special Event: ${eventName} has ended.`);
        }, duration * 24 * 60 * 60 * 1000);
    }

    /**
     * Get season info for UI display
     */
    getSeasonInfo(): { season: string; daysUntilRotation: number; specialItems: number } {
        const seasonConfig = this.getCurrentSeasonConfig();
        const daysSinceRotation = Math.floor(
            (new Date().getTime() - this.rotatingInventory.lastRotation.getTime()) / (1000 * 60 * 60 * 24)
        );
        const rotationDays = seasonConfig?.rotationDays || 7;

        return {
            season: seasonConfig?.name || this.getCurrentSeason(),
            daysUntilRotation: Math.max(0, rotationDays - daysSinceRotation),
            specialItems: this.rotatingInventory.dailySpecials.length + this.rotatingInventory.seasonalItems.length
        };
    }

    private getTomorrowMidnight(): Date {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    private getNextWeek(): Date {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
    }
}

/**
 * Initialize seasonal inventory system
 */
export async function initializeSeasonalInventory(plugin: GamifiedObsidianPlugin): Promise<SeasonalInventoryManager> {
    const manager = new SeasonalInventoryManager(plugin);
    await manager.initialize();
    return manager;
}