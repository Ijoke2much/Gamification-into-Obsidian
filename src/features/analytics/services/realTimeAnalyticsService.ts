import { Notice } from 'obsidian';
import { Boss } from '../../quests/types/BossTypes';
import { materialRewardSystem } from '../../quests/systems/materialRewardSystem';
import { productivityEquipmentSystem } from '../../quests/systems/productivityEquipmentSystem';
import { dynamicBossEvents } from '../../quests/systems/dynamicBossEvents';

/**
 * Real-Time Analytics Service
 * Provides live productivity insights and battle statistics
 * Optimized for both detailed analytics tab and compact sidebar display
 */
export class RealTimeAnalyticsService {
    private static instance: RealTimeAnalyticsService;
    private analyticsData: AnalyticsData;
    private listeners: Set<AnalyticsListener> = new Set();
    private updateInterval: number | null = null;
    private lastUpdateTime: number = 0;

    private constructor() {
        this.analyticsData = this.initializeAnalyticsData();
        this.loadStoredData();
        this.startRealTimeUpdates();
    }

    static getInstance(): RealTimeAnalyticsService {
        if (!RealTimeAnalyticsService.instance) {
            RealTimeAnalyticsService.instance = new RealTimeAnalyticsService();
        }
        return RealTimeAnalyticsService.instance;
    }

    /**
     * Initialize analytics data structure
     */
    private initializeAnalyticsData(): AnalyticsData {
        return {
            // Real-time session metrics
            currentSession: {
                startTime: new Date(),
                activeBossId: null,
                totalFocusTime: 0,
                tasksCompleted: 0,
                productivityScore: 0,
                currentStreak: 0,
                activeEvents: [],
                equippedGear: [],
                lastActivity: new Date()
            },

            // Daily metrics
            dailyMetrics: {
                date: new Date().toDateString(),
                totalWorkTime: 0,
                bossesDefeated: 0,
                materialsCollected: 0,
                equipmentCrafted: 0,
                productivityEvents: 0,
                averageFocus: 0,
                peakProductivityHour: 0,
                goalsAchieved: 0
            },

            // Weekly trends
            weeklyTrends: {
                productivityTrend: 'stable',
                focusImprovement: 0,
                consistencyScore: 0,
                mostProductiveDay: '',
                challengingAreas: [],
                achievements: []
            },

            // Battle analytics
            battleAnalytics: {
                totalBattles: 0,
                victories: 0,
                averageBattleTime: 0,
                mostUsedEquipment: '',
                favoriteEventType: '',
                damageDealtTotal: 0,
                materialsEarned: 0,
                craftingLevel: 0
            },

            // Productivity insights
            productivityInsights: {
                optimalWorkHours: [],
                distractionPatterns: [],
                motivationTriggers: [],
                efficiencyTips: [],
                personalizedRecommendations: []
            },

            // Performance metrics
            performanceMetrics: {
                focusScore: 0,
                enduranceScore: 0,
                creativityScore: 0,
                organizationScore: 0,
                overallProductivity: 0,
                improvementAreas: [],
                strengths: []
            }
        };
    }

    /**
     * Start real-time analytics updates
     */
    private startRealTimeUpdates(): void {
        // Update every 30 seconds
        this.updateInterval = window.setInterval(() => {
            this.updateRealTimeMetrics();
        }, 30000);

        // Also update on significant events
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for immediate updates
     */
    private setupEventListeners(): void {
        // Listen for boss battle events
        window.addEventListener('boss-battle-start', this.handleBossBattleStart.bind(this) as EventListener);
        window.addEventListener('boss-battle-end', this.handleBossBattleEnd.bind(this) as EventListener);
        window.addEventListener('boss-damage-dealt', this.handleBossDamage.bind(this) as EventListener);
        window.addEventListener('task-completed', this.handleTaskCompleted.bind(this) as EventListener);
        window.addEventListener('equipment-changed', this.handleEquipmentChange.bind(this) as EventListener);
    }

    /**
     * Update real-time metrics
     */
    private updateRealTimeMetrics(): void {
        const now = new Date();
        const timeSinceLastUpdate = now.getTime() - this.lastUpdateTime;

        // Update current session
        this.updateCurrentSession(timeSinceLastUpdate);

        // Update daily metrics
        this.updateDailyMetrics();

        // Calculate productivity insights
        this.calculateProductivityInsights();

        // Update performance metrics
        this.updatePerformanceMetrics();

        // Notify listeners
        this.notifyListeners();

        this.lastUpdateTime = now.getTime();
        this.saveAnalyticsData();
    }

    /**
     * Update current session metrics
     */
    private updateCurrentSession(timeDelta: number): void {
        const session = this.analyticsData.currentSession;

        // Update focus time if actively working
        if (session.activeBossId) {
            session.totalFocusTime += timeDelta / 1000; // Convert to seconds
        }

        // Update active events
        session.activeEvents = Array.from(dynamicBossEvents.getAllActiveEvents().values());

        // Update equipped gear
        session.equippedGear = Array.from(productivityEquipmentSystem.getEquippedGear().values());

        // Calculate productivity score
        session.productivityScore = this.calculateProductivityScore();

        // Update activity timestamp
        session.lastActivity = new Date();
    }

    /**
     * Update daily metrics
     */
    private updateDailyMetrics(): void {
        const today = new Date().toDateString();
        const daily = this.analyticsData.dailyMetrics;

        // Reset if new day
        if (daily.date !== today) {
            this.archiveDailyMetrics();
            daily.date = today;
            daily.totalWorkTime = 0;
            daily.bossesDefeated = 0;
            daily.materialsCollected = 0;
            daily.equipmentCrafted = 0;
            daily.productivityEvents = 0;
            daily.goalsAchieved = 0;
        }

        // Update peak productivity hour
        const currentHour = new Date().getHours();
        const currentProductivity = this.analyticsData.currentSession.productivityScore;
        if (currentProductivity > daily.averageFocus) {
            daily.peakProductivityHour = currentHour;
        }

        // Update average focus
        daily.averageFocus = this.calculateDailyAverageFocus();
    }

    /**
     * Calculate productivity insights
     */
    private calculateProductivityInsights(): void {
        const insights = this.analyticsData.productivityInsights;

        // Analyze optimal work hours
        insights.optimalWorkHours = this.analyzeOptimalWorkHours();

        // Identify distraction patterns
        insights.distractionPatterns = this.analyzeDistractionPatterns();

        // Find motivation triggers
        insights.motivationTriggers = this.analyzeMotivationTriggers();

        // Generate efficiency tips
        insights.efficiencyTips = this.generateEfficiencyTips();

        // Create personalized recommendations
        insights.personalizedRecommendations = this.generatePersonalizedRecommendations();
    }

    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics(): void {
        const metrics = this.analyticsData.performanceMetrics;
        const session = this.analyticsData.currentSession;

        // Calculate focus score based on active time and distractions
        metrics.focusScore = this.calculateFocusScore();

        // Calculate endurance score based on work duration
        metrics.enduranceScore = this.calculateEnduranceScore();

        // Calculate creativity score based on variety of tasks
        metrics.creativityScore = this.calculateCreativityScore();

        // Calculate organization score based on task completion patterns
        metrics.organizationScore = this.calculateOrganizationScore();

        // Calculate overall productivity
        metrics.overallProductivity = (
            metrics.focusScore * 0.3 +
            metrics.enduranceScore * 0.2 +
            metrics.creativityScore * 0.2 +
            metrics.organizationScore * 0.3
        );

        // Identify strengths and improvement areas
        metrics.strengths = this.identifyStrengths(metrics);
        metrics.improvementAreas = this.identifyImprovementAreas(metrics);
    }

    /**
     * Handle boss battle start
     */
    private handleBossBattleStart(event: Event): void {
        const customEvent = event as CustomEvent;
        if (customEvent.detail) {
            const { boss } = customEvent.detail;
            this.analyticsData.currentSession.activeBossId = boss.id;
            this.analyticsData.battleAnalytics.totalBattles++;
            this.notifyListeners();
        }
    }

    /**
     * Handle boss battle end
     */
    private handleBossBattleEnd(event: Event): void {
        const customEvent = event as CustomEvent;
        if (customEvent.detail) {
            const { boss, victory, duration } = customEvent.detail;
            const session = this.analyticsData.currentSession;
            const battle = this.analyticsData.battleAnalytics;

            session.activeBossId = null;

            if (victory) {
                battle.victories++;
                this.analyticsData.dailyMetrics.bossesDefeated++;
            }

            // Update average battle time
            battle.averageBattleTime = (battle.averageBattleTime * (battle.totalBattles - 1) + duration) / battle.totalBattles;

            this.notifyListeners();
        }
    }

    /**
     * Handle boss damage dealt
     */
    private handleBossDamage(event: Event): void {
        const customEvent = event as CustomEvent;
        if (customEvent.detail) {
            const { damage } = customEvent.detail;
            this.analyticsData.battleAnalytics.damageDealtTotal += damage;
            this.notifyListeners();
        }
    }

    /**
     * Handle task completion
     */
    private handleTaskCompleted(event: Event): void {
        const session = this.analyticsData.currentSession;
        const daily = this.analyticsData.dailyMetrics;

        session.tasksCompleted++;
        session.currentStreak++;
        daily.goalsAchieved++;

        this.notifyListeners();
    }

    /**
     * Handle equipment changes
     */
    private handleEquipmentChange(event: Event): void {
        const customEvent = event as CustomEvent;
        if (customEvent.detail) {
            const { equipment } = customEvent.detail;
            this.analyticsData.battleAnalytics.mostUsedEquipment = equipment.name;
            this.notifyListeners();
        }
    }

    /**
     * Calculate productivity score
     */
    private calculateProductivityScore(): number {
        const session = this.analyticsData.currentSession;
        let score = 50; // Base score

        // Focus time bonus
        const focusHours = session.totalFocusTime / 3600;
        score += Math.min(focusHours * 10, 30); // Max 30 points for focus

        // Task completion bonus
        score += session.tasksCompleted * 5; // 5 points per task

        // Streak bonus
        score += Math.min(session.currentStreak * 2, 20); // Max 20 points for streak

        // Equipment bonus
        score += session.equippedGear.length * 3; // 3 points per equipped item

        // Active events impact
        for (const event of session.activeEvents) {
            if (event.type === 'inspiration_strike' || event.type === 'weekend_motivation') {
                score += 10; // Positive events boost score
            } else if (event.type === 'procrastination_wave' || event.type === 'sick_day') {
                score -= 5; // Negative events reduce score
            }
        }

        return Math.max(0, Math.min(100, score)); // Clamp between 0-100
    }

    /**
     * Analyze optimal work hours
     */
    private analyzeOptimalWorkHours(): number[] {
        // This would analyze historical data to find peak productivity hours
        // For now, return common productive hours
        return [9, 10, 11, 14, 15]; // 9-11 AM and 2-3 PM
    }

    /**
     * Analyze distraction patterns
     */
    private analyzeDistractionPatterns(): string[] {
        const patterns: string[] = [];
        const events = this.analyticsData.currentSession.activeEvents;

        if (events.some(e => e.type === 'unexpected_meeting')) {
            patterns.push('Frequent interruptions from meetings');
        }
        if (events.some(e => e.type === 'procrastination_wave')) {
            patterns.push('Afternoon procrastination tendency');
        }

        return patterns;
    }

    /**
     * Analyze motivation triggers
     */
    private analyzeMotivationTriggers(): string[] {
        const triggers: string[] = [];
        const equipment = this.analyticsData.currentSession.equippedGear;

        if (equipment.some(e => e.name.includes('Coffee'))) {
            triggers.push('Morning caffeine boost');
        }
        if (equipment.some(e => e.name.includes('Music'))) {
            triggers.push('Background music focus');
        }

        return triggers;
    }

    /**
     * Generate efficiency tips
     */
    private generateEfficiencyTips(): string[] {
        const tips: string[] = [];
        const metrics = this.analyticsData.performanceMetrics;

        if (metrics.focusScore < 60) {
            tips.push('Try the Pomodoro Technique for better focus');
        }
        if (metrics.organizationScore < 60) {
            tips.push('Use a project management app for better organization');
        }
        if (metrics.enduranceScore < 60) {
            tips.push('Take regular breaks to maintain energy');
        }

        return tips;
    }

    /**
     * Generate personalized recommendations
     */
    private generatePersonalizedRecommendations(): string[] {
        const recommendations: string[] = [];
        const daily = this.analyticsData.dailyMetrics;
        const session = this.analyticsData.currentSession;

        if (daily.peakProductivityHour > 0) {
            recommendations.push(`Your peak productivity is at ${daily.peakProductivityHour}:00. Schedule important tasks then.`);
        }

        if (session.currentStreak > 5) {
            recommendations.push('Great streak! Consider taking a short break to maintain momentum.');
        }

        if (session.equippedGear.length === 0) {
            recommendations.push('Equip productivity tools to boost your effectiveness!');
        }

        return recommendations;
    }

    /**
     * Calculate individual performance scores
     */
    private calculateFocusScore(): number {
        const session = this.analyticsData.currentSession;
        const focusTime = session.totalFocusTime / 3600; // Hours
        const distractions = session.activeEvents.filter(e =>
            ['procrastination_wave', 'unexpected_meeting'].includes(e.type)
        ).length;

        let score = Math.min(focusTime * 20, 80); // Base score from focus time
        score -= distractions * 10; // Penalty for distractions
        score += session.equippedGear.filter(e => e.name.includes('Focus')).length * 10; // Focus equipment bonus

        return Math.max(0, Math.min(100, score));
    }

    private calculateEnduranceScore(): number {
        const session = this.analyticsData.currentSession;
        const sessionHours = (new Date().getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
        const activeRatio = session.totalFocusTime / (sessionHours * 3600);

        return Math.min(activeRatio * 100, 100);
    }

    private calculateCreativityScore(): number {
        // Based on variety of tasks and creative equipment
        const session = this.analyticsData.currentSession;
        const creativeEquipment = session.equippedGear.filter(e =>
            e.name.includes('Creative') || e.name.includes('Writing')
        ).length;

        return Math.min(50 + creativeEquipment * 25, 100);
    }

    private calculateOrganizationScore(): number {
        const session = this.analyticsData.currentSession;
        const organizationEquipment = session.equippedGear.filter(e =>
            e.name.includes('Management') || e.name.includes('Planner')
        ).length;

        let score = 40; // Base score
        score += organizationEquipment * 30; // Organization tools
        score += Math.min(session.tasksCompleted * 5, 30); // Task completion

        return Math.min(score, 100);
    }

    /**
     * Identify strengths and improvement areas
     */
    private identifyStrengths(metrics: any): string[] {
        const strengths: string[] = [];

        if (metrics.focusScore >= 80) strengths.push('Excellent focus');
        if (metrics.enduranceScore >= 80) strengths.push('Great endurance');
        if (metrics.creativityScore >= 80) strengths.push('High creativity');
        if (metrics.organizationScore >= 80) strengths.push('Well organized');

        return strengths;
    }

    private identifyImprovementAreas(metrics: any): string[] {
        const areas: string[] = [];

        if (metrics.focusScore < 60) areas.push('Focus enhancement');
        if (metrics.enduranceScore < 60) areas.push('Stamina building');
        if (metrics.creativityScore < 60) areas.push('Creative thinking');
        if (metrics.organizationScore < 60) areas.push('Better organization');

        return areas;
    }

    /**
     * Get analytics data for different display contexts
     */
    getSidebarMetrics(): SidebarAnalytics {
        const session = this.analyticsData.currentSession;
        const daily = this.analyticsData.dailyMetrics;
        const performance = this.analyticsData.performanceMetrics;

        return {
            currentProductivity: Math.round(session.productivityScore),
            focusTime: Math.round(session.totalFocusTime / 60), // Minutes
            tasksCompleted: session.tasksCompleted,
            currentStreak: session.currentStreak,
            topStrength: performance.strengths[0] || 'Building momentum',
            nextTip: this.analyticsData.productivityInsights.efficiencyTips[0] || 'Keep up the great work!'
        };
    }

    getDetailedAnalytics(): DetailedAnalytics {
        return {
            session: this.analyticsData.currentSession,
            daily: this.analyticsData.dailyMetrics,
            weekly: this.analyticsData.weeklyTrends,
            battle: this.analyticsData.battleAnalytics,
            insights: this.analyticsData.productivityInsights,
            performance: this.analyticsData.performanceMetrics
        };
    }

    /**
     * Register analytics listener
     */
    addListener(listener: AnalyticsListener): void {
        this.listeners.add(listener);
    }

    /**
     * Remove analytics listener
     */
    removeListener(listener: AnalyticsListener): void {
        this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of updates
     */
    private notifyListeners(): void {
        const sidebarData = this.getSidebarMetrics();
        const detailedData = this.getDetailedAnalytics();

        for (const listener of this.listeners) {
            try {
                listener(sidebarData, detailedData);
            } catch (error) {
                console.error('Error notifying analytics listener:', error);
            }
        }
    }

    /**
     * Save analytics data to localStorage
     */
    private saveAnalyticsData(): void {
        try {
            const dataToSave = {
                ...this.analyticsData,
                currentSession: {
                    ...this.analyticsData.currentSession,
                    startTime: this.analyticsData.currentSession.startTime.toISOString(),
                    lastActivity: this.analyticsData.currentSession.lastActivity.toISOString()
                }
            };
            localStorage.setItem('real-time-analytics', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    /**
     * Load stored analytics data
     */
    private loadStoredData(): void {
        try {
            const saved = localStorage.getItem('real-time-analytics');
            if (saved) {
                const data = JSON.parse(saved);
                this.analyticsData = {
                    ...this.analyticsData,
                    ...data,
                    currentSession: {
                        ...this.analyticsData.currentSession,
                        ...data.currentSession,
                        startTime: new Date(data.currentSession?.startTime || new Date()),
                        lastActivity: new Date(data.currentSession?.lastActivity || new Date())
                    }
                };
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }

    /**
     * Archive daily metrics for historical analysis
     */
    private archiveDailyMetrics(): void {
        const archived = {
            ...this.analyticsData.dailyMetrics,
            archived: true
        };

        const history = JSON.parse(localStorage.getItem('analytics-history') || '[]');
        history.push(archived);

        // Keep only last 30 days
        const last30Days = history.slice(-30);
        localStorage.setItem('analytics-history', JSON.stringify(last30Days));
    }

    /**
     * Calculate daily average focus
     */
    private calculateDailyAverageFocus(): number {
        const session = this.analyticsData.currentSession;
        const sessionHours = (new Date().getTime() - session.startTime.getTime()) / (1000 * 60 * 60);

        if (sessionHours === 0) return 0;

        return Math.round((session.totalFocusTime / (sessionHours * 3600)) * 100);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Remove event listeners
        window.removeEventListener('boss-battle-start', this.handleBossBattleStart.bind(this) as EventListener);
        window.removeEventListener('boss-battle-end', this.handleBossBattleEnd.bind(this) as EventListener);
        window.removeEventListener('boss-damage-dealt', this.handleBossDamage.bind(this) as EventListener);
        window.removeEventListener('task-completed', this.handleTaskCompleted.bind(this) as EventListener);
        window.removeEventListener('equipment-changed', this.handleEquipmentChange.bind(this) as EventListener);

        this.listeners.clear();
    }
}

// Type definitions
export interface AnalyticsData {
    currentSession: SessionMetrics;
    dailyMetrics: DailyMetrics;
    weeklyTrends: WeeklyTrends;
    battleAnalytics: BattleAnalytics;
    productivityInsights: ProductivityInsights;
    performanceMetrics: PerformanceMetrics;
}

export interface SessionMetrics {
    startTime: Date;
    activeBossId: string | null;
    totalFocusTime: number; // seconds
    tasksCompleted: number;
    productivityScore: number; // 0-100
    currentStreak: number;
    activeEvents: any[];
    equippedGear: any[];
    lastActivity: Date;
}

export interface DailyMetrics {
    date: string;
    totalWorkTime: number;
    bossesDefeated: number;
    materialsCollected: number;
    equipmentCrafted: number;
    productivityEvents: number;
    averageFocus: number;
    peakProductivityHour: number;
    goalsAchieved: number;
}

export interface WeeklyTrends {
    productivityTrend: 'improving' | 'stable' | 'declining';
    focusImprovement: number;
    consistencyScore: number;
    mostProductiveDay: string;
    challengingAreas: string[];
    achievements: string[];
}

export interface BattleAnalytics {
    totalBattles: number;
    victories: number;
    averageBattleTime: number;
    mostUsedEquipment: string;
    favoriteEventType: string;
    damageDealtTotal: number;
    materialsEarned: number;
    craftingLevel: number;
}

export interface ProductivityInsights {
    optimalWorkHours: number[];
    distractionPatterns: string[];
    motivationTriggers: string[];
    efficiencyTips: string[];
    personalizedRecommendations: string[];
}

export interface PerformanceMetrics {
    focusScore: number;
    enduranceScore: number;
    creativityScore: number;
    organizationScore: number;
    overallProductivity: number;
    improvementAreas: string[];
    strengths: string[];
}

export interface SidebarAnalytics {
    currentProductivity: number;
    focusTime: number; // minutes
    tasksCompleted: number;
    currentStreak: number;
    topStrength: string;
    nextTip: string;
}

export interface DetailedAnalytics {
    session: SessionMetrics;
    daily: DailyMetrics;
    weekly: WeeklyTrends;
    battle: BattleAnalytics;
    insights: ProductivityInsights;
    performance: PerformanceMetrics;
}

export type AnalyticsListener = (sidebar: SidebarAnalytics, detailed: DetailedAnalytics) => void;

// Export singleton instance
export const realTimeAnalyticsService = RealTimeAnalyticsService.getInstance();
