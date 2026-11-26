import { CraftingSession, CraftingRecipe, CraftingMaterial, CraftingSkill } from '../types/CraftingTypes';
import { CraftingEngine } from './craftingEngine';

export interface CraftingAnalytics {
    // Overall Statistics
    totalCrafts: number;
    successfulCrafts: number;
    failedCrafts: number;
    successRate: number;

    // Time Statistics
    totalCraftingTime: number; // in minutes
    averageCraftingTime: number; // in minutes
    fastestCraft: number; // in minutes
    longestCraft: number; // in minutes

    // Quality Statistics
    qualityDistribution: Record<string, number>; // quality -> count
    criticalSuccesses: number;
    criticalSuccessRate: number;

    // Material Statistics
    materialsUsed: Record<string, number>; // materialId -> quantity
    mostUsedMaterials: Array<{ materialId: string; name: string; quantity: number }>;
    rareMaterialsUsed: number;

    // Recipe Statistics
    recipesCrafted: Record<string, number>; // recipeId -> count
    mostCraftedRecipes: Array<{ recipeId: string; name: string; count: number }>;
    uniqueRecipesCrafted: number;

    // Skill and Experience
    totalSkillGained: number;
    averageSkillPerCraft: number;
    skillLevel: number;

    // Rewards
    totalXpEarned: number;
    totalBoogersEarned: number;
    averageXpPerCraft: number;

    // Weekly/Monthly Trends
    weeklyCrafts: number[];
    monthlyCrafts: number[];

    // Performance Metrics
    efficiency: number; // success rate * quality bonus
    consistency: number; // how consistent the player's crafting is
}

export interface WeeklyCraftingData {
    craftsCompleted: number;
    successfulCrafts: number;
    totalCraftingTime: number;
    materialsUsed: Record<string, number>;
    xpEarned: number;
    boogersEarned: number;
    skillGained: number;
    qualityBreakdown: Record<string, number>;
}

export class CraftingAnalyticsService {
    private static instance: CraftingAnalyticsService;
    private storageKey = 'crafting-analytics-cache';

    private constructor() { }

    static getInstance(): CraftingAnalyticsService {
        if (!CraftingAnalyticsService.instance) {
            CraftingAnalyticsService.instance = new CraftingAnalyticsService();
        }
        return CraftingAnalyticsService.instance;
    }

    /**
     * Get comprehensive crafting analytics
     */
    getCraftingAnalytics(): CraftingAnalytics {
        const sessions = CraftingEngine.getCraftingSessions();
        const recipes = CraftingEngine.getRecipes();

        if (sessions.length === 0) {
            return this.getEmptyAnalytics();
        }

        // Calculate basic statistics
        const totalCrafts = sessions.length;
        const successfulCrafts = sessions.filter(s => s.status === 'completed').length;
        const failedCrafts = sessions.filter(s => s.status === 'failed').length;
        const successRate = totalCrafts > 0 ? (successfulCrafts / totalCrafts) * 100 : 0;

        // Time statistics
        const completedSessions = sessions.filter(s => s.status === 'completed' && s.endTime);
        const craftingTimes = completedSessions.map(s => (s.endTime! - s.startTime) / (1000 * 60)); // Convert to minutes
        const totalCraftingTime = craftingTimes.reduce((sum, time) => sum + time, 0);
        const averageCraftingTime = craftingTimes.length > 0 ? totalCraftingTime / craftingTimes.length : 0;
        const fastestCraft = craftingTimes.length > 0 ? Math.min(...craftingTimes) : 0;
        const longestCraft = craftingTimes.length > 0 ? Math.max(...craftingTimes) : 0;

        // Quality statistics
        const qualityDistribution: Record<string, number> = {};
        let criticalSuccesses = 0;
        completedSessions.forEach(session => {
            const quality = session.quality || 'basic';
            qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1;
            if (session.criticalSuccess) criticalSuccesses++;
        });
        const criticalSuccessRate = successfulCrafts > 0 ? (criticalSuccesses / successfulCrafts) * 100 : 0;

        // Material statistics
        const materialsUsed: Record<string, number> = {};
        let rareMaterialsUsed = 0;
        sessions.forEach(session => {
            session.materialsUsed.forEach(material => {
                materialsUsed[material.materialId] = (materialsUsed[material.materialId] || 0) + material.quantity;
                // Count rare materials (you might need to check material rarity from a materials list)
            });
        });

        // Recipe statistics
        const recipesCrafted: Record<string, number> = {};
        sessions.forEach(session => {
            recipesCrafted[session.recipeId] = (recipesCrafted[session.recipeId] || 0) + 1;
        });
        const uniqueRecipesCrafted = Object.keys(recipesCrafted).length;

        // Skill and experience
        const totalSkillGained = sessions.reduce((sum, s) => sum + (s.skillGained || 0), 0);
        const averageSkillPerCraft = totalCrafts > 0 ? totalSkillGained / totalCrafts : 0;

        // Rewards
        const totalXpEarned = sessions.reduce((sum, s) => {
            const recipe = recipes.find(r => r.id === s.recipeId);
            return sum + (recipe?.xpReward || 0);
        }, 0);
        const totalBoogersEarned = sessions.reduce((sum, s) => {
            const recipe = recipes.find(r => r.id === s.recipeId);
            return sum + (recipe?.boogersReward || 0);
        }, 0);
        const averageXpPerCraft = totalCrafts > 0 ? totalXpEarned / totalCrafts : 0;

        // Weekly/Monthly trends (simplified - you might want to calculate this based on actual dates)
        const weeklyCrafts = [0, 0, 0, 0, 0, 0, 0]; // Placeholder
        const monthlyCrafts = [0, 0, 0, 0]; // Placeholder

        // Performance metrics
        const efficiency = successRate * (1 + (criticalSuccessRate / 100));
        const consistency = this.calculateConsistency(sessions);

        return {
            totalCrafts,
            successfulCrafts,
            failedCrafts,
            successRate,
            totalCraftingTime,
            averageCraftingTime,
            fastestCraft,
            longestCraft,
            qualityDistribution,
            criticalSuccesses,
            criticalSuccessRate,
            materialsUsed,
            mostUsedMaterials: this.getMostUsedMaterials(materialsUsed),
            rareMaterialsUsed,
            recipesCrafted,
            mostCraftedRecipes: this.getMostCraftedRecipes(recipesCrafted, recipes),
            uniqueRecipesCrafted,
            totalSkillGained,
            averageSkillPerCraft,
            skillLevel: 0, // You might want to get this from player data
            totalXpEarned,
            totalBoogersEarned,
            averageXpPerCraft,
            weeklyCrafts,
            monthlyCrafts,
            efficiency,
            consistency
        };
    }

    /**
     * Get weekly crafting data for a specific week
     */
    getWeeklyCraftingData(startDate: Date, endDate: Date): WeeklyCraftingData {
        const sessions = CraftingEngine.getCraftingSessions();
        const recipes = CraftingEngine.getRecipes();

        const weeklySessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= startDate && sessionDate <= endDate;
        });

        const completedSessions = weeklySessions.filter(s => s.status === 'completed');
        const successfulCrafts = completedSessions.length;
        const totalCraftingTime = completedSessions.reduce((sum, s) => {
            if (s.endTime) {
                return sum + (s.endTime - s.startTime) / (1000 * 60); // Convert to minutes
            }
            return sum;
        }, 0);

        // Materials used this week
        const materialsUsed: Record<string, number> = {};
        weeklySessions.forEach(session => {
            session.materialsUsed.forEach(material => {
                materialsUsed[material.materialId] = (materialsUsed[material.materialId] || 0) + material.quantity;
            });
        });

        // Rewards earned this week
        const xpEarned = weeklySessions.reduce((sum, s) => {
            const recipe = recipes.find(r => r.id === s.recipeId);
            return sum + (recipe?.xpReward || 0);
        }, 0);

        const boogersEarned = weeklySessions.reduce((sum, s) => {
            const recipe = recipes.find(r => r.id === s.recipeId);
            return sum + (recipe?.boogersReward || 0);
        }, 0);

        const skillGained = weeklySessions.reduce((sum, s) => sum + (s.skillGained || 0), 0);

        // Quality breakdown
        const qualityBreakdown: Record<string, number> = {};
        completedSessions.forEach(session => {
            const quality = session.quality || 'basic';
            qualityBreakdown[quality] = (qualityBreakdown[quality] || 0) + 1;
        });

        return {
            craftsCompleted: weeklySessions.length,
            successfulCrafts,
            totalCraftingTime,
            materialsUsed,
            xpEarned,
            boogersEarned,
            skillGained,
            qualityBreakdown
        };
    }

    /**
     * Get crafting skill level (placeholder - you might want to get this from player data)
     */
    getCraftingSkillLevel(): number {
        // This would typically come from player data
        // For now, we'll calculate it based on total XP earned
        const analytics = this.getCraftingAnalytics();
        return Math.floor(analytics.totalXpEarned / 100); // Simple level calculation
    }

    private getEmptyAnalytics(): CraftingAnalytics {
        return {
            totalCrafts: 0,
            successfulCrafts: 0,
            failedCrafts: 0,
            successRate: 0,
            totalCraftingTime: 0,
            averageCraftingTime: 0,
            fastestCraft: 0,
            longestCraft: 0,
            qualityDistribution: {},
            criticalSuccesses: 0,
            criticalSuccessRate: 0,
            materialsUsed: {},
            mostUsedMaterials: [],
            rareMaterialsUsed: 0,
            recipesCrafted: {},
            mostCraftedRecipes: [],
            uniqueRecipesCrafted: 0,
            totalSkillGained: 0,
            averageSkillPerCraft: 0,
            skillLevel: 0,
            totalXpEarned: 0,
            totalBoogersEarned: 0,
            averageXpPerCraft: 0,
            weeklyCrafts: [0, 0, 0, 0, 0, 0, 0],
            monthlyCrafts: [0, 0, 0, 0],
            efficiency: 0,
            consistency: 0
        };
    }

    private getMostUsedMaterials(materialsUsed: Record<string, number>): Array<{ materialId: string; name: string; quantity: number }> {
        return Object.entries(materialsUsed)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([materialId, quantity]) => ({
                materialId,
                name: materialId, // You might want to get the actual material name
                quantity
            }));
    }

    private getMostCraftedRecipes(recipesCrafted: Record<string, number>, recipes: CraftingRecipe[]): Array<{ recipeId: string; name: string; count: number }> {
        return Object.entries(recipesCrafted)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([recipeId, count]) => {
                const recipe = recipes.find(r => r.id === recipeId);
                return {
                    recipeId,
                    name: recipe?.name || recipeId,
                    count
                };
            });
    }

    private calculateConsistency(sessions: CraftingSession[]): number {
        if (sessions.length < 2) return 100;

        const successRates = [];
        const batchSize = Math.max(1, Math.floor(sessions.length / 5));

        for (let i = 0; i < sessions.length; i += batchSize) {
            const batch = sessions.slice(i, i + batchSize);
            const batchSuccessRate = batch.filter(s => s.status === 'completed').length / batch.length;
            successRates.push(batchSuccessRate);
        }

        // Calculate variance in success rates
        const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
        const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
        const standardDeviation = Math.sqrt(variance);

        // Convert to consistency score (0-100, higher is more consistent)
        return Math.max(0, 100 - (standardDeviation * 100));
    }
}

// Export singleton instance
export const craftingAnalyticsService = CraftingAnalyticsService.getInstance();
