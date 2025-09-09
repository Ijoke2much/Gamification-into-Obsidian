import { playerStore } from '../state/playerStore';
import { PlayerData } from '../../data/models/PlayerData';
import { penaltyAnalyticsService } from './penaltyAnalyticsService';
import { penaltyForgivenessService } from './penaltyForgivenessService';

export interface CoachingSuggestion {
    id: string;
    category: 'time_management' | 'difficulty_adjustment' | 'focus_improvement' | 'recovery_strategy';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    impact: 'immediate' | 'short_term' | 'long_term';
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedBenefit: {
        debtReduction: number;
        reputationGain: number;
        timeSaved: number; // minutes per day
    };
    actionable: boolean;
    actionSteps: string[];
    prerequisites?: string[];
}

export interface CoachingSession {
    sessionId: string;
    timestamp: Date;
    suggestions: CoachingSuggestion[];
    focusArea: string;
    nextReviewDate: Date;
    progress: {
        suggestionsFollowed: number;
        totalSuggestions: number;
        improvementRate: number;
    };
}

export class PenaltyCoachingService {
    private static instance: PenaltyCoachingService;
    private coachingHistory: Map<string, CoachingSession> = new Map();
    private suggestionTemplates: Map<string, CoachingSuggestion> = new Map();

    static getInstance(): PenaltyCoachingService {
        if (!PenaltyCoachingService.instance) {
            PenaltyCoachingService.instance = new PenaltyCoachingService();
        }
        return PenaltyCoachingService.instance;
    }

    constructor() {
        this.initializeSuggestionTemplates();
    }

    private initializeSuggestionTemplates(): void {
        // Time Management Suggestions
        this.suggestionTemplates.set('buffer_time', {
            id: 'buffer_time',
            category: 'time_management',
            title: 'Add Buffer Time to Deadlines',
            description: 'Add 20% buffer time to your quest deadlines to account for unexpected delays.',
            priority: 'high',
            impact: 'immediate',
            difficulty: 'easy',
            estimatedBenefit: {
                debtReduction: 50,
                reputationGain: 5,
                timeSaved: 30
            },
            actionable: true,
            actionSteps: [
                'Review your current quest deadlines',
                'Add 20% extra time to each deadline',
                'Update quest due dates in your vault',
                'Monitor completion times for future adjustments'
            ]
        });

        this.suggestionTemplates.set('break_down_tasks', {
            id: 'break_down_tasks',
            category: 'difficulty_adjustment',
            title: 'Break Down Complex Tasks',
            description: 'Split large quests into smaller, more manageable sub-quests.',
            priority: 'medium',
            impact: 'short_term',
            difficulty: 'medium',
            estimatedBenefit: {
                debtReduction: 75,
                reputationGain: 8,
                timeSaved: 45
            },
            actionable: true,
            actionSteps: [
                'Identify quests that take more than 2 hours',
                'Break them into 30-60 minute sub-quests',
                'Set intermediate deadlines for each sub-quest',
                'Track progress on sub-quests separately'
            ]
        });

        this.suggestionTemplates.set('pomodoro_optimization', {
            id: 'pomodoro_optimization',
            category: 'focus_improvement',
            title: 'Optimize Pomodoro Sessions',
            description: 'Use shorter, more focused Pomodoro sessions to maintain concentration.',
            priority: 'medium',
            impact: 'immediate',
            difficulty: 'easy',
            estimatedBenefit: {
                debtReduction: 30,
                reputationGain: 3,
                timeSaved: 20
            },
            actionable: true,
            actionSteps: [
                'Reduce Pomodoro session length to 20-25 minutes',
                'Take 5-minute breaks between sessions',
                'Use longer 15-minute breaks every 4 sessions',
                'Attach specific quests to each session'
            ]
        });

        this.suggestionTemplates.set('priority_system', {
            id: 'priority_system',
            category: 'time_management',
            title: 'Implement Priority System',
            description: 'Use a clear priority system to focus on the most important quests first.',
            priority: 'high',
            impact: 'long_term',
            difficulty: 'medium',
            estimatedBenefit: {
                debtReduction: 100,
                reputationGain: 10,
                timeSaved: 60
            },
            actionable: true,
            actionSteps: [
                'Categorize quests by priority (High/Medium/Low)',
                'Focus on high-priority quests first',
                'Review and adjust priorities weekly',
                'Use priority tags in your quest system'
            ]
        });

        this.suggestionTemplates.set('energy_management', {
            id: 'energy_management',
            category: 'focus_improvement',
            title: 'Optimize Energy Management',
            description: 'Schedule difficult quests during your peak energy hours.',
            priority: 'medium',
            impact: 'short_term',
            difficulty: 'hard',
            estimatedBenefit: {
                debtReduction: 60,
                reputationGain: 6,
                timeSaved: 40
            },
            actionable: true,
            actionSteps: [
                'Track your energy levels throughout the day',
                'Identify your peak productivity hours',
                'Schedule challenging quests during peak hours',
                'Use easy quests for low-energy periods'
            ]
        });

        this.suggestionTemplates.set('debt_recovery_plan', {
            id: 'debt_recovery_plan',
            category: 'recovery_strategy',
            title: 'Create Debt Recovery Plan',
            description: 'Develop a systematic approach to pay off accumulated debt.',
            priority: 'high',
            impact: 'long_term',
            difficulty: 'medium',
            estimatedBenefit: {
                debtReduction: 200,
                reputationGain: 15,
                timeSaved: 0
            },
            actionable: true,
            actionSteps: [
                'Calculate total debt (XP and coins)',
                'Set a daily debt reduction goal',
                'Focus on high-reward quests',
                'Track debt reduction progress weekly'
            ]
        });
    }

    async generateCoachingSession(): Promise<CoachingSession> {
        const player = await playerStore.get();
        if (!player) {
            throw new Error('Player data not available');
        }

        const analytics = await penaltyAnalyticsService.getAnalytics();
        const insights = await penaltyAnalyticsService.getInsights();
        const forgivenessEvents = await penaltyForgivenessService.getAvailableForgivenessEvents();

        // Determine focus area based on current penalties
        const focusArea = this.determineFocusArea(analytics, insights);

        // Generate personalized suggestions
        const suggestions = await this.generatePersonalizedSuggestions(
            analytics,
            insights,
            forgivenessEvents,
            focusArea
        );

        const session: CoachingSession = {
            sessionId: `coaching_${Date.now()}`,
            timestamp: new Date(),
            suggestions,
            focusArea,
            nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
            progress: {
                suggestionsFollowed: 0,
                totalSuggestions: suggestions.length,
                improvementRate: 0
            }
        };

        this.coachingHistory.set(session.sessionId, session);
        return session;
    }

    private determineFocusArea(analytics: any, insights: any[]): string {
        if (analytics.penaltyTypes.quest_overdue > 3) {
            return 'time_management';
        } else if (analytics.penaltyTypes.boss_timeout > 2) {
            return 'difficulty_adjustment';
        } else if (analytics.penaltyTypes.quest_attachment_expired > 1) {
            return 'focus_improvement';
        } else if (analytics.totalDebtAccumulated.xp > 500) {
            return 'recovery_strategy';
        }
        return 'general_optimization';
    }

    private async generatePersonalizedSuggestions(
        analytics: any,
        insights: any[],
        forgivenessEvents: any[],
        focusArea: string
    ): Promise<CoachingSuggestion[]> {
        const suggestions: CoachingSuggestion[] = [];

        // Add focus area specific suggestions
        switch (focusArea) {
            case 'time_management':
                suggestions.push(this.suggestionTemplates.get('buffer_time')!);
                suggestions.push(this.suggestionTemplates.get('priority_system')!);
                break;
            case 'difficulty_adjustment':
                suggestions.push(this.suggestionTemplates.get('break_down_tasks')!);
                suggestions.push(this.suggestionTemplates.get('energy_management')!);
                break;
            case 'focus_improvement':
                suggestions.push(this.suggestionTemplates.get('pomodoro_optimization')!);
                suggestions.push(this.suggestionTemplates.get('energy_management')!);
                break;
            case 'recovery_strategy':
                suggestions.push(this.suggestionTemplates.get('debt_recovery_plan')!);
                suggestions.push(this.suggestionTemplates.get('priority_system')!);
                break;
            default:
                suggestions.push(this.suggestionTemplates.get('buffer_time')!);
                suggestions.push(this.suggestionTemplates.get('priority_system')!);
        }

        // Add forgiveness event suggestions if available
        if (forgivenessEvents.length > 0) {
            suggestions.push({
                id: 'forgiveness_opportunity',
                category: 'recovery_strategy',
                title: 'Forgiveness Opportunities Available',
                description: `You have ${forgivenessEvents.length} forgiveness events available. Complete their requirements to reduce penalties.`,
                priority: 'high',
                impact: 'immediate',
                difficulty: 'medium',
                estimatedBenefit: {
                    debtReduction: 100,
                    reputationGain: 10,
                    timeSaved: 0
                },
                actionable: true,
                actionSteps: [
                    'Review available forgiveness events',
                    'Focus on completing their requirements',
                    'Track progress toward forgiveness goals',
                    'Claim rewards when requirements are met'
                ]
            });
        }

        // Add insights-based suggestions
        insights.forEach(insight => {
            if (insight.actionable && insight.action) {
                suggestions.push({
                    id: `insight_${insight.title.toLowerCase().replace(/\s+/g, '_')}`,
                    category: 'time_management',
                    title: insight.title,
                    description: insight.description,
                    priority: insight.severity === 'high' ? 'high' : insight.severity === 'medium' ? 'medium' : 'low',
                    impact: 'short_term',
                    difficulty: 'medium',
                    estimatedBenefit: {
                        debtReduction: 50,
                        reputationGain: 5,
                        timeSaved: 30
                    },
                    actionable: true,
                    actionSteps: [insight.action!]
                });
            }
        });

        return suggestions.slice(0, 5); // Limit to top 5 suggestions
    }

    async trackSuggestionProgress(sessionId: string, suggestionId: string, completed: boolean): Promise<void> {
        const session = this.coachingHistory.get(sessionId);
        if (!session) {
            return;
        }

        if (completed) {
            session.progress.suggestionsFollowed++;
        }

        session.progress.improvementRate = session.progress.suggestionsFollowed / session.progress.totalSuggestions;
        this.coachingHistory.set(sessionId, session);
    }

    async getCoachingHistory(): Promise<CoachingSession[]> {
        return Array.from(this.coachingHistory.values()).sort((a, b) =>
            b.timestamp.getTime() - a.timestamp.getTime()
        );
    }

    async getCurrentSession(): Promise<CoachingSession | null> {
        const history = await this.getCoachingHistory();
        return history.length > 0 ? history[0] : null;
    }

    async shouldGenerateNewSession(): Promise<boolean> {
        const currentSession = await this.getCurrentSession();
        if (!currentSession) {
            return true;
        }

        const now = new Date();
        return now >= currentSession.nextReviewDate;
    }
}

export const penaltyCoachingService = PenaltyCoachingService.getInstance();
