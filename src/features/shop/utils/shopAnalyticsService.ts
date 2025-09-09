import { CoinTransactionTracker } from '../../../shared/utils/coinTransactionTracker';
import { readInventory, computeSellValue } from '../../inventory/utils/updateInventoryFile';
import { readPlayerData } from '../../player/utils/playerDataUtils';
import type GamifiedObsidianPlugin from '../../../core/main';

export interface ShopAnalytics {
    // Purchase Statistics
    totalPurchases: number;
    totalSpent: number;
    averagePurchaseValue: number;
    mostExpensivePurchase: number;

    // Item Statistics
    totalItemsBought: number;
    uniqueItemsBought: number;
    mostPurchasedItems: Array<{ itemName: string; category: string; count: number; totalSpent: number }>;

    // Category Breakdown
    categoryBreakdown: Record<string, {
        purchases: number;
        totalSpent: number;
        averagePrice: number;
        topItems: string[];
    }>;

    // Spending Patterns
    spendingByDay: number[]; // 7-day breakdown
    spendingByHour: number[]; // 24-hour breakdown
    peakSpendingTimes: string[];
    spendingTrend: 'increasing' | 'stable' | 'decreasing';

    // Market Analysis
    averageItemValue: number;
    priceEfficiency: number; // how well player finds good deals
    itemDiversity: number; // variety of items purchased

    // Inventory Insights
    inventoryValue: number;
    unusedItemsValue: number;
    topValueItems: Array<{ name: string; value: number; quantity: number }>;

    // Financial Health
    spendingToEarningRatio: number;
    budgetUtilization: number;
    savingsRate: number;

    // Recommendations
    recommendations: string[];
}

export interface WeeklyShopData {
    totalPurchases: number;
    totalSpent: number;
    itemsBought: number;
    averagePurchaseValue: number;
    topCategories: Array<{ category: string; spent: number; purchases: number }>;
    dailySpending: number[];
    biggestPurchase: { item: string; amount: number };
}

export class ShopAnalyticsService {
    private static instance: ShopAnalyticsService;
    private storageKey = 'shop-analytics-cache';
    private purchaseHistory: Array<{
        itemName: string;
        category: string;
        price: number;
        quantity: number;
        timestamp: Date;
        playerLevel: number;
        playerCoins: number;
    }> = [];

    private constructor() {
        this.loadPurchaseHistory();
    }

    static getInstance(): ShopAnalyticsService {
        if (!ShopAnalyticsService.instance) {
            ShopAnalyticsService.instance = new ShopAnalyticsService();
        }
        return ShopAnalyticsService.instance;
    }

    /**
     * Get comprehensive shop analytics
     */
    async getShopAnalytics(plugin: GamifiedObsidianPlugin): Promise<ShopAnalytics> {
        try {
            // Get coin transaction data for additional insights
            const coinData = await CoinTransactionTracker.getCoinFlowData(
                plugin.app.vault,
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                new Date()
            );

            // Calculate basic purchase statistics
            const totalPurchases = this.purchaseHistory.length;
            const totalSpent = this.purchaseHistory.reduce((sum, p) => sum + (p.price * p.quantity), 0);
            const averagePurchaseValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
            const mostExpensivePurchase = Math.max(...this.purchaseHistory.map(p => p.price * p.quantity), 0);

            // Item statistics
            const totalItemsBought = this.purchaseHistory.reduce((sum, p) => sum + p.quantity, 0);
            const uniqueItemsBought = new Set(this.purchaseHistory.map(p => p.itemName)).size;
            const mostPurchasedItems = this.calculateMostPurchasedItems();

            // Category breakdown
            const categoryBreakdown = this.calculateCategoryBreakdown();

            // Spending patterns
            const spendingByDay = this.calculateSpendingByDay();
            const spendingByHour = this.calculateSpendingByHour();
            const peakSpendingTimes = this.findPeakSpendingTimes(spendingByHour);
            const spendingTrend = this.calculateSpendingTrend();

            // Market analysis
            const averageItemValue = this.calculateAverageItemValue();
            const priceEfficiency = this.calculatePriceEfficiency();
            const itemDiversity = this.calculateItemDiversity();

            // Inventory insights
            const inventoryInsights = await this.calculateInventoryInsights(plugin);

            // Financial health
            const financialHealth = this.calculateFinancialHealth(coinData);

            // Generate recommendations
            const recommendations = this.generateRecommendations(
                spendingTrend,
                categoryBreakdown,
                financialHealth.spendingToEarningRatio
            );

            return {
                // Purchase Statistics
                totalPurchases,
                totalSpent,
                averagePurchaseValue,
                mostExpensivePurchase,

                // Item Statistics
                totalItemsBought,
                uniqueItemsBought,
                mostPurchasedItems,

                // Category Breakdown
                categoryBreakdown,

                // Spending Patterns
                spendingByDay,
                spendingByHour,
                peakSpendingTimes,
                spendingTrend,

                // Market Analysis
                averageItemValue,
                priceEfficiency,
                itemDiversity,

                // Inventory Insights
                inventoryValue: inventoryInsights.inventoryValue,
                unusedItemsValue: inventoryInsights.unusedItemsValue,
                topValueItems: inventoryInsights.topValueItems,

                // Financial Health
                spendingToEarningRatio: financialHealth.spendingToEarningRatio,
                budgetUtilization: financialHealth.budgetUtilization,
                savingsRate: financialHealth.savingsRate,

                // Recommendations
                recommendations
            };
        } catch (error) {
            console.error('Failed to calculate shop analytics:', error);
            return this.getEmptyAnalytics();
        }
    }

    /**
     * Get weekly shop data for a specific week
     */
    getWeeklyShopData(startDate: Date, endDate: Date): WeeklyShopData {
        const weeklyPurchases = this.purchaseHistory.filter(
            purchase => purchase.timestamp >= startDate && purchase.timestamp <= endDate
        );

        if (weeklyPurchases.length === 0) {
            return {
                totalPurchases: 0,
                totalSpent: 0,
                itemsBought: 0,
                averagePurchaseValue: 0,
                topCategories: [],
                dailySpending: [0, 0, 0, 0, 0, 0, 0],
                biggestPurchase: { item: '', amount: 0 }
            };
        }

        const totalPurchases = weeklyPurchases.length;
        const totalSpent = weeklyPurchases.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const itemsBought = weeklyPurchases.reduce((sum, p) => sum + p.quantity, 0);
        const averagePurchaseValue = totalSpent / totalPurchases;

        // Calculate daily spending
        const dailySpending = [0, 0, 0, 0, 0, 0, 0];
        weeklyPurchases.forEach(purchase => {
            const dayIndex = purchase.timestamp.getDay();
            dailySpending[dayIndex] += purchase.price * purchase.quantity;
        });

        // Top categories
        const categorySpending: Record<string, { spent: number; purchases: number }> = {};
        weeklyPurchases.forEach(purchase => {
            const category = purchase.category || 'Uncategorized';
            if (!categorySpending[category]) {
                categorySpending[category] = { spent: 0, purchases: 0 };
            }
            categorySpending[category].spent += purchase.price * purchase.quantity;
            categorySpending[category].purchases += 1;
        });

        const topCategories = Object.entries(categorySpending)
            .map(([category, data]) => ({ category, ...data }))
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5);

        // Biggest purchase
        const biggestPurchase = weeklyPurchases.reduce(
            (max, p) => {
                const purchaseValue = p.price * p.quantity;
                return purchaseValue > max.amount
                    ? { item: p.itemName, amount: purchaseValue }
                    : max;
            },
            { item: '', amount: 0 }
        );

        return {
            totalPurchases,
            totalSpent,
            itemsBought,
            averagePurchaseValue,
            topCategories,
            dailySpending,
            biggestPurchase
        };
    }

    /**
     * Log a purchase for analytics
     */
    logPurchase(
        itemName: string,
        category: string,
        price: number,
        quantity: number,
        playerLevel: number,
        playerCoins: number
    ): void {
        this.purchaseHistory.push({
            itemName,
            category,
            price,
            quantity,
            timestamp: new Date(),
            playerLevel,
            playerCoins
        });

        // Keep only last 1000 purchases
        if (this.purchaseHistory.length > 1000) {
            this.purchaseHistory = this.purchaseHistory.slice(-500);
        }

        this.savePurchaseHistory();
    }

    private calculateMostPurchasedItems(): Array<{ itemName: string; category: string; count: number; totalSpent: number }> {
        const itemCounts: Record<string, { category: string; count: number; totalSpent: number }> = {};

        this.purchaseHistory.forEach(purchase => {
            const key = purchase.itemName;
            if (!itemCounts[key]) {
                itemCounts[key] = {
                    category: purchase.category,
                    count: 0,
                    totalSpent: 0
                };
            }
            itemCounts[key].count += purchase.quantity;
            itemCounts[key].totalSpent += purchase.price * purchase.quantity;
        });

        return Object.entries(itemCounts)
            .map(([itemName, data]) => ({ itemName, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    private calculateCategoryBreakdown(): Record<string, { purchases: number; totalSpent: number; averagePrice: number; topItems: string[] }> {
        const categories: Record<string, {
            purchases: number;
            totalSpent: number;
            items: Record<string, number>;
        }> = {};

        this.purchaseHistory.forEach(purchase => {
            const category = purchase.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = { purchases: 0, totalSpent: 0, items: {} };
            }

            categories[category].purchases += 1;
            categories[category].totalSpent += purchase.price * purchase.quantity;

            const itemKey = purchase.itemName;
            categories[category].items[itemKey] = (categories[category].items[itemKey] || 0) + purchase.quantity;
        });

        // Convert to final format
        const result: Record<string, { purchases: number; totalSpent: number; averagePrice: number; topItems: string[] }> = {};

        for (const [category, data] of Object.entries(categories)) {
            const topItems = Object.entries(data.items)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([itemName]) => itemName);

            result[category] = {
                purchases: data.purchases,
                totalSpent: data.totalSpent,
                averagePrice: data.purchases > 0 ? data.totalSpent / data.purchases : 0,
                topItems
            };
        }

        return result;
    }

    private calculateSpendingByDay(): number[] {
        const spendingByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

        this.purchaseHistory.forEach(purchase => {
            const dayIndex = purchase.timestamp.getDay();
            spendingByDay[dayIndex] += purchase.price * purchase.quantity;
        });

        return spendingByDay;
    }

    private calculateSpendingByHour(): number[] {
        const spendingByHour = Array(24).fill(0);

        this.purchaseHistory.forEach(purchase => {
            const hour = purchase.timestamp.getHours();
            spendingByHour[hour] += purchase.price * purchase.quantity;
        });

        return spendingByHour;
    }

    private findPeakSpendingTimes(spendingByHour: number[]): string[] {
        const average = spendingByHour.reduce((sum, val) => sum + val, 0) / spendingByHour.length;

        return spendingByHour
            .map((spending, hour) => ({ spending, hour }))
            .filter(({ spending }) => spending > average * 1.5)
            .sort((a, b) => b.spending - a.spending)
            .slice(0, 3)
            .map(({ hour }) => {
                if (hour === 0) return '12 AM';
                if (hour < 12) return `${hour} AM`;
                if (hour === 12) return '12 PM';
                return `${hour - 12} PM`;
            });
    }

    private calculateSpendingTrend(): 'increasing' | 'stable' | 'decreasing' {
        if (this.purchaseHistory.length < 10) return 'stable';

        const recent = this.purchaseHistory.slice(-5);
        const earlier = this.purchaseHistory.slice(-10, -5);

        const recentSpending = recent.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const earlierSpending = earlier.reduce((sum, p) => sum + (p.price * p.quantity), 0);

        if (recentSpending > earlierSpending * 1.2) return 'increasing';
        if (recentSpending < earlierSpending * 0.8) return 'decreasing';
        return 'stable';
    }

    private calculateAverageItemValue(): number {
        if (this.purchaseHistory.length === 0) return 0;
        return this.purchaseHistory.reduce((sum, p) => sum + p.price, 0) / this.purchaseHistory.length;
    }

    private calculatePriceEfficiency(): number {
        // Placeholder calculation - would need market price data for real efficiency
        // For now, assume efficiency based on purchase frequency (frequent buyers get better deals)
        const purchaseFrequency = this.purchaseHistory.length;
        return Math.min(100, 50 + (purchaseFrequency * 2));
    }

    private calculateItemDiversity(): number {
        const uniqueItems = new Set(this.purchaseHistory.map(p => p.itemName)).size;
        const totalPurchases = this.purchaseHistory.length;

        if (totalPurchases === 0) return 0;
        return Math.min(100, (uniqueItems / Math.max(1, totalPurchases / 2)) * 100);
    }

    private async calculateInventoryInsights(plugin: GamifiedObsidianPlugin): Promise<{
        inventoryValue: number;
        unusedItemsValue: number;
        topValueItems: Array<{ name: string; value: number; quantity: number }>;
    }> {
        try {
            // Read actual inventory data
            const inventoryItems = await readInventory(plugin.app.vault);
            const playerData = await readPlayerData(plugin.app.vault);

            let totalInventoryValue = 0;
            let unusedItemsValue = 0;
            const itemValues: Array<{ name: string; value: number; quantity: number }> = [];

            inventoryItems.forEach(item => {
                // Calculate item value using the same logic as the shop
                const sellValue = computeSellValue({
                    price: item.price || item.value || 0,
                    rarity: item.rarity,
                    category: item.category
                }, playerData || undefined);

                const quantity = item.quantity || item.stock || 1;
                const totalItemValue = sellValue * quantity;

                totalInventoryValue += totalItemValue;

                // Consider items as "unused" if they're consumables with high quantities
                // This is a simplified heuristic for identifying potentially unused items
                const isConsumable = (item.category || '').toLowerCase().includes('consumable') ||
                    (item.category || '').toLowerCase().includes('potion') ||
                    (item.category || '').toLowerCase().includes('food');

                if (isConsumable && quantity > 3) {
                    // Assume half of excess consumables are unused
                    const excessQuantity = quantity - 3;
                    unusedItemsValue += sellValue * excessQuantity * 0.5;
                }

                itemValues.push({
                    name: item.name,
                    value: sellValue,
                    quantity
                });
            });

            // Sort by total value (value * quantity) and take top 10
            const topValueItems = itemValues
                .sort((a, b) => (b.value * b.quantity) - (a.value * a.quantity))
                .slice(0, 10);

            return {
                inventoryValue: Math.round(totalInventoryValue),
                unusedItemsValue: Math.round(unusedItemsValue),
                topValueItems
            };
        } catch (error) {
            console.error('[ShopAnalyticsService] Error calculating inventory insights:', error);
            return {
                inventoryValue: 0,
                unusedItemsValue: 0,
                topValueItems: []
            };
        }
    }

    private calculateFinancialHealth(coinData: { totalEarned?: number; totalSpent?: number } | null): {
        spendingToEarningRatio: number;
        budgetUtilization: number;
        savingsRate: number;
    } {
        const totalSpent = this.purchaseHistory.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const totalEarned = coinData?.totalEarned || 1; // Avoid division by zero

        const spendingToEarningRatio = Math.min(100, (totalSpent / totalEarned) * 100);
        const budgetUtilization = Math.min(100, spendingToEarningRatio); // Simplified
        const savingsRate = Math.max(0, 100 - spendingToEarningRatio);

        return {
            spendingToEarningRatio,
            budgetUtilization,
            savingsRate
        };
    }

    private generateRecommendations(
        spendingTrend: string,
        categoryBreakdown: Record<string, { totalSpent: number; purchases: number; averagePrice: number; topItems: string[] }>,
        spendingToEarningRatio: number
    ): string[] {
        const recommendations: string[] = [];

        if (spendingTrend === 'increasing') {
            recommendations.push('Your spending is increasing - consider setting a weekly budget');
        }

        if (spendingToEarningRatio > 80) {
            recommendations.push('High spending ratio detected - focus on earning more coins');
        }

        const categories = Object.keys(categoryBreakdown);
        if (categories.length > 0) {
            const topCategory = categories.reduce((max, cat) =>
                categoryBreakdown[cat].totalSpent > categoryBreakdown[max].totalSpent ? cat : max
            );
            recommendations.push(`You spend most on ${topCategory} - look for deals in this category`);
        }

        if (this.purchaseHistory.length > 20) {
            recommendations.push('You\'re an experienced shopper! Consider bulk purchases for better value');
        }

        return recommendations.slice(0, 3);
    }

    private getEmptyAnalytics(): ShopAnalytics {
        return {
            totalPurchases: 0,
            totalSpent: 0,
            averagePurchaseValue: 0,
            mostExpensivePurchase: 0,
            totalItemsBought: 0,
            uniqueItemsBought: 0,
            mostPurchasedItems: [],
            categoryBreakdown: {},
            spendingByDay: [0, 0, 0, 0, 0, 0, 0],
            spendingByHour: Array(24).fill(0),
            peakSpendingTimes: [],
            spendingTrend: 'stable',
            averageItemValue: 0,
            priceEfficiency: 0,
            itemDiversity: 0,
            inventoryValue: 0,
            unusedItemsValue: 0,
            topValueItems: [],
            spendingToEarningRatio: 0,
            budgetUtilization: 0,
            savingsRate: 100,
            recommendations: []
        };
    }

    private loadPurchaseHistory(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as Array<{
                    itemName: string;
                    category: string;
                    price: number;
                    quantity: number;
                    timestamp: string;
                    playerLevel: number;
                    playerCoins: number;
                }>;
                this.purchaseHistory = parsed.map((item) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            }
        } catch {
            this.purchaseHistory = [];
        }
    }

    private savePurchaseHistory(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.purchaseHistory));
        } catch (error) {
            console.error('Failed to save purchase history:', error);
        }
    }
}

// Export singleton instance
export const shopAnalyticsService = ShopAnalyticsService.getInstance();
