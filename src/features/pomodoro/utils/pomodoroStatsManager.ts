import { PomodoroStats, PomodoroAchievement, SessionType } from '../types/PomodoroTypes';

export class PomodoroStatsManager {
    private static readonly STORAGE_KEY = 'pomodoro-stats';
    private static readonly ACHIEVEMENTS_KEY = 'pomodoro-achievements';

    // Default stats
    static getDefaultStats(): PomodoroStats {
        return {
            totalSessions: 0,
            todaySessions: 0,
            weekSessions: 0,
            thisWeekSessions: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastSessionDate: '',
            streakStartDate: '',
            totalPomodoroXP: 0,
            todayXP: 0,
            weekXP: 0,
            sessionsByType: {
                classic: 0,
                extended: 0,
                short: 0,
                custom: 0,
                deepWork: 0,
                quickFocus: 0,
            },
            lastResetDate: new Date().toDateString(),
            lastWeekResetDate: this.getStartOfWeek().toDateString(),
        };
    }

    // Feature 2: Session Counter Management
    static updateSessionCount(stats: PomodoroStats, sessionType: keyof PomodoroStats['sessionsByType']): PomodoroStats {
        const today = new Date().toDateString();
        const thisWeek = this.getStartOfWeek().toDateString();

        // Reset daily stats if new day
        if (stats.lastResetDate !== today) {
            stats.todaySessions = 0;
            stats.todayXP = 0;
            stats.lastResetDate = today;
        }

        // Reset weekly stats if new week
        if (stats.lastWeekResetDate !== thisWeek) {
            stats.thisWeekSessions = 0;
            stats.weekSessions = 0; // Add this line to reset weekSessions
            stats.weekXP = 0;
            stats.lastWeekResetDate = thisWeek;
        }

        // Update counters
        stats.totalSessions++;
        stats.todaySessions++;
        stats.thisWeekSessions++;
        stats.weekSessions++; // Add this line to update weekSessions
        stats.sessionsByType[sessionType]++;

        return stats;
    }

    // Feature 3: Streak Management
    static updateStreak(stats: PomodoroStats): PomodoroStats {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

        if (!stats.lastSessionDate) {
            // First session ever
            stats.currentStreak = 1;
            stats.longestStreak = 1;
            stats.streakStartDate = today;
        } else if (stats.lastSessionDate === today) {
            // Same day - no streak change
            return stats;
        } else if (stats.lastSessionDate === yesterday) {
            // Consecutive day - increment streak
            stats.currentStreak++;
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
            }
        } else {
            // Streak broken - reset
            stats.currentStreak = 1;
            stats.streakStartDate = today;
        }

        stats.lastSessionDate = today;
        return stats;
    }

    // XP Calculation
    static calculateXP(duration: number, sessionType: string): number {
        const baseXP = Math.floor(duration / 60); // 1 XP per minute
        const multipliers = {
            classic: 1.0,
            extended: 1.2,
            short: 0.8,
            custom: 1.0,
            deepWork: 1.5,
            quickFocus: 0.7,
        };

        return Math.floor(baseXP * (multipliers[sessionType as keyof typeof multipliers] || 1.0));
    }

    // Add XP to stats
    static addXP(stats: PomodoroStats, xp: number): PomodoroStats {
        stats.totalPomodoroXP += xp;
        stats.todayXP += xp;
        stats.weekXP += xp;
        return stats;
    }

    // Get streak status with visual feedback
    static getStreakStatus(streak: number): {
        level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
        icon: string;
        color: string;
        title: string;
    } {
        if (streak >= 30) return { level: 'diamond', icon: '💎', color: '#b9f2ff', title: 'Diamond Streak' };
        if (streak >= 21) return { level: 'platinum', icon: '🏆', color: '#e5e7eb', title: 'Platinum Streak' };
        if (streak >= 14) return { level: 'gold', icon: '🥇', color: '#fbbf24', title: 'Gold Streak' };
        if (streak >= 7) return { level: 'silver', icon: '🥈', color: '#9ca3af', title: 'Silver Streak' };
        return { level: 'bronze', icon: '🥉', color: '#d97706', title: 'Bronze Streak' };
    }

    // Helper: Get start of current week
    private static getStartOfWeek(): Date {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
    }

    // Storage helpers
    static saveStats(stats: PomodoroStats): void {
        try {
            // Validate stats before saving
            if (!this.validateStats(stats)) {
                console.warn('Invalid stats detected, attempting to repair...');
                const repairedStats = this.repairStats(stats);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(repairedStats));
                return;
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        } catch (error) {
            console.error('Failed to save Pomodoro stats:', error);
            // Try to save a backup with timestamp
            try {
                const backupKey = `${this.STORAGE_KEY}-backup-${Date.now()}`;
                localStorage.setItem(backupKey, JSON.stringify(stats));
                console.log('Saved backup stats with key:', backupKey);
            } catch (backupError) {
                console.error('Failed to save backup stats:', backupError);
            }
        }
    }

    static loadStats(): PomodoroStats {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // Validate the parsed data
                if (this.validateStats(parsed)) {
                    return { ...this.getDefaultStats(), ...parsed };
                } else {
                    console.warn('Invalid stats data detected, attempting to repair...');
                    const repairedStats = this.repairStats(parsed);
                    // Save the repaired stats
                    this.saveStats(repairedStats);
                    return repairedStats;
                }
            } catch (parseError) {
                console.error('Failed to parse Pomodoro stats:', parseError);
                // Try to recover partial data
                const recoveredStats = this.recoverPartialStats(saved);
                if (recoveredStats) {
                    console.log('Successfully recovered partial stats');
                    this.saveStats(recoveredStats);
                    return recoveredStats;
                }
                console.warn('Could not recover stats, using defaults');
                return this.getDefaultStats();
            }
        }
        return this.getDefaultStats();
    }

    // New helper methods for data validation and recovery
    private static validateStats(stats: unknown): stats is PomodoroStats {
        if (!stats || typeof stats !== 'object') return false;

        const statsObj = stats as Record<string, unknown>;

        // Check required fields
        const requiredFields = [
            'totalSessions', 'todaySessions', 'weekSessions', 'thisWeekSessions',
            'currentStreak', 'longestStreak', 'totalPomodoroXP', 'todayXP', 'weekXP',
            'sessionsByType', 'lastResetDate', 'lastWeekResetDate'
        ];

        for (const field of requiredFields) {
            if (!(field in statsObj)) return false;
        }

        // Validate sessionsByType structure
        if (!statsObj.sessionsByType || typeof statsObj.sessionsByType !== 'object') return false;
        const sessionsByType = statsObj.sessionsByType as Record<string, unknown>;
        const requiredSessionTypes = ['classic', 'extended', 'short', 'custom', 'deepWork', 'quickFocus'];
        for (const sessionType of requiredSessionTypes) {
            if (typeof sessionsByType[sessionType] !== 'number') return false;
        }

        // Validate numeric fields
        const numericFields = [
            'totalSessions', 'todaySessions', 'weekSessions', 'thisWeekSessions',
            'currentStreak', 'longestStreak', 'totalPomodoroXP', 'todayXP', 'weekXP'
        ];
        for (const field of numericFields) {
            const value = statsObj[field];
            if (typeof value !== 'number' || value < 0) return false;
        }

        return true;
    }

    private static repairStats(corruptedStats: unknown): PomodoroStats {
        const defaultStats = this.getDefaultStats();

        // Create a repaired version by merging with defaults
        const repaired: PomodoroStats = { ...defaultStats };

        // Safely copy valid fields
        if (corruptedStats && typeof corruptedStats === 'object') {
            const corrupted = corruptedStats as Record<string, unknown>;

            // Copy numeric fields with validation
            const numericFields = [
                'totalSessions', 'todaySessions', 'weekSessions', 'thisWeekSessions',
                'currentStreak', 'longestStreak', 'totalPomodoroXP', 'todayXP', 'weekXP'
            ];

            for (const field of numericFields) {
                const value = corrupted[field];
                if (typeof value === 'number' && value >= 0) {
                    (repaired as unknown as Record<string, unknown>)[field] = value;
                }
            }

            // Copy string fields with validation
            const stringFields = ['lastSessionDate', 'streakStartDate', 'lastResetDate', 'lastWeekResetDate'];
            for (const field of stringFields) {
                const value = corrupted[field];
                if (typeof value === 'string') {
                    (repaired as unknown as Record<string, unknown>)[field] = value;
                }
            }

            // Repair sessionsByType
            if (corrupted.sessionsByType && typeof corrupted.sessionsByType === 'object') {
                const sessionsByType = corrupted.sessionsByType as Record<string, unknown>;
                const requiredSessionTypes = ['classic', 'extended', 'short', 'custom', 'deepWork', 'quickFocus'];
                for (const sessionType of requiredSessionTypes) {
                    const value = sessionsByType[sessionType];
                    if (typeof value === 'number' && value >= 0) {
                        repaired.sessionsByType[sessionType as keyof PomodoroStats['sessionsByType']] = value;
                    }
                }
            }
        }

        return repaired;
    }

    private static recoverPartialStats(corruptedJson: string): PomodoroStats | null {
        try {
            // Try to extract partial data using regex
            const numericMatches = corruptedJson.match(/"([^"]+)":\s*(\d+)/g);
            if (!numericMatches) return null;

            const recovered: Record<string, unknown> = {};

            for (const match of numericMatches) {
                const [, field, value] = match.match(/"([^"]+)":\s*(\d+)/) || [];
                if (field && value) {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue >= 0) {
                        recovered[field] = numValue;
                    }
                }
            }

            // If we recovered enough data, repair it
            if (Object.keys(recovered).length > 0) {
                return this.repairStats(recovered);
            }

            return null;
        } catch (error) {
            console.error('Failed to recover partial stats:', error);
            return null;
        }
    }

    // Enhanced save method with immediate save option
    static saveStatsImmediately(stats: PomodoroStats): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.saveStats(stats);
                resolve();
            } catch (error) {
                console.error('Immediate save failed:', error);
                reject(error);
            }
        });
    }

    // Backup and restore functionality
    static createBackup(): string {
        try {
            const stats = this.loadStats();
            const backup = {
                stats,
                timestamp: Date.now(),
                version: '1.0'
            };
            const backupKey = `${this.STORAGE_KEY}-backup-${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backup));
            return backupKey;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    static restoreFromBackup(backupKey: string): boolean {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) return false;

            const backup = JSON.parse(backupData);
            if (backup.stats && this.validateStats(backup.stats)) {
                this.saveStats(backup.stats);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }
}

// Predefined Session Types (Feature 5)
export const SESSION_TYPES: SessionType[] = [
    {
        id: 'classic',
        name: 'Classic Focus',
        description: 'Standard 25-minute work session',
        duration: 25 * 60,
        breakDuration: 5 * 60,
        xpMultiplier: 1.0,
        icon: '⏰',
        color: '#8ecae6',
        category: 'standard',
    },
    {
        id: 'extended',
        name: 'Extended Focus',
        description: 'Long 45-minute deep work session',
        duration: 45 * 60,
        breakDuration: 10 * 60,
        xpMultiplier: 1.2,
        icon: '🎯',
        color: '#219ebc',
        category: 'standard',
    },
    {
        id: 'short',
        name: 'Quick Focus',
        description: 'Short 15-minute burst session',
        duration: 15 * 60,
        breakDuration: 5 * 60,
        xpMultiplier: 0.8,
        icon: '⚡',
        color: '#023047',
        category: 'quickFocus',
    },
    {
        id: 'deepWork',
        name: 'Deep Work',
        description: 'Ultra-focused 60-minute session',
        duration: 60 * 60,
        breakDuration: 15 * 60,
        xpMultiplier: 1.5,
        icon: '🧠',
        color: '#ffb703',
        category: 'deepWork',
    },
    {
        id: 'quickFocus',
        name: 'Power Sprint',
        description: 'Intense 10-minute focus burst',
        duration: 10 * 60,
        breakDuration: 3 * 60,
        xpMultiplier: 0.7,
        icon: '🚀',
        color: '#fb8500',
        category: 'quickFocus',
    },
];

// Achievement Definitions (Feature 4)
export const POMODORO_ACHIEVEMENTS: PomodoroAchievement[] = [
    // Session Milestones
    { id: 'first-session', title: 'Getting Started', description: 'Complete your first pomodoro session', icon: '🌱', xpReward: 25, category: 'sessions', requirement: { type: 'sessions', value: 1 } },
    { id: 'sessions-10', title: 'Focused Mind', description: 'Complete 10 pomodoro sessions', icon: '🧘', xpReward: 50, category: 'sessions', requirement: { type: 'sessions', value: 10 } },
    { id: 'sessions-50', title: 'Productivity Master', description: 'Complete 50 pomodoro sessions', icon: '⚡', xpReward: 100, category: 'sessions', requirement: { type: 'sessions', value: 50 } },
    { id: 'sessions-100', title: 'Focus Champion', description: 'Complete 100 pomodoro sessions', icon: '🏆', xpReward: 200, category: 'sessions', requirement: { type: 'sessions', value: 100 } },

    // Streak Achievements
    { id: 'streak-3', title: 'Building Habits', description: 'Maintain a 3-day streak', icon: '🔥', xpReward: 30, category: 'streaks', requirement: { type: 'streak', value: 3 } },
    { id: 'streak-7', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🥉', xpReward: 75, category: 'streaks', requirement: { type: 'streak', value: 7 } },
    { id: 'streak-14', title: 'Consistency King', description: 'Maintain a 14-day streak', icon: '🥈', xpReward: 150, category: 'streaks', requirement: { type: 'streak', value: 14 } },
    { id: 'streak-30', title: 'Unstoppable Force', description: 'Maintain a 30-day streak', icon: '💎', xpReward: 300, category: 'streaks', requirement: { type: 'streak', value: 30 } },

    // XP Milestones
    { id: 'xp-500', title: 'Experience Gained', description: 'Earn 500 total XP', icon: '⭐', xpReward: 50, category: 'xp', requirement: { type: 'xp', value: 500 } },
    { id: 'xp-2000', title: 'XP Collector', description: 'Earn 2000 total XP', icon: '🌟', xpReward: 100, category: 'xp', requirement: { type: 'xp', value: 2000 } },

    // Session Type Achievements
    { id: 'deep-work-5', title: 'Deep Thinker', description: 'Complete 5 Deep Work sessions', icon: '🧠', xpReward: 75, category: 'special', requirement: { type: 'sessionType', value: 5, sessionType: 'deepWork' } },
    { id: 'quick-focus-10', title: 'Speed Demon', description: 'Complete 10 Quick Focus sessions', icon: '🚀', xpReward: 60, category: 'special', requirement: { type: 'sessionType', value: 10, sessionType: 'quickFocus' } },
];