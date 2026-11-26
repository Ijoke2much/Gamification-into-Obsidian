// Quest Analytics Service for Pomodoro Integration
// Provides comprehensive analytics and insights for quest performance and productivity patterns

import { QuestProgressUpdate, QuestProgressSession } from './questProgressTracker';
import { QuestRewardCalculation } from './questRewardSystem';

export interface QuestAnalytics {
    questId: string;
    questTitle: string;
    totalSessions: number;
    totalTimeSpent: number; // in minutes
    averageSessionDuration: number;
    totalProgressGained: number;
    completionRate: number; // 0-1
    averageFocusScore: number;
    totalInterruptions: number;
    subtasksCompleted: number;
    totalSubtasks: number;
    averageRewardsPerSession: {
        xp: number;
        coins: number;
        cp: number;
        materials: number;
    };
    bestPerformanceSession: QuestProgressSession | null;
    productivityTrend: 'improving' | 'stable' | 'declining';
    optimalSessionTypes: string[];
    peakPerformanceHours: number[];
    difficultyRating: number; // 1-5 based on actual vs estimated time
    efficiencyScore: number; // 0-100 based on multiple factors
    lastUpdated: Date;
}

export interface ProductivityInsights {
    overallProductivity: {
        totalQuests: number;
        totalSessions: number;
        totalTimeSpent: number;
        averageSessionDuration: number;
        completionRate: number;
        averageFocusScore: number;
    };
    timePatterns: {
        mostProductiveHours: number[];
        leastProductiveHours: number[];
        weekendProductivity: number;
        weekdayProductivity: number;
    };
    questPerformance: {
        easiestQuestType: string;
        hardestQuestType: string;
        mostRewardingQuestType: string;
        averageCompletionTime: number;
    };
    sessionOptimization: {
        bestSessionTypes: string[];
        optimalSessionLength: number;
        recommendedBreakFrequency: number;
    };
    improvementSuggestions: string[];
    achievements: {
        streaks: number;
        perfectSessions: number;
        efficiencyMilestones: number;
        focusMastery: number;
    };
}

export interface QuestComparison {
    questId: string;
    questTitle: string;
    difficulty: string;
    estimatedTime: number;
    actualTime: number;
    efficiencyRatio: number; // estimated/actual
    completionRate: number;
    averageFocusScore: number;
    totalRewards: number;
    rank: number;
}

export class QuestAnalyticsService {
    private progressHistory: QuestProgressUpdate[] = [];
    private sessionHistory: QuestProgressSession[] = [];
    private rewardHistory: QuestRewardCalculation[] = [];
    private sampleDataAdded: boolean = false;

    /**
     * Add quest progress data to analytics
     */
    addProgressUpdate(update: QuestProgressUpdate): void {
        this.progressHistory.push(update);
    }

    /**
     * Add quest session data to analytics
     */
    addSessionData(session: QuestProgressSession): void {
        this.sessionHistory.push(session);
    }

    /**
     * Add reward calculation data to analytics
     */
    addRewardData(reward: QuestRewardCalculation): void {
        this.rewardHistory.push(reward);
    }

    /**
     * Get comprehensive analytics for a specific quest
     */
    getQuestAnalytics(questId: string): QuestAnalytics | null {
        const questSessions = this.sessionHistory.filter(s => s.questId === questId);
        const questProgress = this.progressHistory.filter(p => p.questId === questId);
        const questRewards = this.rewardHistory.filter(r =>
            this.sessionHistory.some(s => s.questId === questId)
        );

        if (questSessions.length === 0) return null;

        const totalTimeSpent = questSessions.reduce((sum, s) => {
            const duration = s.endTime ?
                (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60) : 0;
            return sum + duration;
        }, 0);

        const totalProgressGained = questProgress.reduce((sum, p) => sum + p.progress, 0) / Math.max(questProgress.length, 1);
        const averageFocusScore = questSessions.reduce((sum, s) => sum + s.focusScore, 0) / questSessions.length;
        const totalInterruptions = questSessions.reduce((sum, s) => sum + s.interruptions, 0);
        const subtasksCompleted = questProgress.reduce((sum, p) => sum + p.subtasksCompleted, 0);
        const totalSubtasks = questProgress.reduce((sum, p) => sum + p.totalSubtasks, 0);

        const averageRewardsPerSession = {
            xp: questRewards.reduce((sum, r) => sum + r.finalRewards.xp, 0) / Math.max(questRewards.length, 1),
            coins: questRewards.reduce((sum, r) => sum + r.finalRewards.coins, 0) / Math.max(questRewards.length, 1),
            cp: questRewards.reduce((sum, r) => sum + r.finalRewards.cp, 0) / Math.max(questRewards.length, 1),
            materials: questRewards.reduce((sum, r) => sum + r.finalRewards.materials.length, 0) / Math.max(questRewards.length, 1)
        };

        const bestPerformanceSession = questSessions.reduce((best, current) =>
            current.focusScore > (best?.focusScore || 0) ? current : best, null as QuestProgressSession | null
        );

        const productivityTrend = this.calculateProductivityTrend(questSessions);
        const optimalSessionTypes = this.getOptimalSessionTypes(questSessions);
        const peakPerformanceHours = this.getPeakPerformanceHours(questSessions);
        const difficultyRating = this.calculateDifficultyRating(questSessions, questProgress);
        const efficiencyScore = this.calculateEfficiencyScore(questSessions, questProgress);

        return {
            questId,
            questTitle: questProgress[0]?.questId.split(':')[0] || 'Unknown Quest',
            totalSessions: questSessions.length,
            totalTimeSpent,
            averageSessionDuration: totalTimeSpent / questSessions.length,
            totalProgressGained,
            completionRate: subtasksCompleted / Math.max(totalSubtasks, 1),
            averageFocusScore,
            totalInterruptions,
            subtasksCompleted,
            totalSubtasks,
            averageRewardsPerSession,
            bestPerformanceSession,
            productivityTrend,
            optimalSessionTypes,
            peakPerformanceHours,
            difficultyRating,
            efficiencyScore,
            lastUpdated: new Date()
        };
    }

    /**
     * Add sample data for demonstration purposes
     */
    private addSampleData(): void {
        if (this.sampleDataAdded) return;

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        // Add sample sessions
        this.sessionHistory.push(
            {
                sessionId: 'sample-1',
                questId: 'sample-quest-1',
                startTime: twoDaysAgo,
                endTime: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000),
                sessionType: 'classic',
                totalProgressGained: 25,
                focusScore: 85,
                interruptions: 1,
                subtasksCompleted: 2,
                progressUpdates: []
            },
            {
                sessionId: 'sample-2',
                questId: 'sample-quest-2',
                startTime: yesterday,
                endTime: new Date(yesterday.getTime() + 45 * 60 * 1000),
                sessionType: 'extended',
                totalProgressGained: 40,
                focusScore: 92,
                interruptions: 0,
                subtasksCompleted: 3,
                progressUpdates: []
            },
            {
                sessionId: 'sample-3',
                questId: 'sample-quest-1',
                startTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
                endTime: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000),
                sessionType: 'deepWork',
                totalProgressGained: 60,
                focusScore: 95,
                interruptions: 0,
                subtasksCompleted: 4,
                progressUpdates: []
            }
        );

        // Add sample progress updates
        this.progressHistory.push(
            {
                questId: 'sample-quest-1',
                filePath: '/sample/quest1.md',
                lineNumber: 10,
                progress: 25,
                subtasksCompleted: 2,
                totalSubtasks: 5,
                timeSpent: 25,
                sessionType: 'classic',
                timestamp: twoDaysAgo
            },
            {
                questId: 'sample-quest-2',
                filePath: '/sample/quest2.md',
                lineNumber: 15,
                progress: 40,
                subtasksCompleted: 3,
                totalSubtasks: 4,
                timeSpent: 45,
                sessionType: 'extended',
                timestamp: yesterday
            }
        );

        this.sampleDataAdded = true;
        console.log('📊 Sample analytics data added for demonstration');
    }

    /**
     * Get comprehensive productivity insights
     */
    getProductivityInsights(): ProductivityInsights {
        // Add sample data if no real data exists
        if (this.sessionHistory.length === 0) {
            this.addSampleData();
        }
        const allQuests = [...new Set(this.sessionHistory.map(s => s.questId))];
        const totalSessions = this.sessionHistory.length;
        const totalTimeSpent = this.sessionHistory.reduce((sum, s) => {
            const duration = s.endTime ?
                (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60) : 0;
            return sum + duration;
        }, 0);

        const averageSessionDuration = totalTimeSpent / Math.max(totalSessions, 1);
        const averageFocusScore = this.sessionHistory.reduce((sum, s) => sum + s.focusScore, 0) / Math.max(totalSessions, 1);

        // Calculate completion rate across all quests
        const totalSubtasksCompleted = this.progressHistory.reduce((sum, p) => sum + p.subtasksCompleted, 0);
        const totalSubtasks = this.progressHistory.reduce((sum, p) => sum + p.totalSubtasks, 0);
        const completionRate = totalSubtasksCompleted / Math.max(totalSubtasks, 1);

        const timePatterns = this.analyzeTimePatterns();
        const questPerformance = this.analyzeQuestPerformance();
        const sessionOptimization = this.analyzeSessionOptimization();
        const improvementSuggestions = this.generateImprovementSuggestions();
        const achievements = this.calculateAchievements();

        return {
            overallProductivity: {
                totalQuests: allQuests.length,
                totalSessions,
                totalTimeSpent,
                averageSessionDuration,
                completionRate,
                averageFocusScore
            },
            timePatterns,
            questPerformance,
            sessionOptimization,
            improvementSuggestions,
            achievements
        };
    }

    /**
     * Compare quest performance
     */
    getQuestComparisons(): QuestComparison[] {
        // Add sample data if no real data exists
        if (this.sessionHistory.length === 0) {
            this.addSampleData();
        }
        const questIds = [...new Set(this.sessionHistory.map(s => s.questId))];

        return questIds.map(questId => {
            const analytics = this.getQuestAnalytics(questId);
            if (!analytics) return null;

            const questSessions = this.sessionHistory.filter(s => s.questId === questId);
            const estimatedTime = questSessions.length * 25; // Assume 25 min per session
            const actualTime = analytics.totalTimeSpent;
            const efficiencyRatio = estimatedTime / Math.max(actualTime, 1);
            const totalRewards = analytics.averageRewardsPerSession.xp +
                (analytics.averageRewardsPerSession.coins * 2) +
                (analytics.averageRewardsPerSession.cp * 3);

            return {
                questId,
                questTitle: analytics.questTitle,
                difficulty: this.getDifficultyFromQuestId(questId),
                estimatedTime,
                actualTime,
                efficiencyRatio,
                completionRate: analytics.completionRate,
                averageFocusScore: analytics.averageFocusScore,
                totalRewards,
                rank: 0 // Will be set after sorting
            };
        }).filter(Boolean)
            .sort((a, b) => (b?.totalRewards || 0) - (a?.totalRewards || 0))
            .map((quest, index) => ({
                ...quest!,
                rank: index + 1
            }));
    }

    /**
     * Get performance trends over time
     */
    getPerformanceTrends(days: number = 7): {
        date: string;
        sessions: number;
        focusScore: number;
        productivity: number;
    }[] {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

        const dailyData: { [key: string]: { sessions: number; focusScores: number[]; productivity: number } } = {};

        this.sessionHistory.forEach(session => {
            const sessionDate = session.startTime.toISOString().split('T')[0];
            if (sessionDate >= startDate.toISOString().split('T')[0]) {
                if (!dailyData[sessionDate]) {
                    dailyData[sessionDate] = { sessions: 0, focusScores: [], productivity: 0 };
                }
                dailyData[sessionDate].sessions++;
                dailyData[sessionDate].focusScores.push(session.focusScore);
                dailyData[sessionDate].productivity += session.totalProgressGained;
            }
        });

        return Object.entries(dailyData).map(([date, data]) => ({
            date,
            sessions: data.sessions,
            focusScore: data.focusScores.reduce((sum, score) => sum + score, 0) / Math.max(data.focusScores.length, 1),
            productivity: data.productivity
        })).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Calculate productivity trend for a quest
     */
    private calculateProductivityTrend(sessions: QuestProgressSession[]): 'improving' | 'stable' | 'declining' {
        if (sessions.length < 3) return 'stable';

        const recentSessions = sessions.slice(-3);
        const olderSessions = sessions.slice(-6, -3);

        if (olderSessions.length === 0) return 'stable';

        const recentAvgFocus = recentSessions.reduce((sum, s) => sum + s.focusScore, 0) / recentSessions.length;
        const olderAvgFocus = olderSessions.reduce((sum, s) => sum + s.focusScore, 0) / olderSessions.length;

        const improvement = (recentAvgFocus - olderAvgFocus) / olderAvgFocus;

        if (improvement > 0.1) return 'improving';
        if (improvement < -0.1) return 'declining';
        return 'stable';
    }

    /**
     * Get optimal session types for a quest
     */
    private getOptimalSessionTypes(sessions: QuestProgressSession[]): string[] {
        const sessionTypePerformance: { [key: string]: number } = {};

        sessions.forEach(session => {
            if (!sessionTypePerformance[session.sessionType]) {
                sessionTypePerformance[session.sessionType] = 0;
            }
            sessionTypePerformance[session.sessionType] += session.focusScore;
        });

        return Object.entries(sessionTypePerformance)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type]) => type);
    }

    /**
     * Get peak performance hours
     */
    private getPeakPerformanceHours(sessions: QuestProgressSession[]): number[] {
        const hourlyPerformance: { [key: number]: number } = {};

        sessions.forEach(session => {
            const hour = session.startTime.getHours();
            if (!hourlyPerformance[hour]) {
                hourlyPerformance[hour] = 0;
            }
            hourlyPerformance[hour] += session.focusScore;
        });

        return Object.entries(hourlyPerformance)
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 3)
            .map(([hour]) => Number(hour));
    }

    /**
     * Calculate difficulty rating based on actual vs estimated time
     */
    private calculateDifficultyRating(sessions: QuestProgressSession[], progress: QuestProgressUpdate[]): number {
        if (sessions.length === 0) return 3;

        const averageSessionDuration = sessions.reduce((sum, s) => {
            const duration = s.endTime ?
                (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60) : 25;
            return sum + duration;
        }, 0) / sessions.length;

        // Rate difficulty from 1-5 based on session duration
        if (averageSessionDuration <= 15) return 1; // Easy
        if (averageSessionDuration <= 25) return 2; // Easy-Medium
        if (averageSessionDuration <= 35) return 3; // Medium
        if (averageSessionDuration <= 45) return 4; // Medium-Hard
        return 5; // Hard
    }

    /**
     * Calculate efficiency score
     */
    private calculateEfficiencyScore(sessions: QuestProgressSession[], progress: QuestProgressUpdate[]): number {
        if (sessions.length === 0) return 50;

        const avgFocusScore = sessions.reduce((sum, s) => sum + s.focusScore, 0) / sessions.length;
        const avgInterruptions = sessions.reduce((sum, s) => sum + s.interruptions, 0) / sessions.length;
        const completionRate = progress.reduce((sum, p) => sum + (p.subtasksCompleted / Math.max(p.totalSubtasks, 1)), 0) / Math.max(progress.length, 1);

        // Calculate efficiency score (0-100)
        const focusComponent = avgFocusScore * 0.4; // 40% weight
        const interruptionComponent = Math.max(0, (5 - avgInterruptions) * 10); // 20% weight
        const completionComponent = completionRate * 40; // 40% weight

        return Math.min(100, Math.round(focusComponent + interruptionComponent + completionComponent));
    }

    /**
     * Analyze time patterns
     */
    private analyzeTimePatterns() {
        const hourlyProductivity: { [key: number]: { count: number; totalFocus: number } } = {};
        let weekendSessions = 0;
        let weekdaySessions = 0;
        let weekendFocus = 0;
        let weekdayFocus = 0;

        this.sessionHistory.forEach(session => {
            const hour = session.startTime.getHours();
            const isWeekend = [0, 6].includes(session.startTime.getDay());

            if (!hourlyProductivity[hour]) {
                hourlyProductivity[hour] = { count: 0, totalFocus: 0 };
            }
            hourlyProductivity[hour].count++;
            hourlyProductivity[hour].totalFocus += session.focusScore;

            if (isWeekend) {
                weekendSessions++;
                weekendFocus += session.focusScore;
            } else {
                weekdaySessions++;
                weekdayFocus += session.focusScore;
            }
        });

        const mostProductiveHours = Object.entries(hourlyProductivity)
            .map(([hour, data]) => ({ hour: Number(hour), avgFocus: data.totalFocus / data.count }))
            .sort((a, b) => b.avgFocus - a.avgFocus)
            .slice(0, 3)
            .map(item => item.hour);

        const leastProductiveHours = Object.entries(hourlyProductivity)
            .map(([hour, data]) => ({ hour: Number(hour), avgFocus: data.totalFocus / data.count }))
            .sort((a, b) => a.avgFocus - b.avgFocus)
            .slice(0, 3)
            .map(item => item.hour);

        return {
            mostProductiveHours,
            leastProductiveHours,
            weekendProductivity: weekendSessions > 0 ? weekendFocus / weekendSessions : 0,
            weekdayProductivity: weekdaySessions > 0 ? weekdayFocus / weekdaySessions : 0
        };
    }

    /**
     * Analyze quest performance patterns
     */
    private analyzeQuestPerformance() {
        const questTypes: { [key: string]: { count: number; totalRewards: number; avgTime: number } } = {};

        this.sessionHistory.forEach(session => {
            // Determine quest type based on session characteristics
            let questType = 'general';
            if (session.totalProgressGained > 50) questType = 'high-progress';
            else if (session.totalProgressGained < 20) questType = 'low-progress';

            if (!questTypes[questType]) {
                questTypes[questType] = { count: 0, totalRewards: 0, avgTime: 0 };
            }
            questTypes[questType].count++;

            const sessionDuration = session.endTime ?
                (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60) : 25;
            questTypes[questType].avgTime += sessionDuration;
        });

        const easiestQuestType = Object.entries(questTypes)
            .sort((a, b) => a[1].avgTime - b[1].avgTime)[0]?.[0] || 'general';

        const hardestQuestType = Object.entries(questTypes)
            .sort((a, b) => b[1].avgTime - a[1].avgTime)[0]?.[0] || 'general';

        const mostRewardingQuestType = Object.entries(questTypes)
            .sort((a, b) => b[1].totalRewards - a[1].totalRewards)[0]?.[0] || 'general';

        const averageCompletionTime = Object.values(questTypes)
            .reduce((sum, type) => sum + (type.avgTime / type.count), 0) / Object.keys(questTypes).length;

        return {
            easiestQuestType,
            hardestQuestType,
            mostRewardingQuestType,
            averageCompletionTime
        };
    }

    /**
     * Analyze session optimization opportunities
     */
    private analyzeSessionOptimization() {
        const sessionTypes: { [key: string]: { count: number; avgFocus: number } } = {};

        this.sessionHistory.forEach(session => {
            if (!sessionTypes[session.sessionType]) {
                sessionTypes[session.sessionType] = { count: 0, avgFocus: 0 };
            }
            sessionTypes[session.sessionType].count++;
            sessionTypes[session.sessionType].avgFocus += session.focusScore;
        });

        const bestSessionTypes = Object.entries(sessionTypes)
            .map(([type, data]) => ({ type, avgFocus: data.avgFocus / data.count }))
            .sort((a, b) => b.avgFocus - a.avgFocus)
            .slice(0, 3)
            .map(item => item.type);

        const sessionDurations = this.sessionHistory.map(session => {
            return session.endTime ?
                (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60) : 25;
        });

        const optimalSessionLength = sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length;

        return {
            bestSessionTypes,
            optimalSessionLength,
            recommendedBreakFrequency: 4 // Default recommendation
        };
    }

    /**
     * Generate improvement suggestions
     */
    private generateImprovementSuggestions(): string[] {
        const suggestions: string[] = [];

        // Calculate metrics directly to avoid recursive call
        const totalSessions = this.sessionHistory.length;
        const totalTimeSpent = this.sessionHistory.reduce((sum, s) => {
            const duration = s.endTime ?
                (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60) : 0;
            return sum + duration;
        }, 0);
        const averageSessionDuration = totalTimeSpent / Math.max(totalSessions, 1);
        const averageFocusScore = this.sessionHistory.reduce((sum, s) => sum + s.focusScore, 0) / Math.max(totalSessions, 1);

        // Calculate completion rate
        const totalSubtasksCompleted = this.progressHistory.reduce((sum, p) => sum + p.subtasksCompleted, 0);
        const totalSubtasks = this.progressHistory.reduce((sum, p) => sum + p.totalSubtasks, 0);
        const completionRate = totalSubtasksCompleted / Math.max(totalSubtasks, 1);

        // Generate suggestions based on calculated metrics
        if (averageFocusScore < 70) {
            suggestions.push("Try reducing distractions during sessions to improve focus score");
        }

        if (completionRate < 0.6) {
            suggestions.push("Consider breaking down quests into smaller, more manageable subtasks");
        }

        if (averageSessionDuration > 45) {
            suggestions.push("Longer sessions might be causing fatigue - consider shorter, more frequent sessions");
        }

        // Add some default helpful suggestions if no data
        if (totalSessions === 0) {
            suggestions.push("Start completing quests to generate personalized insights!");
            suggestions.push("Try different session types to find what works best for you");
            suggestions.push("Attach quests to Pomodoro sessions for better tracking");
        }

        // Add general productivity tips
        suggestions.push("Take regular breaks between sessions to maintain focus");
        suggestions.push("Use hyperfocus mode for complex tasks when energy levels are high");

        return suggestions;
    }

    /**
     * Calculate achievements
     */
    private calculateAchievements() {
        const perfectSessions = this.sessionHistory.filter(s => s.focusScore >= 95).length;
        const streaks = this.calculateStreaks();
        const efficiencyMilestones = this.sessionHistory.filter(s => s.totalProgressGained > 80).length;
        const focusMastery = this.sessionHistory.filter(s => s.focusScore >= 90).length;

        return {
            streaks,
            perfectSessions,
            efficiencyMilestones,
            focusMastery
        };
    }

    /**
     * Calculate consecutive session streaks
     */
    private calculateStreaks(): number {
        if (this.sessionHistory.length === 0) return 0;

        const sortedSessions = this.sessionHistory.sort((a, b) =>
            a.startTime.getTime() - b.startTime.getTime()
        );

        let maxStreak = 0;
        let currentStreak = 0;
        let lastDate: string | null = null;

        sortedSessions.forEach(session => {
            const sessionDate = session.startTime.toISOString().split('T')[0];

            if (lastDate === null || sessionDate !== lastDate) {
                currentStreak = 1;
            } else {
                currentStreak++;
            }

            maxStreak = Math.max(maxStreak, currentStreak);
            lastDate = sessionDate;
        });

        return maxStreak;
    }

    /**
     * Get difficulty from quest ID (placeholder implementation)
     */
    private getDifficultyFromQuestId(questId: string): string {
        // This would need to be implemented based on how quest difficulty is stored
        return 'medium';
    }

    /**
     * Clear all analytics data
     */
    clearAnalytics(): void {
        this.progressHistory = [];
        this.sessionHistory = [];
        this.rewardHistory = [];
    }

    /**
     * Export analytics data
     */
    exportAnalytics(): {
        progressHistory: QuestProgressUpdate[];
        sessionHistory: QuestProgressSession[];
        rewardHistory: QuestRewardCalculation[];
    } {
        return {
            progressHistory: [...this.progressHistory],
            sessionHistory: [...this.sessionHistory],
            rewardHistory: [...this.rewardHistory]
        };
    }
}
