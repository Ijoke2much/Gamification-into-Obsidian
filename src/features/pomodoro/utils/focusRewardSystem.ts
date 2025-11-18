// Enhanced Focus Reward System for Pomodoro Sessions

export interface FocusMetrics {
    sessionDuration: number; // in minutes
    sessionType: string;
    interruptions: number;
    timeSpentFocused: number; // actual focused time vs total time
    completedTasks: number;
    questDifficulty?: string;
    timeOfDay: number; // hour of day (0-23)
    consecutiveSessionsToday: number;
    currentStreak: number;
    isWeekend: boolean;
    attachedQuestCount: number;
}

export interface FocusReward {
    baseXP: number;
    bonusXP: number;
    totalXP: number;
    baseCoins: number;
    bonusCoins: number;
    totalCoins: number;
    multipliers: Array<{
        type: string;
        description: string;
        multiplier: number;
        bonusXP: number;
    }>;
    achievements?: string[];
    specialRewards?: string[];
}

export class FocusRewardSystem {
    private static readonly FOCUS_THRESHOLDS = {
        PERFECT_FOCUS: 0.95,    // 95% focused time
        HIGH_FOCUS: 0.85,       // 85% focused time
        GOOD_FOCUS: 0.70,       // 70% focused time
        MINIMAL_FOCUS: 0.50     // 50% focused time
    };

    private static readonly TIME_OF_DAY_BONUSES = {
        EARLY_MORNING: { hours: [5, 6, 7], multiplier: 1.2, name: "Early Bird" },
        PEAK_MORNING: { hours: [8, 9, 10, 11], multiplier: 1.1, name: "Morning Peak" },
        AFTERNOON: { hours: [13, 14, 15, 16], multiplier: 1.0, name: "Afternoon" },
        EVENING: { hours: [17, 18, 19], multiplier: 1.05, name: "Evening Focus" },
        NIGHT_OWL: { hours: [20, 21, 22, 23], multiplier: 1.15, name: "Night Owl" }
    };

    static calculateFocusRewards(metrics: FocusMetrics): FocusReward {
        const baseXP = this.calculateBaseXP(metrics.sessionDuration, metrics.sessionType);
        const baseCoins = Math.floor(baseXP * 0.4); // 40% of XP as coins

        let bonusXP = 0;
        let bonusCoins = 0;
        const multipliers: Array<{ type: string; description: string; multiplier: number; bonusXP: number }> = [];
        const achievements: string[] = [];
        const specialRewards: string[] = [];

        // 1. Focus Quality Bonus
        const focusQuality = metrics.timeSpentFocused / metrics.sessionDuration;
        const focusBonus = this.calculateFocusQualityBonus(focusQuality, baseXP);
        if (focusBonus.bonusXP > 0) {
            bonusXP += focusBonus.bonusXP;
            multipliers.push(focusBonus);
        }

        // 2. Interruption Penalty/Bonus
        const interruptionBonus = this.calculateInterruptionBonus(metrics.interruptions, baseXP);
        if (interruptionBonus.bonusXP !== 0) {
            bonusXP += interruptionBonus.bonusXP;
            multipliers.push(interruptionBonus);
        }

        // 3. Streak Bonus
        const streakBonus = this.calculateStreakBonus(metrics.currentStreak, baseXP);
        if (streakBonus.bonusXP > 0) {
            bonusXP += streakBonus.bonusXP;
            multipliers.push(streakBonus);
        }

        // 4. Time of Day Bonus
        const timeBonus = this.calculateTimeOfDayBonus(metrics.timeOfDay, baseXP);
        if (timeBonus.bonusXP > 0) {
            bonusXP += timeBonus.bonusXP;
            multipliers.push(timeBonus);
        }

        // 5. Session Type Bonus (already in base calculation, but add context bonuses)
        const sessionTypeBonus = this.calculateSessionTypeContextBonus(metrics, baseXP);
        if (sessionTypeBonus.bonusXP > 0) {
            bonusXP += sessionTypeBonus.bonusXP;
            multipliers.push(sessionTypeBonus);
        }

        // 6. Consecutive Sessions Bonus
        const consecutiveBonus = this.calculateConsecutiveSessionBonus(metrics.consecutiveSessionsToday, baseXP);
        if (consecutiveBonus.bonusXP > 0) {
            bonusXP += consecutiveBonus.bonusXP;
            multipliers.push(consecutiveBonus);
        }

        // 7. Quest Difficulty Bonus
        if (metrics.questDifficulty) {
            const difficultyBonus = this.calculateQuestDifficultyBonus(metrics.questDifficulty, baseXP);
            if (difficultyBonus.bonusXP > 0) {
                bonusXP += difficultyBonus.bonusXP;
                multipliers.push(difficultyBonus);
            }
        }

        // 8. Multi-Quest Bonus
        if (metrics.attachedQuestCount > 1) {
            const multiQuestBonus = this.calculateMultiQuestBonus(metrics.attachedQuestCount, baseXP);
            bonusXP += multiQuestBonus.bonusXP;
            multipliers.push(multiQuestBonus);
        }

        // 9. Weekend Warrior Bonus
        if (metrics.isWeekend) {
            const weekendBonus = Math.floor(baseXP * 0.1);
            bonusXP += weekendBonus;
            multipliers.push({
                type: 'weekend',
                description: 'Weekend Warrior',
                multiplier: 1.1,
                bonusXP: weekendBonus
            });
        }

        // Calculate bonus coins (usually 50% of bonus XP)
        bonusCoins = Math.floor(bonusXP * 0.5);

        // Check for special achievements
        this.checkForAchievements(metrics, focusQuality, achievements, specialRewards);

        return {
            baseXP,
            bonusXP,
            totalXP: baseXP + bonusXP,
            baseCoins,
            bonusCoins,
            totalCoins: baseCoins + bonusCoins,
            multipliers,
            achievements: achievements.length > 0 ? achievements : undefined,
            specialRewards: specialRewards.length > 0 ? specialRewards : undefined
        };
    }

    private static calculateBaseXP(duration: number, sessionType: string): number {
        const baseXPPerMinute = 0.5;
        const multipliers = {
            classic: 1.0,
            extended: 1.2,
            short: 0.8,
            custom: 1.0,
            deepWork: 1.5,
            quickFocus: 0.7,
        };

        return Math.floor(duration * baseXPPerMinute * (multipliers[sessionType as keyof typeof multipliers] || 1.0));
    }

    private static calculateFocusQualityBonus(focusQuality: number, baseXP: number) {
        if (focusQuality >= this.FOCUS_THRESHOLDS.PERFECT_FOCUS) {
            return {
                type: 'focus',
                description: 'Perfect Focus (95%+)',
                multiplier: 1.5,
                bonusXP: Math.floor(baseXP * 0.5)
            };
        } else if (focusQuality >= this.FOCUS_THRESHOLDS.HIGH_FOCUS) {
            return {
                type: 'focus',
                description: 'High Focus (85%+)',
                multiplier: 1.3,
                bonusXP: Math.floor(baseXP * 0.3)
            };
        } else if (focusQuality >= this.FOCUS_THRESHOLDS.GOOD_FOCUS) {
            return {
                type: 'focus',
                description: 'Good Focus (70%+)',
                multiplier: 1.15,
                bonusXP: Math.floor(baseXP * 0.15)
            };
        }

        return {
            type: 'focus',
            description: 'Standard Focus',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateInterruptionBonus(interruptions: number, baseXP: number) {
        if (interruptions === 0) {
            return {
                type: 'interruption',
                description: 'Zero Interruptions',
                multiplier: 1.25,
                bonusXP: Math.floor(baseXP * 0.25)
            };
        } else if (interruptions === 1) {
            return {
                type: 'interruption',
                description: 'Minimal Interruptions',
                multiplier: 1.1,
                bonusXP: Math.floor(baseXP * 0.1)
            };
        } else if (interruptions >= 5) {
            return {
                type: 'interruption',
                description: 'Too Many Interruptions',
                multiplier: 0.8,
                bonusXP: -Math.floor(baseXP * 0.2)
            };
        }

        return {
            type: 'interruption',
            description: 'Some Interruptions',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateStreakBonus(streak: number, baseXP: number) {
        if (streak >= 30) {
            return {
                type: 'streak',
                description: `Legendary Streak (${streak} days)`,
                multiplier: 2.0,
                bonusXP: Math.floor(baseXP * 1.0)
            };
        } else if (streak >= 14) {
            return {
                type: 'streak',
                description: `Strong Streak (${streak} days)`,
                multiplier: 1.5,
                bonusXP: Math.floor(baseXP * 0.5)
            };
        } else if (streak >= 7) {
            return {
                type: 'streak',
                description: `Week Streak (${streak} days)`,
                multiplier: 1.3,
                bonusXP: Math.floor(baseXP * 0.3)
            };
        } else if (streak >= 3) {
            return {
                type: 'streak',
                description: `Building Streak (${streak} days)`,
                multiplier: 1.15,
                bonusXP: Math.floor(baseXP * 0.15)
            };
        }

        return {
            type: 'streak',
            description: 'No Streak',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateTimeOfDayBonus(hour: number, baseXP: number) {
        for (const [key, timeBonus] of Object.entries(this.TIME_OF_DAY_BONUSES)) {
            if (timeBonus.hours.includes(hour)) {
                const bonusXP = Math.floor(baseXP * (timeBonus.multiplier - 1));
                return {
                    type: 'timeOfDay',
                    description: `${timeBonus.name} Bonus`,
                    multiplier: timeBonus.multiplier,
                    bonusXP
                };
            }
        }

        return {
            type: 'timeOfDay',
            description: 'Standard Time',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateSessionTypeContextBonus(metrics: FocusMetrics, baseXP: number) {
        // Deep work gets bonus for longer sessions
        if (metrics.sessionType === 'deepWork' && metrics.sessionDuration >= 90) {
            return {
                type: 'sessionContext',
                description: 'Extended Deep Work',
                multiplier: 1.2,
                bonusXP: Math.floor(baseXP * 0.2)
            };
        }

        // Quick focus gets bonus for rapid completion
        if (metrics.sessionType === 'quickFocus' && metrics.completedTasks > 0) {
            return {
                type: 'sessionContext',
                description: 'Quick Task Completion',
                multiplier: 1.15,
                bonusXP: Math.floor(baseXP * 0.15)
            };
        }

        return {
            type: 'sessionContext',
            description: 'Standard Session',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateConsecutiveSessionBonus(consecutiveSessions: number, baseXP: number) {
        if (consecutiveSessions >= 5) {
            return {
                type: 'consecutive',
                description: `Power Day (${consecutiveSessions} sessions)`,
                multiplier: 1.4,
                bonusXP: Math.floor(baseXP * 0.4)
            };
        } else if (consecutiveSessions >= 3) {
            return {
                type: 'consecutive',
                description: `Productive Day (${consecutiveSessions} sessions)`,
                multiplier: 1.2,
                bonusXP: Math.floor(baseXP * 0.2)
            };
        }

        return {
            type: 'consecutive',
            description: 'Single Session',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateQuestDifficultyBonus(difficulty: string, baseXP: number) {
        const difficultyMultipliers = {
            easy: 1.0,
            medium: 1.1,
            hard: 1.25,
            epic: 1.5
        };

        const multiplier = difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] || 1.0;
        if (multiplier > 1.0) {
            return {
                type: 'difficulty',
                description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quest`,
                multiplier,
                bonusXP: Math.floor(baseXP * (multiplier - 1))
            };
        }

        return {
            type: 'difficulty',
            description: 'Easy Quest',
            multiplier: 1.0,
            bonusXP: 0
        };
    }

    private static calculateMultiQuestBonus(questCount: number, baseXP: number) {
        const bonus = Math.min(questCount - 1, 3) * 0.1; // Max 30% bonus for 4+ quests
        return {
            type: 'multiQuest',
            description: `Multi-Quest Focus (${questCount} quests)`,
            multiplier: 1 + bonus,
            bonusXP: Math.floor(baseXP * bonus)
        };
    }

    private static checkForAchievements(
        metrics: FocusMetrics,
        focusQuality: number,
        achievements: string[],
        specialRewards: string[]
    ) {
        // Perfect focus achievement
        if (focusQuality >= this.FOCUS_THRESHOLDS.PERFECT_FOCUS && metrics.interruptions === 0) {
            achievements.push('Perfect Focus Session');
            specialRewards.push('🎯 Focus Crystal (+10 permanent focus)');
        }

        // Marathon session
        if (metrics.sessionDuration >= 120) {
            achievements.push('Marathon Focus');
            specialRewards.push('⏳ Time Expansion Potion');
        }

        // Night owl or early bird
        if (metrics.timeOfDay <= 6 || metrics.timeOfDay >= 22) {
            achievements.push(metrics.timeOfDay <= 6 ? 'Early Bird' : 'Night Owl');
            specialRewards.push('🦉 Wisdom Boost (+5% XP for 24h)');
        }

        // Power day
        if (metrics.consecutiveSessionsToday >= 5) {
            achievements.push('Power Day');
            specialRewards.push('⚡ Energy Surge (restore full energy)');
        }

        // Streak milestones
        if ([7, 14, 21, 30, 50, 100].includes(metrics.currentStreak)) {
            achievements.push(`${metrics.currentStreak}-Day Streak`);
            if (metrics.currentStreak >= 30) {
                specialRewards.push('👑 Consistency Crown (permanent +20% XP)');
            }
        }
    }
}
