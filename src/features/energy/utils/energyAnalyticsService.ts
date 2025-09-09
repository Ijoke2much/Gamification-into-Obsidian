import { EnergyState, EnergyActivity } from './energyManagementSystem';
import { PlayerData } from '../../../data/models/PlayerData';
import { playerStore } from '../../../shared/state/playerStore';

export interface EnergyAnalytics {
    // Current State
    currentEnergy: number;
    currentFocus: number;
    currentMotivation: number;
    currentCalm: number;
    currentStress: number;

    // Daily Statistics
    energySpentToday: number;
    energyGainedToday: number;
    activitiesCompletedToday: number;
    restPeriodsToday: number;
    qualityScore: number;

    // Weekly Statistics
    averageDailyEnergy: number;
    averageDailyFocus: number;
    averageDailyMotivation: number;
    averageDailyCalm: number;
    averageDailyStress: number;
    totalEnergySpent: number;
    totalEnergyGained: number;
    totalActivities: number;
    totalRestPeriods: number;

    // Activity Breakdown
    activityBreakdown: Record<string, number>; // activityId -> count
    energyByActivityType: Record<string, number>; // activityType -> total energy
    mostUsedActivities: Array<{ activityId: string; name: string; count: number }>;

    // Time-based Analysis
    energyByHour: number[]; // 24-hour breakdown
    energyByDay: number[]; // 7-day breakdown
    peakEnergyHours: number[];
    lowEnergyHours: number[];

    // Performance Metrics
    efficiency: number; // energy spent vs activities completed
    consistency: number; // how consistent energy levels are
    recoveryRate: number; // how quickly energy recovers
    stressManagement: number; // how well stress is managed

    // Trends
    energyTrend: 'rising' | 'stable' | 'declining' | 'critical';
    weeklyTrend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
}

export interface WeeklyEnergyData {
    averageEnergy: number;
    averageFocus: number;
    averageMotivation: number;
    averageCalm: number;
    averageStress: number;
    totalEnergySpent: number;
    totalEnergyGained: number;
    activitiesCompleted: number;
    restPeriods: number;
    qualityScores: number[];
    energyByDay: number[];
}

export class EnergyAnalyticsService {
    private static instance: EnergyAnalyticsService;
    private storageKey = 'energy-analytics-cache';
    private activityHistory: Array<{
        activityId: string;
        timestamp: Date;
        energyChange: number;
        duration: number;
    }> = [];

    private constructor() {
        this.loadActivityHistory();
    }

    static getInstance(): EnergyAnalyticsService {
        if (!EnergyAnalyticsService.instance) {
            EnergyAnalyticsService.instance = new EnergyAnalyticsService();
        }
        return EnergyAnalyticsService.instance;
    }

    /**
     * Get comprehensive energy analytics
     */
    async getEnergyAnalytics(): Promise<EnergyAnalytics> {
        const playerData = await playerStore.get();
        if (!playerData) {
            return this.getEmptyAnalytics();
        }

        const currentState = await this.getCurrentEnergyState();

        // Calculate daily statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayActivities = this.activityHistory.filter(
            activity => activity.timestamp >= today
        );

        const energySpentToday = todayActivities
            .filter(a => a.energyChange < 0)
            .reduce((sum, a) => sum + Math.abs(a.energyChange), 0);

        const energyGainedToday = todayActivities
            .filter(a => a.energyChange > 0)
            .reduce((sum, a) => sum + a.energyChange, 0);

        // Calculate weekly statistics
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weeklyActivities = this.activityHistory.filter(
            activity => activity.timestamp >= weekStart
        );

        const weeklyEnergyData = this.calculateWeeklyEnergyData(weeklyActivities);

        // Activity breakdown
        const activityBreakdown: Record<string, number> = {};
        const energyByActivityType: Record<string, number> = {};

        weeklyActivities.forEach(activity => {
            activityBreakdown[activity.activityId] = (activityBreakdown[activity.activityId] || 0) + 1;
            // You might want to get activity type from the activity definition
            const activityType = 'productive'; // Placeholder
            energyByActivityType[activityType] = (energyByActivityType[activityType] || 0) + activity.energyChange;
        });

        // Time-based analysis
        const energyByHour = this.calculateEnergyByHour();
        const energyByDay = weeklyEnergyData.energyByDay;
        const peakEnergyHours = this.findPeakHours(energyByHour);
        const lowEnergyHours = this.findLowHours(energyByHour);

        // Performance metrics
        const efficiency = this.calculateEfficiency(energySpentToday, todayActivities.length);
        const consistency = this.calculateConsistency(energyByDay);
        const recoveryRate = this.calculateRecoveryRate(weeklyActivities);
        const stressManagement = this.calculateStressManagement(currentState);

        // Trends and recommendations
        const energyTrend = currentState.energyTrend;
        const weeklyTrend = this.calculateWeeklyTrend(energyByDay);
        const recommendations = this.generateRecommendations(currentState, weeklyEnergyData);

        return {
            // Current State
            currentEnergy: currentState.energy,
            currentFocus: currentState.focus,
            currentMotivation: currentState.motivation,
            currentCalm: currentState.calm,
            currentStress: currentState.stress,

            // Daily Statistics
            energySpentToday,
            energyGainedToday,
            activitiesCompletedToday: todayActivities.length,
            restPeriodsToday: currentState.restPeriodsToday,
            qualityScore: currentState.qualityScore,

            // Weekly Statistics
            averageDailyEnergy: weeklyEnergyData.averageEnergy,
            averageDailyFocus: weeklyEnergyData.averageFocus,
            averageDailyMotivation: weeklyEnergyData.averageMotivation,
            averageDailyCalm: weeklyEnergyData.averageCalm,
            averageDailyStress: weeklyEnergyData.averageStress,
            totalEnergySpent: weeklyEnergyData.totalEnergySpent,
            totalEnergyGained: weeklyEnergyData.totalEnergyGained,
            totalActivities: weeklyEnergyData.activitiesCompleted,
            totalRestPeriods: weeklyEnergyData.restPeriods,

            // Activity Breakdown
            activityBreakdown,
            energyByActivityType,
            mostUsedActivities: this.getMostUsedActivities(activityBreakdown),

            // Time-based Analysis
            energyByHour,
            energyByDay,
            peakEnergyHours,
            lowEnergyHours,

            // Performance Metrics
            efficiency,
            consistency,
            recoveryRate,
            stressManagement,

            // Trends
            energyTrend,
            weeklyTrend,
            recommendations
        };
    }

    /**
     * Get weekly energy data for a specific week
     */
    getWeeklyEnergyData(startDate: Date, endDate: Date): WeeklyEnergyData {
        const weeklyActivities = this.activityHistory.filter(
            activity => activity.timestamp >= startDate && activity.timestamp <= endDate
        );

        return this.calculateWeeklyEnergyData(weeklyActivities);
    }

    /**
     * Log an energy activity for analytics
     */
    logEnergyActivity(activityId: string, energyChange: number, duration: number): void {
        this.activityHistory.push({
            activityId,
            timestamp: new Date(),
            energyChange,
            duration
        });

        // Keep only last 1000 activities
        if (this.activityHistory.length > 1000) {
            this.activityHistory = this.activityHistory.slice(-500);
        }

        this.saveActivityHistory();
    }

    private async getCurrentEnergyState(): Promise<EnergyState> {
        // Get actual energy state from the management system
        try {
            const { EnergyManagementSystem } = await import('./energyManagementSystem');
            return await EnergyManagementSystem.getCurrentEnergyState();
        } catch (error) {
            console.warn('Failed to get current energy state, using fallback:', error);

            // Fallback to basic state
            const playerData = await playerStore.get();
            if (!playerData) {
                throw new Error('Player data not available');
            }

            return {
                energy: playerData.stats?.energy || 70,
                focus: playerData.stats?.focus || 70,
                motivation: playerData.stats?.motivation || 70,
                calm: playerData.stats?.calm || 70,
                stress: playerData.stats?.stress || 30,
                maxEnergy: 100,
                energyRegenRate: 5,
                restingEnergy: 0,
                energySpentToday: 0,
                activitiesCompleted: 0,
                restPeriodsToday: 0,
                qualityScore: 75,
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().getDay(),
                seasonalMultiplier: 1.0,
                lastRestTime: new Date(),
                nextRecommendedRest: new Date(),
                energyTrend: 'stable'
            };
        }
    }

    private calculateWeeklyEnergyData(activities: Array<{ energyChange: number; timestamp: Date }>): WeeklyEnergyData {
        const energyByDay = [0, 0, 0, 0, 0, 0, 0];
        const qualityScores = [75, 80, 70, 85, 75, 80, 75]; // Placeholder

        activities.forEach(activity => {
            const dayIndex = activity.timestamp.getDay();
            energyByDay[dayIndex] += activity.energyChange;
        });

        const totalEnergySpent = activities
            .filter(a => a.energyChange < 0)
            .reduce((sum, a) => sum + Math.abs(a.energyChange), 0);

        const totalEnergyGained = activities
            .filter(a => a.energyChange > 0)
            .reduce((sum, a) => sum + a.energyChange, 0);

        return {
            averageEnergy: 75, // Placeholder
            averageFocus: 70,
            averageMotivation: 75,
            averageCalm: 80,
            averageStress: 30,
            totalEnergySpent,
            totalEnergyGained,
            activitiesCompleted: activities.length,
            restPeriods: Math.floor(activities.length / 3), // Placeholder
            qualityScores,
            energyByDay
        };
    }

    private calculateEnergyByHour(): number[] {
        // Placeholder - would calculate based on actual activity history
        return Array(24).fill(0).map((_, i) => {
            if (i >= 9 && i <= 17) return 70 + Math.random() * 20; // Work hours
            if (i >= 18 && i <= 22) return 60 + Math.random() * 15; // Evening
            return 50 + Math.random() * 20; // Night/morning
        });
    }

    private findPeakHours(energyByHour: number[]): number[] {
        const average = energyByHour.reduce((sum, val) => sum + val, 0) / energyByHour.length;
        return energyByHour
            .map((energy, hour) => ({ energy, hour }))
            .filter(({ energy }) => energy > average + 10)
            .map(({ hour }) => hour);
    }

    private findLowHours(energyByHour: number[]): number[] {
        const average = energyByHour.reduce((sum, val) => sum + val, 0) / energyByHour.length;
        return energyByHour
            .map((energy, hour) => ({ energy, hour }))
            .filter(({ energy }) => energy < average - 10)
            .map(({ hour }) => hour);
    }

    private calculateEfficiency(energySpent: number, activitiesCompleted: number): number {
        if (activitiesCompleted === 0) return 0;
        return Math.min(100, (activitiesCompleted / Math.max(1, energySpent / 10)) * 100);
    }

    private calculateConsistency(energyByDay: number[]): number {
        if (energyByDay.length < 2) return 100;

        const mean = energyByDay.reduce((sum, val) => sum + val, 0) / energyByDay.length;
        const variance = energyByDay.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / energyByDay.length;
        const standardDeviation = Math.sqrt(variance);

        return Math.max(0, 100 - (standardDeviation * 2));
    }

    private calculateRecoveryRate(activities: Array<{ energyChange: number }>): number {
        const restorativeActivities = activities.filter(a => a.energyChange > 0);
        if (restorativeActivities.length === 0) return 0;

        const totalRecovery = restorativeActivities.reduce((sum, a) => sum + a.energyChange, 0);
        return Math.min(100, (totalRecovery / restorativeActivities.length) * 2);
    }

    private calculateStressManagement(state: EnergyState): number {
        const stress = state.stress;
        if (stress <= 20) return 100;
        if (stress <= 40) return 80;
        if (stress <= 60) return 60;
        if (stress <= 80) return 40;
        return 20;
    }

    private calculateWeeklyTrend(energyByDay: number[]): 'improving' | 'stable' | 'declining' {
        if (energyByDay.length < 3) return 'stable';

        const recent = energyByDay.slice(-3);
        const earlier = energyByDay.slice(-6, -3);

        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;

        if (recentAvg > earlierAvg + 5) return 'improving';
        if (recentAvg < earlierAvg - 5) return 'declining';
        return 'stable';
    }

    private generateRecommendations(state: EnergyState, weeklyData: WeeklyEnergyData): string[] {
        const recommendations: string[] = [];

        if (state.energy < 30) {
            recommendations.push('Consider taking a rest period to recover energy');
        }

        if (state.stress > 70) {
            recommendations.push('High stress detected - try stress-reducing activities');
        }

        if (weeklyData.restPeriods < 3) {
            recommendations.push('Increase rest periods for better energy management');
        }

        if (weeklyData.averageEnergy < 60) {
            recommendations.push('Focus on energy-building activities this week');
        }

        return recommendations.slice(0, 3); // Limit to 3 recommendations
    }

    private getMostUsedActivities(activityBreakdown: Record<string, number>): Array<{ activityId: string; name: string; count: number }> {
        return Object.entries(activityBreakdown)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([activityId, count]) => ({
                activityId,
                name: activityId, // You might want to get the actual activity name
                count
            }));
    }

    private getEmptyAnalytics(): EnergyAnalytics {
        return {
            currentEnergy: 0,
            currentFocus: 0,
            currentMotivation: 0,
            currentCalm: 0,
            currentStress: 0,
            energySpentToday: 0,
            energyGainedToday: 0,
            activitiesCompletedToday: 0,
            restPeriodsToday: 0,
            qualityScore: 0,
            averageDailyEnergy: 0,
            averageDailyFocus: 0,
            averageDailyMotivation: 0,
            averageDailyCalm: 0,
            averageDailyStress: 0,
            totalEnergySpent: 0,
            totalEnergyGained: 0,
            totalActivities: 0,
            totalRestPeriods: 0,
            activityBreakdown: {},
            energyByActivityType: {},
            mostUsedActivities: [],
            energyByHour: Array(24).fill(0),
            energyByDay: Array(7).fill(0),
            peakEnergyHours: [],
            lowEnergyHours: [],
            efficiency: 0,
            consistency: 0,
            recoveryRate: 0,
            stressManagement: 0,
            energyTrend: 'stable',
            weeklyTrend: 'stable',
            recommendations: []
        };
    }

    private loadActivityHistory(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.activityHistory = parsed.map((item: any) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            }
        } catch {
            this.activityHistory = [];
        }
    }

    private saveActivityHistory(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.activityHistory));
        } catch (error) {
            console.error('Failed to save activity history:', error);
        }
    }
}

// Export singleton instance
export const energyAnalyticsService = EnergyAnalyticsService.getInstance();
