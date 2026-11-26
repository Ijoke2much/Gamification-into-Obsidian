// Comprehensive Session Tracking and Analytics System

export interface SessionRecord {
    id: string;
    startTime: Date;
    endTime?: Date;
    plannedDuration: number; // in minutes
    actualDuration?: number; // in minutes
    sessionType: string;

    // Session quality metrics
    completed: boolean;
    interruptions: number;
    interruptionLog: Array<{
        timestamp: Date;
        reason: string;
        duration: number; // seconds of interruption
    }>;
    focusScore: number; // 0-100 calculated from various factors

    // Task/Quest integration
    attachedQuests: Array<{
        questId: string;
        title: string;
        progressBefore: number;
        progressAfter: number;
        subtasksCompleted: number;
        estimatedTime: number;
        actualTime: number;
    }>;

    // Environmental factors
    timeOfDay: number; // hour when session started
    dayOfWeek: number; // 0-6 (Sunday = 0)
    isWeekend: boolean;
    weatherCondition?: string; // if available

    // Performance metrics
    productivity: {
        tasksCompleted: number;
        questsCompleted: number;
        subtasksCompleted: number;
        averageTaskTime: number;
        effortLevel: number; // 1-10 self-reported
        satisfactionLevel: number; // 1-10 self-reported
    };

    // Rewards earned
    rewards: {
        baseXP: number;
        bonusXP: number;
        totalXP: number;
        baseCoins: number;
        bonusCoins: number;
        totalCoins: number;
        materials?: string[];
        achievements?: string[];
        specialRewards?: string[];
    };

    // Session context
    sessionNotes?: string;
    mood: {
        before: number; // 1-10
        after: number; // 1-10
        energy: number; // 1-10
        motivation: number; // 1-10
    };

    // Technical data
    deviceType: string; // 'desktop', 'mobile', 'tablet'
    appVersion: string;
    pluginVersion: string;
}

export interface DayAnalytics {
    date: string; // YYYY-MM-DD
    totalSessions: number;
    completedSessions: number;
    totalFocusTime: number; // in minutes
    averageFocusScore: number;
    totalXPEarned: number;
    totalCoinsEarned: number;
    questsCompleted: number;
    tasksCompleted: number;
    bestSessionScore: number;
    worstSessionScore: number;
    productivityTrend: 'up' | 'down' | 'stable';
    mood: {
        averageStart: number;
        averageEnd: number;
        moodImprovement: number;
    };
}

export interface WeekAnalytics {
    startDate: string; // YYYY-MM-DD (Monday)
    endDate: string; // YYYY-MM-DD (Sunday)
    totalSessions: number;
    totalFocusTime: number;
    averageDailyFocus: number;
    streakDays: number;
    bestDay: DayAnalytics;
    worstDay: DayAnalytics;
    sessionTypeDistribution: Record<string, number>;
    timeOfDayPreferences: Record<number, number>; // hour -> session count
    productivity: {
        questsCompleted: number;
        averageQuestCompletionTime: number;
        efficiency: number; // estimated vs actual time ratio
    };
    trends: {
        focusScoretrend: number; // weekly change in average focus score
        productivityTrend: number; // weekly change in tasks/hour
        consistencyScore: number; // how consistent daily performance was
    };
}

export interface MonthAnalytics {
    year: number;
    month: number; // 1-12
    totalSessions: number;
    totalFocusTime: number;
    averageWeeklyFocus: number;
    longestStreak: number;
    currentStreak: number;
    bestWeek: WeekAnalytics;
    worstWeek: WeekAnalytics;
    achievements: string[];
    milestones: Array<{
        type: string;
        description: string;
        achievedDate: string;
        value: number;
    }>;
    patterns: {
        bestDayOfWeek: number;
        bestTimeOfDay: number;
        mostProductiveSessionType: string;
        averageSessionLength: number;
        focusQualityTrend: number;
    };
}

export interface ProductivityInsights {
    // Performance insights
    personalBests: {
        longestSession: SessionRecord;
        highestFocusScore: SessionRecord;
        mostTasksInSession: SessionRecord;
        bestDay: DayAnalytics;
        bestWeek: WeekAnalytics;
    };

    // Pattern recognition
    patterns: {
        optimalTimeOfDay: {
            hour: number;
            averageFocusScore: number;
            sessionsCount: number;
        };

        bestSessionType: {
            type: string;
            averageFocusScore: number;
            completionRate: number;
        };

        productivityCycles: {
            weeklyPattern: number[]; // 7 values for each day of week
            monthlyPattern: number[]; // productivity trend throughout month
            seasonalPattern?: number[]; // if enough data
        };

        interruptionAnalysis: {
            mostCommonInterruptions: Array<{
                reason: string;
                frequency: number;
                averageDuration: number;
                impactOnFocus: number;
            }>;

            interruptionsByTimeOfDay: Record<number, number>;
            interruptionsByDayOfWeek: Record<number, number>;
        };
    };

    // Recommendations
    recommendations: Array<{
        type: 'schedule' | 'sessionType' | 'duration' | 'environment' | 'quest';
        priority: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        expectedImprovement: string;
        confidence: number; // 0-100%
    }>;

    // Goal tracking
    goals: {
        current: Array<{
            id: string;
            type: 'daily' | 'weekly' | 'monthly';
            description: string;
            target: number;
            current: number;
            deadline: string;
            onTrack: boolean;
        }>;

        completed: Array<{
            id: string;
            description: string;
            completedDate: string;
            target: number;
            finalValue: number;
        }>;
    };
}

export class SessionAnalyticsManager {
    private static readonly STORAGE_KEY = 'pomodoro-session-history';
    private static readonly ANALYTICS_CACHE_KEY = 'pomodoro-analytics-cache';

    // Session recording
    static async startSession(sessionData: Partial<SessionRecord>): Promise<string> {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session: SessionRecord = {
            id: sessionId,
            startTime: new Date(),
            plannedDuration: sessionData.plannedDuration || 25,
            sessionType: sessionData.sessionType || 'classic',
            completed: false,
            interruptions: 0,
            interruptionLog: [],
            focusScore: 0,
            attachedQuests: sessionData.attachedQuests || [],
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            isWeekend: [0, 6].includes(new Date().getDay()),
            productivity: {
                tasksCompleted: 0,
                questsCompleted: 0,
                subtasksCompleted: 0,
                averageTaskTime: 0,
                effortLevel: 5,
                satisfactionLevel: 5
            },
            rewards: {
                baseXP: 0,
                bonusXP: 0,
                totalXP: 0,
                baseCoins: 0,
                bonusCoins: 0,
                totalCoins: 0
            },
            mood: {
                before: sessionData.mood?.before || 5,
                after: 5,
                energy: sessionData.mood?.energy || 5,
                motivation: sessionData.mood?.motivation || 5
            },
            deviceType: this.getDeviceType(),
            appVersion: '1.0.0', // Should be dynamic
            pluginVersion: '1.0.0' // Should be dynamic
        };

        await this.saveSession(session);
        return sessionId;
    }

    static async completeSession(
        sessionId: string,
        completionData: {
            completed: boolean;
            actualDuration: number;
            interruptions: number;
            interruptionLog?: Array<{
                timestamp: Date;
                reason: string;
                duration: number;
            }>;
            productivity: Partial<SessionRecord['productivity']>;
            rewards: Partial<SessionRecord['rewards']>;
            mood: Partial<SessionRecord['mood']>;
            sessionNotes?: string;
        }
    ): Promise<void> {
        const sessions = await this.loadAllSessions();
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);

        if (sessionIndex === -1) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const session = sessions[sessionIndex];
        session.endTime = new Date();
        session.actualDuration = completionData.actualDuration;
        session.completed = completionData.completed;
        session.interruptions = completionData.interruptions;
        session.interruptionLog = completionData.interruptionLog || [];
        session.productivity = { ...session.productivity, ...completionData.productivity };
        session.rewards = { ...session.rewards, ...completionData.rewards };
        session.mood = { ...session.mood, ...completionData.mood };
        session.sessionNotes = completionData.sessionNotes;

        // Calculate focus score
        session.focusScore = this.calculateFocusScore(session);

        sessions[sessionIndex] = session;
        await this.saveAllSessions(sessions);

        // Invalidate analytics cache
        this.invalidateAnalyticsCache();
    }

    static async addInterruption(
        sessionId: string,
        interruption: {
            reason: string;
            duration: number;
        }
    ): Promise<void> {
        const sessions = await this.loadAllSessions();
        const session = sessions.find(s => s.id === sessionId);

        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.interruptions++;
        session.interruptionLog.push({
            timestamp: new Date(),
            reason: interruption.reason,
            duration: interruption.duration
        });

        await this.saveAllSessions(sessions);
    }

    // Analytics generation
    static async getDayAnalytics(date: string): Promise<DayAnalytics> {
        const sessions = await this.loadSessionsForDate(date);

        if (sessions.length === 0) {
            return this.getEmptyDayAnalytics(date);
        }

        const completedSessions = sessions.filter(s => s.completed);
        const totalFocusTime = completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
        const averageFocusScore = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + s.focusScore, 0) / completedSessions.length
            : 0;

        const totalXPEarned = sessions.reduce((sum, s) => sum + s.rewards.totalXP, 0);
        const totalCoinsEarned = sessions.reduce((sum, s) => sum + s.rewards.totalCoins, 0);
        const questsCompleted = sessions.reduce((sum, s) => sum + s.productivity.questsCompleted, 0);
        const tasksCompleted = sessions.reduce((sum, s) => sum + s.productivity.tasksCompleted, 0);

        const focusScores = completedSessions.map(s => s.focusScore);
        const bestSessionScore = Math.max(...focusScores, 0);
        const worstSessionScore = Math.min(...focusScores, 100);

        // Calculate mood improvement
        const moodBefore = sessions.reduce((sum, s) => sum + s.mood.before, 0) / sessions.length;
        const moodAfter = sessions.reduce((sum, s) => sum + s.mood.after, 0) / sessions.length;
        const moodImprovement = moodAfter - moodBefore;

        return {
            date,
            totalSessions: sessions.length,
            completedSessions: completedSessions.length,
            totalFocusTime,
            averageFocusScore,
            totalXPEarned,
            totalCoinsEarned,
            questsCompleted,
            tasksCompleted,
            bestSessionScore,
            worstSessionScore,
            productivityTrend: this.calculateTrend(date, 'productivity'),
            mood: {
                averageStart: moodBefore,
                averageEnd: moodAfter,
                moodImprovement
            }
        };
    }

    static async getWeekAnalytics(startDate: string): Promise<WeekAnalytics> {
        // Implementation for week analytics...
        // This would aggregate daily analytics and calculate weekly trends

        return {} as WeekAnalytics; // Placeholder
    }

    static async getProductivityInsights(timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<ProductivityInsights> {
        const sessions = await this.loadSessionsForTimeframe(timeframe);

        // Analyze patterns and generate insights
        const insights = this.analyzeProductivityPatterns(sessions);
        const recommendations = this.generateRecommendations(insights);

        return {
            personalBests: this.findPersonalBests(sessions),
            patterns: insights,
            recommendations,
            goals: await this.loadGoals()
        };
    }

    // Export functionality
    static async exportData(format: 'json' | 'csv', timeframe?: string): Promise<string> {
        const sessions = timeframe
            ? await this.loadSessionsForTimeframe(timeframe as 'week' | 'month' | 'quarter')
            : await this.loadAllSessions();

        if (format === 'csv') {
            return this.convertToCSV(sessions);
        }

        return JSON.stringify({
            exportDate: new Date().toISOString(),
            totalSessions: sessions.length,
            timeframe: timeframe || 'all',
            sessions,
            analytics: {
                totalFocusTime: sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0),
                averageFocusScore: sessions.reduce((sum, s) => sum + s.focusScore, 0) / sessions.length,
                completionRate: sessions.filter(s => s.completed).length / sessions.length
            }
        }, null, 2);
    }

    // Helper methods
    private static calculateFocusScore(session: SessionRecord): number {
        let score = 100; // Start with perfect score

        // Deduct for interruptions
        score -= Math.min(session.interruptions * 10, 50);

        // Deduct for incomplete sessions
        if (!session.completed) {
            score -= 30;
        }

        // Adjust for actual vs planned duration
        if (session.actualDuration && session.plannedDuration) {
            const durationRatio = session.actualDuration / session.plannedDuration;
            if (durationRatio < 0.8) {
                score -= 20; // Ended too early
            } else if (durationRatio > 1.5) {
                score -= 10; // Went way over
            }
        }

        // Bonus for productivity
        if (session.productivity.tasksCompleted > 0) {
            score += Math.min(session.productivity.tasksCompleted * 5, 20);
        }

        return Math.max(0, Math.min(100, score));
    }

    private static getDeviceType(): string {
        // Simple device detection - can be enhanced
        const userAgent = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    private static async saveSession(session: SessionRecord): Promise<void> {
        const sessions = await this.loadAllSessions();
        sessions.push(session);
        await this.saveAllSessions(sessions);
    }

    private static async loadAllSessions(): Promise<SessionRecord[]> {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const sessions = JSON.parse(saved);
                // Convert string dates back to Date objects
                return sessions.map((session: Partial<SessionRecord> & { startTime: string; endTime?: string; interruptionLog: Array<{ timestamp: string; reason: string; duration: number }> }) => ({
                    ...session,
                    startTime: new Date(session.startTime),
                    endTime: session.endTime ? new Date(session.endTime) : undefined,
                    interruptionLog: session.interruptionLog.map((log: { timestamp: string; reason: string; duration: number }) => ({
                        ...log,
                        timestamp: new Date(log.timestamp)
                    }))
                }));
            } catch {
                return [];
            }
        }
        return [];
    }

    private static async saveAllSessions(sessions: SessionRecord[]): Promise<void> {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    }

    private static async loadSessionsForDate(date: string): Promise<SessionRecord[]> {
        const allSessions = await this.loadAllSessions();
        return allSessions.filter(session => {
            const sessionDate = session.startTime.toISOString().split('T')[0];
            return sessionDate === date;
        });
    }

    private static async loadSessionsForWeek(startDate: string): Promise<SessionRecord[]> {
        // Implementation for loading week's sessions
        return [];
    }

    private static async loadSessionsForTimeframe(timeframe: 'week' | 'month' | 'quarter'): Promise<SessionRecord[]> {
        // Implementation for loading sessions within timeframe
        return [];
    }

    private static getEmptyDayAnalytics(date: string): DayAnalytics {
        return {
            date,
            totalSessions: 0,
            completedSessions: 0,
            totalFocusTime: 0,
            averageFocusScore: 0,
            totalXPEarned: 0,
            totalCoinsEarned: 0,
            questsCompleted: 0,
            tasksCompleted: 0,
            bestSessionScore: 0,
            worstSessionScore: 0,
            productivityTrend: 'stable',
            mood: {
                averageStart: 5,
                averageEnd: 5,
                moodImprovement: 0
            }
        };
    }

    private static calculateTrend(date: string, metric: 'productivity' | 'focus'): 'up' | 'down' | 'stable' {
        // Simple trend calculation - can be enhanced
        return 'stable';
    }

    private static analyzeProductivityPatterns(sessions: SessionRecord[]): ProductivityInsights['patterns'] {
        // Pattern analysis implementation
        return {} as ProductivityInsights['patterns'];
    }

    private static generateRecommendations(insights: ProductivityInsights['patterns']): ProductivityInsights['recommendations'] {
        // Recommendation generation
        return [];
    }

    private static findPersonalBests(sessions: SessionRecord[]): ProductivityInsights['personalBests'] {
        // Find personal best sessions and days
        return {} as ProductivityInsights['personalBests'];
    }

    private static async loadGoals(): Promise<ProductivityInsights['goals']> {
        // Load user goals
        return { current: [], completed: [] };
    }

    private static convertToCSV(sessions: SessionRecord[]): string {
        // CSV conversion implementation
        return '';
    }

    private static invalidateAnalyticsCache(): void {
        localStorage.removeItem(this.ANALYTICS_CACHE_KEY);
    }
}
