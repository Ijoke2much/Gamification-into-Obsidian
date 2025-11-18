// Market Dynamics System
// Handles supply/demand economics, price fluctuations, and market trends

import type GamifiedObsidianPlugin from "../../../core/main";
import { ShopItem } from "./ShopParser";
import { Notice } from "obsidian";

export interface MarketData {
    itemId: string;
    basePrice: number;
    currentPrice: number;
    demandLevel: number; // 0-100
    supplyLevel: number; // 0-100
    purchaseHistory: PurchaseRecord[];
    priceHistory: PricePoint[];
    lastPriceUpdate: Date;
    popularity: number; // 0-100, affects how quickly demand changes
    volatility: number; // 0-100, affects price swing magnitude
}

export interface PurchaseRecord {
    timestamp: Date;
    quantity: number;
    playerId?: string;
    price: number;
}

export interface PricePoint {
    timestamp: Date;
    price: number;
    demandLevel: number;
    supplyLevel: number;
}

export interface MarketTrend {
    itemId: string;
    trend: 'rising' | 'falling' | 'stable' | 'volatile';
    changePercent: number;
    prediction: 'bullish' | 'bearish' | 'neutral';
    reason: string;
}

export class MarketDynamicsEngine {
    private plugin: GamifiedObsidianPlugin;
    private marketData: Map<string, MarketData> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private marketEvents: MarketEvent[] = [];

    constructor(plugin: GamifiedObsidianPlugin) {
        this.plugin = plugin;
        this.initializeMarketEvents();
    }

    /**
     * Initialize the market system
     */
    async initialize(items: ShopItem[]): Promise<void> {
        // Initialize market data for each item
        for (const item of items) {
            const marketData: MarketData = {
                itemId: item.name,
                basePrice: item.price,
                currentPrice: item.price,
                demandLevel: this.getInitialDemand(item),
                supplyLevel: this.getInitialSupply(item),
                purchaseHistory: [],
                priceHistory: [{
                    timestamp: new Date(),
                    price: item.price,
                    demandLevel: this.getInitialDemand(item),
                    supplyLevel: this.getInitialSupply(item)
                }],
                lastPriceUpdate: new Date(),
                popularity: this.getItemPopularity(item),
                volatility: this.getItemVolatility(item)
            };

            this.marketData.set(item.name, marketData);
        }

        // Start market updates every hour
        this.updateInterval = setInterval(() => {
            this.updateMarketPrices();
        }, 60 * 60 * 1000); // 1 hour

        console.log(`Market dynamics initialized for ${items.length} items`);
    }

    /**
     * Record a purchase and update market dynamics
     */
    recordPurchase(itemName: string, quantity: number, actualPrice: number): void {
        const marketData = this.marketData.get(itemName);
        if (!marketData) return;

        // Record the purchase
        const purchase: PurchaseRecord = {
            timestamp: new Date(),
            quantity,
            price: actualPrice,
            playerId: 'player' // Could be expanded for multiplayer
        };

        marketData.purchaseHistory.push(purchase);

        // Increase demand based on purchase volume
        const demandIncrease = Math.min(quantity * 2, 15); // Cap at 15 points
        marketData.demandLevel = Math.min(100, marketData.demandLevel + demandIncrease);

        // Decrease supply slightly
        const supplyDecrease = Math.min(quantity * 1.5, 10);
        marketData.supplyLevel = Math.max(0, marketData.supplyLevel - supplyDecrease);

        // Update price immediately
        this.calculateNewPrice(marketData);

        console.log(`📈 Purchase recorded: ${itemName} x${quantity} - Demand: ${marketData.demandLevel}, Supply: ${marketData.supplyLevel}, Price: ${marketData.currentPrice}`);
    }

    /**
     * Get current market price for an item
     */
    getCurrentPrice(itemName: string): number {
        const marketData = this.marketData.get(itemName);
        return marketData?.currentPrice || 0;
    }

    /**
     * Get market information for an item
     */
    getMarketInfo(itemName: string): MarketData | null {
        return this.marketData.get(itemName) || null;
    }

    /**
     * Get market trends for all items
     */
    getMarketTrends(): MarketTrend[] {
        const trends: MarketTrend[] = [];

        for (const [itemName, data] of this.marketData) {
            const trend = this.analyzeItemTrend(data);
            trends.push(trend);
        }

        // Sort by most interesting trends first
        return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    }

    /**
     * Apply market event effects
     */
    triggerMarketEvent(eventName: string): void {
        const event = this.marketEvents.find(e => e.name === eventName);
        if (!event) return;

        for (const effect of event.effects) {
            const marketData = this.marketData.get(effect.itemName);
            if (marketData) {
                if (effect.demandChange) {
                    marketData.demandLevel = Math.max(0, Math.min(100,
                        marketData.demandLevel + effect.demandChange));
                }
                if (effect.supplyChange) {
                    marketData.supplyLevel = Math.max(0, Math.min(100,
                        marketData.supplyLevel + effect.supplyChange));
                }
                this.calculateNewPrice(marketData);
            }
        }

        new Notice(`📰 Market Event: ${event.description}`, 5000);
        console.log(`Market event triggered: ${eventName}`);
    }

    /**
     * Update market prices based on time and trends
     */
    private updateMarketPrices(): void {
        for (const [itemName, data] of this.marketData) {
            // Natural market fluctuation over time
            this.applyNaturalFluctuation(data);

            // Apply random market events occasionally
            if (Math.random() < 0.1) { // 10% chance per hour
                this.applyRandomMarketEffect(data);
            }

            // Gradually restore supply/demand toward equilibrium
            this.applyMarketCorrection(data);

            // Calculate new price
            this.calculateNewPrice(data);
        }

        console.log('📊 Market prices updated');
    }

    /**
     * Calculate new price based on supply and demand
     */
    private calculateNewPrice(marketData: MarketData): void {
        const demandFactor = marketData.demandLevel / 50; // 0-2 multiplier
        const supplyFactor = marketData.supplyLevel / 50; // 0-2 multiplier

        // Price increases with demand, decreases with supply
        const marketMultiplier = demandFactor / Math.max(supplyFactor, 0.1);

        // Apply volatility for more dramatic swings on certain items
        const volatilityMultiplier = 1 + (marketData.volatility / 100) * 0.5;

        const newPrice = Math.round(marketData.basePrice * marketMultiplier * volatilityMultiplier);

        // Prevent extreme price swings (min 50%, max 300% of base price)
        const minPrice = Math.round(marketData.basePrice * 0.5);
        const maxPrice = Math.round(marketData.basePrice * 3.0);

        marketData.currentPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

        // Record price history
        marketData.priceHistory.push({
            timestamp: new Date(),
            price: marketData.currentPrice,
            demandLevel: marketData.demandLevel,
            supplyLevel: marketData.supplyLevel
        });

        // Keep only last 48 hours of history
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        marketData.priceHistory = marketData.priceHistory.filter(p => p.timestamp > cutoff);
        marketData.purchaseHistory = marketData.purchaseHistory.filter(p => p.timestamp > cutoff);

        marketData.lastPriceUpdate = new Date();
    }

    /**
     * Apply natural market fluctuation
     */
    private applyNaturalFluctuation(marketData: MarketData): void {
        // Small random changes to simulate natural market movement
        const demandChange = (Math.random() - 0.5) * 4; // ±2 points
        const supplyChange = (Math.random() - 0.5) * 4; // ±2 points

        marketData.demandLevel = Math.max(0, Math.min(100, marketData.demandLevel + demandChange));
        marketData.supplyLevel = Math.max(0, Math.min(100, marketData.supplyLevel + supplyChange));
    }

    /**
     * Apply random market effects
     */
    private applyRandomMarketEffect(marketData: MarketData): void {
        const effects = [
            { desc: "Merchant caravan arrives", demand: -5, supply: +15 },
            { desc: "Bandits raid supply lines", demand: +10, supply: -20 },
            { desc: "Noble patronage increases demand", demand: +15, supply: 0 },
            { desc: "Guild crafters go on strike", demand: +8, supply: -12 },
            { desc: "Good harvest season", demand: -3, supply: +10 },
            { desc: "War preparations", demand: +20, supply: -5 }
        ];

        const effect = effects[Math.floor(Math.random() * effects.length)];

        marketData.demandLevel = Math.max(0, Math.min(100, marketData.demandLevel + effect.demand));
        marketData.supplyLevel = Math.max(0, Math.min(100, marketData.supplyLevel + effect.supply));

        console.log(`📰 ${effect.desc} affects ${marketData.itemId}`);
    }

    /**
     * Apply market correction (gradual return to equilibrium)
     */
    private applyMarketCorrection(marketData: MarketData): void {
        const targetDemand = 50;
        const targetSupply = 50;

        // Gradual correction toward equilibrium (1% per hour)
        const correctionRate = 0.01;

        if (marketData.demandLevel > targetDemand) {
            marketData.demandLevel -= (marketData.demandLevel - targetDemand) * correctionRate;
        } else if (marketData.demandLevel < targetDemand) {
            marketData.demandLevel += (targetDemand - marketData.demandLevel) * correctionRate;
        }

        if (marketData.supplyLevel > targetSupply) {
            marketData.supplyLevel -= (marketData.supplyLevel - targetSupply) * correctionRate;
        } else if (marketData.supplyLevel < targetSupply) {
            marketData.supplyLevel += (targetSupply - marketData.supplyLevel) * correctionRate;
        }
    }

    /**
     * Analyze trend for an item
     */
    private analyzeItemTrend(marketData: MarketData): MarketTrend {
        const recentHistory = marketData.priceHistory.slice(-24); // Last 24 hours
        if (recentHistory.length < 2) {
            return {
                itemId: marketData.itemId,
                trend: 'stable',
                changePercent: 0,
                prediction: 'neutral',
                reason: 'Insufficient data'
            };
        }

        const oldPrice = recentHistory[0].price;
        const currentPrice = recentHistory[recentHistory.length - 1].price;
        const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100;

        let trend: MarketTrend['trend'] = 'stable';
        let prediction: MarketTrend['prediction'] = 'neutral';
        let reason = '';

        if (Math.abs(changePercent) > 20) {
            trend = 'volatile';
            reason = 'High price volatility detected';
        } else if (changePercent > 10) {
            trend = 'rising';
            prediction = 'bullish';
            reason = 'Strong upward price movement';
        } else if (changePercent < -10) {
            trend = 'falling';
            prediction = 'bearish';
            reason = 'Declining prices';
        } else if (changePercent > 5) {
            trend = 'rising';
            reason = 'Gradual price increase';
        } else if (changePercent < -5) {
            trend = 'falling';
            reason = 'Gradual price decrease';
        } else {
            reason = 'Price stability';
        }

        // Adjust prediction based on supply/demand
        if (marketData.demandLevel > 70 && marketData.supplyLevel < 30) {
            prediction = 'bullish';
            reason += ' - High demand, low supply';
        } else if (marketData.demandLevel < 30 && marketData.supplyLevel > 70) {
            prediction = 'bearish';
            reason += ' - Low demand, high supply';
        }

        return {
            itemId: marketData.itemId,
            trend,
            changePercent,
            prediction,
            reason
        };
    }

    /**
     * Get initial demand based on item properties
     */
    private getInitialDemand(item: ShopItem): number {
        let demand = 50; // Base demand

        // Rarity affects demand
        switch (item.rarity) {
            case 'common': demand += 10; break;
            case 'uncommon': demand += 5; break;
            case 'rare': demand -= 5; break;
            case 'epic': demand -= 15; break;
            case 'legendary': demand -= 25; break;
        }

        // Category affects demand
        if (item.category === 'consumable') demand += 15; // High demand for consumables
        if (item.category === 'equipment') demand += 5;
        if (item.category === 'material') demand += 10;

        return Math.max(0, Math.min(100, demand + (Math.random() * 20 - 10))); // ±10 random
    }

    /**
     * Get initial supply based on item properties
     */
    private getInitialSupply(item: ShopItem): number {
        let supply = 50; // Base supply

        // Rarity affects supply (rare items have lower supply)
        switch (item.rarity) {
            case 'common': supply += 20; break;
            case 'uncommon': supply += 10; break;
            case 'rare': supply -= 10; break;
            case 'epic': supply -= 25; break;
            case 'legendary': supply -= 40; break;
        }

        return Math.max(0, Math.min(100, supply + (Math.random() * 20 - 10))); // ±10 random
    }

    /**
     * Get item popularity (affects how quickly demand changes)
     */
    private getItemPopularity(item: ShopItem): number {
        let popularity = 50;

        if (item.category === 'consumable') popularity += 30; // Consumables are popular
        if (item.category === 'equipment') popularity += 10;
        if (item.rarity === 'rare' || item.rarity === 'epic') popularity += 15;

        return Math.max(0, Math.min(100, popularity));
    }

    /**
     * Get item volatility (how much prices swing)
     */
    private getItemVolatility(item: ShopItem): number {
        let volatility = 20; // Base volatility

        if (item.rarity === 'epic' || item.rarity === 'legendary') volatility += 40; // Rare items more volatile
        if (item.category === 'material') volatility += 20; // Materials fluctuate more
        if (item.price > 100) volatility += 15; // Expensive items more volatile

        return Math.max(0, Math.min(100, volatility));
    }

    /**
     * Initialize market events
     */
    private initializeMarketEvents(): void {
        this.marketEvents = [
            {
                name: 'dragon_sighting',
                description: 'Dragon sighting increases demand for weapons and armor!',
                effects: [
                    { itemName: 'Basic Sword', demandChange: 25, supplyChange: -10 },
                    { itemName: 'Iron Shield', demandChange: 30, supplyChange: -15 },
                    { itemName: 'Hunting Bow', demandChange: 20, supplyChange: -5 }
                ]
            },
            {
                name: 'plague_outbreak',
                description: 'Plague outbreak creates massive demand for healing items!',
                effects: [
                    { itemName: 'Health Potion', demandChange: 40, supplyChange: -20 },
                    { itemName: 'Herbs', demandChange: 35, supplyChange: -25 }
                ]
            },
            {
                name: 'merchant_festival',
                description: 'Merchant festival increases supply and lowers prices!',
                effects: [
                    { itemName: 'Iron Ore', demandChange: -10, supplyChange: 30 },
                    { itemName: 'Crystal Shard', demandChange: -5, supplyChange: 25 }
                ]
            }
        ];
    }

    /**
     * Cleanup when system shuts down
     */
    cleanup(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

interface MarketEvent {
    name: string;
    description: string;
    effects: MarketEventEffect[];
}

interface MarketEventEffect {
    itemName: string;
    demandChange?: number;
    supplyChange?: number;
}
