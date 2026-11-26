import { Boss, BossBattleRecord, PlayerStats } from '../types/BossTypes';
import { EnhancedBattleState, BossPersonality } from '../types/EnhancedMoveTypes';
import { bossAchievementSystem } from '../systems/bossAchievementSystem';

/**
 * Enhanced Boss Analytics Service
 * Provides comprehensive analytics and insights for boss battles
 */
export class EnhancedBossAnalytics {
    private static instance: EnhancedBossAnalytics;
    private analyticsData: BossAnalyticsData = {
        battleHistory: [],
        performanceMetrics: {
            overallWinRate: 0,
            averageBattleTime: 0,
            totalBattleTime: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            efficiencyRating: 0,
            improvementTrend: 0
        },
        personalityAnalytics: new Map(),
        bossSpecificAnalytics: new Map(),
        skillAnalytics: {
            mostUsedMoves: [],
            moveEffectiveness: new Map(),
            comboSuccess: new Map(),
            criticalHitRate: 0,
            adaptationSpeed: 0
        },
        timeAnalytics: {
            bestPerformanceHour: 0,
            performanceByDay: new Map(),
            sessionsPerWeek: 0,
            averageSessionLength: 0
        },
        progressionAnalytics: {
            skillImprovementRate: 0,
            learningCurve: [],
            masteryProgression: new Map(),
            challengeAdaptation: 0
        }
    };

    private constructor() {
        this.loadAnalyticsData();
    }

    static getInstance(): EnhancedBossAnalytics {
        if (!EnhancedBossAnalytics.instance) {
            EnhancedBossAnalytics.instance = new EnhancedBossAnalytics();
        }
        return EnhancedBossAnalytics.instance;
    }

    /**
     * Record a completed battle and update analytics
     */
    async recordBattle(
        boss: Boss,
        battleRecord: BossBattleRecord,
        battleState: EnhancedBattleState
    ): Promise<void> {
        // Add to battle history
        const enhancedRecord: EnhancedBattleRecord = {
            ...battleRecord,
            bossPersonality: boss.ai?.personality,
            movesUsed: battleState.moveHistory.map(move => move.moveName),
            combosExecuted: battleState.moveHistory.filter(move => move.wasCombo).length,
            criticalHits: battleState.moveHistory.filter(move => move.wasCritical).length,
            adaptationEvents: this.extractAdaptationEvents(battleState),
            playerEfficiency: this.calculatePlayerEfficiency(battleRecord),
            battleContext: {
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().getDay(),
                sessionNumber: this.getSessionNumber()
            }
        };

        this.analyticsData.battleHistory.push(enhancedRecord);

        // Update analytics
        await this.updatePerformanceMetrics();
        await this.updatePersonalityAnalytics(boss, enhancedRecord);
        await this.updateBossSpecificAnalytics(boss, enhancedRecord);
        await this.updateSkillAnalytics(battleState);
        await this.updateTimeAnalytics(enhancedRecord);
        await this.updateProgressionAnalytics(enhancedRecord);

        // Save data
        await this.saveAnalyticsData();
    }

    /**
     * Get comprehensive analytics dashboard data
     */
    getAnalyticsDashboard(): AnalyticsDashboard {
        const achievementProgress = bossAchievementSystem.getAchievementProgress();

        return {
            overview: {
                totalBattles: this.analyticsData.battleHistory.length,
                winRate: this.analyticsData.performanceMetrics.overallWinRate,
                averageBattleTime: this.analyticsData.performanceMetrics.averageBattleTime,
                totalPlayTime: this.analyticsData.performanceMetrics.totalBattleTime,
                bossesDefeated: achievementProgress.totalBossesDefeated,
                currentWinStreak: achievementProgress.streakRecords.currentWinStreak,
                bestWinStreak: achievementProgress.streakRecords.bestWinStreak,
                efficiencyRating: this.analyticsData.performanceMetrics.efficiencyRating
            },
            performance: {
                winRateHistory: this.getWinRateHistory(),
                battleTimeHistory: this.getBattleTimeHistory(),
                damageEfficiency: this.getDamageEfficiency(),
                improvementTrend: this.getImprovementTrend(),
                skillRatings: this.getSkillRatings(),
                personalityMastery: this.getPersonalityMastery()
            },
            achievements: {
                unlockedCount: achievementProgress.unlockedAchievements.length,
                totalCount: bossAchievementSystem.getAllAchievements().size,
                recentAchievements: this.getRecentAchievements(),
                nextAchievements: this.getUpcomingAchievements(),
                rarityBreakdown: this.getAchievementRarityBreakdown(),
                categoryProgress: this.getAchievementCategoryProgress()
            },
            insights: {
                strengths: this.identifyStrengths(),
                weaknesses: this.identifyWeaknesses(),
                recommendations: this.generateRecommendations(),
                learningTrends: this.analyzeLearningTrends(),
                personalityInsights: this.getPersonalityInsights(),
                optimizationTips: this.getOptimizationTips()
            },
            stats: {
                totalDamageDealt: this.analyticsData.performanceMetrics.totalDamageDealt,
                totalDamageTaken: this.analyticsData.performanceMetrics.totalDamageTaken,
                combosExecuted: achievementProgress.battleStatistics.combosExecuted,
                criticalHits: achievementProgress.battleStatistics.criticalHits,
                perfectVictories: achievementProgress.streakRecords.bestPerfectStreak,
                masteryLevels: Array.from(achievementProgress.masteryLevels.values()).reduce((sum, mastery) => sum + mastery.level, 0)
            }
        };
    }

    /**
     * Get personality-specific analytics
     */
    getPersonalityAnalytics(personality: BossPersonality): PersonalityAnalytics {
        return this.analyticsData.personalityAnalytics.get(personality) || {
            battlesAgainst: 0,
            victories: 0,
            defeats: 0,
            averageBattleTime: 0,
            averageDamageDealt: 0,
            averageDamageTaken: 0,
            adaptationSuccess: 0,
            learningCurve: [],
            effectiveStrategies: [],
            strugglingAreas: []
        };
    }

    /**
     * Get boss-specific analytics
     */
    getBossAnalytics(bossId: string): BossSpecificAnalytics {
        return this.analyticsData.bossSpecificAnalytics.get(bossId) || {
            encounters: 0,
            victories: 0,
            bestTime: Infinity,
            averageTime: 0,
            masteryLevel: 0,
            masteryXP: 0,
            difficultyRating: 0,
            personalBest: {
                fastestVictory: Infinity,
                highestDamage: 0,
                mostEfficient: 0,
                perfectVictories: 0
            },
            progressionHistory: [],
            strategicInsights: []
        };
    }

    /**
     * Get AI-powered recommendations
     */
    getRecommendations(): Recommendation[] {
        const recommendations: Recommendation[] = [];

        // Analyze win rate trends
        if (this.analyticsData.performanceMetrics.overallWinRate < 0.7) {
            recommendations.push({
                type: 'improvement',
                priority: 'high',
                title: 'Focus on Fundamentals',
                description: 'Your win rate suggests room for improvement in basic combat techniques.',
                actionItems: [
                    'Practice combo execution in easier battles',
                    'Study personality patterns more carefully',
                    'Focus on defensive play until mastery improves'
                ],
                expectedImpact: 'Should improve win rate by 15-20%'
            });
        }

        // Analyze personality performance
        const weakestPersonality = this.findWeakestPersonality();
        if (weakestPersonality) {
            recommendations.push({
                type: 'strategy',
                priority: 'medium',
                title: `Master ${weakestPersonality} Personalities`,
                description: `You struggle most against ${weakestPersonality} bosses.`,
                actionItems: [
                    `Study ${weakestPersonality} behavior patterns`,
                    'Practice specific counter-strategies',
                    'Focus on battles against this personality type'
                ],
                expectedImpact: 'Improved performance against this personality type'
            });
        }

        // Analyze battle timing
        const bestHour = this.analyticsData.timeAnalytics.bestPerformanceHour;
        recommendations.push({
            type: 'optimization',
            priority: 'low',
            title: 'Optimize Battle Timing',
            description: `You perform best during hour ${bestHour}:00.`,
            actionItems: [
                `Schedule important battles around ${bestHour}:00`,
                'Avoid difficult battles during low-performance hours',
                'Track energy levels throughout the day'
            ],
            expectedImpact: '5-10% improvement in difficult battles'
        });

        return recommendations;
    }

    /**
     * Generate progress report
     */
    generateProgressReport(timeframe: 'week' | 'month' | 'all'): ProgressReport {
        const battles = this.filterBattlesByTimeframe(timeframe);

        return {
            timeframe,
            battleCount: battles.length,
            winRate: this.calculateWinRate(battles),
            averageBattleTime: this.calculateAverageBattleTime(battles),
            improvementMetrics: {
                winRateChange: this.calculateWinRateChange(battles),
                speedImprovement: this.calculateSpeedImprovement(battles),
                efficiencyGain: this.calculateEfficiencyGain(battles)
            },
            achievements: this.getAchievementsInTimeframe(timeframe),
            milestones: this.getMilestonesInTimeframe(timeframe),
            insights: this.generateTimeframeInsights(battles)
        };
    }

    // Private helper methods
    private async updatePerformanceMetrics(): Promise<void> {
        const battles = this.analyticsData.battleHistory;
        const victories = battles.filter(b => b.result === 'victory');

        this.analyticsData.performanceMetrics.overallWinRate = victories.length / battles.length;
        this.analyticsData.performanceMetrics.averageBattleTime =
            battles.reduce((sum, b) => sum + b.duration, 0) / battles.length;
        this.analyticsData.performanceMetrics.totalBattleTime =
            battles.reduce((sum, b) => sum + b.duration, 0);
        this.analyticsData.performanceMetrics.totalDamageDealt =
            battles.reduce((sum, b) => sum + b.damageDealt, 0);
        this.analyticsData.performanceMetrics.totalDamageTaken =
            battles.reduce((sum, b) => sum + b.damageTaken, 0);
        this.analyticsData.performanceMetrics.efficiencyRating =
            this.calculateOverallEfficiency();
        this.analyticsData.performanceMetrics.improvementTrend =
            this.calculateImprovementTrend();
    }

    private async updatePersonalityAnalytics(boss: Boss, record: EnhancedBattleRecord): Promise<void> {
        if (!boss.ai?.personality) return;

        const personality = boss.ai.personality;
        let analytics = this.analyticsData.personalityAnalytics.get(personality);

        if (!analytics) {
            analytics = {
                battlesAgainst: 0,
                victories: 0,
                defeats: 0,
                averageBattleTime: 0,
                averageDamageDealt: 0,
                averageDamageTaken: 0,
                adaptationSuccess: 0,
                learningCurve: [],
                effectiveStrategies: [],
                strugglingAreas: []
            };
        }

        analytics.battlesAgainst++;
        if (record.result === 'victory') {
            analytics.victories++;
        } else {
            analytics.defeats++;
        }

        // Update averages
        analytics.averageBattleTime = this.updateAverage(
            analytics.averageBattleTime,
            record.duration,
            analytics.battlesAgainst
        );
        analytics.averageDamageDealt = this.updateAverage(
            analytics.averageDamageDealt,
            record.damageDealt,
            analytics.battlesAgainst
        );
        analytics.averageDamageTaken = this.updateAverage(
            analytics.averageDamageTaken,
            record.damageTaken,
            analytics.battlesAgainst
        );

        this.analyticsData.personalityAnalytics.set(personality, analytics);
    }

    private calculatePlayerEfficiency(record: BossBattleRecord): number {
        if (record.damageTaken === 0) return 100;
        return Math.min(100, (record.damageDealt / record.damageTaken) * 10);
    }

    private extractAdaptationEvents(battleState: EnhancedBattleState): string[] {
        // Extract events where player adapted to boss behavior
        const events: string[] = [];

        // Look for pattern changes in move usage
        const moveHistory = battleState.moveHistory;
        let currentPattern = '';
        let patternChanges = 0;

        for (const move of moveHistory) {
            if (move.moveName !== currentPattern) {
                currentPattern = move.moveName;
                patternChanges++;
            }
        }

        if (patternChanges > 5) {
            events.push('High strategic adaptation - varied move patterns');
        }

        // Look for combo usage improvements
        const comboMoves = moveHistory.filter(move => move.wasCombo);
        if (comboMoves.length > 3) {
            events.push('Effective combo utilization');
        }

        return events;
    }

    private identifyStrengths(): string[] {
        const strengths: string[] = [];

        if (this.analyticsData.performanceMetrics.overallWinRate > 0.8) {
            strengths.push('High win rate consistency');
        }

        if (this.analyticsData.performanceMetrics.efficiencyRating > 80) {
            strengths.push('Excellent damage efficiency');
        }

        // Check for combo mastery
        const achievementProgress = bossAchievementSystem.getAchievementProgress();
        if (achievementProgress.battleStatistics.combosExecuted > 50) {
            strengths.push('Strong combo execution skills');
        }

        return strengths;
    }

    private identifyWeaknesses(): string[] {
        const weaknesses: string[] = [];

        if (this.analyticsData.performanceMetrics.overallWinRate < 0.6) {
            weaknesses.push('Low win rate - needs fundamental improvement');
        }

        if (this.analyticsData.performanceMetrics.averageBattleTime > 20) {
            weaknesses.push('Slow battle completion - work on efficiency');
        }

        // Check for personality struggles
        const weakPersonality = this.findWeakestPersonality();
        if (weakPersonality) {
            weaknesses.push(`Struggles against ${weakPersonality} personalities`);
        }

        return weaknesses;
    }

    private generateRecommendations(): string[] {
        return this.getRecommendations().map(r => r.title);
    }

    private findWeakestPersonality(): string | null {
        let worstWinRate = 1.0;
        let worstPersonality = null;

        for (const [personality, analytics] of this.analyticsData.personalityAnalytics.entries()) {
            const winRate = analytics.victories / analytics.battlesAgainst;
            if (winRate < worstWinRate && analytics.battlesAgainst > 2) {
                worstWinRate = winRate;
                worstPersonality = personality;
            }
        }

        return worstPersonality;
    }

    // Additional helper methods would go here...
    private updateAverage(currentAvg: number, newValue: number, count: number): number {
        return ((currentAvg * (count - 1)) + newValue) / count;
    }

    private calculateOverallEfficiency(): number {
        const battles = this.analyticsData.battleHistory;
        if (battles.length === 0) return 0;

        return battles.reduce((sum, b) => sum + b.playerEfficiency!, 0) / battles.length;
    }

    private calculateImprovementTrend(): number {
        const recentBattles = this.analyticsData.battleHistory.slice(-10);
        const olderBattles = this.analyticsData.battleHistory.slice(-20, -10);

        if (recentBattles.length === 0 || olderBattles.length === 0) return 0;

        const recentWinRate = recentBattles.filter(b => b.result === 'victory').length / recentBattles.length;
        const olderWinRate = olderBattles.filter(b => b.result === 'victory').length / olderBattles.length;

        return recentWinRate - olderWinRate;
    }

    private getSessionNumber(): number {
        const today = new Date().toDateString();
        const todayBattles = this.analyticsData.battleHistory.filter(
            b => new Date(b.battleDate).toDateString() === today
        );
        return Math.floor(todayBattles.length / 5) + 1; // 5 battles per session
    }

    private async updateBossSpecificAnalytics(boss: Boss, record: EnhancedBattleRecord): Promise<void> {
        // Implementation for boss-specific analytics
    }

    private async updateSkillAnalytics(battleState: EnhancedBattleState): Promise<void> {
        // Implementation for skill analytics
    }

    private async updateTimeAnalytics(record: EnhancedBattleRecord): Promise<void> {
        // Implementation for time-based analytics
    }

    private async updateProgressionAnalytics(record: EnhancedBattleRecord): Promise<void> {
        // Implementation for progression analytics
    }

    private filterBattlesByTimeframe(timeframe: string): EnhancedBattleRecord[] {
        // Implementation for filtering battles by timeframe
        return this.analyticsData.battleHistory;
    }

    // Placeholder implementations for dashboard methods
    private getWinRateHistory(): any[] { return []; }
    private getBattleTimeHistory(): any[] { return []; }
    private getDamageEfficiency(): any { return {}; }
    private getImprovementTrend(): any[] { return []; }
    private getSkillRatings(): any { return {}; }
    private getPersonalityMastery(): any { return {}; }
    private getRecentAchievements(): any[] { return []; }
    private getUpcomingAchievements(): any[] { return []; }
    private getAchievementRarityBreakdown(): any { return {}; }
    private getAchievementCategoryProgress(): any { return {}; }
    private analyzeLearningTrends(): any[] { return []; }
    private getPersonalityInsights(): any[] { return []; }
    private getOptimizationTips(): any[] { return []; }
    private calculateWinRate(battles: any[]): number { return 0; }
    private calculateAverageBattleTime(battles: any[]): number { return 0; }
    private calculateWinRateChange(battles: any[]): number { return 0; }
    private calculateSpeedImprovement(battles: any[]): number { return 0; }
    private calculateEfficiencyGain(battles: any[]): number { return 0; }
    private getAchievementsInTimeframe(timeframe: string): any[] { return []; }
    private getMilestonesInTimeframe(timeframe: string): any[] { return []; }
    private generateTimeframeInsights(battles: any[]): any[] { return []; }

    private async saveAnalyticsData(): Promise<void> {
        try {
            const data = {
                ...this.analyticsData,
                personalityAnalytics: Array.from(this.analyticsData.personalityAnalytics.entries()),
                bossSpecificAnalytics: Array.from(this.analyticsData.bossSpecificAnalytics.entries())
            };
            localStorage.setItem('enhanced-boss-analytics', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    private loadAnalyticsData(): void {
        try {
            const saved = localStorage.getItem('enhanced-boss-analytics');
            if (saved) {
                const data = JSON.parse(saved);
                this.analyticsData = {
                    ...data,
                    personalityAnalytics: new Map(data.personalityAnalytics || []),
                    bossSpecificAnalytics: new Map(data.bossSpecificAnalytics || [])
                };
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }
}

// Type definitions
export interface BossAnalyticsData {
    battleHistory: EnhancedBattleRecord[];
    performanceMetrics: PerformanceMetrics;
    personalityAnalytics: Map<BossPersonality, PersonalityAnalytics>;
    bossSpecificAnalytics: Map<string, BossSpecificAnalytics>;
    skillAnalytics: SkillAnalytics;
    timeAnalytics: TimeAnalytics;
    progressionAnalytics: ProgressionAnalytics;
}

export interface EnhancedBattleRecord extends BossBattleRecord {
    bossPersonality?: BossPersonality;
    movesUsed: string[];
    combosExecuted: number;
    criticalHits: number;
    adaptationEvents: string[];
    playerEfficiency: number;
    battleContext: {
        timeOfDay: number;
        dayOfWeek: number;
        sessionNumber: number;
    };
}

export interface PerformanceMetrics {
    overallWinRate: number;
    averageBattleTime: number;
    totalBattleTime: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    efficiencyRating: number;
    improvementTrend: number;
}

export interface PersonalityAnalytics {
    battlesAgainst: number;
    victories: number;
    defeats: number;
    averageBattleTime: number;
    averageDamageDealt: number;
    averageDamageTaken: number;
    adaptationSuccess: number;
    learningCurve: any[];
    effectiveStrategies: string[];
    strugglingAreas: string[];
}

export interface BossSpecificAnalytics {
    encounters: number;
    victories: number;
    bestTime: number;
    averageTime: number;
    masteryLevel: number;
    masteryXP: number;
    difficultyRating: number;
    personalBest: {
        fastestVictory: number;
        highestDamage: number;
        mostEfficient: number;
        perfectVictories: number;
    };
    progressionHistory: any[];
    strategicInsights: string[];
}

export interface SkillAnalytics {
    mostUsedMoves: string[];
    moveEffectiveness: Map<string, number>;
    comboSuccess: Map<string, number>;
    criticalHitRate: number;
    adaptationSpeed: number;
}

export interface TimeAnalytics {
    bestPerformanceHour: number;
    performanceByDay: Map<number, number>;
    sessionsPerWeek: number;
    averageSessionLength: number;
}

export interface ProgressionAnalytics {
    skillImprovementRate: number;
    learningCurve: any[];
    masteryProgression: Map<string, number>;
    challengeAdaptation: number;
}

export interface AnalyticsDashboard {
    overview: any;
    performance: any;
    achievements: any;
    insights: any;
    stats: any;
}

export interface Recommendation {
    type: 'improvement' | 'strategy' | 'optimization';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
    expectedImpact: string;
}

export interface ProgressReport {
    timeframe: string;
    battleCount: number;
    winRate: number;
    averageBattleTime: number;
    improvementMetrics: any;
    achievements: any[];
    milestones: any[];
    insights: any[];
}

// Export singleton instance
export const enhancedBossAnalytics = EnhancedBossAnalytics.getInstance();
