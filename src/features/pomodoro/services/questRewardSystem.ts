// Enhanced Quest Reward System for Pomodoro Integration
// Calculates dynamic rewards based on quest performance, difficulty, and session quality

import { AttachedQuest } from '../types/EnhancedTaskLinking';
import { QuestProgressUpdate } from './questProgressTracker';

export interface QuestRewardCalculation {
    baseRewards: {
        xp: number;
        coins: number;
        cp: number;
        materials: string[];
    };
    performanceBonuses: {
        focusBonus: number;
        speedBonus: number;
        streakBonus: number;
        difficultyBonus: number;
        completionBonus: number;
        timedQuestBonus: number;
    };
    finalRewards: {
        xp: number;
        coins: number;
        cp: number;
        materials: string[];
        totalValue: number;
    };
    bonusBreakdown: {
        description: string;
        amount: number;
        type: 'xp' | 'coins' | 'cp' | 'materials';
    }[];
}

export interface QuestPerformanceMetrics {
    quest: AttachedQuest;
    sessionDuration: number; // in minutes
    focusScore: number; // 0-100
    interruptions: number;
    progressGained: number; // percentage
    estimatedTime: number; // in minutes
    actualTime: number; // in minutes
    subtasksCompleted: number;
    totalSubtasks: number;
    isFirstCompletion: boolean;
    consecutiveSessions: number;
    timeOfDay: number; // hour
    isWeekend: boolean;
}

export class QuestRewardSystem {
    private static readonly BASE_XP_PER_MINUTE = 2;
    private static readonly BASE_COINS_PER_MINUTE = 1;
    private static readonly BASE_CP_PER_MINUTE = 0.5;

    private static readonly DIFFICULTY_MULTIPLIERS = {
        'easy': 1.0,
        'medium': 1.2,
        'hard': 1.5,
        'epic': 2.0
    };

    private static readonly FOCUS_BONUS_THRESHOLDS = {
        90: 0.3, // 30% bonus for 90%+ focus
        80: 0.2, // 20% bonus for 80%+ focus
        70: 0.1, // 10% bonus for 70%+ focus
        60: 0.0  // No bonus below 60%
    };

    private static readonly SPEED_BONUS_THRESHOLDS = {
        0.5: 0.5,  // 50% bonus for completing in half the estimated time
        0.75: 0.3, // 30% bonus for completing in 3/4 of estimated time
        1.0: 0.0   // No bonus for taking estimated time or longer
    };

    private static readonly STREAK_BONUSES = {
        1: 0.0,   // No bonus for first session
        2: 0.1,   // 10% bonus for 2 consecutive sessions
        3: 0.2,   // 20% bonus for 3 consecutive sessions
        5: 0.3,   // 30% bonus for 5 consecutive sessions
        7: 0.5,   // 50% bonus for 7 consecutive sessions
        10: 0.7   // 70% bonus for 10+ consecutive sessions
    };

    /**
     * Calculate enhanced rewards for a quest session
     */
    static calculateQuestRewards(metrics: QuestPerformanceMetrics): QuestRewardCalculation {
        const baseRewards = this.calculateBaseRewards(metrics);
        const performanceBonuses = this.calculatePerformanceBonuses(metrics);

        const finalRewards = {
            xp: Math.round(baseRewards.xp + performanceBonuses.focusBonus + performanceBonuses.speedBonus +
                performanceBonuses.streakBonus + performanceBonuses.difficultyBonus +
                performanceBonuses.completionBonus + performanceBonuses.timedQuestBonus),
            coins: Math.round(baseRewards.coins * (1 + this.getTotalBonusMultiplier(performanceBonuses))),
            cp: Math.round(baseRewards.cp + (performanceBonuses.focusBonus * 0.5) + (performanceBonuses.difficultyBonus * 0.3)),
            materials: [...baseRewards.materials, ...this.getBonusMaterials(performanceBonuses)],
            totalValue: 0
        };

        finalRewards.totalValue = finalRewards.xp + (finalRewards.coins * 2) + (finalRewards.cp * 3) + (finalRewards.materials.length * 10);

        const bonusBreakdown = this.generateBonusBreakdown(performanceBonuses);

        return {
            baseRewards,
            performanceBonuses,
            finalRewards,
            bonusBreakdown
        };
    }

    /**
     * Calculate base rewards for a quest session
     */
    private static calculateBaseRewards(metrics: QuestPerformanceMetrics): {
        xp: number;
        coins: number;
        cp: number;
        materials: string[];
    } {
        const sessionXP = metrics.sessionDuration * this.BASE_XP_PER_MINUTE;
        const sessionCoins = metrics.sessionDuration * this.BASE_COINS_PER_MINUTE;
        const sessionCP = metrics.sessionDuration * this.BASE_CP_PER_MINUTE;

        // Add quest-specific rewards
        const questXP = metrics.quest.rewards.baseXP || 0;
        const questCoins = metrics.quest.rewards.baseCoins || 0;
        const questCP = metrics.quest.rewards.cp || 0;
        const questMaterials = metrics.quest.rewards.materials || [];

        return {
            xp: sessionXP + questXP,
            coins: sessionCoins + questCoins,
            cp: sessionCP + questCP,
            materials: questMaterials
        };
    }

    /**
     * Calculate performance-based bonuses
     */
    private static calculatePerformanceBonuses(metrics: QuestPerformanceMetrics): {
        focusBonus: number;
        speedBonus: number;
        streakBonus: number;
        difficultyBonus: number;
        completionBonus: number;
        timedQuestBonus: number;
    } {
        const focusBonus = this.calculateFocusBonus(metrics.focusScore);
        const speedBonus = this.calculateSpeedBonus(metrics.estimatedTime, metrics.actualTime);
        const streakBonus = this.calculateStreakBonus(metrics.consecutiveSessions);
        const difficultyBonus = this.calculateDifficultyBonus(metrics.quest.difficulty, metrics.sessionDuration);
        const completionBonus = this.calculateCompletionBonus(metrics.subtasksCompleted, metrics.totalSubtasks);
        const timedQuestBonus = this.calculateTimedQuestBonus(metrics.quest.isTimedQuest, metrics.focusScore);

        return {
            focusBonus,
            speedBonus,
            streakBonus,
            difficultyBonus,
            completionBonus,
            timedQuestBonus
        };
    }

    /**
     * Calculate focus bonus based on session quality
     */
    private static calculateFocusBonus(focusScore: number): number {
        if (focusScore >= 90) return 15; // High focus bonus
        if (focusScore >= 80) return 10; // Good focus bonus
        if (focusScore >= 70) return 5;  // Moderate focus bonus
        return 0; // No bonus for low focus
    }

    /**
     * Calculate speed bonus for completing quests faster than estimated
     */
    private static calculateSpeedBonus(estimatedTime: number, actualTime: number): number {
        if (estimatedTime === 0 || actualTime === 0) return 0;

        const efficiencyRatio = estimatedTime / actualTime;

        if (efficiencyRatio >= 2) return 20; // 2x faster = 20 XP bonus
        if (efficiencyRatio >= 1.5) return 15; // 1.5x faster = 15 XP bonus
        if (efficiencyRatio >= 1.25) return 10; // 1.25x faster = 10 XP bonus
        if (efficiencyRatio >= 1.1) return 5; // 1.1x faster = 5 XP bonus

        return 0; // No bonus for taking longer than estimated
    }

    /**
     * Calculate streak bonus for consecutive quest sessions
     */
    private static calculateStreakBonus(consecutiveSessions: number): number {
        if (consecutiveSessions >= 10) return 25; // 10+ sessions = 25 XP bonus
        if (consecutiveSessions >= 7) return 20;  // 7+ sessions = 20 XP bonus
        if (consecutiveSessions >= 5) return 15;  // 5+ sessions = 15 XP bonus
        if (consecutiveSessions >= 3) return 10;  // 3+ sessions = 10 XP bonus
        if (consecutiveSessions >= 2) return 5;   // 2+ sessions = 5 XP bonus

        return 0; // No bonus for first session
    }

    /**
     * Calculate difficulty bonus based on quest difficulty
     */
    private static calculateDifficultyBonus(difficulty: string, sessionDuration: number): number {
        const multiplier = this.DIFFICULTY_MULTIPLIERS[difficulty as keyof typeof this.DIFFICULTY_MULTIPLIERS] || 1.0;
        return Math.round(sessionDuration * 0.5 * (multiplier - 1.0));
    }

    /**
     * Calculate completion bonus for finishing subtasks
     */
    private static calculateCompletionBonus(subtasksCompleted: number, totalSubtasks: number): number {
        if (totalSubtasks === 0) return 0;

        const completionRate = subtasksCompleted / totalSubtasks;

        if (completionRate === 1.0) return 20; // Perfect completion = 20 XP bonus
        if (completionRate >= 0.8) return 15;  // 80%+ completion = 15 XP bonus
        if (completionRate >= 0.6) return 10;  // 60%+ completion = 10 XP bonus
        if (completionRate >= 0.4) return 5;   // 40%+ completion = 5 XP bonus

        return 0; // No bonus for low completion
    }

    /**
     * Calculate timed quest bonus for urgent tasks
     */
    private static calculateTimedQuestBonus(isTimedQuest: boolean, focusScore: number): number {
        if (!isTimedQuest) return 0;

        // Timed quests get bonus XP based on focus quality
        if (focusScore >= 90) return 25; // High focus on timed quest = 25 XP bonus
        if (focusScore >= 80) return 20; // Good focus on timed quest = 20 XP bonus
        if (focusScore >= 70) return 15; // Moderate focus on timed quest = 15 XP bonus

        return 10; // Base timed quest bonus
    }

    /**
     * Get total bonus multiplier for coins
     */
    private static getTotalBonusMultiplier(bonuses: any): number {
        let totalMultiplier = 0;

        // Focus bonus multiplier
        if (bonuses.focusBonus > 0) totalMultiplier += 0.1;

        // Speed bonus multiplier
        if (bonuses.speedBonus > 0) totalMultiplier += 0.15;

        // Streak bonus multiplier
        if (bonuses.streakBonus > 0) totalMultiplier += 0.2;

        // Difficulty bonus multiplier
        if (bonuses.difficultyBonus > 0) totalMultiplier += 0.1;

        // Completion bonus multiplier
        if (bonuses.completionBonus > 0) totalMultiplier += 0.25;

        // Timed quest bonus multiplier
        if (bonuses.timedQuestBonus > 0) totalMultiplier += 0.2;

        return Math.min(totalMultiplier, 1.0); // Cap at 100% bonus
    }

    /**
     * Get bonus materials based on performance
     */
    private static getBonusMaterials(bonuses: any): string[] {
        const bonusMaterials: string[] = [];

        // Focus bonus materials
        if (bonuses.focusBonus >= 15) bonusMaterials.push('💎 Focus Crystal');
        else if (bonuses.focusBonus >= 10) bonusMaterials.push('🔮 Focus Gem');

        // Speed bonus materials
        if (bonuses.speedBonus >= 20) bonusMaterials.push('⚡ Speed Essence');
        else if (bonuses.speedBonus >= 15) bonusMaterials.push('🏃 Velocity Shard');

        // Streak bonus materials
        if (bonuses.streakBonus >= 20) bonusMaterials.push('🔥 Streak Ember');
        else if (bonuses.streakBonus >= 15) bonusMaterials.push('🌟 Momentum Star');

        // Difficulty bonus materials
        if (bonuses.difficultyBonus >= 15) bonusMaterials.push('⚔️ Challenge Blade');
        else if (bonuses.difficultyBonus >= 10) bonusMaterials.push('🛡️ Perseverance Shield');

        // Completion bonus materials
        if (bonuses.completionBonus >= 20) bonusMaterials.push('🏆 Perfection Trophy');
        else if (bonuses.completionBonus >= 15) bonusMaterials.push('🎯 Precision Token');

        // Timed quest bonus materials
        if (bonuses.timedQuestBonus >= 20) bonusMaterials.push('⏰ Time Master Gem');
        else if (bonuses.timedQuestBonus >= 15) bonusMaterials.push('🕐 Efficiency Crystal');

        return bonusMaterials;
    }

    /**
     * Generate detailed bonus breakdown for display
     */
    private static generateBonusBreakdown(bonuses: any): {
        description: string;
        amount: number;
        type: 'xp' | 'coins' | 'cp' | 'materials';
    }[] {
        const breakdown: any[] = [];

        if (bonuses.focusBonus > 0) {
            breakdown.push({
                description: 'Focus Bonus',
                amount: bonuses.focusBonus,
                type: 'xp' as const
            });
        }

        if (bonuses.speedBonus > 0) {
            breakdown.push({
                description: 'Speed Bonus',
                amount: bonuses.speedBonus,
                type: 'xp' as const
            });
        }

        if (bonuses.streakBonus > 0) {
            breakdown.push({
                description: 'Streak Bonus',
                amount: bonuses.streakBonus,
                type: 'xp' as const
            });
        }

        if (bonuses.difficultyBonus > 0) {
            breakdown.push({
                description: 'Difficulty Bonus',
                amount: bonuses.difficultyBonus,
                type: 'xp' as const
            });
        }

        if (bonuses.completionBonus > 0) {
            breakdown.push({
                description: 'Completion Bonus',
                amount: bonuses.completionBonus,
                type: 'xp' as const
            });
        }

        if (bonuses.timedQuestBonus > 0) {
            breakdown.push({
                description: 'Timed Quest Bonus',
                amount: bonuses.timedQuestBonus,
                type: 'xp' as const
            });
        }

        return breakdown;
    }

    /**
     * Calculate rewards for quest completion
     */
    static calculateQuestCompletionRewards(quest: AttachedQuest, sessionCount: number): {
        xp: number;
        coins: number;
        cp: number;
        materials: string[];
    } {
        const baseXP = quest.rewards.baseXP || 50;
        const baseCoins = quest.rewards.baseCoins || 25;
        const baseCP = quest.rewards.cp || 15;
        const baseMaterials = quest.rewards.materials || [];

        // Completion bonus based on difficulty
        const completionMultiplier = this.DIFFICULTY_MULTIPLIERS[quest.difficulty] || 1.0;
        const completionBonus = Math.round(baseXP * 0.5 * completionMultiplier);

        // Efficiency bonus (fewer sessions = better efficiency)
        const efficiencyBonus = Math.max(0, 10 - sessionCount) * 5;

        // Timed quest completion bonus
        const timedQuestBonus = quest.isTimedQuest ? 25 : 0;

        return {
            xp: baseXP + completionBonus + efficiencyBonus + timedQuestBonus,
            coins: Math.round(baseCoins * completionMultiplier),
            cp: Math.round(baseCP * completionMultiplier),
            materials: [
                ...baseMaterials,
                '🏆 Quest Completion Trophy',
                ...(quest.isTimedQuest ? ['⏰ Time Master Badge'] : []),
                ...(sessionCount === 1 ? ['✨ Perfect Execution'] : [])
            ]
        };
    }

    /**
     * Get motivational message based on performance
     */
    static getMotivationalMessage(calculation: QuestRewardCalculation): string {
        const totalBonuses = calculation.performanceBonuses.focusBonus +
            calculation.performanceBonuses.speedBonus +
            calculation.performanceBonuses.streakBonus +
            calculation.performanceBonuses.difficultyBonus +
            calculation.performanceBonuses.completionBonus +
            calculation.performanceBonuses.timedQuestBonus;

        if (totalBonuses >= 50) {
            return "🌟 Outstanding performance! You're on fire!";
        } else if (totalBonuses >= 30) {
            return "🔥 Excellent work! You're really improving!";
        } else if (totalBonuses >= 20) {
            return "⭐ Great job! Keep up the momentum!";
        } else if (totalBonuses >= 10) {
            return "👍 Good work! Every session counts!";
        } else {
            return "💪 Nice effort! Practice makes perfect!";
        }
    }
}
