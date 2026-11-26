// Enhanced Shop System Integration
// Combines market dynamics, shopkeeper personality, and price fluctuations

import type GamifiedObsidianPlugin from "../../../core/main";
import { ShopItem, getAllShopItems, writeShopItems } from "./ShopParser";
import { MarketDynamicsEngine } from "./marketDynamics";
import { ShopkeeperPersonalityManager } from "./shopkeeperPersonality";
import { SeasonalInventoryManager } from "./seasonalInventoryManager";
import { Notice } from "obsidian";

export interface EnhancedShopItem extends ShopItem {
    // Market data
    marketPrice?: number;
    priceChange?: number;
    trend?: 'rising' | 'falling' | 'stable' | 'volatile';

    // Shopkeeper modifications
    shopkeeperPrice?: number;
    personalityBonus?: number;

    // Final price after all modifiers
    finalPrice: number;

    // Price breakdown for transparency
    priceBreakdown: {
        basePrice: number;
        marketModifier: number;
        shopkeeperModifier: number;
        seasonalModifier: number;
        offerDiscount: number;
        finalPrice: number;
    };

    // Availability
    availability: 'in_stock' | 'low_stock' | 'out_of_stock' | 'back_ordered';
    estimatedRestock?: Date;
}

export interface ShopStatus {
    currentShopkeeper: {
        name: string;
        avatar: string;
        mood: number;
        reputation: number;
        personality: string;
        dialogue: string;
    };
    marketConditions: {
        overall: 'bullish' | 'bearish' | 'stable' | 'volatile';
        volatility: number;
        recentEvents: string[];
    };
    specialOffers: {
        id: string;
        title: string;
        description: string;
        discount: number;
    }[];
    inventory: {
        totalItems: number;
        lowStockItems: number;
        newArrivals: number;
    };
}

export class EnhancedShopSystem {
    private plugin: GamifiedObsidianPlugin;
    private marketEngine: MarketDynamicsEngine;
    private shopkeeperManager: ShopkeeperPersonalityManager;
    private seasonalManager: SeasonalInventoryManager | null = null;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(plugin: GamifiedObsidianPlugin) {
        this.plugin = plugin;
        this.marketEngine = new MarketDynamicsEngine(plugin);
        this.shopkeeperManager = new ShopkeeperPersonalityManager(plugin);
    }

    /**
     * Initialize the enhanced shop system
     */
    async initialize(seasonalManager?: SeasonalInventoryManager): Promise<void> {
        try {
            // Set seasonal manager if provided
            if (seasonalManager) {
                this.seasonalManager = seasonalManager;
            }

            // Load current shop items
            const items = await getAllShopItems(this.plugin);

            // Initialize market dynamics
            await this.marketEngine.initialize(items);

            // Start regular updates
            this.setupUpdateSchedule();

            console.log('✅ Enhanced shop system initialized');
        } catch (error) {
            console.error('Failed to initialize enhanced shop system:', error);
        }
    }

    /**
     * Get enhanced shop inventory with all price calculations
     */
    async getEnhancedInventory(): Promise<EnhancedShopItem[]> {
        try {
            const baseItems = await getAllShopItems(this.plugin);
            const enhancedItems: EnhancedShopItem[] = [];

            for (const item of baseItems) {
                const enhanced = await this.enhanceItem(item);
                enhancedItems.push(enhanced);
            }

            return enhancedItems.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Failed to get enhanced inventory:', error);
            return [];
        }
    }

    /**
     * Enhance a single item with all modifiers
     */
    private async enhanceItem(item: ShopItem): Promise<EnhancedShopItem> {
        // Get base prices and modifiers
        const basePrice = item.price;
        const marketPrice = this.marketEngine.getCurrentPrice(item.name);
        const marketModifier = marketPrice > 0 ? marketPrice / basePrice : 1.0;

        // Get shopkeeper modifier
        const shopkeeperModifier = this.shopkeeperManager.getPriceModifier();

        // Get seasonal modifier (if available)
        let seasonalModifier = 1.0;
        if (this.seasonalManager) {
            // Check if this is a seasonal item with special pricing
            const seasonalItems = this.seasonalManager.getCurrentShopInventory();
            const seasonalItem = seasonalItems.find(si => si.name.includes(item.name) || item.name.includes(si.name.replace(/^[🌱☀️🍂❄️💫⭐]\s*/, '')));
            if (seasonalItem) {
                seasonalModifier = seasonalItem.price / basePrice;
            }
        }

        // Calculate price before offers
        const priceBeforeOffers = Math.round(basePrice * marketModifier * shopkeeperModifier * seasonalModifier);

        // Apply any available offers
        const offers = this.shopkeeperManager.getAvailableOffers();
        let bestOffer = 0;
        for (const offer of offers) {
            const offerResult = this.shopkeeperManager.applyOffer(offer.id, [item]);
            if (offerResult.discount > bestOffer) {
                bestOffer = offerResult.discount;
            }
        }

        const offerDiscount = Math.round(priceBeforeOffers * bestOffer);
        const finalPrice = Math.max(1, priceBeforeOffers - offerDiscount);

        // Get market trend
        const marketInfo = this.marketEngine.getMarketInfo(item.name);
        const marketTrends = this.marketEngine.getMarketTrends();
        const itemTrend = marketTrends.find(t => t.itemId === item.name);

        // Determine availability
        let availability: EnhancedShopItem['availability'] = 'in_stock';
        const stock = item.stock || 0;
        if (stock === 0) {
            availability = 'out_of_stock';
        } else if (stock <= 2) {
            availability = 'low_stock';
        }

        const enhanced: EnhancedShopItem = {
            ...item,
            marketPrice,
            priceChange: marketInfo ? ((marketPrice - basePrice) / basePrice) * 100 : 0,
            trend: itemTrend?.trend || 'stable',
            shopkeeperPrice: Math.round(basePrice * shopkeeperModifier),
            personalityBonus: shopkeeperModifier - 1,
            finalPrice,
            priceBreakdown: {
                basePrice,
                marketModifier,
                shopkeeperModifier,
                seasonalModifier,
                offerDiscount,
                finalPrice
            },
            availability,
            estimatedRestock: availability === 'out_of_stock' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
        };

        return enhanced;
    }

    /**
     * Process a purchase with all systems
     */
    async processPurchase(itemName: string, quantity: number): Promise<{ success: boolean, message: string, finalPrice: number }> {
        try {
            const items = await this.getEnhancedInventory();
            const item = items.find(i => i.name === itemName);

            if (!item) {
                return { success: false, message: 'Item not found', finalPrice: 0 };
            }

            if (item.availability === 'out_of_stock') {
                return { success: false, message: 'Item is out of stock', finalPrice: 0 };
            }

            const stock = item.stock || 0;
            if (stock < quantity) {
                return { success: false, message: `Only ${stock} available`, finalPrice: 0 };
            }

            const totalPrice = item.finalPrice * quantity;

            // Record purchase in market system
            this.marketEngine.recordPurchase(itemName, quantity, item.finalPrice);

            // Record interaction with shopkeeper
            this.shopkeeperManager.recordInteraction('purchase', [itemName], totalPrice);

            // Update stock in base system
            await this.updateItemStock(itemName, quantity);

            // Get shopkeeper response
            const shopkeeper = this.shopkeeperManager.getCurrentShopkeeper();
            const dialogue = this.shopkeeperManager.getDialogue('farewells');

            return {
                success: true,
                message: `${shopkeeper?.avatar} ${shopkeeper?.name}: "${dialogue}"`,
                finalPrice: totalPrice
            };

        } catch (error) {
            console.error('Purchase processing failed:', error);
            return { success: false, message: 'Purchase failed', finalPrice: 0 };
        }
    }

    /**
     * Get current shop status for UI
     */
    getShopStatus(): ShopStatus {
        const shopkeeperStatus = this.shopkeeperManager.getShopkeeperStatus();
        const marketTrends = this.marketEngine.getMarketTrends();
        const offers = this.shopkeeperManager.getAvailableOffers();

        // Analyze overall market conditions
        const risingTrends = marketTrends.filter(t => t.trend === 'rising').length;
        const fallingTrends = marketTrends.filter(t => t.trend === 'falling').length;
        const volatileTrends = marketTrends.filter(t => t.trend === 'volatile').length;

        let overallCondition: ShopStatus['marketConditions']['overall'] = 'stable';
        if (volatileTrends > marketTrends.length * 0.3) {
            overallCondition = 'volatile';
        } else if (risingTrends > fallingTrends * 1.5) {
            overallCondition = 'bullish';
        } else if (fallingTrends > risingTrends * 1.5) {
            overallCondition = 'bearish';
        }

        return {
            currentShopkeeper: {
                ...shopkeeperStatus,
                dialogue: shopkeeperStatus.currentDialogue
            },
            marketConditions: {
                overall: overallCondition,
                volatility: Math.round((volatileTrends / marketTrends.length) * 100),
                recentEvents: marketTrends.slice(0, 3).map(t => `${t.itemId}: ${t.reason}`)
            },
            specialOffers: offers.map(offer => ({
                id: offer.id,
                title: offer.title,
                description: offer.description,
                discount: offer.rewards.find(r => r.type === 'discount')?.value || 0
            })),
            inventory: {
                totalItems: marketTrends.length,
                lowStockItems: 0, // Would need to calculate from actual inventory
                newArrivals: 0     // Would need to track from seasonal system
            }
        };
    }

    /**
     * Trigger market event
     */
    triggerMarketEvent(eventName: string): void {
        this.marketEngine.triggerMarketEvent(eventName);
    }

    /**
     * Force price update
     */
    async updatePrices(): Promise<void> {
        // Market dynamics handles its own price updates
        // Just trigger a manual update if needed
        console.log('Manual price update triggered');
    }

    /**
     * Rotate shopkeeper
     */
    rotateShopkeeper(): void {
        this.shopkeeperManager.rotateShopkeeper();
    }

    /**
     * Get market analysis for a specific item
     */
    getItemAnalysis(itemName: string): any {
        const marketInfo = this.marketEngine.getMarketInfo(itemName);
        const trends = this.marketEngine.getMarketTrends();
        const itemTrend = trends.find(t => t.itemId === itemName);

        return {
            marketInfo,
            trend: itemTrend,
            recommendation: this.generateRecommendation(marketInfo, itemTrend)
        };
    }

    /**
     * Generate purchase recommendation
     */
    private generateRecommendation(marketInfo: any, trend: any): string {
        if (!marketInfo || !trend) return 'No data available';

        if (trend.prediction === 'bullish' && trend.changePercent > 10) {
            return '📈 Strong buy signal - prices rising rapidly!';
        } else if (trend.prediction === 'bearish' && trend.changePercent < -10) {
            return '📉 Wait for better prices - falling market!';
        } else if (trend.trend === 'volatile') {
            return '⚠️ Volatile pricing - buy with caution!';
        } else if (marketInfo.demandLevel > 80) {
            return '🔥 High demand - buy now before stock runs out!';
        } else if (marketInfo.supplyLevel > 80) {
            return '💰 Oversupply - great time to buy at low prices!';
        }

        return '✅ Normal market conditions - fair pricing.';
    }

    /**
     * Update item stock after purchase
     */
    private async updateItemStock(itemName: string, quantity: number): Promise<void> {
        try {
            const items = await getAllShopItems(this.plugin);
            const item = items.find(i => i.name === itemName);

            if (item && (item.stock || 0) >= quantity) {
                item.stock = (item.stock || 0) - quantity;
                await writeShopItems(this.plugin, items);
            }
        } catch (error) {
            console.error('Failed to update item stock:', error);
        }
    }

    /**
     * Setup regular update schedule
     */
    private setupUpdateSchedule(): void {
        // Update every 30 minutes
        this.updateInterval = setInterval(async () => {
            await this.performScheduledUpdate();
        }, 30 * 60 * 1000);
    }

    /**
     * Perform scheduled updates
     */
    private async performScheduledUpdate(): Promise<void> {
        try {
            // Market dynamics updates happen automatically

            // Randomly trigger shopkeeper mood changes
            if (Math.random() < 0.2) { // 20% chance every 30 minutes
                const shopkeeper = this.shopkeeperManager.getCurrentShopkeeper();
                if (shopkeeper) {
                    // Small mood fluctuation
                    const moodChange = (Math.random() - 0.5) * 10; // ±5 points
                    shopkeeper.mood = Math.max(0, Math.min(100, shopkeeper.mood + moodChange));
                    console.log(`Shopkeeper mood changed: ${shopkeeper.mood.toFixed(1)}`);
                }
            }

            // Rotate shopkeeper occasionally (daily)
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() < 30) { // Once per day around midnight
                if (Math.random() < 0.1) { // 10% chance
                    this.shopkeeperManager.rotateShopkeeper();
                }
            }

        } catch (error) {
            console.error('Scheduled update failed:', error);
        }
    }

    /**
     * Cleanup when system shuts down
     */
    cleanup(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.marketEngine.cleanup();
        this.shopkeeperManager.cleanup();

        console.log('Enhanced shop system cleaned up');
    }
}
