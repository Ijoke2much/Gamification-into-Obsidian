// Enhanced Achievement Processor
// Handles achievement unlocking, progress tracking, and analytics

import { AchievementTracker, Achievement, PlayerAchievement } from '../../../data/models/AchievementSystem';

export interface AchievementEvent {
  type: 'unlocked' | 'progress' | 'milestone';
  achievement: Achievement;
  playerData: PlayerAchievement;
  timestamp: Date;
  previousProgress?: number;
}

export interface AchievementAnalytics {
  totalUnlocked: number;
  totalProgress: number;
  averageProgress: number;
  completionRate: number;
  recentUnlocks: AchievementEvent[];
  progressTrends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  categoryBreakdown: Record<string, { total: number; completed: number; inProgress: number; locked: number }>;
  tierBreakdown: Record<string, { total: number; completed: number; inProgress: number; locked: number }>;
}

export class EnhancedAchievementProcessor {
  private tracker: AchievementTracker;
  private eventHistory: AchievementEvent[] = [];
  private notificationQueue: Achievement[] = [];
  private analyticsCache: AchievementAnalytics | null = null;
  private lastAnalyticsUpdate: Date | null = null;

  constructor(tracker: AchievementTracker) {
    this.tracker = tracker;
  }

  /**
   * Process achievement progress and trigger events
   */
  processAchievementProgress(
    achievementId: string,
    newProgress: number,
    triggerSource?: string
  ): AchievementEvent | null {
    const achievementData = this.tracker.getAchievement(achievementId);
    if (!achievementData) return null;

    const { achievement, playerData } = achievementData;
    const previousProgress = playerData?.progress || 0;

    // Update progress
    this.tracker.updateProgress(achievementId, newProgress);

    // Get updated player data
    const updatedAchievementData = this.tracker.getAchievement(achievementId);
    if (!updatedAchievementData) return null;

    const updatedPlayerData = updatedAchievementData.playerData;

    // Determine event type
    let eventType: AchievementEvent['type'] = 'progress';

    if (updatedPlayerData.status === 'completed' && playerData?.status !== 'completed') {
      eventType = 'unlocked';
      this.addToNotificationQueue(achievement);
    } else if (this.isMilestone(newProgress, achievement.criteria.target)) {
      eventType = 'milestone';
    }

    // Create event
    const event: AchievementEvent = {
      type: eventType,
      achievement,
      playerData: updatedPlayerData,
      timestamp: new Date(),
      previousProgress,
    };

    // Add to history
    this.eventHistory.push(event);

    // Invalidate analytics cache
    this.analyticsCache = null;

    // Limit history size
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }

    return event;
  }

  /**
   * Check if progress value represents a milestone
   */
  private isMilestone(progress: number, target: number | string): boolean {
    // If target is a string, we can't calculate milestones numerically
    if (typeof target === 'string') {
      return false;
    }

    const milestones = [0.25, 0.5, 0.75, 0.9, 0.95];
    const progressRatio = progress / target;

    return milestones.some(milestone =>
      Math.abs(progressRatio - milestone) < 0.05
    );
  }

  /**
   * Add achievement to notification queue
   */
  private addToNotificationQueue(achievement: Achievement): void {
    // Check if already in queue
    if (!this.notificationQueue.find(a => a.id === achievement.id)) {
      this.notificationQueue.push(achievement);
    }
  }

  /**
   * Get next notification from queue
   */
  getNextNotification(): Achievement | null {
    return this.notificationQueue.shift() || null;
  }

  /**
   * Get all pending notifications
   */
  getPendingNotifications(): Achievement[] {
    return [...this.notificationQueue];
  }

  /**
   * Clear notification queue
   */
  clearNotificationQueue(): void {
    this.notificationQueue = [];
  }

  /**
   * Get achievement analytics with caching
   */
  getAnalytics(): AchievementAnalytics {
    const now = new Date();
    const cacheAge = this.lastAnalyticsUpdate
      ? now.getTime() - this.lastAnalyticsUpdate.getTime()
      : Infinity;

    // Return cached analytics if recent (less than 5 minutes old)
    if (this.analyticsCache && cacheAge < 5 * 60 * 1000) {
      return this.analyticsCache;
    }

    const analytics = this.calculateAnalytics();
    this.analyticsCache = analytics;
    this.lastAnalyticsUpdate = now;

    return analytics;
  }

  /**
   * Calculate comprehensive achievement analytics
   */
  private calculateAnalytics(): AchievementAnalytics {
    const allAchievements = this.tracker.getAllAchievements();
    const completedAchievements = this.tracker.getCompletedAchievements();

    // Basic stats
    const totalUnlocked = completedAchievements.length;
    const totalProgress = allAchievements.reduce((sum, { playerData }) => sum + playerData.progress, 0);
    const averageProgress = totalProgress / allAchievements.length;
    const completionRate = (totalUnlocked / allAchievements.length) * 100;

    // Recent unlocks (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUnlocks = this.eventHistory
      .filter(event =>
        event.type === 'unlocked' &&
        event.timestamp > thirtyDaysAgo
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    // Progress trends
    const progressTrends = this.calculateProgressTrends();

    // Category breakdown
    const categoryBreakdown = allAchievements.reduce((acc, { achievement, playerData }) => {
      const category = achievement.category;
      if (!acc[category]) {
        acc[category] = { total: 0, completed: 0, inProgress: 0, locked: 0 };
      }
      acc[category].total++;

      if (playerData.status === 'completed') acc[category].completed++;
      else if (playerData.status === 'in_progress') acc[category].inProgress++;
      else acc[category].locked++;

      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number; locked: number }>);

    // Tier breakdown
    const tierBreakdown = allAchievements.reduce((acc, { achievement, playerData }) => {
      const tier = achievement.tier;
      if (!acc[tier]) {
        acc[tier] = { total: 0, completed: 0, inProgress: 0, locked: 0 };
      }
      acc[tier].total++;

      if (playerData.status === 'completed') acc[tier].completed++;
      else if (playerData.status === 'in_progress') acc[tier].inProgress++;
      else acc[tier].locked++;

      return acc;
    }, {} as Record<string, { total: number; completed: 0; inProgress: number; locked: number }>);

    return {
      totalUnlocked,
      totalProgress,
      averageProgress,
      completionRate,
      recentUnlocks,
      progressTrends,
      categoryBreakdown,
      tierBreakdown,
    };
  }

  /**
   * Calculate progress trends over time
   */
  private calculateProgressTrends() {
    const now = new Date();
    const trends = {
      daily: [] as number[],
      weekly: [] as number[],
      monthly: [] as number[],
    };

    // Daily trends (last 7 days)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayEvents = this.eventHistory.filter(event =>
        event.timestamp >= dayStart && event.timestamp <= dayEnd
      );

      const dayProgress = this.calculateDayProgress(dayEvents);
      trends.daily.push(dayProgress);
    }

    // Weekly trends (last 8 weeks)
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekEnd = new Date(date.setDate(date.getDate() + 6));

      const weekEvents = this.eventHistory.filter(event =>
        event.timestamp >= weekStart && event.timestamp <= weekEnd
      );

      const weekProgress = this.calculateWeekProgress(weekEvents);
      trends.weekly.push(weekProgress);
    }

    // Monthly trends (last 12 months)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthEvents = this.eventHistory.filter(event =>
        event.timestamp >= monthStart && event.timestamp <= monthEnd
      );

      const monthProgress = this.calculateMonthProgress(monthEvents);
      trends.monthly.push(monthProgress);
    }

    return trends;
  }

  /**
   * Calculate progress for a specific day
   */
  private calculateDayProgress(events: AchievementEvent[]): number {
    if (events.length === 0) return 0;

    const unlockedCount = events.filter(e => e.type === 'unlocked').length;
    const totalAchievements = this.tracker.getAllAchievements().length;

    return Math.min((unlockedCount / totalAchievements) * 100, 100);
  }

  /**
   * Calculate progress for a specific week
   */
  private calculateWeekProgress(events: AchievementEvent[]): number {
    if (events.length === 0) return 0;

    const unlockedCount = events.filter(e => e.type === 'unlocked').length;
    const totalAchievements = this.tracker.getAllAchievements().length;

    return Math.min((unlockedCount / totalAchievements) * 100, 100);
  }

  /**
   * Calculate progress for a specific month
   */
  private calculateMonthProgress(events: AchievementEvent[]): number {
    if (events.length === 0) return 0;

    const unlockedCount = events.filter(e => e.type === 'unlocked').length;
    const totalAchievements = this.tracker.getAllAchievements().length;

    return Math.min((unlockedCount / totalAchievements) * 100, 100);
  }

  /**
   * Get achievement events for a specific time period
   */
  getEventsForPeriod(startDate: Date, endDate: Date): AchievementEvent[] {
    return this.eventHistory.filter(event =>
      event.timestamp >= startDate && event.timestamp <= endDate
    );
  }

  /**
   * Get events by type
   */
  getEventsByType(type: AchievementEvent['type']): AchievementEvent[] {
    return this.eventHistory.filter(event => event.type === type);
  }

  /**
   * Get events for a specific achievement
   */
  getEventsForAchievement(achievementId: string): AchievementEvent[] {
    return this.eventHistory.filter(event => event.achievement.id === achievementId);
  }

  /**
   * Export achievement data for backup/analytics
   */
  exportAchievementData(): string {
    const data = {
      analytics: this.getAnalytics(),
      eventHistory: this.eventHistory,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import achievement data from backup
   */
  importAchievementData(data: string): boolean {
    try {
      const importedData = JSON.parse(data);

      if (importedData.version && importedData.eventHistory) {
        // Validate data structure
        if (Array.isArray(importedData.eventHistory)) {
          this.eventHistory = importedData.eventHistory.map((event: Omit<AchievementEvent, 'timestamp'> & { timestamp: string }) => ({
            ...event,
            timestamp: new Date(event.timestamp),
          }));

          // Invalidate cache to force recalculation
          this.analyticsCache = null;
          this.lastAnalyticsUpdate = null;

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to import achievement data:', error);
      return false;
    }
  }

  /**
   * Get achievement suggestions based on current progress
   */
  getAchievementSuggestions(): Achievement[] {
    const allAchievements = this.tracker.getAllAchievements();
    const inProgressAchievements = allAchievements.filter(
      ({ playerData }) => playerData.status === 'in_progress'
    );

    // Sort by progress (closest to completion first)
    return inProgressAchievements
      .sort((a, b) => b.playerData.progress - a.playerData.progress)
      .slice(0, 5)
      .map(({ achievement }) => achievement);
  }

  /**
   * Get achievement streak information
   */
  getAchievementStreak(): { current: number; longest: number; lastUnlock: Date | null } {
    const unlockEvents = this.eventHistory
      .filter(event => event.type === 'unlocked')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (unlockEvents.length === 0) {
      return { current: 0, longest: 0, lastUnlock: null };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const event of unlockEvents) {
      if (!lastDate) {
        lastDate = event.timestamp;
        tempStreak = 1;
        continue;
      }

      const daysDiff = Math.floor(
        (lastDate.getTime() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (daysDiff === 0) {
        // Same day, continue streak
        continue;
      } else {
        // Streak broken
        if (currentStreak === 0) {
          currentStreak = tempStreak;
        }
        tempStreak = 1;
      }

      lastDate = event.timestamp;
    }

    // Check if current streak is ongoing
    if (lastDate) {
      const daysSinceLastUnlock = Math.floor(
        (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastUnlock <= 1) {
        currentStreak = tempStreak;
      }
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      lastUnlock: unlockEvents[0]?.timestamp || null,
    };
  }
}

export default EnhancedAchievementProcessor; 