import { playerStore } from '../state/playerStore';
import { PlayerData } from '../../data/models/PlayerData';

export interface PenaltyAnalytics {
    totalPenalties: number;
    penaltyTypes: {
        boss_timeout: number;
        quest_overdue: number;
        quest_attachment_expired: number;
    };
    totalDebtAccumulated: {
        xp: number;
        coins: number;
    };
    totalDebtPaid: {
        xp: number;
        coins: number;
    };
    averageReputation: number;
    penaltyTrends: {
        daily: Array<{ date: string; penalties: number; debt: number }>;
        weekly: Array<{ week: string; penalties: number; debt: number }>;
    };
    problemAreas: {
        mostOverdueQuests: Array<{ questId: string; daysOverdue: number; frequency: number }>;
        mostFailedBosses: Array<{ bossId: string; failures: number; averageTime: number }>;
        commonDebuffTypes: Array<{ debuffName: string; frequency: number; averageDuration: number }>;
    };
    recoveryMetrics: {
        averageDebtRecoveryTime: number;
        reputationRecoveryRate: number;
        debuffClearanceRate: number;
    };
}

export interface PenaltyInsight {
    type: 'warning' | 'suggestion' | 'achievement';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    actionable: boolean;
    action?: string;
    impact?: string;
}

export class PenaltyAnalyticsService {
    private static instance: PenaltyAnalyticsService;
    private analyticsCache: Map<string, PenaltyAnalytics> = new Map();
    private lastUpdate: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    static getInstance(): PenaltyAnalyticsService {
        if (!PenaltyAnalyticsService.instance) {
            PenaltyAnalyticsService.instance = new PenaltyAnalyticsService();
        }
        return PenaltyAnalyticsService.instance;
    }

    async getAnalytics(): Promise<PenaltyAnalytics> {
        const now = Date.now();
        if (now - this.lastUpdate < this.CACHE_DURATION) {
            return this.analyticsCache.get('current') || this.getDefaultAnalytics();
        }

        const player = await playerStore.get();
        if (!player) {
            return this.getDefaultAnalytics();
        }

        const analytics = await this.calculateAnalytics(player);
        this.analyticsCache.set('current', analytics);
        this.lastUpdate = now;

        return analytics;
    }

    async getInsights(): Promise<PenaltyInsight[]> {
        const analytics = await this.getAnalytics();
        const insights: PenaltyInsight[] = [];

        // Analyze penalty patterns
        if (analytics.penaltyTypes.quest_overdue > 5) {
            insights.push({
                type: 'warning',
                title: 'High Overdue Quest Rate',
                description: `You have ${analytics.penaltyTypes.quest_overdue} overdue quest penalties. Consider setting more realistic deadlines.`,
                severity: 'high',
                actionable: true,
                action: 'Review quest deadlines and adjust difficulty',
                impact: 'Reduces reputation and accumulates debt'
            });
        }

        if (analytics.penaltyTypes.boss_timeout > 3) {
            insights.push({
                type: 'suggestion',
                title: 'Boss Battle Time Management',
                description: 'You\'re frequently exceeding boss battle time limits. Try breaking down complex tasks.',
                severity: 'medium',
                actionable: true,
                action: 'Use smaller, focused work sessions',
                impact: 'Improves battle rewards and reduces fatigue'
            });
        }

        if (analytics.totalDebtAccumulated.xp > 1000) {
            insights.push({
                type: 'warning',
                title: 'High XP Debt',
                description: `You have ${analytics.totalDebtAccumulated.xp} XP in debt. Focus on completing quests on time.`,
                severity: 'high',
                actionable: true,
                action: 'Prioritize on-time quest completion',
                impact: 'Slows down skill progression'
            });
        }

        if (analytics.averageReputation < -20) {
            insights.push({
                type: 'suggestion',
                title: 'Reputation Recovery Needed',
                description: 'Your quest reputation is low. Complete quests on time to improve it.',
                severity: 'medium',
                actionable: true,
                action: 'Focus on deadline management',
                impact: 'Affects shop prices and rewards'
            });
        }

        // Positive insights
        if (analytics.recoveryMetrics.reputationRecoveryRate > 0.8) {
            insights.push({
                type: 'achievement',
                title: 'Excellent Recovery Rate',
                description: 'You\'re recovering from penalties very well! Keep up the good work.',
                severity: 'low',
                actionable: false
            });
        }

        return insights;
    }

    async getOptimizationSuggestions(): Promise<string[]> {
        const analytics = await this.getAnalytics();
        const suggestions: string[] = [];

        // Time management suggestions
        if (analytics.problemAreas.mostOverdueQuests.length > 0) {
            const avgOverdue = analytics.problemAreas.mostOverdueQuests.reduce((sum, quest) => sum + quest.daysOverdue, 0) / analytics.problemAreas.mostOverdueQuests.length;
            suggestions.push(`Consider adding ${Math.ceil(avgOverdue * 0.5)} days to quest deadlines to account for unexpected delays.`);
        }

        // Focus suggestions
        if (analytics.penaltyTypes.quest_attachment_expired > 2) {
            suggestions.push('Try shorter Pomodoro sessions (20-25 minutes) to maintain focus and complete attached quests.');
        }

        // Difficulty suggestions
        if (analytics.penaltyTypes.boss_timeout > 2) {
            suggestions.push('Break down complex boss battles into smaller, more manageable tasks.');
        }

        return suggestions;
    }

    private async calculateAnalytics(player: PlayerData): Promise<PenaltyAnalytics> {
        // This would integrate with actual penalty history tracking
        // For now, we'll calculate based on current state
        const currentDebt = {
            xp: player.failureDebtXP || 0,
            coins: player.failureDebtCoins || 0
        };

        const reputation = player.questReputation || 0;
        const activeDebuffs = (player.debuffs || []).filter(debuff =>
            !debuff.expiresAt || new Date(debuff.expiresAt) > new Date()
        );

        return {
            totalPenalties: activeDebuffs.length + (currentDebt.xp > 0 ? 1 : 0) + (currentDebt.coins > 0 ? 1 : 0),
            penaltyTypes: {
                boss_timeout: activeDebuffs.filter(d => d.name === 'Battle Fatigue').length,
                quest_overdue: activeDebuffs.filter(d => d.name === 'Procrastination').length,
                quest_attachment_expired: activeDebuffs.filter(d => d.name === 'Scattered Focus').length
            },
            totalDebtAccumulated: currentDebt,
            totalDebtPaid: { xp: 0, coins: 0 }, // Would track from history
            averageReputation: reputation,
            penaltyTrends: {
                daily: [],
                weekly: []
            },
            problemAreas: {
                mostOverdueQuests: [],
                mostFailedBosses: [],
                commonDebuffTypes: activeDebuffs.reduce((acc, debuff) => {
                    const existing = acc.find(d => d.debuffName === debuff.name);
                    if (existing) {
                        existing.frequency++;
                    } else {
                        acc.push({
                            debuffName: debuff.name,
                            frequency: 1,
                            averageDuration: 24 // Default duration in hours
                        });
                    }
                    return acc;
                }, [] as Array<{ debuffName: string; frequency: number; averageDuration: number }>)
            },
            recoveryMetrics: {
                averageDebtRecoveryTime: 7, // Days
                reputationRecoveryRate: reputation < 0 ? 0.3 : 0.8,
                debuffClearanceRate: 0.9
            }
        };
    }

    private getDefaultAnalytics(): PenaltyAnalytics {
        return {
            totalPenalties: 0,
            penaltyTypes: { boss_timeout: 0, quest_overdue: 0, quest_attachment_expired: 0 },
            totalDebtAccumulated: { xp: 0, coins: 0 },
            totalDebtPaid: { xp: 0, coins: 0 },
            averageReputation: 0,
            penaltyTrends: { daily: [], weekly: [] },
            problemAreas: {
                mostOverdueQuests: [],
                mostFailedBosses: [],
                commonDebuffTypes: []
            },
            recoveryMetrics: {
                averageDebtRecoveryTime: 0,
                reputationRecoveryRate: 1,
                debuffClearanceRate: 1
            }
        };
    }
}

export const penaltyAnalyticsService = PenaltyAnalyticsService.getInstance();
